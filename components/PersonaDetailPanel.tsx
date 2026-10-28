"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getPersona } from "@/lib/personas";
import type { NodeState } from "@/lib/evaluations";
import { Ring } from "./ScoreGauge";
import { Avatar, DECISION_STYLE } from "./PersonaNode";

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
  profileOpen?: boolean;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{children}</div>
);

export function PersonaDetailBody({ personaId, state, copy, onClose, onRetry, profileOpen }: Props) {
  const persona = personaId ? getPersona(personaId) : undefined;
  const vote = state?.vote;

  if (!persona) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 text-center text-sm text-zinc-500">
        <span className="text-2xl" aria-hidden>👆</span>
        Select a persona to see their full reasoning.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-3">
        <Avatar persona={persona} size={52} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-zinc-100">{persona.name}</div>
          <div className="text-xs text-zinc-400">{persona.role} · {persona.age}</div>
        </div>
        {vote && !vote.error && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DECISION_STYLE[vote.decision]}`}>
            {vote.decision[0].toUpperCase() + vote.decision.slice(1)}
          </span>
        )}
        <button onClick={onClose} className="rounded-md px-1.5 text-zinc-500 hover:text-white" aria-label="Close details">✕</button>
      </div>

      {!vote && <p className="text-zinc-500">{state?.status === "loading" ? "Evaluating…" : "No evaluation yet."}</p>}

      {vote?.error && (
        <div className="rounded-xl border border-zinc-500/50 bg-zinc-500/10 p-3">
          <p className="font-semibold text-zinc-200">Evaluation failed</p>
          <p className="mt-1 text-zinc-400">{vote.message}</p>
          <p className="mt-1 text-xs text-zinc-500">Excluded from the score; not counted as a decision.</p>
          <button onClick={() => onRetry(persona.id)} className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">Retry</button>
        </div>
      )}

      {vote && !vote.error && (
        <>
          <div className="flex items-center gap-4 rounded-xl border border-line bg-bg/50 p-3">
            <Ring value={Math.round(vote.purchase_likelihood * 100)} size={64} stroke={7} small />
            <div className="flex-1 font-medium text-zinc-200">Purchase likelihood</div>
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-xs text-indigo-200" title={`${vote.latencyMs} ms`}>{vote.model}</span>
          </div>
          <div><Label>Top objection</Label><p className="text-zinc-200">{vote.top_objection}</p></div>
          <div>
            <Label>Trigger phrase</Label>
            {vote.trigger_phrase ? <q className="text-zinc-200">{vote.trigger_phrase}</q> : <span className="text-zinc-500">None cited</span>}
          </div>
          <div><Label>What would convince me</Label><p className="text-zinc-200">{vote.what_would_convince_me}</p></div>
          <div><Label>Reasoning</Label><p className="text-zinc-300">{vote.reasoning}</p></div>
          <div>
            <Label>Copy evaluated</Label>
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 text-xs leading-relaxed text-zinc-300">
              <Highlighted copy={copy} phrase={vote.trigger_phrase} />
            </p>
          </div>
        </>
      )}

      <details open={profileOpen} className="rounded-xl border border-line p-3 text-xs text-zinc-400">
        <summary className="cursor-pointer text-zinc-300">Full persona profile</summary>
        <dl className="mt-2 space-y-2">
          <div><dt className="text-zinc-500">Budget</dt><dd>{persona.budget}</dd></div>
          <div><dt className="text-zinc-500">Values</dt><dd>{persona.values.join(" · ")}</dd></div>
          <div><dt className="text-zinc-500">Pet peeves</dt><dd>{persona.pet_peeves.join(" · ")}</dd></div>
          <div><dt className="text-zinc-500">About</dt><dd>{persona.bio}</dd></div>
        </dl>
      </details>
    </div>
  );
}

/** Slide-over detail panel used wherever a persona is selected. */
export default function PersonaDetailDrawer(props: Props) {
  return (
    <AnimatePresence>
      {props.personaId && (
        <div>
          <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={props.onClose} />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-line bg-card p-5 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            role="dialog"
            aria-label="Persona details"
          >
            <PersonaDetailBody {...props} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
