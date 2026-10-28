"use client";

import Link from "next/link";
import { useEvaluation, type Evaluation } from "@/lib/evaluations";
import type { Aggregate } from "@/lib/aggregate";
import { btnPrimary } from "./PageHeader";

type Loaded = { evaluation: Evaluation; originalAgg: Aggregate; revisedAgg: Aggregate };

/** Resolves an evaluation id to its data, or renders a loading / not-found state. */
export default function EvalGuard({ id, children }: { id: string; children: (e: Loaded) => React.ReactNode }) {
  const { evaluation, originalAgg, revisedAgg, hydrated } = useEvaluation(id);

  if (!evaluation || !originalAgg || !revisedAgg) {
    if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-card" aria-busy />;
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Evaluation not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Evaluations are kept in this browser only (no database), so a link only works where it was created, and
          clearing site data removes them.
        </p>
        <Link href="/evaluate" className={`${btnPrimary} mt-5`}>Start a new evaluation</Link>
      </div>
    );
  }
  return <>{children({ evaluation, originalAgg, revisedAgg })}</>;
}
