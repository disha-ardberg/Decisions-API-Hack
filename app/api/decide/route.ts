import { NextResponse } from "next/server";
import { runPanel, summarize } from "@/lib/panel";
import { RewriteError, rewriteCopy } from "@/lib/rewrite";
import { DecideRequestSchema, validateCopy } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = DecideRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Body must be { copy: string, rewrite?: boolean }." }, { status: 400 });
  const invalid = validateCopy(body.data.copy);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const { copy, rewrite } = body.data;
  const started = Date.now();
  let calls = 0;

  const first = summarize(await runPanel(copy));
  calls += first.votes.length;
  const { successful, expected, ...initial } = first;
  const response: Record<string, unknown> = { ...initial, successful_evaluations: successful, expected_evaluations: expected };

  if (rewrite) {
    if (first.top_objections.length === 0) {
      response.rewrite_error = "No objections were available to rewrite against (no successful evaluations).";
    } else {
      try {
        calls += 1;
        const rw = await rewriteCopy(copy, first.top_objections.map(({ objection, count }) => ({ objection, count })));
        const second = summarize(await runPanel(rw.revised_copy));
        calls += second.votes.length;
        response.rewrite = rw;
        response.revote = {
          score: second.score,
          split: second.split,
          votes: second.votes,
          top_objections: second.top_objections,
          model_disagreement: second.model_disagreement,
          successful_evaluations: second.successful,
          expected_evaluations: second.expected,
        };
      } catch (err) {
        response.rewrite_error = err instanceof RewriteError ? err.message : "Rewrite failed.";
      }
    }
  }

  response.meta = { calls, durationMs: Date.now() - started, mock: process.env.MOCK_MODE === "true" };
  return NextResponse.json(response);
}
