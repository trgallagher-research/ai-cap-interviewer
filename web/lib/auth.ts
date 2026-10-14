/* auth.ts: organiser passcode + signed cookie. Web Crypto only, so it runs in middleware (edge)
 * and in Node route handlers alike.
 *
 * Cookie `aiwd_org` = hex HMAC-SHA256(key = AUTH_SECRET || ORGANISER_PASSCODE,
 *                                     msg = "aiwd-organiser-v1:" + ORGANISER_PASSCODE).
 * Changing the passcode or AUTH_SECRET invalidates every cookie.
 * Production without ORGANISER_PASSCODE → organiser area closed (503), never open.
 * Development (`next dev`) without a passcode → open, for local work only.
 */
import { NextResponse, type NextRequest } from "next/server";

export const ORG_COOKIE = "aiwd_org";
export const ORG_COOKIE_MAX_AGE = 14 * 24 * 60 * 60;

export type OrganiserAccess = "ok" | "unauthorised" | "closed";

export const CLOSED_MESSAGE =
  "The organiser area is closed because ORGANISER_PASSCODE is not set. Set it in Vercel under Project → Settings → Environment Variables, then redeploy.";

function passcode(): string { return process.env.ORGANISER_PASSCODE || ""; }

export function organiserClosed(): boolean {
  return !passcode() && process.env.NODE_ENV === "production";
}

/** Development without a passcode: the organiser area is open (never in production). */
function devOpen(): boolean {
  return !passcode() && process.env.NODE_ENV !== "production";
}

const enc = new TextEncoder();

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare (lengths are fixed hex digests in practice). */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function expectedCookie(): Promise<string> {
  const pc = passcode();
  return hmacHex(process.env.AUTH_SECRET || pc, "aiwd-organiser-v1:" + pc);
}

/** Compare a submitted passcode with ORGANISER_PASSCODE in constant time (via HMAC digests). */
export async function passcodeMatches(submitted: string): Promise<boolean> {
  const pc = passcode();
  if (!pc) return false;
  const key = "aiwd-passcode-compare";
  const [a, b] = await Promise.all([hmacHex(key, String(submitted || "")), hmacHex(key, pc)]);
  return safeEqual(a, b);
}

export async function organiserAccess(req: NextRequest): Promise<OrganiserAccess> {
  if (organiserClosed()) return "closed";
  if (devOpen()) return "ok";
  const got = req.cookies.get(ORG_COOKIE)?.value || "";
  if (!got) return "unauthorised";
  return safeEqual(got, await expectedCookie()) ? "ok" : "unauthorised";
}

/** For organiser route handlers: null when allowed, else the error response to return. */
export async function requireOrganiser(req: NextRequest): Promise<NextResponse | null> {
  const access = await organiserAccess(req);
  if (access === "ok") return null;
  if (access === "closed") return NextResponse.json({ error: CLOSED_MESSAGE, code: "organiser_closed" }, { status: 503 });
  return NextResponse.json({ error: "Organiser login required", code: "unauthorised" }, { status: 401 });
}

/** Secure whenever the request reached us over HTTPS (always on Vercel); plain-http local
 *  `next start` (tests) gets a non-Secure cookie so clients there keep sending it. */
export function cookieSecure(req: NextRequest): boolean {
  const xfp = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  return req.nextUrl.protocol === "https:" || xfp === "https";
}
