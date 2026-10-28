import type { Aggregate } from "@/lib/aggregate";

export default function DistributionCard({ agg, title }: { agg: Aggregate; title: string }) {
  const total = agg.successful;
  const R = 52;
  const C = 2 * Math.PI * R;
  const segs = [
    { label: "Buy", n: agg.split.buy, color: "#34d399" },
    { label: "Maybe", n: agg.split.maybe, color: "#fbbf24" },
    { label: "Pass", n: agg.split.pass, color: "#f87171" },
  ];
  let offset = 0;
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#1e2236" strokeWidth="14" />
            {total > 0 &&
              segs.map((s) => {
                const len = (s.n / total) * C;
                const el = s.n > 0 ? (
                  <circle key={s.label} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-offset} style={{ transition: "all .5s" }} />
                ) : null;
                offset += len;
                return el;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{total}</span>
            <span className="text-xs text-zinc-400">evaluated</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 text-sm">
          {segs.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
              <span className="tabular-nums text-zinc-300"><b className="mr-3 text-zinc-100">{s.n}</b>{total ? Math.round((s.n / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
