import { supabaseAdmin } from "./supabase";
import type {
  AnalysisFramework,
  CustomFramework,
  FrameworkReflection,
  Guide,
  Intro,
  PublicAggregateReport,
  RespondentReport,
  Role,
  Synthesis,
  Turn,
} from "./types";

export interface StudyRow {
  id: string;
  title: string;
  topic: string;
  guide: Guide;
  intro: Intro | null;
  target_minutes: number | null;
  /** Optional respondent-facing framework reflection; null = feature off (migration 0004). */
  analysis_framework: AnalysisFramework | null;
  analysis_framework_custom: CustomFramework | null;
  visibility: "public" | "controlled";
  status: "draft" | "active" | "closed";
}

/** Fetch a study (with its interview guide + landing intro) by id. */
export async function getStudy(studyId: string): Promise<StudyRow | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("studies")
    .select(
      "id,title,topic,guide,intro,target_minutes,analysis_framework,analysis_framework_custom,visibility,status",
    )
    .eq("id", studyId)
    .single();
  if (error || !data) return null;
  return data as StudyRow;
}

/** Short, human-quotable reference code respondents can cite for a deletion request. */
function makeRefCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `INT-${code}`;
}

/** Create an interview row once consent is given. Returns the new interview id + ref code. */
export async function createInterview(
  studyId: string,
  consentVersion: string,
): Promise<{ id: string; refCode: string }> {
  const sb = supabaseAdmin();
  const refCode = makeRefCode();
  const { data, error } = await sb
    .from("interviews")
    .insert({
      study_id: studyId,
      consent_version: consentVersion,
      consent_at: new Date().toISOString(),
      ref_code: refCode,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create interview: ${error?.message}`);
  }
  return { id: data.id as string, refCode };
}

/** Append one turn, written live as the conversation streams. */
export async function appendTurn(
  interviewId: string,
  role: Role,
  text: string,
  idx: number,
): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("turns")
    .insert({ interview_id: interviewId, role, text, idx });
  if (error) throw new Error(`Failed to append turn: ${error.message}`);
  await sb
    .from("interviews")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", interviewId);
}

/** Ordered transcript for an interview (the server-side source of truth). */
export async function getTranscript(interviewId: string): Promise<Turn[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("turns")
    .select("role,text")
    .eq("interview_id", interviewId)
    .order("idx", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({ role: r.role as Role, text: r.text as string }));
}

/** Mark an interview completed (status only — email is captured separately). */
export async function markCompleted(interviewId: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", interviewId);
}

/** Mark an interview as a graceful early exit (kept for per-interview synthesis,
 *  excluded from cross-study aggregation). */
export async function markCompletedEarly(
  interviewId: string,
  reason?: string,
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({
      status: "completed_early",
      exit_reason: reason ?? "respondent ended early",
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId);
}

/** Delete an interview (and its turns, via cascade) by its respondent-facing ref
 *  code. Returns true if a row was deleted. Powers the GDPR self-serve erasure. */
export async function deleteInterviewByRefCode(
  refCode: string,
): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("interviews")
    .delete()
    .eq("ref_code", refCode.trim())
    .select("id");
  if (error) throw new Error(`Failed to delete interview: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Store the optional opt-in email + what the respondent agreed to receive, captured
 *  at the end of an interview. Stamps email_consent_at so it's clear when they agreed. */
export async function setEmailPrefs(
  interviewId: string,
  prefs: {
    email: string;
    wantsIndividual: boolean;
    wantsAggregate: boolean;
    wantsAnalysis?: boolean;
  },
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({
      email: prefs.email,
      wants_individual_report: prefs.wantsIndividual,
      wants_aggregate_report: prefs.wantsAggregate,
      wants_analysis_report: !!prefs.wantsAnalysis,
      email_consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId);
}

/** Stamp that the respondent's individual report email has been sent. */
export async function markIndividualReportSent(interviewId: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({ individual_report_sent_at: new Date().toISOString() })
    .eq("id", interviewId);
}

/** Stamp that the respondent's framework analysis email has been sent. */
export async function markAnalysisSent(interviewId: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({ analysis_report_sent_at: new Date().toISOString() })
    .eq("id", interviewId);
}

// --- Reports (respondent-facing, stored in `syntheses` by `kind`) ----------------

/** Cached respondent-facing report for one interview, if generated. */
export async function getRespondentReport(
  interviewId: string,
): Promise<RespondentReport | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("syntheses")
    .select("content")
    .eq("interview_id", interviewId)
    .eq("kind", "respondent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as RespondentReport) ?? null;
}

/** Replace any cached respondent report for this interview with a fresh one. */
export async function saveRespondentReport(
  interviewId: string,
  studyId: string,
  content: RespondentReport,
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("syntheses")
    .delete()
    .eq("interview_id", interviewId)
    .eq("kind", "respondent");
  await sb.from("syntheses").insert({
    study_id: studyId,
    interview_id: interviewId,
    kind: "respondent",
    content,
  });
}

/** Cached respondent-facing framework reflection for one interview, if generated. */
export async function getRespondentAnalysis(
  interviewId: string,
): Promise<FrameworkReflection | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("syntheses")
    .select("content")
    .eq("interview_id", interviewId)
    .eq("kind", "respondent_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as FrameworkReflection) ?? null;
}

/** Replace any cached framework reflection for this interview with a fresh one. */
export async function saveRespondentAnalysis(
  interviewId: string,
  studyId: string,
  content: FrameworkReflection,
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("syntheses")
    .delete()
    .eq("interview_id", interviewId)
    .eq("kind", "respondent_analysis");
  await sb.from("syntheses").insert({
    study_id: studyId,
    interview_id: interviewId,
    kind: "respondent_analysis",
    content,
  });
}

/** The cached creator-facing cross-study synthesis (source for the lay aggregate). */
export async function getCrossSynthesis(studyId: string): Promise<Synthesis | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("syntheses")
    .select("content")
    .eq("study_id", studyId)
    .is("interview_id", null)
    .eq("kind", "cross")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as Synthesis) ?? null;
}

/** Cached respondent-facing aggregate report for a study, if generated. */
export async function getPublicAggregate(
  studyId: string,
): Promise<PublicAggregateReport | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("syntheses")
    .select("content")
    .eq("study_id", studyId)
    .is("interview_id", null)
    .eq("kind", "aggregate_public")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as PublicAggregateReport) ?? null;
}

