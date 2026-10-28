"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { aggregate, type Aggregate } from "./aggregate";
import { PERSONAS } from "./personas";
import { getMaxConcurrency, runWithConcurrency } from "./pool";
import { RecordedRunSchema } from "./recorded";
import { validateCopy, type Rewrite, type VoteResult } from "./schemas";

export type NodeState = { status: "idle" | "loading" | "done" | "error"; vote?: VoteResult };
export type Round = Record<string, NodeState>;
export type RoundKey = "original" | "revised";

export type Evaluation = {
  id: string;
  createdAt: number;
  copy: string;
  original: Round;
  revised: Round;
  revisedCopy: string;
  rewrite: Rewrite | null;
  /** Pipeline: index of the running stage, and how many stages are complete. */
  active: number | null;
  completed: number;
  error: string | null;
  recordedRun?: { source: "mock" | "live"; recordedAt: string };
};

const STORAGE_KEY = "panel.evaluations.v1";
const MAX_SAVED = 20;

const emptyRound = (): Round => Object.fromEntries(PERSONAS.map((p) => [p.id, { status: "idle" } as NodeState]));
const roundFromVotes = (votes: VoteResult[]): Round => {
  const round = emptyRound();
  for (const vote of votes) {
    if (vote.personaId in round) round[vote.personaId] = { status: vote.error ? "error" : "done", vote };
  }
  return round;
};

export const roundVotes = (round: Round): VoteResult[] => Object.values(round).flatMap((n) => (n.vote ? [n.vote] : []));
export const aggOf = (round: Round): Aggregate => aggregate(roundVotes(round));

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

type Ctx = {
  /** Newest first. */
  evaluations: Evaluation[];
  get: (id: string) => Evaluation | undefined;
  /** False until saved evaluations have been read from the browser (avoids a false "not found"). */
  hydrated: boolean;
  busy: boolean;
  mock: boolean | null;
  start: (copy: string) => { id: string } | { error: string };
  loadRecordedRun: (input: unknown) => { id: string } | { error: string };
  fixObjections: (id: string) => Promise<void>;
  revoteEditedCopy: (id: string, copy: string) => Promise<boolean>;
  retryPersona: (id: string, key: RoundKey, personaId: string) => Promise<void>;
};

const EvalContext = createContext<Ctx | null>(null);

