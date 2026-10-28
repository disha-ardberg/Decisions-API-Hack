import OpenAI from "openai";

export class ConfigError extends Error {}

export const isMockMode = () => process.env.MOCK_MODE === "true";

let cached: OpenAI | null = null;

/** Server-side only. Throws ConfigError with a readable message when env is incomplete. */
export function getClient(): OpenAI {
  const missing = ["AI_BASE_URL", "AI_API_KEY"].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new ConfigError(
      `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Set them in .env.local, or set MOCK_MODE=true.`,
    );
  }
  cached ??= new OpenAI({
    baseURL: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    timeout: 60_000,
    maxRetries: 0,
  });
  return cached;
}

export function requireModel(slot: "MODEL_A" | "MODEL_B" | "MODEL_C"): string {
  const m = process.env[slot];
  if (!m) throw new ConfigError(`Missing environment variable: ${slot}. Set it in .env.local, or set MOCK_MODE=true.`);
  return m;
}

/**
 * Chat completion that asks for JSON mode first and falls back to prompt-only JSON
 * if the gateway rejects `response_format`. Returns the raw assistant text.
 */
export async function chatJson(model: string, system: string, user: string): Promise<string> {
  const client = getClient();
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    const status = (err as { status?: number }).status;
    const msg = err instanceof Error ? err.message : "";
    // 400/422 mentioning response_format => gateway/model doesn't support it; retry without.
    if ((status === 400 || status === 422) && /response_format|json_object|json mode/i.test(msg)) {
      const res = await client.chat.completions.create({ model, messages, temperature: 0.7 });
      return res.choices[0]?.message?.content ?? "";
    }
    throw err;
  }
}

export function describeError(err: unknown): string {
  if (err instanceof ConfigError) return err.message;
  const status = (err as { status?: number }).status;
  if (status === 401 || status === 403) return "Gateway authentication failed (check AI_API_KEY).";
  if (status === 404) return "Gateway or model not found (check AI_BASE_URL and MODEL_* values).";
  if (status === 429) return "Gateway rate limit hit.";
  if (err instanceof Error && /timed? ?out|timeout/i.test(err.message)) return "Gateway request timed out.";
  return err instanceof Error ? err.message : "Unknown error";
}

/** Strip Markdown fences, grab the outermost {...}, parse. Throws on failure. */
export function extractJson(raw: string): unknown {
  const stripped = raw.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in model output");
  return JSON.parse(stripped.slice(start, end + 1));
}
