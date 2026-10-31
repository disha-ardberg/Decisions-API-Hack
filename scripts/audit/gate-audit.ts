import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { aggregate } from "../../lib/aggregate";
import { extractJson } from "../../lib/client";
import { runPanel, summarize } from "../../lib/panel";
import { SAMPLES } from "../../lib/samples";
import { PersonaVoteSchema, type VoteResult } from "../../lib/schemas";

// Audit only. Force the direct function checks to use the local mock path.
process.env.MOCK_MODE = "true";
const root = process.cwd();
const has = (path: string) => existsSync(join(root, path));
const report = (name: string, result: string) => console.log(`${name}: ${result}`);

async function gateApiCases() {
  const cases = [
    { name: "valid", body: JSON.stringify({ copy: SAMPLES[0].copy, quick: true }) },
    { name: "short copy", body: JSON.stringify({ copy: "short" }) },
    { name: "revise sample", body: JSON.stringify({ copy: SAMPLES[1].copy, quick: true }) },
    { name: "invalid JSON", body: "{" },
    { name: "missing body", body: undefined },
  ];
  for (const item of cases) {
    try {
      const response = await fetch("http://localhost:3000/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: item.body,
      });
      report(`/api/gate ${item.name}`, `HTTP ${response.status}`);
      if (has("app/api/gate/route.ts")) {
        assert.equal(response.status, item.name === "valid" || item.name === "revise sample" ? 200 : 400);
        if (response.status === 200) {
          const data = await response.json();
          assert.ok(data.verdict);
          assert.ok(Array.isArray(data.rules));
        }
      } else {
        assert.equal(response.status, 404);
      }
    } catch (error) {
      report(`/api/gate ${item.name}`, `UNVERIFIED (${error instanceof Error ? error.message : "request failed"})`);
    }
  }
}

async function main() {
  report("gate logic cases", has("lib/gate.ts") ? "UNVERIFIED (interface needs inspection)" : "MISSING (lib/gate.ts absent; 7 requested assertions cannot run)");
  report("complete() fault injection", has("lib/llm.ts") ? "UNVERIFIED (interface needs inspection)" : "MISSING (lib/llm.ts absent; 4 requested assertions cannot run)");
  report("parseJson", "MISSING (checking existing extractJson instead)");

  assert.deepEqual(extractJson('{"ok":true}'), { ok: true });
  assert.deepEqual(extractJson('```json\n{"ok":true}\n```'), { ok: true });
  assert.deepEqual(extractJson('before {"ok":true} after'), { ok: true });
  assert.throws(() => extractJson('{"ok":'), Error);
  assert.equal(PersonaVoteSchema.safeParse(extractJson('{"ok":true}')).success, false);
  report("extractJson + schema", "PASS (clean, fenced, prose, truncated, wrong schema)");

  const votes: VoteResult[] = [0.7, 0.6, 0.8, 0.5].map((purchase_likelihood, index) => ({
    personaId: `ok-${index}`, model: "mock-A", latencyMs: 1, decision: "maybe" as const,
    purchase_likelihood, top_objection: "No price", trigger_phrase: "",
    what_would_convince_me: "A price", reasoning: "I need a price.",
  }));
  for (let index = 0; index < 6; index++) votes.push({
    error: true, personaId: `failed-${index}`, model: "mock-A", latencyMs: 1, message: "simulated failure",
  });
  const partial = aggregate(votes);
  assert.equal(partial.score, 65);
  assert.equal(partial.successful, 4);
  assert.equal(partial.expected, 10);
  assert.equal(partial.split.maybe, 4);
  assert.equal(aggregate([]).score, null);
  report("6/10 failed votes", `PASS (score=${partial.score}, responded=${partial.successful}/${partial.expected})`);

  const mockVotes = await runPanel(SAMPLES[1].copy);
  const mockResult = summarize(mockVotes);
  assert.equal(mockVotes.length, 10);
  assert.ok(mockVotes.every((vote) => vote.model.startsWith("mock-")));
  assert.equal(mockResult.expected, 10);
  report("mock panel", `PASS (votes=${mockVotes.length}, responded=${mockResult.successful})`);

  await gateApiCases();
  if (has("data/recorded")) {
    const files = readdirSync(join(root, "data/recorded")).filter((file) => file.endsWith(".json"));
    report("recorded files", `${files.length} present; schema inspection needed`);
  } else {
    report("recorded files", "MISSING (data/recorded absent)");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
