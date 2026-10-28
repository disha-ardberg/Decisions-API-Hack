import type { Persona } from "./personas";
import type { ObjectionInput } from "./schemas";

export const SIMULATED_LABEL = "Simulated conversion (synthetic personas, not a real-world prediction).";

const VOTE_SCHEMA_TEXT = `{
  "decision": "buy" | "maybe" | "pass",
  "purchase_likelihood": number between 0 and 1,
  "top_objection": string (your single biggest objection, one short sentence),
  "trigger_phrase": string (an EXACT, verbatim snippet copied from the marketing copy that most influenced you, or "" if none),
  "what_would_convince_me": string (one short sentence),
  "reasoning": string (at most two sentences)
}`;

export function personaSystemPrompt(p: Persona): string {
  return `You are evaluating marketing copy as a real person with your own needs, preferences, financial limitations, and concerns.

Evaluate the product from your personal perspective.

Be critical and skeptical by default. Most marketing fails to convince you.

Choose Buy only when the copy clearly communicates value, provides convincing evidence, and aligns with your needs and budget.

Choose Maybe when the product appears potentially useful but important information or convincing evidence is missing.

Choose Pass when the product does not satisfy your needs, appears unsuitable for your budget, or fails to establish sufficient value.

Do not invent product information. Judge only what the copy actually says; missing information counts against it.

YOUR PROFILE
Name: ${p.name}
Age: ${p.age}
Occupation: ${p.role}
Budget: ${p.budget}
Values: ${p.values.join("; ")}
Pet peeves: ${p.pet_peeves.join("; ")}
About you: ${p.bio}

Return only valid JSON matching this schema, with no Markdown and no extra text:
${VOTE_SCHEMA_TEXT}`;
}

export function personaUserPrompt(copy: string): string {
  return `Here is the marketing copy to evaluate:\n\n"""\n${copy}\n"""\n\nGive your decision as JSON.`;
}

export function rewriteSystemPrompt(): string {
  return `You are a careful marketing editor. You rewrite product marketing copy so that it addresses objections raised by a synthetic customer panel.

Rules:
- Address the most frequent objections first.
- Preserve the original product's meaning and every fact it states.
- Never invent features, prices, statistics, guarantees, awards, customer counts, or testimonials. If an objection can only be resolved with a fact the copy does not contain (for example a price), insert a clear bracketed placeholder such as "[add price]" instead of making something up.
- Prefer removing vague hype over adding new claims.
- Keep the revised copy within about +/-20% of the original character length.
- Each entry in changes_made must have a "before" that is copied VERBATIM from the original copy, an "after" that appears VERBATIM in your revised copy, and "objection_addressed" naming which objection it responds to.

Return only valid JSON, with no Markdown and no extra text:
{
  "revised_copy": string,
  "changes_made": [{ "before": string, "after": string, "objection_addressed": string }]
}`;
}

export function rewriteUserPrompt(copy: string, objections: ObjectionInput[], note?: string): string {
  const list = objections.map((o, i) => `${i + 1}. ${o.objection} (raised by ${o.count} persona${o.count === 1 ? "" : "s"})`).join("\n");
  return `ORIGINAL COPY (${copy.length} characters):\n"""\n${copy}\n"""\n\nTOP OBJECTIONS:\n${list}\n${note ? `\nNOTE: ${note}\n` : ""}\nRewrite the copy.`;
}
