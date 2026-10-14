import { NextResponse, type NextRequest } from "next/server";
import { CLOSED_MESSAGE, cookieSecure, expectedCookie, ORG_COOKIE, ORG_COOKIE_MAX_AGE, organiserClosed, passcodeMatches } from "@/lib/auth";
import { errorResponse, jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";

/** POST {passcode} → 204 + httpOnly cookie; 401 on a wrong passcode; 503 when not configured. */
export async function POST(req: NextRequest) {
  try {
    if (organiserClosed()) return jsonError(503, CLOSED_MESSAGE, "organiser_closed");
    const body = await readJson(req, 4000);
    if (!process.env.ORGANISER_PASSCODE) return new NextResponse(null, { status: 204 }); // dev without passcode: open
    if (!(await passcodeMatches(typeof body.passcode === "string" ? body.passcode : ""))) {
      await new Promise((r) => setTimeout(r, 400)); // slow down guessing
      return jsonError(401, "That passcode is not right.", "unauthorised");
    }
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(ORG_COOKIE, await expectedCookie(), {
      httpOnly: true, secure: cookieSecure(req), sameSite: "lax", path: "/", maxAge: ORG_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
