"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import EvalGuard from "@/components/EvalGuard";
import LoadRecordedButton from "@/components/LoadRecordedButton";
import PageHeader, { btnGhost, btnPrimary } from "@/components/PageHeader";
import PersonaDetailDrawer from "@/components/PersonaDetailPanel";
import PipelineStrip from "@/components/PipelineStrip";
import ReactionMap from "@/components/ReactionMap";
import ScoreGauge from "@/components/ScoreGauge";
import VerdictCard from "@/components/VerdictCard";
import { roundVotes, useEvaluations, type Evaluation, type RoundKey } from "@/lib/evaluations";
import { evaluate } from "@/lib/gate";
import { makeRecordedRound, RecordedRunSchema } from "@/lib/recorded";

function saveRun(e: Evaluation) {
  const originalVotes = roundVotes(e.original);
  const revisedVotes = roundVotes(e.revised);
  const run = RecordedRunSchema.parse({
    schema_version: 1,
    source: originalVotes.every((vote) => vote.model.startsWith("mock-")) ? "mock" : "live",
    recorded_at: new Date().toISOString(),
    original: makeRecordedRound(e.copy, originalVotes),
    ...(e.completed >= 5 && e.rewrite ? {
      rewrite: e.rewrite,
      revised: makeRecordedRound(e.revisedCopy, revisedVotes),
    } : {}),
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "panel-run.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const { retryPersona } = useEvaluations();
  const [view, setView] = useState<RoundKey>("original");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <EvalGuard id={id}>
      {({ evaluation: e, originalAgg, revisedAgg }) => {
        const hasRevised = e.completed >= 4 && !!e.rewrite;
        const key: RoundKey = hasRevised ? view : "original";
        const round = e[key];
        const agg = key === "original" ? originalAgg : revisedAgg;
        const running = e.completed < 3;
        const ready = !running;
        const votes = roundVotes(round);
        const gate = ready && (key === "original" || e.completed >= 5)
          ? evaluate({ score: agg.score, votes, top_objections: agg.top_objections }) : null;
        const failedOriginal = roundVotes(e.original).filter((vote) => vote.error).length;
        const failedRevised = e.completed >= 5 ? roundVotes(e.revised).filter((vote) => vote.error).length : 0;
        const firstFailure = [...roundVotes(e.original), ...roundVotes(e.revised)].find((vote) => vote.error);
        const failureMessage = firstFailure?.error ? firstFailure.message : null;
        const canSave = ready && !e.recordedRun && e.active === null && roundVotes(e.original).length === 10 &&
          (e.completed < 5 || roundVotes(e.revised).length === 10);

        return (
          <>
            <PageHeader
              crumbs={[{ label: "Overview", href: "/" }, { label: "Evaluations", href: "/evaluate" }, { label: `#${e.id}` }]}
              title={running ? "Running 10 synthetic customer evaluations…" : "Evaluation results"}
              subtitle={running ? "Each persona appears as soon as it responds." : "How your copy performed across 10 synthetic customer personas."}
              actions={
                <>
                  <Link href={`/insights/${e.id}`} aria-disabled={!ready} className={`${btnGhost} ${ready ? "" : "pointer-events-none opacity-40"}`}>View insights</Link>
                  <Link href={`/rewrite/${e.id}`} aria-disabled={!ready} className={`${btnPrimary} ${ready ? "" : "pointer-events-none opacity-40"}`}>Fix objections →</Link>
                  {process.env.NODE_ENV === "development" && !e.recordedRun && (
                    <button type="button" onClick={() => saveRun(e)} disabled={!canSave} className={btnGhost}>Save this run</button>
                  )}
                </>
              }
            />
            <div className="space-y-5">
              <PipelineStrip active={e.active} completed={e.completed} />
              {e.recordedRun && <span className="inline-flex rounded-full border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-300">Recorded run · {e.recordedRun.source}</span>}
              {!e.recordedRun && ready && (failedOriginal > 5 || failedRevised > 5) && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <span>Most evaluations failed. {failureMessage ?? "Check the AI provider configuration."} You can explore a recorded run while live evaluations are unavailable.</span>
                  <LoadRecordedButton className={btnGhost} />
                </div>
              )}
              {e.error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{e.error}</p>}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-5">
                  <ScoreGauge agg={agg} />
                  {gate && <VerdictCard title={`${key === "original" ? "Original" : "Revised"} Launch Gate`} result={gate} />}
                  <section className="rounded-2xl border border-line bg-card p-5">
                    <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Copy evaluated</h2>
                    <p className="line-clamp-6 text-sm leading-relaxed text-zinc-300">{key === "original" ? e.copy : e.revisedCopy}</p>
                  </section>
                </div>
                <ReactionMap
                  round={round}
                  selected={selected}
                  onSelect={setSelected}
                  right={hasRevised ? (
                    <div className="flex overflow-hidden rounded-lg border border-line text-xs">
                      {(["original", "revised"] as const).map((k) => (
                        <button key={k} onClick={() => setView(k)} className={`px-3 py-1 ${key === k ? "bg-accent text-white" : "text-zinc-400 hover:text-white"}`}>{k === "original" ? "Original" : "Revised"}</button>
                      ))}
                    </div>
                  ) : null}
                />
              </div>
            </div>
            <PersonaDetailDrawer
              personaId={selected}
              state={selected ? round[selected] : undefined}
              copy={key === "original" ? e.copy : e.revisedCopy}
              onClose={() => setSelected(null)}
              onRetry={(pid) => retryPersona(e.id, key, pid)}
              allowRetry={!e.recordedRun}
            />
          </>
        );
      }}
    </EvalGuard>
  );
}
