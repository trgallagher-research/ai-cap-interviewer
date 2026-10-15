import type { NextRequest } from "next/server";
import { Interview } from "@/lib/aiwd/engine";
import { safeEqual } from "@/lib/auth";
import { clientIp, errorResponse, jsonError, noStore, readJson } from "@/lib/http";
import { isEmail } from "@/lib/email";
import { allowStart, getSettings, newInterviewId, reserveInterviewSlot, saveInterview } from "@/lib/store";
import { cleanText, LIMITS_INPUT, validateAnswers } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST {name, role, email?, lang?, answers, accessCode?} → {interviewId}. No model call here.
 *  lang "nl" runs the interview and feedback in Dutch; anything else is English.
 *  Email follows the organiser's setting: required, optional, or not collected (ignored). */
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const name = cleanText(body.name, "name", LIMITS_INPUT.name, true);
    const role = cleanText(body.role, "role", LIMITS_INPUT.role, true);
    const answers = validateAnswers(body.answers);
    const { emailMode } = await getSettings();
    let email = "";
    if (emailMode !== "none") {
      email = cleanText(body.email, "email", 200, false).toLowerCase();
      if (email && !isEmail(email)) return jsonError(400, "That email address does not look right.", "email");
      if (!email && emailMode === "required") return jsonError(400, "Please enter your email address so we can send you your report.", "email");
    }

    const required = process.env.MEMBER_ACCESS_CODE || "";
    // On a production deployment, starts need an access code unless the site is deliberately open:
    // without one, anyone with the URL could fill every interview slot and spend the budget.
    if (!required && process.env.VERCEL_ENV === "production" && process.env.ALLOW_OPEN_START !== "1") {
      return jsonError(503, "The interview is not open yet. Please use the link from your invitation.", "not_configured");
    }
    if (required) {
      const got = typeof body.accessCode === "string" ? body.accessCode.trim().slice(0, LIMITS_INPUT.accessCode) : "";
      if (!got || !safeEqual(got.toLowerCase(), required.trim().toLowerCase())) {
        return jsonError(403, "That access code is not right. Check the invite link or ask the organiser.", "access_code");
      }
    }
    if (!(await allowStart(clientIp(req)))) {
      return jsonError(429, "Too many interviews started from this connection. Please try again in an hour.", "rate_limited");
    }
    if (!(await reserveInterviewSlot())) {
      return jsonError(503, "The pilot is full: the maximum number of interviews has been reached. Thank you for your interest.", "full");
    }

    const iv = new Interview({ name, role }, answers);
    if (body.lang === "nl") iv.lang = "nl";
    const now = new Date().toISOString();
    const id = newInterviewId();
    await saveInterview({ id, state: iv.toJSON(), createdAt: now, updatedAt: now, ...(email ? { email } : {}) });
    return noStore({ interviewId: id });
  } catch (err) {
    return errorResponse(err);
  }
}
