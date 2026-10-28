"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DistributionCard from "@/components/DistributionCard";
import EvalGuard from "@/components/EvalGuard";
import InsightsCard from "@/components/InsightsCard";
import { LikelihoodBars, ModelBreakdown, ObjectionsByPersona } from "@/components/InsightPanels";
import ObjectionList from "@/components/ObjectionList";
import PageHeader, { btnGhost, btnPrimary } from "@/components/PageHeader";
import ScoreGauge from "@/components/ScoreGauge";
import { roundVotes, type RoundKey } from "@/lib/evaluations";
import { deriveInsights } from "@/lib/insights";

export default function InsightsPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<RoundKey>("original");

  return (
    <EvalGuard id={id}>
      {({ evaluation: e, originalAgg, revisedAgg }) => {
        const hasRevised = e.completed >= 5;
        const key: RoundKey = hasRevised ? view : "original";
        const agg = key === "original" ? originalAgg : revisedAgg;
        const votes = roundVotes(e[key]);
        const insights = deriveInsights(votes, agg);

        return (
          <>
            <PageHeader
              crumbs={[{ label: "Overview", href: "/" }, { label: `Evaluation #${e.id}`, href: `/evaluate/${e.id}` }, { label: "Insights" }]}
              title="Evaluation insights"
              subtitle="Where the score comes from, what blocks conversion and how much the models agree."
              actions={
                <>
                  {hasRevised && (
                    <div className="flex overflow-hidden rounded-lg border border-line text-sm">
                      {(["original", "revised"] as const).map((k) => (
                        <button key={k} onClick={() => setView(k)} className={`px-3 py-2 ${key === k ? "bg-accent text-white" : "text-zinc-400 hover:text-white"}`}>{k === "original" ? "Original" : "Revised"}</button>
                      ))}
                    </div>
                  )}
                  <Link href={`/evaluate/${e.id}`} className={btnGhost}>← Results</Link>
                  <Link href={`/rewrite/${e.id}`} className={btnPrimary}>Rewrite studio →</Link>
                </>
              }
            />
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ScoreGauge agg={agg} />
                <DistributionCard agg={agg} title="Decision distribution" />
                <ModelBreakdown agg={agg} />
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ObjectionList objections={agg.top_objections} total={agg.successful} />
                <ObjectionsByPersona agg={agg} />
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
                <LikelihoodBars votes={votes} />
                <InsightsCard insights={insights} />
              </div>
            </div>
          </>
        );
      }}
    </EvalGuard>
  );
}
