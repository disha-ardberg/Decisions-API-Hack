import assert from "node:assert/strict";
import { POST } from "../app/api/gate/route";
import { SAMPLES } from "../lib/samples";

process.env.MOCK_MODE = "true";

async function call(body?: string) {
  return POST(new Request("http://localhost/api/gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }));
}

async function main() {
  const strong = await call(JSON.stringify({ copy: SAMPLES[0].copy }));
  assert.equal(strong.status, 200);
  const result = await strong.json();
  assert.ok(["ship", "revise", "kill"].includes(result.verdict));
  assert.ok(Array.isArray(result.rules));
  assert.equal(result.votes.length, 10);
  assert.equal(result.meta.mock, true);
  assert.equal(result.meta.calls, 10);
  assert.ok(result.responded.includes("of 10"));
  assert.equal(result.revote, undefined);

  const short = await call(JSON.stringify({ copy: "short" }));
  assert.equal(short.status, 400);
  assert.match((await short.json()).error, /at least 20 characters/);
  assert.equal((await call("{")).status, 400);
  assert.equal((await call()).status, 400);

  const weak = await call(JSON.stringify({ copy: SAMPLES[1].copy, policy: { min_score: 99 } }));
  assert.equal(weak.status, 200);
  assert.notEqual((await weak.json()).verdict, "ship");

  const custom = await call(JSON.stringify({ copy: SAMPLES[0].copy, customPersonas: [{ name: "Custom judge" }] }));
  assert.equal(custom.status, 200);
  const customResult = await custom.json();
  assert.equal(customResult.votes.length, 11);
  assert.ok(customResult.rules.some((rule: { id: string }) => rule.id === "min_custom_score"));

  const withRewrite = await call(JSON.stringify({ copy: SAMPLES[1].copy, rewrite: true }));
  assert.equal(withRewrite.status, 200);
  const rewritten = await withRewrite.json();
  assert.ok(rewritten.rewrite?.revised_copy);
  assert.ok(["ship", "revise", "kill"].includes(rewritten.revote?.verdict));
  assert.equal(rewritten.meta.calls, 21);
  console.log("gate API tests passed: valid, bad copy, invalid/missing JSON, revise=200, custom persona, rewrite/revote verdict");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
