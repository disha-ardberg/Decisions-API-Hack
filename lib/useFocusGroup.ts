"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { aggregate, type Aggregate } from "./aggregate";
import { PERSONAS } from "./personas";
import { runWithConcurrency } from "./pool";
import { validateCopy, type Rewrite, type VoteResult } from "./schemas";

export type NodeState = { status: "idle" | "loading" | "done" | "error"; vote?: VoteResult };
export type Round = Record<string, NodeState>;
export type RoundKey = "original" | "revised";

const emptyRound = (): Round => Object.fromEntries(PERSONAS.map((p) => [p.id, { status: "idle" } as NodeState]));

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
  const busyRef = useRef(false);

  const setters = { original: setOriginal, revised: setRevised };

  const runRound = useCallback(async (copy: string, key: RoundKey) => {
    const set = setters[key];
    set(emptyRound());
    await runWithConcurrency(
      PERSONAS.map((p) => async () => {
        set((r) => ({ ...r, [p.id]: { status: "loading" } }));
        const vote = await fetchVote(copy, p.id);
        set((r) => ({ ...r, [p.id]: { status: vote.error ? "error" : "done", vote } }));
      }),
      5,
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
    if (busyRef.current || originalAgg.top_objections.length === 0) return;
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
  }, [originalAgg, originalCopy, runRound]);

  const retryPersona = useCallback(
    async (key: RoundKey, personaId: string) => {
      const set = setters[key];
      const copy = key === "original" ? originalCopy : revisedCopy;
      set((r) => ({ ...r, [personaId]: { status: "loading" } }));
      const vote = await fetchVote(copy, personaId, true);
      set((r) => ({ ...r, [personaId]: { status: vote.error ? "error" : "done", vote } }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalCopy, revisedCopy],
  );

  return {
    originalCopy, revisedCopy, original, revised, rewrite, originalAgg, revisedAgg,
    active, completed, error, busy, run, fixObjections, retryPersona,
  } as const;
}

export type FocusGroup = ReturnType<typeof useFocusGroup>;
export type { Aggregate };
