import type { GateEvaluation, GateRule } from "@/lib/gate";

const VERDICT_STYLE = {
  ship: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
  revise: "border-amber-500/60 bg-amber-500/15 text-amber-300",
  kill: "border-red-500/60 bg-red-500/15 text-red-300",
} as const;

function measure(rule: GateRule, value: number | null): string {
  if (value === null) return "unavailable";
  if (rule.id === "max_objection_share" || rule.id === "min_responded_share") return `${Math.round(value * 100)}%`;
  return `${Math.round(value)} points`;
}

function comparison(rule: GateRule): string {
  const operator = rule.id === "max_objection_share" ? "≤" : "≥";
  return `${measure(rule, rule.actual)} ${operator} ${measure(rule, rule.threshold)}`;
}

export default function VerdictCard({ result, title = "Launch Gate" }: { result: GateEvaluation; title?: string }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5" aria-label={title}>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      <div className={`inline-flex rounded-xl border px-4 py-2 text-2xl font-black tracking-wide ${VERDICT_STYLE[result.verdict]}`}>
        {result.verdict.toUpperCase()}
      </div>
      <p className="mt-3 text-sm text-zinc-300">{result.responded} judges responded</p>
      <ul className="mt-4 space-y-2" aria-label="Launch Gate rules">
        {result.rules.map((rule) => (
          <li key={rule.id} className="flex gap-2 text-sm">
            <span className={rule.passed ? "text-emerald-400" : "text-red-400"} aria-label={rule.passed ? "Passed" : "Failed"}>
              {rule.passed ? "✓" : "✕"}
            </span>
            <span className="min-w-0">
              <span className="text-zinc-200">{rule.label}</span>
              <span className="block text-xs text-zinc-400">{comparison(rule)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-zinc-300">
        {result.flip_hint || "All gate rules pass."}
      </p>
      <p className="mt-3 text-xs text-zinc-500">Simulated personas, not a real-market prediction</p>
    </section>
  );
}