/** Replace the cached public aggregate report for a study. */
export async function savePublicAggregate(
  studyId: string,
  content: PublicAggregateReport,
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("syntheses")
    .delete()
    .eq("study_id", studyId)
    .is("interview_id", null)
    .eq("kind", "aggregate_public");
  await sb.from("syntheses").insert({
    study_id: studyId,
    interview_id: null,
    kind: "aggregate_public",
    content,
  });
}

/** Opted-in recipients for the aggregate report who haven't been sent it yet. */
export async function listAggregateRecipients(
  studyId: string,
): Promise<{ id: string; email: string }[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("interviews")
    .select("id,email")
    .eq("study_id", studyId)
    .eq("wants_aggregate_report", true)
    .not("email", "is", null)
    .is("aggregate_report_sent_at", null);
  return (data ?? []).map((r) => ({ id: r.id as string, email: r.email as string }));
}

/** Count opted-in aggregate recipients (pending vs already sent), for the studio UI. */
export async function countAggregateRecipients(
  studyId: string,
): Promise<{ pending: number; sent: number }> {
  const sb = supabaseAdmin();
  const base = () =>
    sb
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("study_id", studyId)
      .eq("wants_aggregate_report", true)
      .not("email", "is", null);
  const { count: pending } = await base().is("aggregate_report_sent_at", null);
  const { count: sent } = await base().not("aggregate_report_sent_at", "is", null);
  return { pending: pending ?? 0, sent: sent ?? 0 };
}

/** Stamp that the aggregate report email has been sent to this interview's address. */
export async function markAggregateSent(interviewId: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("interviews")
    .update({ aggregate_report_sent_at: new Date().toISOString() })
    .eq("id", interviewId);
}

/** Load an interview's id/study/status/ref_code (server source of truth for the flow). */
export async function getInterview(
  interviewId: string,
): Promise<{
  id: string;
  study_id: string;
  status: string;
  ref_code: string | null;
} | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("interviews")
    .select("id,study_id,status,ref_code")
    .eq("id", interviewId)
    .single();
  return data ?? null;
}

/** Count interviews for a study (used by the spend cap). */
export async function countInterviews(studyId: string): Promise<number> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("study_id", studyId);
  return count ?? 0;
}
