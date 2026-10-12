import { NextRequest, NextResponse } from "next/server";
import { getStudy, countInterviews, createInterview } from "@/lib/db";
import { MAX_INTERVIEWS } from "@/lib/flags";
import { CONSENT_VERSION } from "@/lib/consent";

export const runtime = "nodejs";

// Called once the respondent accepts consent. Enforces the spend cap, then creates
// the interview row and returns its id (the server-side handle for the session).
export async function POST(req: NextRequest) {
  try {
    const { studyId } = (await req.json()) as { studyId: string };
    const study = await getStudy(studyId);
    if (!study || study.status !== "active") {
      return NextResponse.json(
        { error: "Study not found or not accepting responses" },
        { status: 404 },
      );
    }
    // Spend cap: stop starting new interviews once the study is full.
    if ((await countInterviews(studyId)) >= MAX_INTERVIEWS) {
      return NextResponse.json({ full: true });
    }
    const { id: interviewId, refCode } = await createInterview(
      studyId,
      CONSENT_VERSION,
    );
    return NextResponse.json({ interviewId, refCode });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start" },
      { status: 500 },
    );
  }
}
