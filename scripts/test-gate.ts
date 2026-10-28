import assert from "node:assert/strict";
import { DEFAULT_GATE_POLICY, evaluate, type GateInput } from "../lib/gate";

function input(score: number | null, responded = 10, total = 10, objectionCount = 0, customScore?: number | null): GateInput {
  return {
    score,
    votes: Array.from({ length: total }, (_, index) => ({ error: index >= responded })),
    top_objections: objectionCount ? [{ objection: "price", count: objectionCount }] : [],
    ...(customScore === undefined ? {} : { group_scores: { custom: { score: customScore, count: 2 } } }),
  };
}

const killed = evaluate(input(10));
assert.equal(killed.verdict, "kill");

const shipped = evaluate(input(70, 10, 10, 4));
assert.equal(shipped.verdict, "ship");

const revised = evaluate(input(40, 4, 10, 3, 30));
assert.equal(revised.verdict, "revise");
assert.deepEqual(revised.rules.filter((rule) => !rule.passed).map((rule) => rule.id).sort(),
  ["min_score", "max_objection_share", "min_responded_share", "min_custom_score"].sort());
assert.ok(revised.flip_hint.includes("Too few judges responded, re-run"));
assert.ok(revised.flip_hint.includes("Raise score"));

const exact = evaluate(input(55, 6, 10, 0, 45));
assert.equal(exact.verdict, "ship");
assert.equal(exact.rules.find((rule) => rule.id === "min_score")?.passed, true);
assert.equal(exact.rules.find((rule) => rule.id === "min_responded_share")?.passed, true);
assert.equal(exact.rules.find((rule) => rule.id === "min_custom_score")?.passed, true);
assert.equal(evaluate(input(55, 10, 10, 4)).verdict, "ship");

const empty = evaluate(input(null, 0, 0));
assert.equal(empty.verdict, "revise");
assert.equal(empty.responded, "0 of 0");
assert.ok(empty.flip_hint.includes("Too few judges responded, re-run"));

assert.equal(evaluate(input(70)).rules.some((rule) => rule.id === "min_custom_score"), false);
for (const rule of revised.rules) {
  for (const key of ["id", "label", "passed", "actual", "threshold"] as const) assert.ok(key in rule);
}
assert.equal(DEFAULT_GATE_POLICY.kill_below, 20);
console.log("gate tests passed: kill, ship, revise, exact thresholds (>= and <=), empty votes, skipped custom rule, rule shape");
