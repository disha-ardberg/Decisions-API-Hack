import { NextResponse } from "next/server";
import { RewriteError, rewriteCopy } from "@/lib/rewrite";
import { RewriteRequestSchema, validateCopy } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = RewriteRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const invalid = validateCopy(body.data.copy);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    return NextResponse.json(await rewriteCopy(body.data.copy, body.data.objections));
  } catch (err) {
    const message = err instanceof RewriteError ? err.message : "Rewrite failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
