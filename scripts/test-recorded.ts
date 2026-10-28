import assert from "node:assert/strict";
import sample from "../data/recorded/sample.json";
import { makeRecordedRound, RecordedRunSchema } from "../lib/recorded";

// The imported fixture and its validation must work without a network request.
globalThis.fetch = async () => { throw new Error("Network disabled for recorded-run test."); };
const run = RecordedRunSchema.parse(sample);
assert.equal(run.source, "mock");
assert.equal(run.original.verdict, "revise");
assert.equal(run.revised?.verdict, "ship");
assert.equal(run.original.votes.length, 10);
assert.equal(run.revised?.votes.length, 10);
assert.ok(run.original.votes.every((vote) => vote.model.startsWith("mock-")));
assert.equal(makeRecordedRound(run.original.copy, run.original.votes).verdict, run.original.verdict);
assert.equal(makeRecordedRound(run.revised!.copy, run.revised!.votes).verdict, run.revised!.verdict);
console.log("recorded run passed: mock source, revise -> ship, 10+10 votes, schema, offline import");
