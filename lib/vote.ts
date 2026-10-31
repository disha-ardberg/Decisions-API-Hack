import { chatJson, describeError, extractJson, isMockMode, requireModel } from "./client";
import { mockVote } from "./mock";
import { getPersona, type ModelSlot, type Persona } from "./personas";
import { personaSystemPrompt, personaUserPrompt } from "./prompts";
import { PersonaVoteSchema, type PersonaVote, type VoteError, type VoteResult } from "./schemas";

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
const MAX_RETRY_WAIT_MS = 10_000;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function isQuotaError(err: unknown): boolean {
  const apiError = err as { code?: unknown; type?: unknown } | null;
  const code = apiError?.code;
  return code === "credit_balance_exhausted" || code === "organization_usage_limit_exceeded" ||
    code === "organization_spend_limit_exceeded" || code === "project_spend_limit_exceeded" ||
    code === "insufficient_quota" || apiError?.type === "insufficient_quota";
}

function retryAfterMs(err: unknown): number | undefined {
  const headers = (err as { headers?: { get?: (name: string) => string | null } } | null)?.headers;
  const value = headers?.get?.("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(ms) && ms >= 0 ? Math.ceil(ms) : undefined;
}

function failedVote(
  personaId: string, model: string, started: number, message: string, rateLimited: boolean, cause: unknown,
): VoteError {
  const latencyMs = Date.now() - started;
  const err = cause as {
    name?: unknown; status?: unknown; code?: unknown; type?: unknown; requestID?: unknown;
    headers?: { get?: (name: string) => string | null };
  } | null;
  // Vercel groups this line with the function invocation. Never log copy, prompts, or credentials.
  console.error(JSON.stringify({
    event: "persona_vote_failed",
    personaId,
    model,
    errorName: typeof err?.name === "string" ? err.name : null,
    status: typeof err?.status === "number" ? err.status : null,
    code: typeof err?.code === "string" ? err.code : null,
    type: typeof err?.type === "string" ? err.type : null,
    providerRequestId: typeof err?.requestID === "string" ? err.requestID : null,
    retryAfter: err?.headers?.get?.("retry-after") ?? null,
    latencyMs,
  }));
  return { error: true, personaId, model, latencyMs, message, rateLimited };
}

export function isRetryableModelError(err: unknown): boolean {
  if (isQuotaError(err)) return false;
  const status = errorStatus(err);
  if (status !== undefined) return status === 429 || status >= 500 && status < 600;
  if (!(err instanceof Error)) return false;
  return /APITimeoutError|APIConnectionError|AbortError|FetchError/i.test(err.name) ||
    /timed?\s*out|timeout|network|connection|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message);
}

function canFallback(err: unknown): boolean {
  if (isQuotaError(err)) return false;
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
  let lastError: unknown;
  let rateLimited = false;
  const primaryIndex = MODEL_ORDER.indexOf(persona.model);
  const slots = [persona.model, MODEL_ORDER[(primaryIndex + 1) % MODEL_ORDER.length]];
  for (const slot of slots) {
    try {
      model = requireModel(slot);
    } catch (err) {
      lastMessage = describeError(err);
      lastError = err;
      continue;
    }
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const raw = await (opts.transport ?? chatJson)(model, personaSystemPrompt(persona), personaUserPrompt(copy, opts.audience));
        const vote = parseVote(raw, copy);
        return { ...vote, personaId: persona.id, model, latencyMs: Date.now() - started, rateLimited };
      } catch (err) {
        lastError = err;
        if (errorStatus(err) === 429) {
          rateLimited = true;
          opts.onRateLimit?.();
        }
        lastMessage = err instanceof Error && err.name === "ZodError"
          ? "Model returned JSON that failed schema validation."
          : describeError(err);
        const retryable = isRetryableModelError(err);
        const serverDelay = retryable ? retryAfterMs(err) : undefined;
        if (serverDelay !== undefined && serverDelay > MAX_RETRY_WAIT_MS) {
          lastMessage = `${lastMessage} Retry after ${Math.ceil(serverDelay / 1000)} seconds.`;
          return failedVote(persona.id, model, started, lastMessage, rateLimited, err);
        }
        if (retryable && attempt < RETRY_DELAYS.length) {
          const jitter = Math.floor(Math.max(0, opts.jitter?.() ?? Math.random()) * 250);
          await (opts.wait ?? delay)(Math.max(RETRY_DELAYS[attempt], serverDelay ?? 0) + jitter);
          continue;
        }
        if (!canFallback(err)) {
          return failedVote(persona.id, model, started, lastMessage, rateLimited, err);
        }
        break;
      }
    }
  }
  return failedVote(persona.id, model, started, lastMessage, rateLimited, lastError);
}
