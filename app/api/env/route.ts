import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Non-secret: lets the UI show a Demo/Live indicator. */
export function GET() {
  return NextResponse.json({ mock: process.env.MOCK_MODE === "true" });
}
