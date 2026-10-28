import type { RankedObjection } from "@/lib/aggregate";
import { getPersona } from "@/lib/personas";

export default function ObjectionList({ objections }: { objections: RankedObjection[] }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Top objections</div>
      {objections.length === 0 ? (
        <p className="text-sm text-zinc-500">Objections appear once personas respond.</p>
      ) : (
        <ol className="space-y-3">
          {objections.map((o, i) => (
            <li key={o.objection} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{i + 1}</span>
              <div className="text-sm">
                <p className="text-zinc-100">{o.objection}</p>
                <p className="text-xs text-zinc-500">
                  {o.count} persona{o.count === 1 ? "" : "s"}: {o.personaIds.map((id) => getPersona(id)?.name ?? id).join(", ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
