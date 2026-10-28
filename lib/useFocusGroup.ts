"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { aggregate, type Aggregate } from "./aggregate";
import { PERSONAS } from "./personas";
import { getMaxConcurrency, runWithConcurrency } from "./pool";
import { RecordedRunSchema } from "./recorded";
import { validateCopy, type Rewrite, type VoteResult } from "./schemas";

export type NodeState = { status: "idle" | "loading" | "done" | "error"; vote?: VoteResult };
export type Round = Record<string, NodeState>;
export type RoundKey = "original" | "revised";

const emptyRound = (): Round => Object.fromEntries(PERSONAS.map((p) => [p.id, { status: "idle" } as NodeState]));
const roundFromVotes = (votes: VoteResult[]): Round => {
  const round = emptyRound();
  for (const vote of votes) {
    if (vote.personaId in round) round[vote.personaId] = { status: vote.error ? "error" : "done", vote };
  }
  return round;
};

async function fetchVote(copy: string, personaId: string, retry = false): Promise<VoteResult> {
  const started = Date.now();
  try {
    const res = await fetch("/api/persona-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copy, personaId, retry }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { error: true, personaId, model: "", latencyMs: Date.now() - started, message: data?.error ?? `Request failed (${res.status}).` };
    }
    return data as VoteResult;
  } catch {
    return { error: true, personaId, model: "", latencyMs: Date.now() - started, message: "Network error. Is the server running?" };
  }
}

export function useFocusGroup() {
  const [originalCopy, setOriginalCopy] = useState("");
  const [original, setOriginal] = useState<Round>(emptyRound);
  const [revised, setRevised] = useState<Round>(emptyRound);
  const [rewrite, setRewrite] = useState<Rewrite | null>(null);
  const [revisedCopy, setRevisedCopy] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordedRun, setRecordedRun] = useState<{ source: "mock" | "live"; recordedAt: string } | null>(null);
  const busyRef = useRef(false);

  const setters = { original: setOriginal, revised: setRevised };

  const runRound = useCallback(async (copy: string, key: RoundKey) => {
    const set = setters[key];
    set(emptyRound());
    await runWithConcurrency(
      PERSONAS.map((p) => async (control) => {
        set((r) => ({ ...r, [p.id]: { status: "loading" } }));
        const vote = await fetchVote(copy, p.id);
        if (vote.rateLimited || (vote.error && /rate limit|429/i.test(vote.message))) control.rateLimited();
        set((r) => ({ ...r, [p.id]: { status: vote.error ? "error" : "done", vote } }));
      }),
      getMaxConcurrency(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    async (copy: string) => {
      if (busyRef.current) return;
      const invalid = validateCopy(copy);
      if (invalid) {
        setError(invalid);
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setRecordedRun(null);
      setRewrite(null);
      setRevisedCopy("");
      setRevised(emptyRound());
      setOriginalCopy(copy);
      setCompleted(1);
      setActive(1);
      await runRound(copy, "original");
      setCompleted(2);
      setActive(2);
      await new Promise((r) => setTimeout(r, 350)); // brief, visible aggregate stage
      setCompleted(3);
      setActive(null);
      busyRef.current = false;
      setBusy(false);
    },
    [runRound],
  );

  const originalAgg = useMemo(() => aggregate(Object.values(original).flatMap((n) => (n.vote ? [n.vote] : []))), [original]);
  const revisedAgg = useMemo(() => aggregate(Object.values(revised).flatMap((n) => (n.vote ? [n.vote] : []))), [revised]);

  const fixObjections = useCallback(async () => {
    if (busyRef.current || recordedRun || originalAgg.top_objections.length === 0) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setActive(3);
    setCompleted(3);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy: originalCopy,
          objections: originalAgg.top_objections.map(({ objection, count }) => ({ objection, count })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.revised_copy) throw new Error(data?.error ?? `Rewrite failed (${res.status}).`);
      setRewrite(data as Rewrite);
      setRevisedCopy(data.revised_copy);
      setCompleted(4);
      setActive(4);
      await runRound(data.revised_copy, "revised");
      setCompleted(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
      setCompleted(3);
    } finally {
      setActive(null);
      busyRef.current = false;
      setBusy(false);
    }
  }, [originalAgg, originalCopy, recordedRun, runRound]);

  const retryPersona = useCallback(
    async (key: RoundKey, personaId: string) => {
      if (recordedRun) return;
      const set = setters[key];
      const copy = key === "original" ? originalCopy : revisedCopy;
      set((r) => ({ ...r, [personaId]: { status: "loading" } }));
      const vote = await fetchVote(copy, personaId, true);
      set((r) => ({ ...r, [personaId]: { status: vote.error ? "error" : "done", vote } }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalCopy, revisedCopy, recordedRun],
  );

  const loadRecordedRun = useCallback((input: unknown) => {
    if (busyRef.current) return;
    const run = RecordedRunSchema.parse(input);
    setOriginalCopy(run.original.copy);
    setOriginal(roundFromVotes(run.original.votes));
    setRewrite(run.rewrite ?? null);
    setRevisedCopy(run.revised?.copy ?? "");
    setRevised(run.revised ? roundFromVotes(run.revised.votes) : emptyRound());
    setRecordedRun({ source: run.source, recordedAt: run.recorded_at });
    setError(null);
    setActive(null);
    setCompleted(run.revised ? 5 : 3);
  }, []);

  return {
    originalCopy, revisedCopy, original, revised, rewrite, originalAgg, revisedAgg,
    active, completed, error, busy, recordedRun, run, fixObjections, retryPersona, loadRecordedRun,
  } as const;
}

export type FocusGroup = ReturnType<typeof useFocusGroup>;
export type { Aggregate };
