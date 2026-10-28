import { aggregate } from "./aggregate";
import { PERSONAS, type Persona } from "./personas";
import { getMaxConcurrency, runWithConcurrency } from "./pool";
import type { VoteResult } from "./schemas";
import { evaluatePersona } from "./vote";

/** Server-side: evaluate the supplied personas with configured concurrency. */
export async function runPanel(copy: string, personas: Persona[] = PERSONAS, audience?: string): Promise<VoteResult[]> {
  const settled = await runWithConcurrency(
    personas.map((p) => (control) => evaluatePersona(copy, p, { isRetry: true, audience, onRateLimit: control.rateLimited })),
    getMaxConcurrency(),
  );
  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          error: true as const,
          personaId: personas[i].id,
          model: "",
          latencyMs: 0,
          message: r.reason instanceof Error ? r.reason.message : "Evaluation failed.",
        },
  );
}

export function summarize(votes: VoteResult[], expected = votes.length) {
  const a = aggregate(votes, expected);
  return {
    score: a.score,
    split: a.split,
    votes,
    top_objections: a.top_objections,
    model_disagreement: { spread: a.model_disagreement.spread, contested: a.model_disagreement.contested },
    successful: a.successful,
    expected: a.expected,
  };
}
