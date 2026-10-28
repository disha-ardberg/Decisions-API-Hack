import { chatJson, describeError, extractJson, isMockMode, requireModel } from "./client";
import { mockRewrite } from "./mock";
import { rewriteSystemPrompt, rewriteUserPrompt } from "./prompts";
import { RewriteSchema, type ObjectionInput, type Rewrite } from "./schemas";

/** Keep only changes whose before/after can be located verbatim; the rest are ignored, not fatal. */
export function filterChanges(copy: string, rewrite: Rewrite): Rewrite {
  return {
    revised_copy: rewrite.revised_copy,
    changes_made: rewrite.changes_made.filter(
      (c) =>
        c.before.length > 0 &&
        c.after.length > 0 &&
        copy.includes(c.before) &&
        rewrite.revised_copy.includes(c.after),
    ),
  };
}

export class RewriteError extends Error {}

/** Rewrite via MODEL_C (or the mock). Throws RewriteError with a readable message on failure. */
export async function rewriteCopy(copy: string, objections: ObjectionInput[]): Promise<Rewrite> {
  if (isMockMode()) return filterChanges(copy, await mockRewrite(copy, objections));

  let model: string;
  try {
    model = requireModel("MODEL_C");
  } catch (err) {
    throw new RewriteError(describeError(err));
  }

  let note: string | undefined;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chatJson(model, rewriteSystemPrompt(), rewriteUserPrompt(copy, objections, note));
      const parsed = RewriteSchema.parse(extractJson(raw));
      const ratio = parsed.revised_copy.length / copy.length;
      if ((ratio < 0.8 || ratio > 1.2) && attempt === 0) {
        note = `Your previous revision was ${Math.round(ratio * 100)}% of the original length. Keep it within 80-120%.`;
        continue;
      }
      return filterChanges(copy, parsed);
    } catch (err) {
      lastError = err instanceof Error && err.name === "ZodError" ? "Model returned an invalid rewrite." : describeError(err);
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) break;
    }
  }
  throw new RewriteError(lastError || "Rewrite failed.");
}
