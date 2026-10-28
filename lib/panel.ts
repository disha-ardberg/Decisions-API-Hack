import { aggregate } from "./aggregate";
import { PERSONAS } from "./personas";
import { runWithConcurrency } from "./pool";
import type { VoteResult } from "./schemas";
import { evaluatePersona } from "./vote";

/** Server-side: evaluate all personas with concurrency 5. Used by /api/decide. */
export async function runPanel(copy: string): Promise<VoteResult[]> {
  const settled = await runWithConcurrency(
    PERSONAS.map((p) => () => evaluatePersona(copy, p, { isRetry: true })),
    5,
  );
  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          error: true as const,
          personaId: PERSONAS[i].id,
          model: "",
          latencyMs: 0,
          message: r.reason instanceof Error ? r.reason.message : "Evaluation failed.",
        },
  );
}

export function summarize(votes: VoteResult[]) {
  const a = aggregate(votes);
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
