"use client";

import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";
import type { NodeState } from "@/lib/evaluations";

export const DECISION_STYLE = {
  buy: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  maybe: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  pass: "border-red-500/50 bg-red-500/10 text-red-300",
} as const;

const CARD_TONE = {
  buy: "border-emerald-500/40 bg-emerald-500/[0.06]",
  maybe: "border-amber-500/40 bg-amber-500/[0.06]",
  pass: "border-red-500/40 bg-red-500/[0.06]",
} as const;

export function Avatar({ persona, size = 40 }: { persona: Persona; size?: number }) {
  const idx = Number(persona.id.length) * 37 + persona.age * 7;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.5, background: `linear-gradient(135deg, hsl(${idx % 360} 45% 32%), hsl(${(idx + 50) % 360} 40% 20%))` }}
      aria-hidden
    >
      {persona.emoji}
    </span>
  );
}

export function statusOf(state: NodeState) {
  const vote = state.vote;
  if (state.status === "loading") return { label: "Evaluating…", tone: "border-accent/50 bg-accent/[0.06] animate-pulse", pill: "border-accent/40 bg-accent/15 text-indigo-200", pct: null };
  if (vote && !vote.error) return { label: vote.decision[0].toUpperCase() + vote.decision.slice(1), tone: CARD_TONE[vote.decision], pill: DECISION_STYLE[vote.decision], pct: Math.round(vote.purchase_likelihood * 100) };
  if (state.status === "error") return { label: "Failed · Retry", tone: "border-zinc-500/50 bg-zinc-500/[0.07]", pill: "border-zinc-500/50 bg-zinc-500/15 text-zinc-300", pct: null };
  return { label: "Waiting", tone: "border-line bg-card", pill: "border-line text-zinc-500", pct: null };
}

type Props = { persona: Persona; state: NodeState; selected: boolean; onClick: () => void; list?: boolean };

export default function PersonaNode({ persona, state, selected, onClick, list }: Props) {
  const s = statusOf(state);
  const model = state.vote?.model || persona.model.replace("MODEL_", "Model ");

  const pill = <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}>{s.label}</span>;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      key={state.status}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-3.5 text-left transition hover:brightness-125 ${s.tone} ${selected ? "ring-2 ring-accent" : ""} ${list ? "flex items-center gap-4" : "flex flex-col gap-3"}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar persona={persona} />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight text-zinc-100">{persona.name}</div>
          <div className={`text-xs leading-snug text-zinc-400 ${list ? "" : "line-clamp-2"}`}>{persona.role} · {persona.age}</div>
        </div>
      </div>
      <div className={`flex items-center justify-between gap-2 ${list ? "w-72" : ""}`}>
        {pill}
        <span className="text-base font-semibold tabular-nums text-zinc-100">{s.pct !== null ? `${s.pct}%` : ""}</span>
      </div>
      <div className={`text-right text-xs text-zinc-500 ${list ? "w-28" : ""} truncate`} title={model}>{model}</div>
    </motion.button>
  );
}
