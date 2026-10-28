import { NextResponse } from "next/server";
import { z } from "zod";
import { conversionScore } from "@/lib/aggregate";
import { DEFAULT_GATE_POLICY, evaluate, type GatePolicy } from "@/lib/gate";
import { runPanel, summarize } from "@/lib/panel";
import { PERSONAS, type Persona } from "@/lib/personas";
import { RewriteError, rewriteCopy } from "@/lib/rewrite";
import { validateCopy, type VoteResult } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CustomPersonaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(60).optional(),
  name: z.string().trim().min(1).max(80),
  emoji: z.string().max(12).default("👤"),
  age: z.number().int().min(18).max(110).default(30),
  role: z.string().trim().min(1).max(120).default("Audience member"),
  budget: z.string().max(300).default("Not specified"),
  values: z.array(z.string().max(100)).max(10).default([]),
  pet_peeves: z.array(z.string().max(100)).max(10).default([]),
  model: z.enum(["MODEL_A", "MODEL_B", "MODEL_C"]).optional(),
  bio: z.string().max(600).default("No additional details provided."),
}).strict();

const PolicySchema = z.object({
  min_score: z.number().min(0).max(100).optional(),
  max_objection_share: z.number().min(0).max(1).optional(),
  min_custom_score: z.number().min(0).max(100).optional(),
  kill_below: z.number().min(0).max(100).optional(),
  min_responded_share: z.number().min(0).max(1).optional(),
}).strict();

const GateRequestSchema = z.object({
  copy: z.string(),
  audience: z.string().trim().min(1).max(500).optional(),
  customPersonas: z.array(CustomPersonaSchema).max(10).optional(),
  policy: PolicySchema.optional(),
  rewrite: z.boolean().optional(),
}).strict();

function gateResult(votes: VoteResult[], customIds: Set<string>, policy: GatePolicy) {
  const summary = summarize(votes);
  const group_scores = customIds.size > 0 ? {
    custom: {
      score: conversionScore(votes.filter((vote) => customIds.has(vote.personaId))),
      count: customIds.size,
    },
  } : undefined;
  return { summary, gate: evaluate({ ...summary, group_scores }, policy) };
}

export async function POST(req: Request) {
  const parsed = GateRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const invalid = validateCopy(parsed.data.copy);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const { copy, audience, rewrite } = parsed.data;
  const policy: GatePolicy = { ...DEFAULT_GATE_POLICY, ...parsed.data.policy };
  const custom: Persona[] = (parsed.data.customPersonas ?? []).map((persona, index) => ({
    ...persona,
    id: `custom-${index + 1}${persona.id ? `-${persona.id}` : ""}`,
    model: persona.model ?? (["MODEL_A", "MODEL_B", "MODEL_C"] as const)[index % 3],
  }));
  const customIds = new Set(custom.map((persona) => persona.id));
  const personas = [...PERSONAS, ...custom];
  const started = Date.now();
  let calls = 0;

  const initial = gateResult(await runPanel(copy, personas, audience), customIds, policy);
  calls += initial.summary.votes.length;
  const response: Record<string, unknown> = {
    ...initial.gate,
    score: initial.summary.score,
    split: initial.summary.split,
    policy,
    votes: initial.summary.votes,
    top_objections: initial.summary.top_objections,
  };

  if (rewrite) {
    if (initial.summary.top_objections.length === 0) {
      response.rewrite_error = "No objections were available to rewrite against (no successful evaluations).";
    } else {
      try {
        calls++;
        const revised = await rewriteCopy(copy, initial.summary.top_objections.map(({ objection, count }) => ({ objection, count })));
        const revote = gateResult(await runPanel(revised.revised_copy, personas, audience), customIds, policy);
        calls += revote.summary.votes.length;
        response.rewrite = revised;
        response.revote = {
          ...revote.gate,
          score: revote.summary.score,
          split: revote.summary.split,
          votes: revote.summary.votes,
          top_objections: revote.summary.top_objections,
        };
      } catch (err) {
        response.rewrite_error = err instanceof RewriteError ? err.message : "Rewrite failed.";
      }
    }
  }

  response.meta = { calls, durationMs: Date.now() - started, mock: process.env.MOCK_MODE === "true" };
  return NextResponse.json(response);
}
