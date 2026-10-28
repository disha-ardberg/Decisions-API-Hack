import type { Aggregate } from "@/lib/aggregate";
import { getPersona } from "@/lib/personas";
import { isOk, type VoteResult } from "@/lib/schemas";
import { Avatar } from "./PersonaNode";

const BAR = { buy: "bg-emerald-400", maybe: "bg-amber-400", pass: "bg-red-400" } as const;
const card = "rounded-2xl border border-line bg-card p-5";

/** Every persona's purchase likelihood, highest first. */
export function LikelihoodBars({ votes }: { votes: VoteResult[] }) {
  const ok = votes.filter(isOk).sort((a, b) => b.purchase_likelihood - a.purchase_likelihood);
  const failed = votes.length - ok.length;
  return (
    <section className={card}>
      <h2 className="mb-4 font-semibold">Purchase likelihood by persona</h2>
      {ok.length === 0 ? <p className="text-sm text-zinc-500">No successful evaluations.</p> : (
        <ul className="space-y-2.5">
          {ok.map((v) => {
            const p = getPersona(v.personaId);
            const pct = Math.round(v.purchase_likelihood * 100);
            return (
              <li key={v.personaId} className="flex items-center gap-3 text-sm">
                {p && <Avatar persona={p} size={28} />}
                <span className="w-40 shrink-0 truncate text-zinc-300" title={p?.name}>{p?.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${BAR[v.decision]}`} style={{ width: `${pct}%` }} /></div>
                <span className="w-10 text-right font-semibold tabular-nums">{pct}%</span>
              </li>
            );
          })}
        </ul>
      )}
      {failed > 0 && <p className="mt-3 text-xs text-zinc-500">{failed} failed persona{failed === 1 ? "" : "s"} not shown and excluded from the score.</p>}
    </section>
  );
}

/** Per-model average likelihood and the spread that drives the "contested" flag. */
export function ModelBreakdown({ agg }: { agg: Aggregate }) {
  const md = agg.model_disagreement;
  const rows = Object.entries(md.modelAverages).sort((a, b) => b[1] - a[1]);
  return (
    <section className={card}>
      <h2 className="mb-1 font-semibold">Model disagreement</h2>
      <p className="mb-4 text-xs text-zinc-500">Average purchase likelihood per model. A spread above 25 points marks the result as contested.</p>
      {rows.length === 0 ? <p className="text-sm text-zinc-500">No data yet.</p> : (
        <ul className="space-y-2.5">
          {rows.map(([model, avg]) => (
            <li key={model} className="text-sm">
              <div className="mb-1 flex justify-between"><span className="text-zinc-300">{model}</span><b className="tabular-nums">{Math.round(avg * 100)}%</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-accent to-indigo-400" style={{ width: `${avg * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
      <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${md.contested ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-line bg-bg/50 text-zinc-300"}`}>
        Spread <b>{Math.round(md.spread * 100)} pts</b> · {md.contested ? "Contested" : "Models broadly agree"}
      </div>
    </section>
  );
}

/** Which personas raised each top objection. */
export function ObjectionsByPersona({ agg }: { agg: Aggregate }) {
  return (
    <section className={card}>
      <h2 className="mb-4 font-semibold">Objections by persona</h2>
      {agg.top_objections.length === 0 ? <p className="text-sm text-zinc-500">No objections yet.</p> : (
        <div className="space-y-4">
          {agg.top_objections.map((o, i) => (
            <div key={o.objection}>
              <p className="mb-2 text-sm text-zinc-200"><b className="mr-2 text-accent">{i + 1}</b>{o.objection}</p>
              <div className="flex flex-wrap gap-2">
                {o.personaIds.map((id) => {
                  const p = getPersona(id);
                  return p ? (
                    <span key={id} className="flex items-center gap-1.5 rounded-full border border-line bg-card2 py-0.5 pl-1 pr-3 text-xs text-zinc-300"><Avatar persona={p} size={20} />{p.name}</span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
