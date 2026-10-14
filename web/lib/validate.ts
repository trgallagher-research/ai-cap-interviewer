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
