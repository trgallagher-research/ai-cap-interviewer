import { NextResponse, type NextRequest } from "next/server";
import { cookieSecure, ORG_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/** POST → 204, cookie cleared. */
export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(ORG_COOKIE, "", { httpOnly: true, secure: cookieSecure(req), sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
