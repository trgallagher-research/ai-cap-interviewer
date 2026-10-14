/* store.ts: server-side persistence. SERVER-ONLY.
 *
 * Upstash Redis when KV_REST_API_URL/KV_REST_API_TOKEN (Vercel Marketplace integration) or
 * UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are set; otherwise an in-memory store
 * (local dev and tests only: lost on restart, not shared between serverless instances).
 *
 * Keys (all prefixed "aiwd:"):
 *   aiwd:iv:{id}            interview record (state + finish result), TTL 60 days
 *   aiwd:lock:{id}          per-interview lock, SET NX PX 90000
 *   aiwd:profile:{id}       stored Profile (no TTL)
 *   aiwd:profiles           sorted set of profile ids by createdAt (no TTL)
 *   aiwd:gen:{kind}         cached product read / share-back
 *   aiwd:count:interviews   interviews started (MAX_INTERVIEWS cap)
 *   aiwd:rl:start:{ip}      starts per IP in the current hour window
 *   aiwd:settings           organiser settings (email mode)
 *   aiwd:report:{token}     private report link → profile id (no TTL; dies with the profile)
 *   aiwd:audit              sorted set of organiser activity entries by time
 *   aiwd:cost:total         hash of cost counters ("<kind>.<metric>"), all time
 *   aiwd:cost:day:{date}    the same per UTC day (TTL 400 days)
 *   aiwd:cost:iv:{id}       the same per interview (TTL 400 days)
 *   aiwd:cost:ivs           sorted set of interview ids with costs, by last spend
 */
import { Redis } from "@upstash/redis";
import type { GeneratedResult, InterviewState, MemberResult, Profile } from "./aiwd/types";

const P = "aiwd:";
export const INTERVIEW_TTL_SECONDS = 60 * 24 * 60 * 60;
export const LOCK_MS = 90_000;

// ---------------------------------------------------------------------------
// Minimal KV interface with two backends
// ---------------------------------------------------------------------------
interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; px?: number; ex?: number }): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Delete only if the current value equals `value` (lock release). */
  delIfEquals(key: string, value: string): Promise<void>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  /** All members, highest score first. */
  zrevAll(key: string): Promise<string[]>;
  mget(keys: string[]): Promise<(string | null)[]>;
  hincrby(key: string, field: string, by: number): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
}

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function storageKind(): "redis" | "memory" {
  return redisEnv() ? "redis" : "memory";
}

class RedisKV implements KV {
  private r: Redis;
  constructor(url: string, token: string) {
    // We serialise JSON ourselves so values (and lock tokens) round-trip exactly.
    this.r = new Redis({ url, token, automaticDeserialization: false });
  }
  async get(key: string) { const v = await this.r.get<string>(key); return v === null || v === undefined ? null : String(v); }
  async set(key: string, value: string, opts?: { nx?: boolean; px?: number; ex?: number }) {
    let res: unknown;
    if (opts?.nx && opts.px) res = await this.r.set(key, value, { nx: true, px: opts.px });
    else if (opts?.nx && opts.ex) res = await this.r.set(key, value, { nx: true, ex: opts.ex });
    else if (opts?.nx) res = await this.r.set(key, value, { nx: true });
    else if (opts?.px) res = await this.r.set(key, value, { px: opts.px });
    else if (opts?.ex) res = await this.r.set(key, value, { ex: opts.ex });
    else res = await this.r.set(key, value);
    return res === "OK" || res === true;
  }
  async del(key: string) { await this.r.del(key); }
  async delIfEquals(key: string, value: string) {
    await this.r.eval('if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end', [key], [value]);
  }
  async incr(key: string) { return Number(await this.r.incr(key)); }
  async decr(key: string) { return Number(await this.r.decr(key)); }
  async expire(key: string, seconds: number) { await this.r.expire(key, seconds); }
  async zadd(key: string, score: number, member: string) { await this.r.zadd(key, { score, member }); }
  async zrem(key: string, member: string) { await this.r.zrem(key, member); }
  async zrevAll(key: string) { const v = await this.r.zrange<string[]>(key, 0, -1, { rev: true }); return (v || []).map(String); }
  async mget(keys: string[]) { if (!keys.length) return []; const v = await this.r.mget<(string | null)[]>(...keys); return v.map((x) => (x === null || x === undefined ? null : String(x))); }
  async hincrby(key: string, field: string, by: number) { await this.r.hincrby(key, field, by); }
  async hgetall(key: string) {
    const v = await this.r.hgetall<Record<string, unknown>>(key);
    const out: Record<string, string> = {};
    for (const [k, x] of Object.entries(v || {})) out[k] = String(x);
    return out;
  }
}

