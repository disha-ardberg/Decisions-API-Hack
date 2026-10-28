import assert from "node:assert/strict";
import { PERSONAS } from "../lib/personas";
import { getMaxConcurrency, runWithConcurrency } from "../lib/pool";
import { evaluatePersona, isRetryableModelError } from "../lib/vote";

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
  console.log("resilience tests passed: 429 backoff, 500/timeout fallback, 400/401/403 stop, network classification, pool limit reduction");
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
