import assert from "node:assert/strict";
import { PERSONAS } from "../lib/personas";
import { getMaxConcurrency, runWithConcurrency } from "../lib/pool";
import { evaluatePersona, isRetryableModelError } from "../lib/vote";
import { describeError } from "../lib/client";

process.env.MOCK_MODE = "false";
process.env.MODEL_A = "test-A";
process.env.MODEL_B = "test-B";
process.env.MODEL_C = "test-C";

const copy = "This product helps families plan dinners each week.";
const validVote = JSON.stringify({
  decision: "maybe", purchase_likelihood: 0.5, top_objection: "No price",
  trigger_phrase: "", what_would_convince_me: "A clear price", reasoning: "I need the price.",
});
const error = (status: number) => Object.assign(new Error(`status ${status}`), { status });

async function main() {
  let calls = 0;
  let rateLimits = 0;
  const waits: number[] = [];
  const after429 = await evaluatePersona(copy, PERSONAS[0], {
    transport: async () => { if (++calls <= 2) throw error(429); return validVote; },
    wait: async (ms) => { waits.push(ms); }, jitter: () => 0,
    onRateLimit: () => { rateLimits++; },
  });
  assert.equal(after429.error, undefined);
  assert.equal(after429.model, "test-A");
  assert.equal(after429.rateLimited, true);
  assert.equal(calls, 3);
  assert.equal(rateLimits, 2);
  assert.deepEqual(waits, [500, 1500]);

  let quotaCalls = 0;
  const quota = Object.assign(error(429), { code: "credit_balance_exhausted", requestID: "req_test_429" });
  const logged: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(" ")); };
  let afterQuota: Awaited<ReturnType<typeof evaluatePersona>>;
  try {
    afterQuota = await evaluatePersona(copy, PERSONAS[0], {
      transport: async () => { quotaCalls++; throw quota; },
      wait: async () => { throw new Error("Quota errors must not be retried"); },
    });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(afterQuota.error, true);
  assert.equal(quotaCalls, 1);
  assert.equal(logged.length, 1);
  const log = JSON.parse(logged[0]);
  assert.equal(log.event, "persona_vote_failed");
  assert.equal(log.status, 429);
  assert.equal(log.code, "credit_balance_exhausted");
  assert.equal(log.providerRequestId, "req_test_429");
  assert.equal(logged[0].includes(copy), false);
  assert.equal(isRetryableModelError(quota), false);
  assert.match(describeError(quota), /credits are exhausted/);
  const legacyQuota = Object.assign(error(429), { type: "insufficient_quota" });
  assert.equal(isRetryableModelError(legacyQuota), false);
  assert.match(describeError(legacyQuota), /quota is exhausted/);

  const hintedWaits: number[] = [];
  let hintedCalls = 0;
  const hinted = Object.assign(error(429), { headers: new Headers({ "Retry-After": "3" }) });
  const afterHint = await evaluatePersona(copy, PERSONAS[0], {
    transport: async () => { if (++hintedCalls === 1) throw hinted; return validVote; },
    wait: async (ms) => { hintedWaits.push(ms); }, jitter: () => 0,
  });
  assert.equal(afterHint.error, undefined);
  assert.deepEqual(hintedWaits, [3000]);

  let longHintCalls = 0;
  const longHint = Object.assign(error(429), { headers: new Headers({ "Retry-After": "60" }) });
  const afterLongHint = await evaluatePersona(copy, PERSONAS[0], {
    transport: async () => { longHintCalls++; throw longHint; },
    wait: async () => { throw new Error("Long Retry-After must not be ignored"); },
  });
  assert.equal(afterLongHint.error, true);
  assert.equal(longHintCalls, 1);
  assert.match(afterLongHint.message, /Retry after 60 seconds/);

  const models: string[] = [];
  const after500 = await evaluatePersona(copy, PERSONAS[0], {
    transport: async (model) => { models.push(model); if (model === "test-A") throw error(500); return validVote; },
    wait: async () => {}, jitter: () => 0,
  });
  assert.equal(after500.model, "test-B");
  assert.deepEqual(models, ["test-A", "test-A", "test-A", "test-B"]);

  for (const status of [400, 401, 403]) {
    let attempts = 0;
    const failed = await evaluatePersona(copy, PERSONAS[0], {
      transport: async () => { attempts++; throw error(status); },
      wait: async () => { throw new Error("Unexpected wait"); }, jitter: () => 0,
    });
    assert.equal(failed.error, true);
    assert.equal(attempts, 1);
  }

  const timeoutModels: string[] = [];
  const timeout = Object.assign(new Error("request timed out"), { name: "APITimeoutError" });
  const afterTimeout = await evaluatePersona(copy, PERSONAS[0], {
    transport: async (model) => { timeoutModels.push(model); if (model === "test-A") throw timeout; return validVote; },
    wait: async () => {}, jitter: () => 0,
  });
  assert.equal(afterTimeout.model, "test-B");
  assert.deepEqual(timeoutModels, ["test-A", "test-A", "test-A", "test-B"]);
  assert.equal(isRetryableModelError(new Error("fetch failed")), true);
  assert.equal(isRetryableModelError(error(400)), false);

  delete process.env.MAX_CONCURRENCY;
  assert.equal(getMaxConcurrency(), 4);
  process.env.MAX_CONCURRENCY = "3";
  assert.equal(getMaxConcurrency(), 3);
  const limits: number[] = [];
  const settled = await runWithConcurrency(Array.from({ length: 8 }, (_, index) => async (control) => {
    if (index === 0) control.rateLimited();
    limits.push(control.currentLimit());
    return index;
  }), 4);
  assert.equal(limits[0], 3);
  assert.deepEqual(settled.map((item) => item.status === "fulfilled" ? item.value : -1), [0, 1, 2, 3, 4, 5, 6, 7]);
  console.log("resilience tests passed: 429 backoff and Retry-After, quota stops, 500/timeout fallback, 400/401/403 stop, pool limit reduction");
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
