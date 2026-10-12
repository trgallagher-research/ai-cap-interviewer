import { NextRequest, NextResponse } from "next/server";
import { generateStructured, MODELS } from "@/lib/anthropic";
import {
  getInterview,
  getTranscript,
  getRespondentReport,
  saveRespondentReport,
} from "@/lib/db";
import {
  RESPONDENT_REPORT_SYSTEM,
  buildRespondentReportUserPrompt,
  RESPONDENT_REPORT_SCHEMA,
} from "@/lib/prompts";
import type { RespondentReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Below this much respondent text we don't bother summarising — there's nothing to
// reflect back, and we'd rather show a plain thank-you than a hollow report.
const MIN_RESPONDENT_CHARS = 200;

// Respondent-facing summary of their OWN interview. No creator auth — the interviewId
// is the bearer, the same trust model as /api/interview/turn (the respondent holds it
// in their session). Never returns the creator-facing Synthesis / objectives.
export async function GET(req: NextRequest) {
  const interviewId = req.nextUrl.searchParams.get("interviewId");
  if (!interviewId) {
    return NextResponse.json({ error: "interviewId required" }, { status: 400 });
  }
  return NextResponse.json({ report: await getRespondentReport(interviewId) });
}

export async function POST(req: NextRequest) {
  try {
    const { interviewId } = (await req.json()) as { interviewId: string };
    if (!interviewId) {
      return NextResponse.json({ error: "interviewId required" }, { status: 400 });
    }

    const interview = await getInterview(interviewId);
    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Only summarise a finished conversation (normal or graceful early exit).
    if (!["completed", "completed_early"].includes(interview.status)) {
      return NextResponse.json({ error: "Interview not complete" }, { status: 409 });
    }

    // Return the cached report if we already made one (guards repeat POSTs / cost).
    const cached = await getRespondentReport(interviewId);
    if (cached) return NextResponse.json({ report: cached });

    const turns = await getTranscript(interviewId);
    const respondentTurns = turns.filter((t) => t.role === "respondent");
    const respondentChars = respondentTurns.reduce((n, t) => n + t.text.length, 0);
    if (respondentTurns.length < 2 || respondentChars < MIN_RESPONDENT_CHARS) {
      return NextResponse.json({ report: null, tooShort: true });
    }

    const transcriptText = turns
      .map((t) => `${t.role === "interviewer" ? "Interviewer" : "You"}: ${t.text}`)
      .join("\n");

    const report = await generateStructured<RespondentReport>({
      system: RESPONDENT_REPORT_SYSTEM,
      user: buildRespondentReportUserPrompt(transcriptText),
      schema: RESPONDENT_REPORT_SCHEMA,
      model: MODELS.interview, // Sonnet — lighter/faster for a warm summary
      thinking: false, // a recap needs no deep reasoning; keeps the on-screen wait short
      maxTokens: 1500,
    });

    await saveRespondentReport(interviewId, interview.study_id, report);
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build report" },
      { status: 500 },
    );
  }
}
