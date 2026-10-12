import { NextRequest, NextResponse } from "next/server";
import { getRespondentAnalysis } from "@/lib/db";
import { getOrBuildAnalysis } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

// Respondent-facing framework reflection of their OWN interview, read through the study's
// chosen lens. Like /api/interview/report, the interviewId is the bearer (the respondent
// holds it in their session) — no creator auth, and the research agenda never appears.
export async function GET(req: NextRequest) {
  const interviewId = req.nextUrl.searchParams.get("interviewId");
  if (!interviewId) {
    return NextResponse.json({ error: "interviewId required" }, { status: 400 });
  }
  return NextResponse.json({ analysis: await getRespondentAnalysis(interviewId) });
}

export async function POST(req: NextRequest) {
  try {
    const { interviewId } = (await req.json()) as { interviewId: string };
    if (!interviewId) {
      return NextResponse.json({ error: "interviewId required" }, { status: 400 });
    }

    const { analysis, reason } = await getOrBuildAnalysis(interviewId);
    if (reason === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (reason === "not_complete") {
      return NextResponse.json({ error: "Interview not complete" }, { status: 409 });
    }
    // no_framework / too_short are normal "nothing to send" outcomes, not errors.
    return NextResponse.json({ analysis, ...(reason ? { skipped: reason } : {}) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build analysis" },
      { status: 500 },
    );
  }
}
