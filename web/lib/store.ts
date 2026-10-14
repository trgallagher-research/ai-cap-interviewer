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
}

type MemEntry = { v: string; exp?: number };
type MemState = { kv: Map<string, MemEntry>; z: Map<string, Map<string, number>> };

class MemoryKV implements KV {
  private s: MemState;
  constructor() {
    const g = globalThis as unknown as { __aiwdMem?: MemState };
    if (!g.__aiwdMem) g.__aiwdMem = { kv: new Map(), z: new Map() };
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
}

let kvInstance: KV | null = null;
function kv(): KV {
  if (!kvInstance) {
    const env = redisEnv();
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
export async function acquireLock(id: string): Promise<string | null> {
  const token = randomId("lk_");
  const ok = await kv().set(P + "lock:" + id, token, { nx: true, px: LOCK_MS });
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
  return acquireLock("gen-" + kind);
}
export async function releaseGenerateLock(kind: GenerateKind, token: string): Promise<void> {
  return releaseLock("gen-" + kind, token);
}
