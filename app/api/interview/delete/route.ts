import { NextRequest, NextResponse } from "next/server";
import { deleteInterviewByRefCode } from "@/lib/db";

export const runtime = "nodejs";

// GDPR self-serve erasure. Respondents are anonymous, so the reference code shown at
// the end of their session is the secret that authorizes deletion of that session
// (and its turns, via cascade). No other auth — the code is the capability.
export async function POST(req: NextRequest) {
  try {
    const { refCode } = (await req.json()) as { refCode: string };
    if (!refCode?.trim()) {
      return NextResponse.json(
        { error: "Enter your reference code." },
        { status: 400 },
      );
    }
    const deleted = await deleteInterviewByRefCode(refCode);
    return NextResponse.json({ deleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
