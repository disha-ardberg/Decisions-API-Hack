import { NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { VoteRequestSchema, validateCopy } from "@/lib/schemas";
import { evaluatePersona } from "@/lib/vote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = VoteRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Body must be { copy, personaId }." }, { status: 400 });

  const { copy, personaId, retry } = body.data;
  const invalid = validateCopy(copy);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!getPersona(personaId)) return NextResponse.json({ error: `Unknown personaId "${personaId}".` }, { status: 400 });

  return NextResponse.json(await evaluatePersona(copy, personaId, { isRetry: retry }));
}
