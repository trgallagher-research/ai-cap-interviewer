import type { NextRequest } from "next/server";
import { assembleProfile, chatJson, Interview, profileMessages } from "@/lib/aiwd/engine";
import { errorResponse, isInterviewId, jsonError, noStore, readJson } from "@/lib/http";
import { getLlm } from "@/lib/llm";
import { memberResult } from "@/lib/member";
import { sendReport } from "@/lib/email";
import { acquireLock, getInterview, getSettings, newReportToken, releaseLock, saveInterview, saveProfile, saveReportToken, withinLimit } from "@/lib/store";

/** Absolute base for links in emails: PUBLIC_BASE_URL, else the request's own origin. */
function baseUrl(req: NextRequest): string {
  return (process.env.PUBLIC_BASE_URL || req.nextUrl.origin).replace(/\/+$/, "");
}

export const runtime = "nodejs";
export const maxDuration = 300; // profile and generation calls can exceed 60 s; allowed with Vercel Fluid compute (default for new projects)

/**
 * POST {interviewId} → {feedback, ratings:[{task, rating|null}], endedEarly}.
 * Builds and stores the full Profile (organiser-only) and returns only the member-safe subset,
 * plus the private report link token. Emails the report when the member gave an address, the
 * organiser's setting collects emails, and sending is configured.
 * Idempotent: a second call returns the stored result without another model call.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const id = body.interviewId;
    if (!isInterviewId(id)) return jsonError(404, "Interview not found", "not_found");
    let rec = await getInterview(id);
    if (!rec) return jsonError(404, "Interview not found", "not_found");
    if (rec.result) return noStore(rec.result);
    if (rec.state.status !== "complete" && rec.state.status !== "ended_early") {
      return jsonError(409, "The interview is not finished yet.", "not_finished");
    }
    // Cap model attempts per interview: a profile that keeps failing must not become a paid loop.
    if (!(await withinLimit("finish:" + id, 3, 60 * 24 * 60 * 60))) {
      return jsonError(429, "We could not prepare your feedback this time. Your answers are saved for the organiser.", "limit");
    }
    const token = await acquireLock(id, 300_000);
    if (!token) return jsonError(409, "Your feedback is already being prepared.", "busy");
    try {
      rec = await getInterview(id);
      if (!rec) return jsonError(404, "Interview not found", "not_found");
      if (rec.result) return noStore(rec.result);
      const iv = Interview.fromJSON(rec.state, getLlm({ kind: "profile", interviewId: id }));
      const out = await chatJson(iv.llm, profileMessages(iv), { tier: "reasoning" });
      const profile = assembleProfile(iv, out, "live");
      profile.interviewId = id;
      profile.reportToken = newReportToken();
      if (rec.email) profile.member.email = rec.email;
      await saveProfile(profile);
      await saveReportToken(profile.reportToken, profile.id);
      if (rec.email && (await getSettings()).emailMode !== "none") {
        const state = await sendReport(rec.email, profile.member.name, profile.feedback, baseUrl(req) + "/r/" + profile.reportToken);
        profile.emailStatus = { state, at: new Date().toISOString() };
        await saveProfile(profile);
      }
      rec.profileId = profile.id;
      rec.result = memberResult(profile);
      await saveInterview(rec);
      return noStore(rec.result);
    } finally {
      await releaseLock(id, token);
    }
  } catch (err) {
    return errorResponse(err);
  }
}
