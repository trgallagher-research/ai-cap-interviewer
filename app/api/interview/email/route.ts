import { NextRequest, NextResponse } from "next/server";
import {
  setEmailPrefs,
  getInterview,
  getStudy,
  getRespondentReport,
  markIndividualReportSent,
  markAnalysisSent,
} from "@/lib/db";
import { getOrBuildAnalysis } from "@/lib/analysis";
import { frameworkLabel } from "@/lib/frameworks";
import { emailEnabled, sendEmail } from "@/lib/email";
import {
  individualReportEmail,
  frameworkAnalysisEmail,
} from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const maxDuration = 60;

// Optional email opt-in captured at the very end of an interview, with the two
// granular opt-ins (a copy of their own summary, and/or the overall findings later).
// If they opted into the individual copy and email is configured, send it now.
export async function POST(req: NextRequest) {
  try {
    const { interviewId, email, wantsIndividual, wantsAggregate, wantsAnalysis } =
      (await req.json()) as {
        interviewId: string;
        email: string;
        wantsIndividual?: boolean;
        wantsAggregate?: boolean;
        wantsAnalysis?: boolean;
      };
    if (!interviewId || !email?.trim()) {
      return NextResponse.json(
        { error: "interviewId and email are required" },
        { status: 400 },
      );
    }

    await setEmailPrefs(interviewId, {
      email: email.trim(),
      wantsIndividual: !!wantsIndividual,
      wantsAggregate: !!wantsAggregate,
      wantsAnalysis: !!wantsAnalysis,
    });

    // Send the individual report immediately if they asked for it and email is set up.
    // Failures here must NOT fail the request — the report is shown on-screen anyway.
    if (wantsIndividual && emailEnabled()) {
      try {
        const report = await getRespondentReport(interviewId);
        if (report) {
          const interview = await getInterview(interviewId);
          const { subject, html, text } = individualReportEmail(report, {
            refCode: interview?.ref_code ?? undefined,
            deleteUrl: `${req.nextUrl.origin}/delete`,
          });
          await sendEmail({ to: email.trim(), subject, html, text });
          await markIndividualReportSent(interviewId);
        }
      } catch (e) {
        console.error("individual report email failed", e);
      }
    }

    // Send the framework reflection if they opted in and the study has a lens configured.
    // Generated on demand (cached from the completion screen in the common case). Same
    // non-fatal contract: a failure here must not fail the opt-in request.
    if (wantsAnalysis && emailEnabled()) {
      try {
        const { analysis } = await getOrBuildAnalysis(interviewId);
        if (analysis) {
          const interview = await getInterview(interviewId);
          const study = interview ? await getStudy(interview.study_id) : null;
          const label = (study && frameworkLabel(study)) || "a chosen framework";
          const { subject, html, text } = frameworkAnalysisEmail(analysis, {
            frameworkLabel: label,
            refCode: interview?.ref_code ?? undefined,
            deleteUrl: `${req.nextUrl.origin}/delete`,
          });
          await sendEmail({ to: email.trim(), subject, html, text });
          await markAnalysisSent(interviewId);
        }
      } catch (e) {
        console.error("framework analysis email failed", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
