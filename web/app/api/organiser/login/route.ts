import { NextResponse, type NextRequest } from "next/server";
import { CLOSED_MESSAGE, cookieSecure, expectedCookie, ORG_COOKIE, ORG_COOKIE_MAX_AGE, organiserClosed, passcodeMatches } from "@/lib/auth";
import { clientIp, errorResponse, jsonError, readJson } from "@/lib/http";
import { counterValue, resetCounter, withinLimit } from "@/lib/store";

export const runtime = "nodejs";

/** POST {passcode} → 204 + httpOnly cookie; 401 on a wrong passcode; 503 when not configured. */
export async function POST(req: NextRequest) {
  try {
    if (organiserClosed()) return jsonError(503, CLOSED_MESSAGE, "organiser_closed");
    const body = await readJson(req, 4000);
    if (!process.env.ORGANISER_PASSCODE) return new NextResponse(null, { status: 204 }); // dev without passcode: open
    const ipKey = "login:" + clientIp(req);
    if ((await counterValue(ipKey)) >= 10) {
      return jsonError(429, "Too many attempts. Please wait 15 minutes and try again.", "rate_limited");
    }
    if (!(await passcodeMatches(typeof body.passcode === "string" ? body.passcode : ""))) {
      await withinLimit(ipKey, 10, 15 * 60); // count the failure (10 per 15 minutes per IP)
      await new Promise((r) => setTimeout(r, 400)); // slow down guessing
      return jsonError(401, "That passcode is not right.", "unauthorised");
    }
    await resetCounter(ipKey);
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(ORG_COOKIE, await expectedCookie(), {
      httpOnly: true, secure: cookieSecure(req), sameSite: "lax", path: "/", maxAge: ORG_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