export function EvaluationsProvider({ children }: { children: React.ReactNode }) {
  const [byId, setById] = useState<Record<string, Evaluation>>({});
  const [hydrated, setHydrated] = useState(false);
  const [mock, setMock] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  const patch = useCallback((id: string, fn: (e: Evaluation) => Evaluation) => {
    setById((s) => (s[id] ? { ...s, [id]: fn(s[id]) } : s));
  }, []);

  // Restore saved evaluations once on the client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Evaluation[];
        setById((s) => ({ ...Object.fromEntries(saved.map((e) => [e.id, e])), ...s }));
      }
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
    setHydrated(true);
    fetch("/api/env").then((r) => r.json()).then((d) => setMock(!!d.mock)).catch(() => {});
  }, []);

  // Persist settled evaluations (never while one is mid-run, so we don't save half-finished rounds).
  useEffect(() => {
    if (!hydrated) return;
    const all = Object.values(byId);
    if (all.some((e) => e.active !== null)) return;
    try {
      const keep = all.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SAVED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
    } catch {
      /* quota or blocked: the in-memory state still works */
    }
  }, [byId, hydrated]);

  const runRound = useCallback(
    async (id: string, copy: string, key: RoundKey) => {
      const setRound = (fn: (r: Round) => Round) => patch(id, (e) => ({ ...e, [key]: fn(e[key]) }));
      setRound(() => emptyRound());
      await runWithConcurrency(
        PERSONAS.map((p) => async (control) => {
          setRound((r) => ({ ...r, [p.id]: { status: "loading" } }));
          const vote = await fetchVote(copy, p.id);
          if (vote.rateLimited || (vote.error && /rate limit|429/i.test(vote.message))) control.rateLimited();
          setRound((r) => ({ ...r, [p.id]: { status: vote.error ? "error" : "done", vote } }));
        }),
        getMaxConcurrency(),
      );
    },
    [patch],
  );

  const start = useCallback<Ctx["start"]>(
    (copy) => {
      const invalid = validateCopy(copy);
      if (invalid) return { error: invalid };
      if (busyRef.current) return { error: "An evaluation is already running. Please wait for it to finish." };
      busyRef.current = true;
      setBusy(true);
      const id = Math.random().toString(36).slice(2, 10);
      const evaluation: Evaluation = {
        id, createdAt: Date.now(), copy, original: emptyRound(), revised: emptyRound(),
        revisedCopy: "", rewrite: null, active: 1, completed: 1, error: null,
      };
      setById((s) => ({ ...s, [id]: evaluation }));
      (async () => {
        await runRound(id, copy, "original");
        patch(id, (e) => ({ ...e, completed: 2, active: 2 }));
        await new Promise((r) => setTimeout(r, 350)); // brief, visible Insights stage
        patch(id, (e) => ({ ...e, completed: 3, active: null }));
        busyRef.current = false;
        setBusy(false);
      })();
      return { id };
    },
    [patch, runRound],
  );

  const fixObjections = useCallback(
    async (id: string) => {
      const e = byIdRef.current[id];
      if (!e || e.recordedRun || busyRef.current) return;
      const objections = aggOf(e.original).top_objections.map(({ objection, count }) => ({ objection, count }));
      if (objections.length === 0) return;
      busyRef.current = true;
      setBusy(true);
      patch(id, (x) => ({ ...x, error: null, active: 3, completed: 3 }));
      try {
        const res = await fetch("/api/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ copy: e.copy, objections }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.revised_copy) throw new Error(data?.error ?? `Rewrite failed (${res.status}).`);
        patch(id, (x) => ({ ...x, rewrite: data as Rewrite, revisedCopy: data.revised_copy, completed: 4, active: 4 }));
        await runRound(id, data.revised_copy, "revised");
        patch(id, (x) => ({ ...x, completed: 5 }));
      } catch (err) {
        patch(id, (x) => ({ ...x, error: err instanceof Error ? err.message : "Rewrite failed.", completed: 3 }));
      } finally {
        patch(id, (x) => ({ ...x, active: null }));
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patch, runRound],
  );

  const revoteEditedCopy = useCallback<Ctx["revoteEditedCopy"]>(
    async (id, copy) => {
      const e = byIdRef.current[id];
      if (!e || !e.rewrite || e.recordedRun || busyRef.current) return false;
      const invalid = validateCopy(copy);
      if (invalid) {
        patch(id, (x) => ({ ...x, error: invalid }));
        return false;
      }
      busyRef.current = true;
      setBusy(true);
      patch(id, (x) => ({ ...x, error: null, active: 4, completed: 4,
        revisedCopy: copy,
        rewrite: x.rewrite && { ...x.rewrite, revised_copy: copy,
          changes_made: x.rewrite.changes_made.filter((change) => copy.includes(change.after)) },
      }));
      try {
        await runRound(id, copy, "revised");
        patch(id, (x) => ({ ...x, completed: 5 }));
        return true;
      } catch (err) {
        patch(id, (x) => ({ ...x, error: err instanceof Error ? err.message : "Re-vote failed." }));
        return false;
      } finally {
        patch(id, (x) => ({ ...x, active: null }));
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patch, runRound],
  );

  const loadRecordedRun = useCallback<Ctx["loadRecordedRun"]>((input) => {
    if (busyRef.current) return { error: "An evaluation is already running." };
    const parsed = RecordedRunSchema.safeParse(input);
    if (!parsed.success) return { error: "Recorded run failed validation." };
    const run = parsed.data;
    const id = `recorded-${Math.random().toString(36).slice(2, 10)}`;
    const evaluation: Evaluation = {
      id, createdAt: Date.parse(run.recorded_at), copy: run.original.copy,
      original: roundFromVotes(run.original.votes),
      revised: run.revised ? roundFromVotes(run.revised.votes) : emptyRound(),
      revisedCopy: run.revised?.copy ?? "", rewrite: run.rewrite ?? null,
      active: null, completed: run.revised ? 5 : 3, error: null,
      recordedRun: { source: run.source, recordedAt: run.recorded_at },
    };
    setById((state) => ({ ...state, [id]: evaluation }));
    return { id };
  }, []);

  const retryPersona = useCallback<Ctx["retryPersona"]>(
    async (id, key, personaId) => {
      const e = byIdRef.current[id];
      if (!e || e.recordedRun) return;
      const copy = key === "original" ? e.copy : e.revisedCopy;
      patch(id, (x) => ({ ...x, [key]: { ...x[key], [personaId]: { status: "loading" } } }));
      const vote = await fetchVote(copy, personaId, true);
      patch(id, (x) => ({ ...x, [key]: { ...x[key], [personaId]: { status: vote.error ? "error" : "done", vote } } }));
    },
    [patch],
  );

  const evaluations = useMemo(() => Object.values(byId).sort((a, b) => b.createdAt - a.createdAt), [byId]);
  const value = useMemo<Ctx>(
    () => ({ evaluations, get: (id) => byId[id], hydrated, busy, mock, start, loadRecordedRun, fixObjections, revoteEditedCopy, retryPersona }),
    [evaluations, byId, hydrated, busy, mock, start, loadRecordedRun, fixObjections, revoteEditedCopy, retryPersona],
  );

  return <EvalContext.Provider value={value}>{children}</EvalContext.Provider>;
}

export function useEvaluations(): Ctx {
  const ctx = useContext(EvalContext);
  if (!ctx) throw new Error("useEvaluations must be used inside EvaluationsProvider");
  return ctx;
}

/** One evaluation plus its derived aggregates. */
export function useEvaluation(id: string) {
  const ctx = useEvaluations();
  const evaluation = ctx.get(id);
  const originalAgg = useMemo(() => (evaluation ? aggOf(evaluation.original) : null), [evaluation?.original]); // eslint-disable-line react-hooks/exhaustive-deps
  const revisedAgg = useMemo(() => (evaluation ? aggOf(evaluation.revised) : null), [evaluation?.revised]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...ctx, evaluation, originalAgg, revisedAgg };
}