type MemEntry = { v: string; exp?: number };
type MemState = { kv: Map<string, MemEntry>; z: Map<string, Map<string, number>>; h: Map<string, Map<string, number>> };

class MemoryKV implements KV {
  private s: MemState;
  constructor() {
    const g = globalThis as unknown as { __aiwdMem?: MemState };
    if (!g.__aiwdMem) g.__aiwdMem = { kv: new Map(), z: new Map(), h: new Map() };
    if (!g.__aiwdMem.h) g.__aiwdMem.h = new Map();
    this.s = g.__aiwdMem;
  }
  private live(key: string): MemEntry | null {
    const e = this.s.kv.get(key);
    if (!e) return null;
    if (e.exp !== undefined && e.exp <= Date.now()) { this.s.kv.delete(key); return null; }
    return e;
  }
  async get(key: string) { const e = this.live(key); return e ? e.v : null; }
  async set(key: string, value: string, opts?: { nx?: boolean; px?: number; ex?: number }) {
    if (opts?.nx && this.live(key)) return false;
    const ms = opts?.px ?? (opts?.ex !== undefined ? opts.ex * 1000 : undefined);
    this.s.kv.set(key, { v: value, exp: ms !== undefined ? Date.now() + ms : undefined });
    return true;
  }
  async del(key: string) { this.s.kv.delete(key); }
  async delIfEquals(key: string, value: string) { const e = this.live(key); if (e && e.v === value) this.s.kv.delete(key); }
  async incr(key: string) { const e = this.live(key); const n = (e ? Number(e.v) || 0 : 0) + 1; this.s.kv.set(key, { v: String(n), exp: e?.exp }); return n; }
  async decr(key: string) { const e = this.live(key); const n = (e ? Number(e.v) || 0 : 0) - 1; this.s.kv.set(key, { v: String(n), exp: e?.exp }); return n; }
  async expire(key: string, seconds: number) { const e = this.live(key); if (e) e.exp = Date.now() + seconds * 1000; }
  async zadd(key: string, score: number, member: string) { let z = this.s.z.get(key); if (!z) { z = new Map(); this.s.z.set(key, z); } z.set(member, score); }
  async zrem(key: string, member: string) { this.s.z.get(key)?.delete(member); }
  async zrevAll(key: string) { const z = this.s.z.get(key); if (!z) return []; return [...z.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1)).map((e) => e[0]); }
  async mget(keys: string[]) { return keys.map((k) => { const e = this.live(k); return e ? e.v : null; }); }
  async hincrby(key: string, field: string, by: number) { let h = this.s.h.get(key); if (!h) { h = new Map(); this.s.h.set(key, h); } h.set(field, (h.get(field) || 0) + by); }
  async hgetall(key: string) { const h = this.s.h.get(key); const out: Record<string, string> = {}; if (h) for (const [k, v] of h) out[k] = String(v); return out; }
}

/** Thrown when the deployment has no shared store: every cap and lock would silently stop working. */
export class StorageNotConfigured extends Error {}

let kvInstance: KV | null = null;
function kv(): KV {
  if (!kvInstance) {
    const env = redisEnv();
    // On Vercel, memory is per instance: caps, rate limits and locks would not hold and data would be
    // lost. Refuse to run instead (set ALLOW_MEMORY_STORE=1 only for a throwaway preview).
    if (!env && process.env.VERCEL === "1" && process.env.ALLOW_MEMORY_STORE !== "1") {
      throw new StorageNotConfigured("No storage configured: add the Upstash for Redis integration to this Vercel project.");
    }
    kvInstance = env ? new RedisKV(env.url, env.token) : new MemoryKV();
  }
  return kvInstance;
}

