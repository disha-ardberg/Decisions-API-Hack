"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ComparisonCard from "@/components/ComparisonCard";
import DecisionShift from "@/components/DecisionShift";
import EvalGuard from "@/components/EvalGuard";
import ObjectionList from "@/components/ObjectionList";
import PageHeader, { btnGhost } from "@/components/PageHeader";
import PipelineStrip from "@/components/PipelineStrip";
import RedlineView from "@/components/RedlineView";
import { useEvaluations } from "@/lib/evaluations";

export default function RewritePage() {
  const { id } = useParams<{ id: string }>();
  const { fixObjections, busy } = useEvaluations();

  return (
    <EvalGuard id={id}>
      {({ evaluation: e, originalAgg, revisedAgg }) => {
        const hasRevised = e.completed >= 4 && !!e.rewrite;
        const revoteDone = e.completed >= 5;
        const canFix = e.completed >= 3 && !busy && !hasRevised && originalAgg.top_objections.length > 0;

        return (
          <>
            <PageHeader
              crumbs={[{ label: "Overview", href: "/" }, { label: `Evaluation #${e.id}`, href: `/evaluate/${e.id}` }, { label: "Rewrite studio" }]}
              title="Rewrite studio"
              subtitle="Rewrite your copy against the top objections, then compare the original and revised panels."
              actions={<Link href={`/insights/${e.id}`} className={btnGhost}>← Insights</Link>}
            />
            <div className="space-y-5">
              <PipelineStrip active={e.active} completed={e.completed} />
              {e.error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{e.error} You can try again.</p>}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ComparisonCard original={originalAgg} revised={revisedAgg} hasRevised={hasRevised} revoteDone={revoteDone} rewriting={e.active === 3} canFix={canFix} onFix={() => fixObjections(e.id)} />
                <ObjectionList objections={originalAgg.top_objections} total={originalAgg.successful} />
              </div>

              {hasRevised && e.rewrite ? (
                <>
                  {revoteDone && revisedAgg.score !== null && originalAgg.score !== null && revisedAgg.score < originalAgg.score && (
                    <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">The revised copy scored lower than the original. The result is shown as measured.</p>
                  )}
                  <RedlineView original={e.copy} rewrite={e.rewrite} />
                  <DecisionShift original={e.original} revised={e.revised} />
                </>
              ) : (
                <section className="rounded-2xl border border-line bg-card p-5">
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Original copy</h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{e.copy}</p>
                </section>
              )}
            </div>
          </>
        );
      }}
    </EvalGuard>
  );
}
