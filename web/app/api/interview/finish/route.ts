import type { NextRequest } from "next/server";
import { assembleProfile, chatJson, Interview, profileMessages } from "@/lib/aiwd/engine";
import { errorResponse, isInterviewId, jsonError, noStore, readJson } from "@/lib/http";
import { getLlm } from "@/lib/llm";
import { memberResult } from "@/lib/member";
import { acquireLock, getInterview, releaseLock, saveInterview, saveProfile } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST {interviewId} → {feedback, ratings:[{task, rating|null}], endedEarly}.
 * Builds and stores the full Profile (organiser-only) and returns only the member-safe subset.
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
    const token = await acquireLock(id);
    if (!token) return jsonError(409, "Your feedback is already being prepared.", "busy");
    try {
      rec = await getInterview(id);
      if (!rec) return jsonError(404, "Interview not found", "not_found");
      if (rec.result) return noStore(rec.result);
      const iv = Interview.fromJSON(rec.state, getLlm());
      const out = await chatJson(iv.llm, profileMessages(iv), { tier: "reasoning" });
      const profile = assembleProfile(iv, out, "live");
      await saveProfile(profile);
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
