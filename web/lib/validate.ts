/* validate.ts: input validation for the member API. Pure; no server imports. */
import { QUESTIONNAIRE, QUESTION_ORDER, questionSkipped } from "./aiwd/prompts";
import type { Answers } from "./aiwd/types";

export const LIMITS_INPUT = { name: 80, role: 160, answer: 4000, other: 200, accessCode: 200 };

export class ValidationError extends Error {
  code = "invalid";
}

function bad(msg: string): never { throw new ValidationError(msg); }

export function cleanText(v: unknown, field: string, max: number, required: boolean): string {
  if (v === undefined || v === null) { if (required) bad(`${field} is required`); return ""; }
  if (typeof v !== "string") bad(`${field} must be text`);
  const t = v.replace(/\s+/g, " ").trim();
  if (required && !t) bad(`${field} is required`);
  if (t.length > max) bad(`${field} is too long (max ${max} characters)`);
  return t;
}

/**
 * Validate and normalise questionnaire answers exactly as member.js sync() builds them:
 * skipped questions dropped, multi questions always arrays, singles only when answered,
 * "Other" text only for questions that allow it. Unknown keys or option values → 400.
 */
export function validateAnswers(input: unknown): Answers {
  if (!input || typeof input !== "object" || Array.isArray(input)) bad("answers must be an object");
  const raw = input as Record<string, unknown>;
  const allowed = new Set<string>(QUESTION_ORDER);
  for (const qid of QUESTION_ORDER) if (QUESTIONNAIRE[qid].other) allowed.add(qid + "Other");
  for (const k of Object.keys(raw)) if (!allowed.has(k)) bad(`unknown answer field: ${k}`);

  // First pass: type-check values against the option keys.
  const typed: Record<string, unknown> = {};
  for (const qid of QUESTION_ORDER) {
    const q = QUESTIONNAIRE[qid];
    const v = raw[qid];
    const keys = new Set(q.options.map((o) => o.key));
    if (q.type === "multi") {
      if (v === undefined || v === null) typed[qid] = [];
      else {
        if (!Array.isArray(v)) bad(`${qid} must be a list`);
        const vals = Array.from(new Set(v as unknown[]));
        for (const x of vals) if (typeof x !== "string" || !keys.has(x)) bad(`${qid} has an unknown option`);
        const excl = q.options.filter((o) => o.exclusive).map((o) => o.key);
        if (vals.length > 1 && vals.some((x) => excl.includes(x as string))) bad(`${qid}: an exclusive option cannot be combined`);
        typed[qid] = vals;
      }
    } else if (v !== undefined && v !== null && v !== "") {
      if (typeof v !== "string" || !keys.has(v)) bad(`${qid} has an unknown option`);
      typed[qid] = v;
    }
    if (q.other) {
      const o = cleanText(raw[qid + "Other"], qid + "Other", LIMITS_INPUT.other, false);
      if (o) typed[qid + "Other"] = o;
    }
  }

  // Second pass: apply skip rules and required checks (as member.js does).
  const a: Record<string, unknown> = {};
  for (const qid of QUESTION_ORDER) {
    const q = QUESTIONNAIRE[qid];
    if (questionSkipped(qid, typed)) continue;
    if (q.type === "multi") a[qid] = typed[qid];
    else if (typed[qid]) a[qid] = typed[qid];
    if (q.other && typed[qid + "Other"]) a[qid + "Other"] = typed[qid + "Other"];
    if (q.required) {
      const v = a[qid];
      if (!(Array.isArray(v) ? v.length : v)) bad(`${qid} is required`);
    }
  }
  return a as Answers;
}

