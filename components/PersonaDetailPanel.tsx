"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getPersona } from "@/lib/personas";
import type { NodeState } from "@/lib/useFocusGroup";
import { DECISION_STYLE } from "./PersonaNode";

function Highlighted({ copy, phrase }: { copy: string; phrase: string }) {
  const i = phrase ? copy.indexOf(phrase) : -1;
  if (i < 0) return <>{copy}</>;
  return (
    <>
      {copy.slice(0, i)}
      <mark className="trigger">{phrase}</mark>
      {copy.slice(i + phrase.length)}
    </>
  );
}

type Props = {
  personaId: string | null;
  state: NodeState | undefined;
  copy: string;
  onClose: () => void;
  onRetry: (id: string) => void;
  allowRetry?: boolean;
};

export default function PersonaDetailPanel({ personaId, state, copy, onClose, onRetry, allowRetry = true }: Props) {
  const persona = personaId ? getPersona(personaId) : undefined;
  const vote = state?.vote;

  return (
    <AnimatePresence>
      {persona && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-line bg-card p-5 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            role="dialog"
            aria-label={`${persona.name} details`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{persona.emoji} {persona.name}</h2>
                <p className="text-sm text-zinc-400">{persona.age} · {persona.role}</p>
              </div>
              <button onClick={onClose} className="rounded-lg border border-line px-2 py-1 text-sm text-zinc-400 hover:text-white" aria-label="Close">✕</button>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Budget</dt><dd>{persona.budget}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Values</dt><dd>{persona.values.join(" · ")}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Pet peeves</dt><dd>{persona.pet_peeves.join(" · ")}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Profile</dt><dd className="text-zinc-300">{persona.bio}</dd></div>
            </dl>

            <hr className="my-5 border-line" />

            {!vote && <p className="text-sm text-zinc-500">{state?.status === "loading" ? "Evaluating…" : "No evaluation yet."}</p>}

            {vote?.error && (
              <div className="rounded-xl border border-zinc-500/50 bg-zinc-500/10 p-3 text-sm">
                <p className="font-semibold text-zinc-200">Evaluation failed</p>
                <p className="mt-1 text-zinc-400">{vote.message}</p>
                <p className="mt-1 text-xs text-zinc-500">This persona is excluded from the score; it is not counted as a decision.</p>
                {allowRetry && <button onClick={() => onRetry(persona.id)} className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">Retry</button>}
              </div>
            )}

            {vote && !vote.error && (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${DECISION_STYLE[vote.decision]}`}>{vote.decision.toUpperCase()}</span>
                  <span className="text-zinc-300">Purchase likelihood <b>{Math.round(vote.purchase_likelihood * 100)}%</b></span>
                </div>
                <div><div className="text-xs uppercase tracking-wide text-zinc-500">Main objection</div>{vote.top_objection}</div>
                <div><div className="text-xs uppercase tracking-wide text-zinc-500">What would convince me</div>{vote.what_would_convince_me}</div>
                <div><div className="text-xs uppercase tracking-wide text-zinc-500">Reasoning</div>{vote.reasoning}</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Trigger phrase</div>
                  {vote.trigger_phrase ? <q className="text-zinc-200">{vote.trigger_phrase}</q> : <span className="text-zinc-500">None cited</span>}
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Copy evaluated</div>
                  <p className="whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 leading-relaxed text-zinc-300">
                    <Highlighted copy={copy} phrase={vote.trigger_phrase} />
                  </p>
                </div>
                <p className="text-xs text-zinc-500">{vote.model} · {vote.latencyMs} ms</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
