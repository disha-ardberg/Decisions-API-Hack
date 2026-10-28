"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import sampleRun from "@/data/recorded/sample.json";
import { useEvaluations } from "@/lib/evaluations";

export default function LoadRecordedButton({ className, label = "Load recorded run" }: { className: string; label?: string }) {
  const router = useRouter();
  const { busy, loadRecordedRun } = useEvaluations();
  const [error, setError] = useState<string | null>(null);

  function load() {
    const result = loadRecordedRun(sampleRun);
    if ("error" in result) setError(result.error);
    else router.push(`/evaluate/${result.id}`);
  }

  return (
    <>
      <button type="button" onClick={load} disabled={busy} className={className}>{label}</button>
      {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
    </>
  );
}
