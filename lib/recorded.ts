import { z } from "zod";
import { aggregate } from "./aggregate";
import { evaluate } from "./gate";
import { PersonaVoteSchema, RewriteSchema, type VoteResult } from "./schemas";

const VoteOkSchema = PersonaVoteSchema.extend({
  personaId: z.string(),
  model: z.string(),
  latencyMs: z.number().nonnegative(),
  error: z.literal(false).optional(),
  rateLimited: z.boolean().optional(),
});
const VoteErrorSchema = z.object({
  error: z.literal(true),
  personaId: z.string(),
  model: z.string(),
  latencyMs: z.number().nonnegative(),
  message: z.string(),
  rateLimited: z.boolean().optional(),
});
const VoteResultSchema = z.union([VoteOkSchema, VoteErrorSchema]);

const RecordedRoundSchema = z.object({
  copy: z.string().min(20),
  votes: z.array(VoteResultSchema).length(10),
  score: z.number().min(0).max(100).nullable(),
  split: z.object({ buy: z.number().int().nonnegative(), maybe: z.number().int().nonnegative(), pass: z.number().int().nonnegative() }),
  top_objections: z.array(z.object({ objection: z.string(), count: z.number().int().nonnegative(), personaIds: z.array(z.string()) })),
  verdict: z.enum(["ship", "revise", "kill"]),
  rules: z.array(z.object({
    id: z.enum(["min_score", "max_objection_share", "min_custom_score", "min_responded_share"]),
    label: z.string(),
    passed: z.boolean(),
    actual: z.number().nullable(),
    threshold: z.number(),
  })),
  flip_hint: z.string(),
  responded: z.string(),
}).strict();

export const RecordedRunSchema = z.object({
  schema_version: z.literal(1),
  source: z.enum(["mock", "live"]),
  recorded_at: z.iso.datetime(),
  original: RecordedRoundSchema,
  rewrite: RewriteSchema.optional(),
  revised: RecordedRoundSchema.optional(),
}).strict().superRefine((run, ctx) => {
  if (Boolean(run.rewrite) !== Boolean(run.revised)) {
    ctx.addIssue({ code: "custom", message: "A revised round requires a rewrite, and vice versa." });
  }
  if (run.rewrite && run.revised && run.rewrite.revised_copy !== run.revised.copy) {
    ctx.addIssue({ code: "custom", message: "Revised copy must match the rewrite." });
  }
});

export type RecordedRun = z.infer<typeof RecordedRunSchema>;

export function makeRecordedRound(copy: string, votes: VoteResult[]) {
  const result = aggregate(votes, votes.length);
  const gate = evaluate({ score: result.score, votes, top_objections: result.top_objections });
  return {
    copy,
    votes,
    score: result.score,
    split: result.split,
    top_objections: result.top_objections,
    ...gate,
  };
}
