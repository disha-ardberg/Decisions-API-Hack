import assert from "node:assert/strict";
import { aggregate, rankObjections } from "../lib/aggregate";
import { runWithConcurrency } from "../lib/pool";
import type { VoteResult } from "../lib/schemas";

const v = (personaId: string, model: string, p: number, obj: string, decision: "buy" | "maybe" | "pass"): VoteResult => ({
  decision, purchase_likelihood: p, top_objection: obj, trigger_phrase: "", what_would_convince_me: "x", reasoning: "x.",
  personaId, model, latencyMs: 1,
});
const err = (personaId: string): VoteResult => ({ error: true, personaId, model: "A", latencyMs: 1, message: "boom" });

const votes: VoteResult[] = [
  v("a", "A", 0.8, "No price given", "buy"),
  v("b", "A", 0.6, "Price isn't stated clearly", "buy"),
  v("c", "B", 0.4, "No evidence or proof for the claims", "maybe"),
  v("d", "B", 0.2, "No proof the claims are tested", "pass"),
  v("e", "C", 0.1, "Vague marketing language", "pass"),
  err("f"),
];
const a = aggregate(votes);
assert.equal(a.score, Math.round(((0.8 + 0.6 + 0.4 + 0.2 + 0.1) / 5) * 100)); // 42, error excluded
assert.equal(a.successful, 5);
assert.deepEqual(a.split, { buy: 2, maybe: 1, pass: 2 });
assert.ok(Math.abs(a.model_disagreement.spread - (0.7 - 0.1)) < 1e-9);
assert.equal(a.model_disagreement.contested, true);
assert.equal(a.top_objections.length, 3);
assert.equal(a.top_objections[0].count, 2);
assert.equal(aggregate([err("x")]).score, null); // missing != 0
assert.equal(aggregate([]).model_disagreement.spread, 0);
assert.equal(rankObjections([v("a", "A", 0.5, "Too expensive", "maybe")]).length, 1);

async function main() {
const order: number[] = [];
let active = 0, peak = 0;
const res = await runWithConcurrency(
  Array.from({ length: 12 }, (_, i) => async () => {
    active++; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 10));
    active--; order.push(i);
    if (i === 3) throw new Error("fail");
    return i;
  }), 5);
assert.equal(peak, 5);
assert.equal(res[3].status, "rejected");
assert.deepEqual(res.map((r) => (r.status === "fulfilled" ? r.value : -1)), [0,1,2,-1,4,5,6,7,8,9,10,11]);
console.log("all aggregate/pool tests passed");
}
main();