function parse<T>(v: string | null): T | null {
  if (v === null) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

function randomId(prefix: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------
export interface InterviewRecord {
  id: string;
  state: InterviewState;
  createdAt: string;
  updatedAt: string;
  /** Set once /finish has stored the profile. */
  profileId?: string;
  /** Member-safe result returned by /finish (idempotent replay). */
  result?: MemberResult;
  /** Model-calling /turn requests so far (spend guard). */
  turnRequests?: number;
  /** Member's email, kept outside the interview state so it never reaches a prompt. */
  email?: string;
}

export function newInterviewId(): string { return randomId("iv_"); }

export async function getInterview(id: string): Promise<InterviewRecord | null> {
  if (!/^iv_[0-9a-f]{32}$/.test(id)) return null;
  return parse<InterviewRecord>(await kv().get(P + "iv:" + id));
}

export async function saveInterview(rec: InterviewRecord): Promise<void> {
  rec.updatedAt = new Date().toISOString();
  await kv().set(P + "iv:" + rec.id, JSON.stringify(rec), { ex: INTERVIEW_TTL_SECONDS });
}

/** Per-interview lock. Returns a token to release with, or null when busy. */
export async function acquireLock(id: string, ms: number = LOCK_MS): Promise<string | null> {
  const token = randomId("lk_");
  const ok = await kv().set(P + "lock:" + id, token, { nx: true, px: ms });
  return ok ? token : null;
}

export async function releaseLock(id: string, token: string): Promise<void> {
  try { await kv().delIfEquals(P + "lock:" + id, token); } catch { /* expires on its own */ }
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------
export function maxInterviews(): number {
  const n = Number(process.env.MAX_INTERVIEWS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 150;
}

/** Reserve one interview slot; false when MAX_INTERVIEWS is reached. */
export async function reserveInterviewSlot(): Promise<boolean> {
  const key = P + "count:interviews";
  const n = await kv().incr(key);
  if (n > maxInterviews()) { await kv().decr(key); return false; }
  return true;
}

export async function releaseInterviewSlot(): Promise<void> {
  await kv().decr(P + "count:interviews");
}

/**
 * Count one use of something in a fixed window; true while the count is within `max`.
 * Used for finish attempts, transcription calls and organiser login failures.
 */
export async function withinLimit(name: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = P + "rl:" + name;
  const n = await kv().incr(key);
  if (n === 1) await kv().expire(key, windowSeconds);
  return n <= max;
}

/** Read a counter without incrementing it (0 when absent). */
export async function counterValue(name: string): Promise<number> {
  return Number(await kv().get(P + "rl:" + name)) || 0;
}

export async function resetCounter(name: string): Promise<void> {
  await kv().del(P + "rl:" + name);
}

export const START_LIMIT_PER_HOUR = 5;

/** Fixed one-hour window per IP. Returns true when this start is allowed. */
export async function allowStart(ip: string): Promise<boolean> {
  const key = P + "rl:start:" + (ip || "unknown");
  const n = await kv().incr(key);
  if (n === 1) await kv().expire(key, 3600);
  return n <= START_LIMIT_PER_HOUR;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function saveProfile(p: Profile): Promise<void> {
  await kv().set(P + "profile:" + p.id, JSON.stringify(p));
  const t = Date.parse(p.createdAt);
  await kv().zadd(P + "profiles", Number.isFinite(t) ? t : Date.now(), p.id);
}

export async function getProfile(id: string): Promise<Profile | null> {
  return parse<Profile>(await kv().get(P + "profile:" + id));
}

/** Stored profiles, newest first. */
export async function listProfiles(): Promise<Profile[]> {
  const ids = await kv().zrevAll(P + "profiles");
  if (!ids.length) return [];
  const vals = await kv().mget(ids.map((id) => P + "profile:" + id));
  return vals.map((v) => parse<Profile>(v)).filter((p): p is Profile => !!p);
}

export async function deleteProfile(id: string): Promise<boolean> {
  const existed = (await kv().get(P + "profile:" + id)) !== null;
  await kv().del(P + "profile:" + id);
  await kv().zrem(P + "profiles", id);
  return existed;
}

// ---------------------------------------------------------------------------
// Generated caches (product read, share-back)
// ---------------------------------------------------------------------------
export type GenerateKind = "product-read" | "shareback";

export async function getGenerated(kind: GenerateKind): Promise<GeneratedResult | null> {
  return parse<GeneratedResult>(await kv().get(P + "gen:" + kind));
}

export async function setGenerated(kind: GenerateKind, value: GeneratedResult): Promise<void> {
  await kv().set(P + "gen:" + kind, JSON.stringify(value));
}

/** Short lock for an expensive organiser generation (one at a time per kind). */
export async function acquireGenerateLock(kind: GenerateKind): Promise<string | null> {
  return acquireLock("gen-" + kind, 300_000); // generation calls can run up to 240 s
}
export async function releaseGenerateLock(kind: GenerateKind, token: string): Promise<void> {
  return releaseLock("gen-" + kind, token);
}

// ---------------------------------------------------------------------------
// Organiser settings
// ---------------------------------------------------------------------------
export type EmailMode = "required" | "optional" | "none";
export interface Settings { emailMode: EmailMode }
export const DEFAULT_SETTINGS: Settings = { emailMode: "none" };

export async function getSettings(): Promise<Settings> {
  const v = parse<Partial<Settings>>(await kv().get(P + "settings")) || {};
  const mode = v.emailMode === "required" || v.emailMode === "optional" || v.emailMode === "none" ? v.emailMode : DEFAULT_SETTINGS.emailMode;
  return { emailMode: mode };
}

export async function saveSettings(s: Settings): Promise<void> {
  await kv().set(P + "settings", JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Private report links
// ---------------------------------------------------------------------------
export function newReportToken(): string { return randomId("r_"); }
export function isReportToken(v: unknown): v is string { return typeof v === "string" && /^r_[0-9a-f]{32}$/.test(v); }

export async function saveReportToken(token: string, profileId: string): Promise<void> {
  await kv().set(P + "report:" + token, profileId);
}

/** The profile behind a report link, or null (unknown token, or the profile was deleted). */
export async function profileForReport(token: string): Promise<Profile | null> {
  if (!isReportToken(token)) return null;
  const id = await kv().get(P + "report:" + token);
  return id ? getProfile(id) : null;
}

// ---------------------------------------------------------------------------
// Organiser activity log
// ---------------------------------------------------------------------------
export interface AuditEntry { at: string; who: string; name: string; action: string; detail?: string }

export async function audit(who: { id: string; name: string }, action: string, detail?: string): Promise<void> {
  try {
    const e: AuditEntry = { at: new Date().toISOString(), who: who.id, name: who.name, action, ...(detail ? { detail: detail.slice(0, 200) } : {}) };
    // The random suffix keeps two identical entries in the same millisecond distinct in the set.
    await kv().zadd(P + "audit", Date.now(), JSON.stringify(e) + "\u0000" + randomId(""));
  } catch { /* logging must never break the action */ }
}

export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const all = await kv().zrevAll(P + "audit");
  return all.slice(0, limit).map((m) => parse<AuditEntry>(m.split("\u0000")[0])).filter((e): e is AuditEntry => !!e);
}

// ---------------------------------------------------------------------------
// Costs (counters only; prices are applied when recording, see lib/pricing.ts)
// ---------------------------------------------------------------------------
export type CostKind = "turn" | "profile" | "product-read" | "shareback" | "voice";
export const COST_KINDS: CostKind[] = ["turn", "profile", "product-read", "shareback", "voice"];
/** Integer counters per kind: micro-dollars, calls, tokens, audio seconds. */
export interface CostDelta { micro: number; calls: number; input?: number; output?: number; cacheRead?: number; cacheWrite?: number; seconds?: number; fallbacks?: number }
const COST_TTL = 400 * 24 * 60 * 60;

export async function recordCost(kind: CostKind, d: CostDelta, interviewId?: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const keys = [P + "cost:total", P + "cost:day:" + day];
  if (interviewId) keys.push(P + "cost:iv:" + interviewId);
  for (const key of keys) {
    for (const [m, v] of Object.entries(d)) {
      if (typeof v === "number" && v) await kv().hincrby(key, kind + "." + m, Math.round(v));
    }
  }
  await kv().expire(P + "cost:day:" + day, COST_TTL);
  if (interviewId) {
    await kv().expire(P + "cost:iv:" + interviewId, COST_TTL);
    await kv().zadd(P + "cost:ivs", Date.now(), interviewId);
  }
}

export type CostCounters = Record<string, number>;
const toNums = (h: Record<string, string>): CostCounters => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v) || 0]));

export async function costTotals(): Promise<CostCounters> { return toNums(await kv().hgetall(P + "cost:total")); }

export async function costDays(n: number): Promise<{ date: string; counters: CostCounters }[]> {
  const out: { date: string; counters: CostCounters }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, counters: toNums(await kv().hgetall(P + "cost:day:" + date)) });
  }
  return out;
}

/** Interviews with recorded costs, most recent spend first. */
export async function costInterviews(limit = 200): Promise<{ id: string; counters: CostCounters }[]> {
  const ids = (await kv().zrevAll(P + "cost:ivs")).slice(0, limit);
  const out: { id: string; counters: CostCounters }[] = [];
  for (const id of ids) out.push({ id, counters: toNums(await kv().hgetall(P + "cost:iv:" + id)) });
  return out;
}
