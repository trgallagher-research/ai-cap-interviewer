/* engine.ts: interview state machine, marker parsing, scoring and stats.
 *
 * Typed port of prototype/src/engine.js, behaviour unchanged. The browser LLM adapter is gone:
 * Interview takes an injected `llm` ({ chat(system, messages, {onText, tier}) }) and the
 * interviewer instruction block goes in `system` (see prompts.ts). JSON calls (profile, product
 * read, share-back) stay prompt-instructed JSON parsed with the same tolerant parser + one retry.
 *
 * No server imports: the pure functions (assembleProfile, divergenceFor, stats, helpMap,
 * signalsFromAnswers, parse*) are importable from client components.
 */
import * as P from "./prompts";
import type {
  Answers, Band, ChatMessage, Divergence, HelpEntry, InterviewState, InterviewStatus, Llm, LlmTier, Member,
  ParsedTurn, Phase, Profile, RateItem, Ratings, Stats, Turn, TurnResult,
} from "./types";

const M = P.MARK;

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

export function tryParseJson(text: unknown): any {
  if (typeof text !== "string") return undefined;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{"); const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) return undefined;
  try { return JSON.parse(t.slice(start, end + 1)); } catch (_) { return undefined; }
}

export class LlmJsonError extends Error {
  code = "bad_json";
  text: string;
  constructor(text: string) { super("Claude did not return valid JSON"); this.text = text; }
}

/** Ask for JSON; strips fences; one retry with a nudge if parsing fails (as Engine.llm.json). */
export async function chatJson(llm: Llm, messages: ChatMessage[], opts?: { tier?: LlmTier; system?: string }): Promise<any> {
  const tier = (opts && opts.tier) || "reasoning";
  const system = (opts && opts.system) || "";
  const first = await llm.chat(system, messages, { tier });
  const parsed = tryParseJson(first.text);
  if (parsed !== undefined) return parsed;
  const retry: ChatMessage[] = messages.concat([
    { role: "assistant", content: first.text },
    { role: "user", content: "That was not valid JSON. Return ONLY the JSON object, no prose, no code fences." },
  ]);
  const second = await llm.chat(system, retry, { tier });
  const again = tryParseJson(second.text);
  if (again !== undefined) return again;
  throw new LlmJsonError(second.text);
}

// ---------------------------------------------------------------------------
// Marker parsing
// ---------------------------------------------------------------------------

/** Text safe to show while streaming: everything before the first "<<" (and no dangling "<"). */
export function safeVisible(full: string): string {
  const idx = full.indexOf("<<");
  if (idx !== -1) return full.slice(0, idx);
  return full.endsWith("<") ? full.slice(0, -1) : full;
}

export function parsePhase(full: string): Phase | null {
  const i = full.indexOf(M.PHASE_OPEN);
  if (i === -1) return null;
  const j = full.indexOf(M.CLOSE, i + M.PHASE_OPEN.length);
  if (j === -1) return null;
  const v = full.slice(i + M.PHASE_OPEN.length, j).trim().toLowerCase();
  return (P.PHASES as string[]).includes(v) ? (v as Phase) : null;
}

/** Returns a validated array of rating items, or null when absent/invalid. */
export function parseRate(full: string): RateItem[] | null {
  const i = full.indexOf(M.RATE_OPEN);
  if (i === -1) return null;
  const j = full.indexOf(M.CLOSE, i + M.RATE_OPEN.length);
  if (j === -1) return null;
  const raw = full.slice(i + M.RATE_OPEN.length, j).trim();
  const a = raw.indexOf("["); const b = raw.lastIndexOf("]");
  if (a === -1 || b === -1) return null;
  let arr: unknown;
  try { arr = JSON.parse(raw.slice(a, b + 1)); } catch (_) { return null; }
  if (!Array.isArray(arr)) return null;
  const items: RateItem[] = arr
    .filter((x: any) => x && typeof x.task === "string" && x.task.trim())
    .map((x: any, k: number) => ({
      id: String(x.id || ("r" + (k + 1))),
      task: x.task.trim(),
      level: clampInt(x.level, 1, 4, 2),
      ...(x.beyond === undefined || x.beyond === null ? {} : { beyond: clampInt(x.beyond, 0, 2, 1) }),
    }));
  if (items.length < 2 || items.length > 6) return null;
  // ids must be unique
  const seen = new Set<string>();
  for (const it of items) { if (seen.has(it.id)) it.id = it.id + "_" + Math.random().toString(36).slice(2, 5); seen.add(it.id); }
  return items;
}

export function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

/** Optional quick replies: 2–4 short strings, or null. */
export function parseChips(full: string): string[] | null {
  const i = full.indexOf(M.CHIPS_OPEN);
  if (i === -1) return null;
  const j = full.indexOf(M.CLOSE, i + M.CHIPS_OPEN.length);
  if (j === -1) return null;
  const raw = full.slice(i + M.CHIPS_OPEN.length, j);
  const a = raw.indexOf("["); const b = raw.lastIndexOf("]");
  if (a === -1 || b === -1) return null;
  let arr: unknown;
  try { arr = JSON.parse(raw.slice(a, b + 1)); } catch (_) { return null; }
  if (!Array.isArray(arr)) return null;
  const chips = arr.map((x) => String(x || "").trim()).filter((x) => x && x.length <= 60);
  return chips.length >= 2 ? chips.slice(0, 4) : null;
}

export function parseTurn(full: string): ParsedTurn {
  return {
    visible: full.split("<<")[0].trim(),
    phase: parsePhase(full),
    rateItems: parseRate(full),
    chips: parseChips(full),
    complete: full.includes(M.COMPLETE),
  };
}

// ---------------------------------------------------------------------------
// Interview state machine
// ---------------------------------------------------------------------------
export const LIMITS = { maxQuestionsBeforeRate: 9, maxAfterRate: 2, maxForcedRateAttempts: 2 };

function noLlm(): Llm {
  return { chat: async () => { const e: Error & { code?: string } = new Error("Claude is not available"); e.code = "unavailable"; throw e; } };
}

/** Interview holds the transcript and drives one turn at a time. UI-agnostic. */
export class Interview {
  member: Member;
  answers: Answers | null;
  turns: Turn[];
  phase: Phase;
  rateItems: RateItem[] | null;
  ratings: Ratings | null;
  status: InterviewStatus;
  interviewerCount: number;
  afterRateCount: number;
  rateRetries: number;
  forcedRateAttempts: number;
  chips: string[] | null;
  startedAt: string;
  /** Injected LLM; not serialised. */
  llm: Llm;

  constructor(member: Partial<Member>, answers?: Answers | null, llm?: Llm) {
    this.member = { name: (member.name || "").trim(), role: (member.role || "").trim() };
    this.answers = answers || null; // opening questionnaire (see prompts.QUESTIONNAIRE)
    this.turns = [];            // {role:"interviewer"|"member", text}
    this.phase = "orient";
    this.rateItems = null;      // proposed self-efficacy items
    this.ratings = null;        // {id: 0..100}
    this.status = "in_progress"; // in_progress | rating | complete | ended_early
    this.interviewerCount = 0;
    this.afterRateCount = 0;
    this.rateRetries = 0;
    this.forcedRateAttempts = 0; // forceRate nudges answered without a valid RATE marker
    this.chips = null;          // quick replies offered with the latest question
    this.startedAt = new Date().toISOString();
    this.llm = llm || noLlm();
  }

  /** Add the member's answer (text). */
  answer(text: string, opts?: { tapped?: boolean }): void {
    const t = (text || "").trim();
    if (!t) return;
    const turn: Turn = { role: "member", text: t };
    if (opts && opts.tapped) turn.tapped = true;
    this.turns.push(turn);
  }

  /** Record slider ratings and add them to the transcript as a member turn. */
  submitRatings(ratings: Record<string, unknown>): void {
    this.ratings = {};
    for (const it of this.rateItems || []) {
      const v = ratings[it.id];
      if (typeof v === "number" && Number.isFinite(v)) this.ratings[it.id] = clampInt(v, 0, 100, 50);
    }
    this.turns.push({ role: "member", text: P.formatRatingsTurn(this.rateItems || [], this.ratings) });
    this.status = "in_progress";
    this.phase = "close";
  }

  /** Decide any page-side steering before the next interviewer turn. */
  _nudge(): string {
    if (this.ratings) {
      return this.afterRateCount >= LIMITS.maxAfterRate ? P.NUDGES.forceClose : "";
    }
    if (this.rateItems) return ""; // waiting on the member's ratings; shouldn't be called
    if (this.interviewerCount >= LIMITS.maxQuestionsBeforeRate) {
      // Two forced attempts without a valid marker: give up on ratings and close (profile is unrated).
      if (this.forcedRateAttempts >= LIMITS.maxForcedRateAttempts) return P.NUDGES.forceClose;
      return P.NUDGES.forceRate; // counted in next() only once a reply arrives, so failed calls and retries do not use it up
    }
    return "";
  }

  /** The `system` block for this interview (identical for every turn, so it caches). */
  system(): string {
    return P.buildInterviewSystem(this.member, this.answers);
  }

  /**
   * Run one interviewer turn. onText(visibleSoFar) streams the safe prefix.
   * Resolves {visible, phase, rateItems, chips, complete}.
   */
  async next(onText?: ((visible: string) => void) | null, opts?: { endNow?: boolean; nudge?: string }): Promise<TurnResult> {
    opts = opts || {};
    const endNow = !!opts.endNow;
    let nudge = endNow ? "" : this._nudge();
    if (opts.nudge) nudge = opts.nudge;
    const system = this.system();
    const messages = P.interviewMessages(this.member, this.turns, { endNow, nudge, answers: this.answers });
    let full = "";
    const res = await this.llm.chat(system, messages, {
      tier: "interview",
      onText: (text) => { full = text; if (onText) onText(safeVisible(text)); },
    });
    full = res.text || full;
    if (nudge === P.NUDGES.forceRate) this.forcedRateAttempts++;
    let parsed = parseTurn(full);

    // If the model said it was going to the rate phase but gave no valid items, ask once more.
    if (!endNow && !this.ratings && parsed.phase === "rate" && !parsed.rateItems && this.rateRetries < 1) {
      this.rateRetries++;
      this.turns.push({ role: "interviewer", text: parsed.visible });
      const retryMsgs = P.interviewMessages(this.member, this.turns, { nudge: P.NUDGES.missingRate, answers: this.answers });
      this.turns.pop();
      const r2 = await this.llm.chat(system, retryMsgs, { tier: "interview", onText: (t) => { if (onText) onText(safeVisible(t)); } });
      const p2 = parseTurn(r2.text || "");
      if (p2.rateItems) parsed = p2;
    }

    const visible = parsed.visible || "(…)";
    this.turns.push({ role: "interviewer", text: visible });
    this.interviewerCount++;
    if (this.ratings) this.afterRateCount++;

    const forcedClose = nudge === P.NUDGES.forceClose;
    if (endNow || parsed.complete || forcedClose) {
      this.status = endNow ? "ended_early" : "complete";
      this.phase = "close";
    } else if (parsed.rateItems && !this.ratings) {
      this.rateItems = parsed.rateItems;
      this.status = "rating";
      this.phase = "rate";
    } else if (parsed.phase) {
      this.phase = parsed.phase;
    }
    // Safety: the page, not the model, guarantees termination.
    if (this.ratings && this.afterRateCount > LIMITS.maxAfterRate && this.status === "in_progress") {
      this.status = "complete"; this.phase = "close";
    }
    const done = this.status === "complete" || this.status === "ended_early";
    this.chips = (!done && this.status !== "rating" && parsed.chips) ? parsed.chips : null;
    return { visible, phase: this.phase, rateItems: this.status === "rating" ? this.rateItems : null, chips: this.chips, complete: done };
  }

  /** Snapshot for persistence / resume. */
  toJSON(): InterviewState {
    return { member: this.member, answers: this.answers, chips: this.chips || null, turns: this.turns, phase: this.phase, rateItems: this.rateItems, ratings: this.ratings, status: this.status, interviewerCount: this.interviewerCount, afterRateCount: this.afterRateCount, rateRetries: this.rateRetries, forcedRateAttempts: this.forcedRateAttempts, startedAt: this.startedAt };
  }
  static fromJSON(o: Partial<InterviewState>, llm?: Llm): Interview {
    const iv = new Interview(o.member || { name: "", role: "" }, o.answers || null, llm);
    Object.assign(iv, o);
    if (typeof iv.rateRetries !== "number") iv.rateRetries = 0;
    if (typeof iv.forcedRateAttempts !== "number") iv.forcedRateAttempts = 0;
    return iv;
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
// Expected confidence depends on the member's practice level and on how far each rated task
// sits beyond it (a beginner rating a first-step task at 60 is accurate, not overconfident).
// ITEM_TABLE gives the expected rating per (practice level, steps beyond); TOL is the tolerance,
// wider for levels 0 and 1 where ratings on untried tasks are noisier.
// EXPECTED is the indicative band for a typical item set at each practice level, used by the
// organiser's scatter; classification itself uses the member's own items (divergenceFor).
export const EXPECTED: Record<number, number> = { 0: 40, 1: 47, 2: 55, 3: 68, 4: 82 };
export const TOL = 18;
const TOL_BY_LEVEL: Record<number, number> = { 0: 22, 1: 22, 2: 18, 3: 18, 4: 18 };
// Rows: practice level 0..4; columns: how many steps the task sits beyond that level (<=0, 1, 2, 3+).
const ITEM_TABLE: Record<number, number[]> = {
  0: [55, 55, 35, 20],
  1: [65, 45, 30, 20],
  2: [75, 55, 35, 25],
  3: [82, 58, 38, 25],
  4: [82, 58, 38, 25],
};
const ITEM_EXPECTED = (L: number, delta: number) => ITEM_TABLE[L][delta <= 0 ? 0 : Math.min(delta, 3)];

export function band(mean: number | null | undefined): Band {
  if (mean === null || mean === undefined || !Number.isFinite(mean)) return "none";
  return mean < 40 ? "low" : mean > 70 ? "high" : "moderate";
}

const NOTES: Record<string, string> = {
  unrated: "No ratings were given, so confidence could not be compared with practice.",
  "confident-starter": "Rates their confidence well above what their described practice would predict.",
  "cautious-practitioner": "Rates their confidence well below what their described practice would predict.",
  aligned: "Confidence and described practice are broadly in step.",
};

type ItemLike = { id?: string; level?: number; beyond?: number; rating?: number };

/** Level-aware classification from the member's own rated items. */
export function divergenceFor(level: unknown, items: ItemLike[] | null | undefined, ratings?: Ratings | null): Required<Divergence> {
  const L = clampInt(level, 0, 4, 0);
  // "beyond" (0..2, from the interviewer) is preferred: it stays meaningful at levels 3-4, where
  // item levels cannot rise above 4. Older items without it fall back to item level minus practice level.
  const rated = (items || []).map((it) => ({ level: clampInt(it.level, 1, 4, 2), beyond: (typeof it.beyond === "number") ? it.beyond : null, rating: ratings ? ratings[it.id as string] : it.rating })).filter((x): x is { level: number; beyond: number | null; rating: number } => typeof x.rating === "number");
  if (!rated.length) return { kind: "unrated", note: NOTES.unrated, expected: null, residual: null };
  const mean = rated.reduce((a, x) => a + x.rating, 0) / rated.length;
  const expected = rated.reduce((a, x) => a + ITEM_EXPECTED(L, x.beyond !== null ? x.beyond : x.level - L), 0) / rated.length;
  const residual = Math.round(mean - expected);
  const tol = TOL_BY_LEVEL[L];
  let kind = residual >= tol ? "confident-starter" : residual <= -tol ? "cautious-practitioner" : "aligned";
  // Someone who has not used AI tools cannot be a cautious practitioner: low ratings are expected.
  if (kind === "cautious-practitioner" && L === 0) kind = "aligned";
  return { kind, note: NOTES[kind], expected: Math.round(expected), residual };
}

/** Coarse fallback when only a mean is known (kept for callers that lack items). */
export function divergence(level: unknown, mean: number): Divergence {
  if (!Number.isFinite(mean)) return { kind: "unrated", note: NOTES.unrated };
  const exp = EXPECTED[clampInt(level, 0, 4, 0)];
  const kind = mean > exp + TOL ? "confident-starter" : mean < exp - TOL ? "cautious-practitioner" : "aligned";
  return { kind, note: NOTES[kind] };
}

export function meanRating(items: { id: string }[] | null | undefined, ratings: Ratings | null | undefined): number | null {
  const vals = (items || []).map((it) => ratings && ratings[it.id]).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** The profile request for a finished interview (questionnaire + transcript + ratings). */
export function profileMessages(interview: Pick<Interview, "member" | "turns" | "rateItems" | "ratings" | "answers">): ChatMessage[] {
  return [{ role: "user", content: P.buildProfilePrompt(interview.member, interview.turns, interview.rateItems, interview.ratings, interview.answers) }];
}

/** Product signals come from the questionnaire's fixed options so they tally cleanly. */
export function signalsFromAnswers(a: Answers | null | undefined): { offerKeys: string[]; pay: string; wouldPayFor: string } {
  const out = { offerKeys: [] as string[], pay: "", wouldPayFor: "" };
  if (!a) return out;
  const keys = (Array.isArray(a.offer) ? a.offer : []).filter((k) => k !== "nothing");
  out.offerKeys = keys;
  out.pay = a.pay || ""; // "nothing for now" members never see the pay question: left blank, tallied via offer.nothing
  const labels = keys.map((k) => P.optionLabel("offer", k));
  if (a.offerOther) labels.push(a.offerOther);
  if (out.pay === "yes" || out.pay === "maybe") out.wouldPayFor = labels.join("; ");
  else if (Array.isArray(a.offer) && a.offer.includes("nothing")) out.wouldPayFor = "";
  return out;
}

export function newId(): string { return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/** Build the stored Profile from the interview + the model's JSON (see docs/architecture.md). */
export function assembleProfile(interview: Pick<Interview, "member" | "turns" | "rateItems" | "ratings" | "answers" | "status">, modelOut: any, source?: Profile["source"]): Profile {
  const m = modelOut || {};
  const pr = m.practice || {};
  const level = clampInt(pr.level, 0, 4, 0);
  const items = (interview.rateItems || []).map((it) => ({ id: it.id, task: it.task, level: it.level, ...(typeof it.beyond === "number" ? { beyond: it.beyond } : {}), rating: interview.ratings ? interview.ratings[it.id] : undefined }));
  const mean = meanRating(interview.rateItems, interview.ratings);
  const validKeys = new Set<string>(P.DOMAINS.map((d) => d.key));
  const domains: { key: string; evidence: string }[] = Array.isArray(pr.domains) ? pr.domains.filter((d: any) => d && validKeys.has(d.key)).map((d: any) => ({ key: d.key, evidence: String(d.evidence || "") })) : [];
  const a = interview.answers || null;
  // The member's own stance answer wins over the model's reading when present.
  const stances = P.STANCES as string[];
  const stance = (a && stances.includes(a.stance as string)) ? a.stance as string : (stances.includes(pr.stance) ? pr.stance : "pragmatic");
  const sig = signalsFromAnswers(a);
  const fb = m.feedback || {};
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    source: source || "live",
    member: { name: interview.member.name || "Anonymous", role: interview.member.role || "", org: "" },
    practice: {
      level, levelLabel: P.LADDER[level].label,
      summary: String(pr.summary || ""),
      domains,
      tools: Array.isArray(pr.tools) ? pr.tools.map(String) : ((a && Array.isArray(a.tools) && a.frequency !== "never") ? a.tools.slice() : []),
      judgement: String(pr.judgement || ""),
      probedNoEpisode: Array.isArray(pr.probedNoEpisode) ? pr.probedNoEpisode.filter((k: string) => validKeys.has(k) && !domains.some((d) => d.key === k) && a && Array.isArray(a.uses) && a.uses.includes(k)) : [],
      stance,
    },
    confidence: { items, mean, band: band(mean), pattern: String((m.confidence && m.confidence.pattern) || "") },
    divergence: divergenceFor(level, interview.rateItems, interview.ratings),
    wants: Array.isArray(m.wants) ? m.wants.map(String).slice(0, 3) : [],
    offers: Array.isArray(m.offers) ? m.offers.map(String).slice(0, 2) : [],
    productSignals: { wouldPayFor: a ? sig.wouldPayFor : String((m.productSignals && m.productSignals.wouldPayFor) || ""), offerKeys: sig.offerKeys, pay: sig.pay, quote: String((m.productSignals && m.productSignals.quote) || "") },
    questionnaire: a,
    selfReport: a ? {
      frequency: a.frequency || "",
      domains: (a.frequency === "never" || !Array.isArray(a.uses)) ? [] : a.uses.filter((k) => validKeys.has(k)),
      tools: (a.frequency === "never" || !Array.isArray(a.tools)) ? [] : a.tools.slice().concat(a.toolsOther ? [a.toolsOther] : []),
      canShow: a.canShow || "",
    } : null,
    selfCheck: P.computeSelfCheck(a, mean),
    feedback: {
      headline: String(fb.headline || ("Thanks " + (interview.member.name || "") + ", here is what stood out")),
      summary: String(fb.summary || ""),
      strengths: Array.isArray(fb.strengths) ? fb.strengths.map(String).slice(0, 2) : [],
      nextSteps: Array.isArray(fb.nextSteps) ? fb.nextSteps.filter((s: any) => s && s.title).map((s: any) => ({ title: String(s.title), detail: String(s.detail || ""), steps: Array.isArray(s.steps) ? s.steps.map(String).filter(Boolean).slice(0, 3) : [] })).slice(0, 3) : [],
      calibration: String(fb.calibration || ""),
      followUp: String(fb.followUp || ""),
      closing: String(fb.closing || ""),
    },
    quotes: Array.isArray(m.quotes) ? m.quotes.map(String).slice(0, 4) : [],
    transcript: interview.turns.slice(),
    endedEarly: interview.status === "ended_early",
  };
}

// ---------------------------------------------------------------------------
// Aggregate statistics for the organiser view and the share-back prompt
// ---------------------------------------------------------------------------
export function stats(profiles: Profile[]): Stats {
  const byLevel = [0, 0, 0, 0, 0];
  const byDomain: Record<string, number> = {}; P.DOMAINS.forEach((d) => { byDomain[d.key] = 0; });
  const byStance: Record<string, number> = {}; P.STANCES.forEach((s) => { byStance[s] = 0; });
  const byDivergence: Record<string, number> = { "aligned": 0, "confident-starter": 0, "cautious-practitioner": 0, "unrated": 0 };
  const means: number[] = [];
  const wants: string[] = []; const offers: string[] = []; const pay: string[] = [];
  for (const p of profiles) {
    byLevel[clampInt(p.practice.level, 0, 4, 0)]++;
    for (const d of p.practice.domains || []) if (byDomain[d.key] !== undefined) byDomain[d.key]++;
    if (byStance[p.practice.stance] !== undefined) byStance[p.practice.stance]++;
    if (p.divergence && byDivergence[p.divergence.kind] !== undefined) byDivergence[p.divergence.kind]++;
    if (Number.isFinite(p.confidence.mean)) means.push(p.confidence.mean as number);
    (p.wants || []).forEach((w) => wants.push(w));
    (p.offers || []).forEach((o) => offers.push(o));
    if (p.productSignals && p.productSignals.wouldPayFor) pay.push(p.productSignals.wouldPayFor);
  }
  const q = { frequency: {} as Record<string, number>, offer: {} as Record<string, number>, pay: { yes: 0, maybe: 0, no: 0, unsure: 0 } as Record<string, number>, selfDomains: {} as Record<string, number>, claimedNoEpisode: {} as Record<string, number>, probedNoEpisode: {} as Record<string, number>, answered: 0,
    search: 0, items: {} as Record<string, { answered: number; positive: number }>, whyNot: {} as Record<string, number>, accessNotAsked: 0,
    calibration: { "confidence-above-skills": 0, "skills-above-confidence": 0, "in-line": 0, "unknown": 0 } as Record<string, number> };
  for (const qid of P.QUESTION_ORDER) if (P.QUESTIONNAIRE[qid].block) q.items[qid] = { answered: 0, positive: 0 };
  (P.QUESTIONNAIRE.whyNot.options).forEach((o) => { q.whyNot[o.key] = 0; });
  (P.QUESTIONNAIRE.frequency.options).forEach((o) => { q.frequency[o.key] = 0; });
  (P.QUESTIONNAIRE.offer.options).forEach((o) => { q.offer[o.key] = 0; });
  P.DOMAINS.forEach((d) => { q.selfDomains[d.key] = 0; q.claimedNoEpisode[d.key] = 0; q.probedNoEpisode[d.key] = 0; });
  for (const p of profiles) {
    const sr = p.selfReport; const ps = p.productSignals || ({} as Profile["productSignals"]);
    if (!sr) continue;
    q.answered++;
    if (q.frequency[sr.frequency] !== undefined) q.frequency[sr.frequency]++;
    for (const k of sr.domains || []) {
      if (q.selfDomains[k] === undefined) continue;
      q.selfDomains[k]++;
      if (!(p.practice.domains || []).some((d) => d.key === k)) {
        q.claimedNoEpisode[k]++;
        if ((p.practice.probedNoEpisode || []).includes(k)) q.probedNoEpisode[k]++;
      }
    }
    const qa = p.questionnaire || {};
    for (const k of (Array.isArray(qa.offer) ? qa.offer : [])) if (q.offer[k] !== undefined) q.offer[k]++;
    if (Array.isArray(qa.uses) && qa.uses.includes("search") && !P.questionSkipped("uses", qa)) q.search++;
    for (const [qid, cell] of Object.entries(q.items)) {
      const v = (qa as Record<string, unknown>)[qid];
      if (typeof v !== "string" || !v || P.questionSkipped(qid, qa)) continue;
      const qq = P.QUESTIONNAIRE[qid];
      cell.answered++;
      if (qq.block === "scenario" ? v === qq.correct : (P.POSITIVE[qq.block as string] || []).includes(v)) cell.positive++;
    }
    if (Array.isArray(qa.whyNot) && !P.questionSkipped("whyNot", qa)) for (const k of qa.whyNot) if (q.whyNot[k] !== undefined) q.whyNot[k]++;
    if ((qa.supInOrg === "yes" || qa.supOutside === "yes") && qa.supAsked === "no") q.accessNotAsked++;
    const ck = p.selfCheck && p.selfCheck.calibration ? p.selfCheck.calibration.kind : null;
    if (ck && q.calibration[ck] !== undefined) q.calibration[ck]++;
    if (ps.pay && q.pay[ps.pay] !== undefined) q.pay[ps.pay]++;
  }
  const meanConfidence = means.length ? Math.round(means.reduce((a, b) => a + b, 0) / means.length) : null;
  // Domain gaps: domains where fewer than 2 members at level >= 2 show evidence.
  const strongByDomain: Record<string, number> = {};
  P.DOMAINS.forEach((d) => { strongByDomain[d.key] = profiles.filter((p) => p.practice.level >= 2 && (p.practice.domains || []).some((x) => x.key === d.key)).length; });
  const gaps = P.DOMAINS.filter((d) => strongByDomain[d.key] < 2).map((d) => d.key);
  return { n: profiles.length, questionnaire: q, byLevel, byDomain, strongByDomain, gaps, byStance, byDivergence, meanConfidence, wants, offers, wouldPayFor: pay };
}

/**
 * Who could help whom: for each domain, members with evidence at level >= 2 (routine or better, the same bar as the gap rule) are potential helpers;
 * members who named a want matching the domain (by keyword) or have no evidence there and are level <= 1 are seekers.
 */
export const WANT_KEYWORDS: Record<string, string[]> = {
  writing: ["writ", "email", "proposal", "report", "linkedin", "newsletter"],
  prep: ["prepar", "workshop", "session", "design", "programme", "training", "intervention"],
  analysis: ["analy", "summar", "interview", "survey", "pattern", "data", "document"],
  thinking: ["think", "case", "sparring", "reflect", "hypothes", "sounding"],
  client: ["client", "in the room", "live with", "with a group", "with teams", "in front of"],
  learning: ["research", "theory", "literature", "course", "reading", "keep up"],
  admin: ["admin", "schedul", "invoice", "notes", "organis", "translat", "minutes"],
  building: ["build", "prompt", "automat", "tool", "gpt", "project", "script", "template"],
};

export function helpMap(profiles: Profile[]): HelpEntry[] {
  const out: HelpEntry[] = [];
  for (const d of P.DOMAINS) {
    const helpers = profiles.filter((p) => p.practice.level >= 2 && (p.practice.domains || []).some((x) => x.key === d.key));
    const kws = WANT_KEYWORDS[d.key];
    const seekers = profiles.filter((p) => (p.wants || []).some((w) => kws.some((k) => w.toLowerCase().includes(k))) && !helpers.includes(p));
    if (helpers.length || seekers.length) out.push({ domain: d.key, label: d.label, helpers, seekers });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Defensive normalisation (port of organiser.js normalise): fills missing bits so views and
// aggregate prompts never throw on a half-formed (e.g. imported) record.
// ---------------------------------------------------------------------------
function hash(str: string): number { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

export function normaliseProfile(p: any): Profile {
  const q: any = Object.assign({}, p);
  q.member = Object.assign({ name: "Anonymous", role: "", org: "" }, p.member || {});
  q.practice = Object.assign({ level: 0, levelLabel: "", summary: "", domains: [], tools: [], judgement: "", stance: "pragmatic" }, p.practice || {});
  q.practice.domains = Array.isArray(q.practice.domains) ? q.practice.domains : [];
  q.practice.tools = Array.isArray(q.practice.tools) ? q.practice.tools : [];
  q.confidence = Object.assign({ items: [], mean: null, band: "none", pattern: "" }, p.confidence || {});
  q.confidence.items = Array.isArray(q.confidence.items) ? q.confidence.items : [];
  q.divergence = p.divergence || { kind: "aligned", note: "" };
  q.wants = Array.isArray(p.wants) ? p.wants : [];
  q.offers = Array.isArray(p.offers) ? p.offers : [];
  q.productSignals = Object.assign({ wouldPayFor: "", quote: "" }, p.productSignals || {});
  q.feedback = Object.assign({ headline: "", summary: "", strengths: [], nextSteps: [], closing: "" }, p.feedback || {});
  q.quotes = Array.isArray(p.quotes) ? p.quotes : [];
  q.id = p.id || ("p_" + hash(JSON.stringify(p.member || {})).toString(36).slice(2, 9));
  return q as Profile;
}
