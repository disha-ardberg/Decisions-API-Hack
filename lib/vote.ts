import { chatJson, describeError, extractJson, isMockMode, requireModel } from "./client";
import { mockVote } from "./mock";
import { getPersona, type ModelSlot, type Persona } from "./personas";
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

const MODEL_ORDER: ModelSlot[] = ["MODEL_A", "MODEL_B", "MODEL_C"];
const RETRY_DELAYS = [500, 1500];
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

export function isRetryableModelError(err: unknown): boolean {
  const status = errorStatus(err);
  if (status !== undefined) return status === 429 || status >= 500 && status < 600;
  if (!(err instanceof Error)) return false;
  return /APITimeoutError|APIConnectionError|AbortError|FetchError/i.test(err.name) ||
    /timed?\s*out|timeout|network|connection|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message);
}

function canFallback(err: unknown): boolean {
  const status = errorStatus(err);
  return status === 404 || isRetryableModelError(err) ||
    err instanceof SyntaxError || err instanceof Error && err.name === "ZodError";
}

type VoteOptions = {
  isRetry?: boolean;
  audience?: string;
  onRateLimit?: () => void;
  // Injected only by tests; normal requests use the shared client and real timers.
  transport?: typeof chatJson;
  wait?: (ms: number) => Promise<void>;
  jitter?: () => number;
};

/**
 * Single source of truth for one persona evaluation. Used by /api/persona-vote and /api/decide.
 * Never throws: failures come back as { error: true } so one persona cannot sink the panel.
 */
export async function evaluatePersona(
  copy: string,
  personaOrId: Persona | string,
  opts: VoteOptions = {},
): Promise<VoteResult> {
  const persona = typeof personaOrId === "string" ? getPersona(personaOrId) : personaOrId;
  if (!persona) {
    return { error: true, personaId: String(personaOrId), model: "", latencyMs: 0, message: "Unknown persona." };
  }

  if (isMockMode()) return mockVote(copy, persona, opts.isRetry);

  const started = Date.now();
  let model = "";
  let lastMessage = "";
  let rateLimited = false;
  const primaryIndex = MODEL_ORDER.indexOf(persona.model);
  const slots = [persona.model, MODEL_ORDER[(primaryIndex + 1) % MODEL_ORDER.length]];
  for (const slot of slots) {
    try {
      model = requireModel(slot);
    } catch (err) {
      lastMessage = describeError(err);
      continue;
    }
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const raw = await (opts.transport ?? chatJson)(model, personaSystemPrompt(persona), personaUserPrompt(copy, opts.audience));
        const vote = parseVote(raw, copy);
        return { ...vote, personaId: persona.id, model, latencyMs: Date.now() - started, rateLimited };
      } catch (err) {
        if (errorStatus(err) === 429) {
          rateLimited = true;
          opts.onRateLimit?.();
        }
        lastMessage = err instanceof Error && err.name === "ZodError"
          ? "Model returned JSON that failed schema validation."
          : describeError(err);
        if (isRetryableModelError(err) && attempt < RETRY_DELAYS.length) {
          const jitter = Math.floor(Math.max(0, opts.jitter?.() ?? Math.random()) * 250);
          await (opts.wait ?? delay)(RETRY_DELAYS[attempt] + jitter);
          continue;
        }
        if (!canFallback(err)) {
          return { error: true, personaId: persona.id, model, latencyMs: Date.now() - started, message: lastMessage, rateLimited };
        }
        break;
      }
    }
  }
  return { error: true, personaId: persona.id, model, latencyMs: Date.now() - started, message: lastMessage, rateLimited };
}
