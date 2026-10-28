"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CopyInput from "@/components/CopyInput";
import PageHeader from "@/components/PageHeader";
import PipelineStrip from "@/components/PipelineStrip";
import { useEvaluations } from "@/lib/evaluations";
import { validateCopy } from "@/lib/schemas";

export default function NewEvaluation() {
  const router = useRouter();
  const { start, busy } = useEvaluations();
  const [copy, setCopy] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run() {
    const res = start(copy);
    if ("error" in res) setError(res.error);
    else router.push(`/evaluate/${res.id}`);
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Overview", href: "/" }, { label: "New evaluation" }]}
        title="New evaluation"
        subtitle="Paste your marketing copy (20 to 3,000 characters). All 10 personas will evaluate it independently."
      />
      <div className="space-y-5">
        <CopyInput copy={copy} onChange={(v) => { setCopy(v); setError(null); }} onRun={run} busy={busy} serverError={error} />
        <PipelineStrip active={null} completed={!validateCopy(copy) ? 1 : 0} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Independent reactions", "Each persona sees only the copy and its own profile, never the other personas' answers."],
            ["Honest scoring", "The conversion score is the mean purchase likelihood of personas that responded. Failed personas are excluded, never counted as zero."],
            ["Simulated, not predicted", "Results reflect synthetic personas and are not a real-world conversion prediction."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-line bg-card p-5"><h3 className="font-medium">{t}</h3><p className="mt-1 text-sm text-zinc-400">{d}</p></div>
          ))}
        </div>
      </div>
    </>
  );
}
