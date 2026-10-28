import { PERSONAS } from "@/lib/personas";
import type { Round } from "@/lib/evaluations";
import { Avatar, DECISION_STYLE } from "./PersonaNode";

function Pill({ state }: { state: Round[string] }) {
  const v = state.vote;
  if (!v || v.error) return <span className="rounded-full border border-zinc-500/50 px-2.5 py-0.5 text-xs text-zinc-400">{state.status === "loading" ? "Evaluating…" : "Failed"}</span>;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DECISION_STYLE[v.decision]}`}>
      {v.decision[0].toUpperCase() + v.decision.slice(1)} · {Math.round(v.purchase_likelihood * 100)}%
    </span>
  );
}

/** How each persona's reaction moved between the original and revised copy. */
export default function DecisionShift({ original, revised }: { original: Round; revised: Round }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 font-semibold">New persona decisions</h2>
      <ul className="divide-y divide-line">
        {PERSONAS.map((p) => {
          const o = original[p.id].vote, r = revised[p.id].vote;
          const delta = o && r && !o.error && !r.error ? Math.round((r.purchase_likelihood - o.purchase_likelihood) * 100) : null;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <Avatar persona={p} size={30} />
              <span className="min-w-36 flex-1 text-zinc-200">{p.name}</span>
              <Pill state={original[p.id]} />
              <span className="text-zinc-600" aria-hidden>→</span>
              <Pill state={revised[p.id]} />
              <span className={`w-14 text-right text-xs font-semibold tabular-nums ${delta === null ? "text-zinc-600" : delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-400"}`}>
                {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta} pts`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
