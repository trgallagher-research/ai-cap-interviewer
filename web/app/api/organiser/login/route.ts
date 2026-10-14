import { NextResponse, type NextRequest } from "next/server";
import { accountForPasscode, accounts, CLOSED_MESSAGE, cookieForId, cookieSecure, ORG_COOKIE, ORG_COOKIE_MAX_AGE, organiserClosed } from "@/lib/auth";
import { clientIp, errorResponse, jsonError, readJson } from "@/lib/http";
import { audit, counterValue, resetCounter, withinLimit } from "@/lib/store";

export const runtime = "nodejs";

/** POST {passcode} → 204 + httpOnly cookie for the matching account; 401 on a wrong passcode; 503 when not configured. */
export async function POST(req: NextRequest) {
  try {
    if (organiserClosed()) return jsonError(503, CLOSED_MESSAGE, "organiser_closed");
    const body = await readJson(req, 4000);
    if (!accounts().length) return new NextResponse(null, { status: 204 }); // dev without accounts: open
    const ipKey = "login:" + clientIp(req);
    if ((await counterValue(ipKey)) >= 10) {
      return jsonError(429, "Too many attempts. Please wait 15 minutes and try again.", "rate_limited");
    }
    const who = await accountForPasscode(typeof body.passcode === "string" ? body.passcode : "");
    const cookie = who ? await cookieForId(who.id) : null;
    if (!who || !cookie) {
      await withinLimit(ipKey, 10, 15 * 60); // count the failure (10 per 15 minutes per IP)
      await new Promise((r) => setTimeout(r, 400)); // slow down guessing
      return jsonError(401, "That passcode is not right.", "unauthorised");
    }
    await resetCounter(ipKey);
    await audit(who, "signed in");
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(ORG_COOKIE, cookie, {
      httpOnly: true, secure: cookieSecure(req), sameSite: "lax", path: "/", maxAge: ORG_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
