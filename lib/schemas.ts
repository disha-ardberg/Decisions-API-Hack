import { z } from "zod";

export const COPY_MIN = 20;
export const COPY_MAX = 3000;

export const DecisionSchema = z.enum(["buy", "maybe", "pass"]);
export type Decision = z.infer<typeof DecisionSchema>;

function sentenceCount(text: string): number {
  return text.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim().length > 0).length;
}

export const PersonaVoteSchema = z.object({
  decision: DecisionSchema,
  purchase_likelihood: z.number().min(0).max(1),
  top_objection: z.string().min(1),
  // Verified against the submitted copy in vote.ts (needs the copy, so not checkable here).
  trigger_phrase: z.string(),
  what_would_convince_me: z.string().min(1),
  reasoning: z
    .string()
    .min(1)
    .refine((s) => sentenceCount(s) <= 2, "reasoning must be at most two sentences"),
});
export type PersonaVote = z.infer<typeof PersonaVoteSchema>;

export type VoteOk = PersonaVote & {
  personaId: string;
  model: string;
  latencyMs: number;
  error?: false;
  rateLimited?: boolean;
};

export type VoteError = {
  error: true;
  personaId: string;
  model: string;
  latencyMs: number;
  message: string;
  rateLimited?: boolean;
};

export type VoteResult = VoteOk | VoteError;

export const isOk = (v: VoteResult): v is VoteOk => !v.error;

export const ChangeSchema = z.object({
  before: z.string(),
  after: z.string(),
  objection_addressed: z.string(),
});

export const RewriteSchema = z.object({
  revised_copy: z.string().min(1),
  changes_made: z.array(ChangeSchema),
});
export type Rewrite = z.infer<typeof RewriteSchema>;
export type Change = z.infer<typeof ChangeSchema>;

export const ObjectionInputSchema = z.object({
  objection: z.string().min(1),
  count: z.number().int().min(1),
});
export type ObjectionInput = z.infer<typeof ObjectionInputSchema>;

export function validateCopy(copy: unknown): string | null {
  if (typeof copy !== "string" || copy.trim().length === 0) return "Marketing copy is required.";
  const n = copy.trim().length;
  if (n < COPY_MIN) return `Marketing copy must be at least ${COPY_MIN} characters (got ${n}).`;
  if (n > COPY_MAX) return `Marketing copy must be at most ${COPY_MAX} characters (got ${n}).`;
  return null;
}

export const VoteRequestSchema = z.object({
  copy: z.string(),
  personaId: z.string(),
  retry: z.boolean().optional(),
});

export const RewriteRequestSchema = z.object({
  copy: z.string(),
  objections: z.array(ObjectionInputSchema).min(1, "At least one objection is required."),
});

export const DecideRequestSchema = z.object({
  copy: z.string(),
  rewrite: z.boolean().optional(),
});
