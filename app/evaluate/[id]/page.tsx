"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import EvalGuard from "@/components/EvalGuard";
import PageHeader, { btnGhost, btnPrimary } from "@/components/PageHeader";
import PersonaDetailDrawer from "@/components/PersonaDetailPanel";
import PipelineStrip from "@/components/PipelineStrip";
import ReactionMap from "@/components/ReactionMap";
import ScoreGauge from "@/components/ScoreGauge";
import { useEvaluations, type RoundKey } from "@/lib/evaluations";

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
                </>
              }
            />
            <div className="space-y-5">
              <PipelineStrip active={e.active} completed={e.completed} />
              {e.error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{e.error}</p>}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-5">
                  <ScoreGauge agg={agg} />
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
            />
          </>
        );
      }}
    </EvalGuard>
  );
}