/** Ratings: only known item ids, numbers 0..100 (others ignored / rejected). */
export function validateRatings(input: unknown, itemIds: string[]): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) bad("ratings must be an object");
  const known = new Set(itemIds);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!known.has(k)) bad(`unknown rating item: ${k}`);
    if (v === null || v === undefined) continue; // skipped slider
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) bad(`rating for ${k} must be a number from 0 to 100`);
    out[k] = Math.round(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Imported profiles (artifact result codes pasted by the organiser). The code text comes from a
// member, so every field the organiser page renders is forced into the shape it expects: strings
// stay strings (capped), lists stay lists of strings or of small objects, numbers are clamped.
// ---------------------------------------------------------------------------
const S = (v: unknown, max = 2000): string => (typeof v === "string" ? v : v === null || v === undefined ? "" : typeof v === "number" || typeof v === "boolean" ? String(v) : "").slice(0, max);
const N = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : Math.min(hi, Math.max(lo, n));
};
const SA = (v: unknown, maxItems = 20, max = 600): string[] => (Array.isArray(v) ? v.slice(0, maxItems).map((x) => S(x, max)).filter(Boolean) : []);
const OBJ = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function sanitiseImported(input: unknown): Record<string, unknown> {
  const p = OBJ(input);
  const m = OBJ(p.member), pr = OBJ(p.practice), c = OBJ(p.confidence), d = OBJ(p.divergence);
  const ps = OBJ(p.productSignals), fb = OBJ(p.feedback);
  const level = N(pr.level, 0, 4) ?? 0;
  const items = (Array.isArray(c.items) ? c.items : []).slice(0, 8).map((x) => {
    const it = OBJ(x);
    const out: Record<string, unknown> = { id: S(it.id, 40), task: S(it.task, 600), level: N(it.level, 1, 4) ?? 2 };
    const r = N(it.rating, 0, 100); if (r !== null) out.rating = r;
    const b = N(it.beyond, 0, 2); if (b !== null) out.beyond = b;
    return out;
  });
  const transcript = (Array.isArray(p.transcript) ? p.transcript : []).slice(0, 200).map((x) => {
    const t = OBJ(x);
    const out: Record<string, unknown> = { role: t.role === "interviewer" ? "interviewer" : "member", text: S(t.text, 6000) };
    if (t.tapped === true) out.tapped = true;
    return out;
  });
  const selfReport = p.selfReport ? (() => { const sr = OBJ(p.selfReport); return { frequency: S(sr.frequency, 40), domains: SA(sr.domains, 8, 40), tools: SA(sr.tools, 20, 80), canShow: S(sr.canShow, 20) }; })() : null;
  return {
    id: S(p.id, 200),
    createdAt: S(p.createdAt, 40),
    member: { name: S(m.name, 80) || "Anonymous", role: S(m.role, 160), org: S(m.org, 160) },
    practice: {
      level,
      levelLabel: S(pr.levelLabel, 40),
      summary: S(pr.summary),
      domains: (Array.isArray(pr.domains) ? pr.domains : []).slice(0, 8).map((x) => { const dd = OBJ(x); return { key: S(dd.key, 20), evidence: S(dd.evidence, 600) }; }).filter((x) => x.key),
      tools: SA(pr.tools, 20, 80),
      judgement: S(pr.judgement),
      stance: S(pr.stance, 20) || "pragmatic",
      probedNoEpisode: SA(pr.probedNoEpisode, 8, 20),
    },
    confidence: { items, mean: N(c.mean, 0, 100), band: S(c.band, 20) || "none", pattern: S(c.pattern, 600) },
    divergence: { kind: S(d.kind, 40) || "unrated", note: S(d.note, 600) },
    wants: SA(p.wants, 5), offers: SA(p.offers, 5),
    productSignals: { wouldPayFor: S(ps.wouldPayFor, 600), offerKeys: SA(ps.offerKeys, 10, 40), pay: S(ps.pay, 20), quote: S(ps.quote, 600) },
    questionnaire: p.questionnaire ? JSON.parse(JSON.stringify(p.questionnaire, (_k, v) => (typeof v === "string" ? v.slice(0, 600) : v))) : null,
    selfReport,
    feedback: {
      headline: S(fb.headline, 300), summary: S(fb.summary), strengths: SA(fb.strengths, 4),
      nextSteps: (Array.isArray(fb.nextSteps) ? fb.nextSteps : []).slice(0, 3).map((x) => { const n = OBJ(x); return { title: S(n.title, 200), detail: S(n.detail, 1200) }; }),
      closing: S(fb.closing, 600),
    },
    quotes: SA(p.quotes, 6),
    transcript,
    endedEarly: p.endedEarly === true,
  };
}
