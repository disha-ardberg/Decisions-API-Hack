"use client";

import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";
import type { NodeState } from "@/lib/useFocusGroup";

export const DECISION_STYLE = {
  buy: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
  maybe: "border-amber-500/60 bg-amber-500/10 text-amber-300",
  pass: "border-red-500/60 bg-red-500/10 text-red-300",
} as const;

export default function PersonaNode({ persona, state, onClick }: { persona: Persona; state: NodeState; onClick: () => void }) {
  const vote = state.vote;
  let tone = "border-line bg-card text-zinc-400";
  let badge = "Waiting";
  if (state.status === "loading") {
    tone = "animate-pulse border-accent/60 bg-accent/10 text-zinc-300";
    badge = "Thinking…";
  } else if (vote && !vote.error) {
    tone = DECISION_STYLE[vote.decision];
    badge = `${vote.decision.toUpperCase()} · ${Math.round(vote.purchase_likelihood * 100)}%`;
  } else if (state.status === "error") {
    tone = "border-zinc-500/60 bg-zinc-500/10 text-zinc-300";
    badge = "Failed · retry";
  }
  const modelLabel = vote?.model || persona.model;

  return (
    <motion.button
      layout
      initial={{ opacity: 0.6, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      key={state.status}
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-1 rounded-2xl border p-3 text-left transition hover:brightness-125 ${tone}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>{persona.emoji}</span>
        <span className="text-sm font-semibold leading-tight text-zinc-100">{persona.name}</span>
      </div>
      <span className="text-xs text-zinc-500">{persona.role}</span>
      <span className="mt-1 text-sm font-semibold">{badge}</span>
      <span className="truncate text-[11px] text-zinc-500" title={modelLabel}>{modelLabel}</span>
    </motion.button>
  );
}
