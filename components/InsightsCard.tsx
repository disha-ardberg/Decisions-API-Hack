import type { Insight } from "@/lib/insights";

const DOT = { good: "bg-emerald-400", warn: "bg-amber-400", bad: "bg-red-400", info: "bg-indigo-400" } as const;

export default function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-3 font-semibold">Key Insights</h2>
      {insights.length === 0 ? (
        <p className="text-sm text-zinc-500">Insights are derived from the personas&apos; actual responses once they arrive.</p>
      ) : (
        <ul className="space-y-2.5 text-sm text-zinc-300">
          {insights.map((i, n) => (
            <li key={n} className="flex gap-2.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[i.tone]}`} />{i.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
