/* auth.ts: organiser accounts + signed cookie. Web Crypto only, so it runs in middleware (edge)
 * and in Node route handlers alike.
 *
 * Accounts come from ORGANISER_ACCOUNTS, a JSON array of
 *   {"id": "tim", "name": "Tim", "role": "owner" | "organiser", "passcode": "…"}
 * Each person has their own passcode; owners also see costs and the activity log. Without
 * ORGANISER_ACCOUNTS, ORGANISER_PASSCODE alone is one owner account (the original single-passcode setup).
 *
 * Cookie `aiwd_org` = "<account id>.<hex HMAC-SHA256(key = AUTH_SECRET || first passcode,
 *                       msg = "aiwd-organiser-v2:" + id + ":" + passcode)>".
 * Removing an account, or changing its passcode or AUTH_SECRET, invalidates that person's cookie.
 * Production without any account → organiser area closed (503), never open.
 * Development (`next dev`) without accounts → open as a dev owner, for local work only.
 */
import { NextResponse, type NextRequest } from "next/server";

export const ORG_COOKIE = "aiwd_org";
export const ORG_COOKIE_MAX_AGE = 14 * 24 * 60 * 60;

export type OrganiserRole = "owner" | "organiser";
export interface OrganiserAccount { id: string; name: string; role: OrganiserRole; passcode: string }
/** What routes and pages may know about the signed-in organiser (never the passcode). */
export interface Organiser { id: string; name: string; role: OrganiserRole }

export type OrganiserAccess = "ok" | "unauthorised" | "closed";

export const CLOSED_MESSAGE =
  "The organiser area is closed because no organiser account is set (ORGANISER_ACCOUNTS or ORGANISER_PASSCODE). Set it in Vercel under Project → Settings → Environment Variables, then redeploy.";

/** Parsed accounts; invalid entries (no id, or a passcode under 8 characters) are ignored. */
export function accounts(): OrganiserAccount[] {
  const raw = process.env.ORGANISER_ACCOUNTS;
  if (raw) {
    try {
      const list = JSON.parse(raw) as unknown;
      if (Array.isArray(list)) {
        const out: OrganiserAccount[] = [];
        for (const a of list as Record<string, unknown>[]) {
          const id = typeof a?.id === "string" ? a.id.trim() : "";
          const passcode = typeof a?.passcode === "string" ? a.passcode : "";
          if (!/^[a-z0-9_-]{1,32}$/i.test(id) || passcode.length < 8 || out.some((x) => x.id === id)) continue;
          out.push({ id, name: typeof a.name === "string" && a.name.trim() ? a.name.trim().slice(0, 60) : id, role: a.role === "owner" ? "owner" : "organiser", passcode });
        }
        return out;
      }
    } catch { /* fall through: a broken value closes the area rather than opening it */ }
    return [];
  }
  const pc = process.env.ORGANISER_PASSCODE || "";
  return pc ? [{ id: "owner", name: "Organiser", role: "owner", passcode: pc }] : [];
}

function configured(): boolean { return !!(process.env.ORGANISER_ACCOUNTS || process.env.ORGANISER_PASSCODE); }

export function organiserClosed(): boolean {
  return process.env.NODE_ENV === "production" && accounts().length === 0;
}

/** Development without any account configured: the organiser area is open (never in production). */
function devOpen(): boolean {
  return !configured() && process.env.NODE_ENV !== "production";
}
const DEV_ORGANISER: Organiser = { id: "dev", name: "Developer", role: "owner" };

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

function cookieKey(list: OrganiserAccount[]): string {
  return process.env.AUTH_SECRET || (list[0] ? list[0].passcode : "");
}

export async function cookieFor(account: OrganiserAccount): Promise<string> {
  return account.id + "." + (await hmacHex(cookieKey(accounts()), "aiwd-organiser-v2:" + account.id + ":" + account.passcode));
}

const pub = (a: OrganiserAccount): Organiser => ({ id: a.id, name: a.name, role: a.role });

/** The account whose passcode matches, compared in constant time against every account. */
export async function accountForPasscode(submitted: string): Promise<Organiser | null> {
  const key = "aiwd-passcode-compare";
  const got = await hmacHex(key, String(submitted || ""));
  let found: OrganiserAccount | null = null;
  for (const a of accounts()) {
    if (safeEqual(got, await hmacHex(key, a.passcode)) && !found) found = a;
  }
  return found ? pub(found) : null;
}

/** Cookie for a signed-in organiser (by id; the passcode is never sent back). */
export async function cookieForId(id: string): Promise<string | null> {
  const a = accounts().find((x) => x.id === id);
  return a ? cookieFor(a) : null;
}

/** The signed-in organiser, or null. */
export async function currentOrganiser(req: NextRequest): Promise<Organiser | null> {
  if (devOpen()) return DEV_ORGANISER;
  const got = req.cookies.get(ORG_COOKIE)?.value || "";
  const dot = got.indexOf(".");
  if (dot <= 0) return null;
  const a = accounts().find((x) => x.id === got.slice(0, dot));
  if (!a) return null;
  return safeEqual(got, await cookieFor(a)) ? pub(a) : null;
}

export async function organiserAccess(req: NextRequest): Promise<OrganiserAccess> {
  if (organiserClosed()) return "closed";
  return (await currentOrganiser(req)) ? "ok" : "unauthorised";
}

/**
 * For organiser route handlers: {organiser} when allowed, else {denied: response}.
 * With {owner: true}, organisers who are not owners get 403.
 */
export async function requireOrganiser(req: NextRequest, opts?: { owner?: boolean }): Promise<{ organiser: Organiser; denied?: undefined } | { organiser?: undefined; denied: NextResponse }> {
  if (organiserClosed()) return { denied: NextResponse.json({ error: CLOSED_MESSAGE, code: "organiser_closed" }, { status: 503 }) };
  const o = await currentOrganiser(req);
  if (!o) return { denied: NextResponse.json({ error: "Organiser login required", code: "unauthorised" }, { status: 401 }) };
  if (opts?.owner && o.role !== "owner") return { denied: NextResponse.json({ error: "Only the owner can see this.", code: "forbidden" }, { status: 403 }) };
  return { organiser: o };
}

/** Secure whenever the request reached us over HTTPS (always on Vercel); plain-http local
 *  `next start` (tests) gets a non-Secure cookie so clients there keep sending it. */
export function cookieSecure(req: NextRequest): boolean {
  const xfp = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  return req.nextUrl.protocol === "https:" || xfp === "https";
}
