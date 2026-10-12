import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { generateStructured, MODELS } from "@/lib/anthropic";
import {
  AGGREGATE_PUBLIC_SYSTEM,
  buildAggregatePublicUserPrompt,
  AGGREGATE_PUBLIC_SCHEMA,
} from "@/lib/prompts";
import {
  getCrossSynthesis,
  getPublicAggregate,
  savePublicAggregate,
  listAggregateRecipients,
  markAggregateSent,
  countAggregateRecipients,
} from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { aggregateReportEmail } from "@/lib/emailTemplates";
import type { PublicAggregateReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Authorize: the caller must own the study. Returns its title, or null.
async function ownStudy(studyId: string): Promise<{ title: string } | null> {
  const creator = await getCreator();
  if (!creator) return null;
  const { data } = await creator.supabase
    .from("studies")
    .select("id,title")
    .eq("id", studyId)
    .single();
  return data ? { title: data.title as string } : null;
}

// Recipient counts for the studio UI (how many are waiting / already sent).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const { studyId } = await params;
  if (!(await ownStudy(studyId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const counts = await countAggregateRecipients(studyId);
  return NextResponse.json({ ...counts, emailEnabled: emailEnabled() });
}

// Email the lay aggregate report to every opted-in respondent not yet sent it.
// Idempotent: each send stamps aggregate_report_sent_at, so re-running only mails new
// opt-ins.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const { studyId } = await params;
  const study = await ownStudy(studyId);
  if (!study) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailEnabled()) {
    return NextResponse.json(
      { error: "Email sending is not configured (set RESEND_API_KEY)." },
      { status: 400 },
    );
  }

  // Ensure a lay aggregate report exists, derived from the cached cross synthesis
  // (themes + quotes only — coverage is dropped so the agenda can't leak).
  let report = await getPublicAggregate(studyId);
  if (!report) {
    const cross = await getCrossSynthesis(studyId);
    if (!cross) {
      return NextResponse.json(
        { error: "Generate the cross-study synthesis first." },
        { status: 400 },
      );
    }
    try {
      report = await generateStructured<PublicAggregateReport>({
        system: AGGREGATE_PUBLIC_SYSTEM,
        user: buildAggregatePublicUserPrompt(cross.themes, cross.quotes),
        schema: AGGREGATE_PUBLIC_SCHEMA,
        model: MODELS.interview,
        maxTokens: 2000,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to build report" },
        { status: 500 },
      );
    }
    await savePublicAggregate(studyId, report);
  }

  const recipients = await listAggregateRecipients(studyId);
  const { subject, html, text } = aggregateReportEmail(report, {
    studyTitle: study.title,
  });

  // Sequential to stay within Resend's free-tier rate limits.
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await sendEmail({ to: r.email, subject, html, text });
      await markAggregateSent(r.id);
      sent++;
    } catch (e) {
      console.error("aggregate email failed", r.email, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
