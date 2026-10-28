import type { RankedObjection } from "@/lib/aggregate";
import { getPersona } from "@/lib/personas";

export default function ObjectionList({ objections, total }: { objections: RankedObjection[]; total: number }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 font-semibold">Top Objections</h2>
      {objections.length === 0 ? (
        <p className="text-sm text-zinc-500">Objections appear once personas respond.</p>
      ) : (
        <ol className="space-y-4">
          {objections.map((o, i) => {
            const pct = total ? Math.round((o.count / total) * 100) : 0;
            const names = o.personaIds.map((id) => getPersona(id)?.name ?? id).join(", ");
            return (
              <li key={o.objection}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 gap-2"><b className="text-accent">{i + 1}</b><span className="text-zinc-100">{o.objection}</span></span>
                  <span className="shrink-0 text-xs text-zinc-400">{o.count} persona{o.count === 1 ? "" : "s"} · {pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-indigo-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{names}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
