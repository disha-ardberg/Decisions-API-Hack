import { chatJson, describeError, extractJson, isMockMode, requireModel } from "./client";
import { mockVote } from "./mock";
import { getPersona, type Persona } from "./personas";
import { personaSystemPrompt, personaUserPrompt } from "./prompts";
import { PersonaVoteSchema, type PersonaVote, type VoteResult } from "./schemas";

/** The trigger phrase must be verbatim from the copy; otherwise it is dropped. */
export function sanitizeTrigger(phrase: string, copy: string): string {
  const p = phrase.trim();
  if (!p) return "";
  if (copy.includes(p)) return p;
  const i = copy.toLowerCase().indexOf(p.toLowerCase());
  return i >= 0 ? copy.slice(i, i + p.length) : "";
}

function parseVote(raw: string, copy: string): PersonaVote {
  const vote = PersonaVoteSchema.parse(extractJson(raw));
  return { ...vote, trigger_phrase: sanitizeTrigger(vote.trigger_phrase, copy) };
}

/**
 * Single source of truth for one persona evaluation. Used by /api/persona-vote and /api/decide.
 * Never throws: failures come back as { error: true } so one persona cannot sink the panel.
 */
export async function evaluatePersona(
  copy: string,
  personaOrId: Persona | string,
  opts: { isRetry?: boolean } = {},
): Promise<VoteResult> {
  const persona = typeof personaOrId === "string" ? getPersona(personaOrId) : personaOrId;
  if (!persona) {
    return { error: true, personaId: String(personaOrId), model: "", latencyMs: 0, message: "Unknown persona." };
  }

  if (isMockMode()) return mockVote(copy, persona, opts.isRetry);

  const started = Date.now();
  let model = "";
  try {
    model = requireModel(persona.model);
  } catch (err) {
    return { error: true, personaId: persona.id, model, latencyMs: 0, message: describeError(err) };
  }

  let lastMessage = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chatJson(model, personaSystemPrompt(persona), personaUserPrompt(copy));
      const vote = parseVote(raw, copy);
      return { ...vote, personaId: persona.id, model, latencyMs: Date.now() - started };
    } catch (err) {
      lastMessage = err instanceof Error && err.name === "ZodError"
        ? "Model returned JSON that failed schema validation."
        : describeError(err);
      // Auth/config problems will not fix themselves on retry.
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) break;
    }
  }
  return { error: true, personaId: persona.id, model, latencyMs: Date.now() - started, message: lastMessage };
}
