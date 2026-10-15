/* Engine parity and behaviour checks (ported Node smoke checks from the prototype). */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../../lib/aiwd/engine";
import * as P from "../../lib/aiwd/prompts";
import { SEED } from "../../lib/aiwd/seed";
import type { Answers, ChatMessage, Llm } from "../../lib/aiwd/types";
import { loadPrototype, plain } from "./proto";

const W = loadPrototype();
const PE = W.Engine, PP = W.Prompts;

const WEEKLY: Answers = { frequency: "weekly", uses: ["writing", "prep"], tools: ["ChatGPT"], toolsOther: "Otter", stance: "pragmatic", offer: ["peer-halfday"], pay: "maybe", canShow: "yes" };
const NEVER: Answers = { frequency: "never", stance: "sceptical", offer: ["nothing"] };
const TRIED_NOTHING: Answers = { frequency: "tried", uses: [], tools: [], stance: "cautious", offer: ["demos"], pay: "no" };
const UNEASY_DAILY: Answers = { frequency: "daily", uses: ["writing", "analysis"], tools: ["Claude"], stance: "worried", offer: ["confidentiality"], pay: "yes", canShow: "maybe" };

const RATE_ITEMS = [
  { id: "r1", task: "Draft a proposal from notes.", level: 2, beyond: 0 },
  { id: "r2", task: "Cluster interview notes.", level: 3, beyond: 1 },
  { id: "r3", task: "Use it live with a team.", level: 4, beyond: 2 },
];
const RATE_TEXT = "Please rate these.\n<<RATE: " + JSON.stringify(RATE_ITEMS) + " >>\n<<PHASE: rate >>";

test("parseTurn: chips, RATE, phase, complete; visible never contains markers", () => {
  const t1 = "Was that this week?\n<<CHIPS: [\"This week\", \"This month\", \"Longer ago\"] >>\n<<PHASE: practice >>";
  const p1 = E.parseTurn(t1);
  assert.equal(p1.visible, "Was that this week?");
  assert.deepEqual(p1.chips, ["This week", "This month", "Longer ago"]);
  assert.equal(p1.phase, "practice");
  assert.equal(p1.rateItems, null);
  assert.equal(p1.complete, false);
  const p2 = E.parseTurn(RATE_TEXT);
  assert.equal(p2.phase, "rate");
  assert.deepEqual(p2.rateItems, RATE_ITEMS);
  const p3 = E.parseTurn("Thanks.\n<<PHASE: close >>\n<<COMPLETE>>");
  assert.equal(p3.complete, true);
  assert.equal(p3.phase, "close");
  // Invalid / edge cases agree with the prototype.
  const cases = [
    t1, RATE_TEXT, "x <<CHIPS: [\"only one\"] >>", "x <<RATE: [{\"task\":\"a\"}] >>", "x <<RATE: not json >>",
    "x <<RATE: [{\"task\":\"a\",\"level\":9},{\"id\":\"r1\",\"task\":\"b\",\"beyond\":7},{\"id\":\"r1\",\"task\":\"c\"}] >>",
    "x <<PHASE: nonsense >>", "no markers", "dangling <", "<<PHASE: orient >>",
  ];
  for (const c of cases) {
    const a = plain(E.parseTurn(c)), b = plain(PE.parseTurn(c));
    if (a.rateItems && b.rateItems) { // duplicate ids get a random suffix: compare the stems
      a.rateItems = a.rateItems.map((x: any) => ({ ...x, id: x.id.replace(/_.*/, "") }));
      b.rateItems = b.rateItems.map((x: any) => ({ ...x, id: x.id.replace(/_.*/, "") }));
    }
    assert.deepEqual(a, b, c);
  }
  for (const s of ["abc<", "abc<<P", "abc", "<<", "a<b"]) assert.equal(E.safeVisible(s), PE.safeVisible(s));
});

test("divergenceFor: level-aware rule incl. beyond, matches prototype", () => {
  // Level 2 member, items with beyond 0/1/2, ratings at expectation → aligned.
  const items = [{ id: "a", level: 2, beyond: 0 }, { id: "b", level: 3, beyond: 1 }, { id: "c", level: 4, beyond: 2 }];
  const d1 = E.divergenceFor(2, items, { a: 75, b: 55, c: 35 });
  assert.equal(d1.kind, "aligned"); assert.equal(d1.expected, 55); assert.equal(d1.residual, 0);
  assert.equal(E.divergenceFor(2, items, { a: 100, b: 90, c: 70 }).kind, "confident-starter");
  assert.equal(E.divergenceFor(2, items, { a: 40, b: 20, c: 5 }).kind, "cautious-practitioner");
  // Level 0: never a cautious practitioner.
  assert.equal(E.divergenceFor(0, items, { a: 0, b: 0, c: 0 }).kind, "aligned");
  // Wider tolerance at level 1 (22): residual 20 is still aligned.
  const l1 = [{ id: "a", level: 1 }, { id: "b", level: 2 }];
  assert.equal(E.divergenceFor(1, l1, { a: 85, b: 65 }).kind, "aligned");
  // Fallback without beyond: item level minus practice level.
  assert.equal(E.divergenceFor(3, [{ id: "a", level: 4 }], { a: 58 }).expected, 58);
  // No ratings → unrated.
  assert.equal(E.divergenceFor(2, items, {}).kind, "unrated");
  assert.equal(E.divergenceFor(2, [], null).kind, "unrated");
  // Ratings read from items when no ratings map is given.
  assert.equal(E.divergenceFor(2, [{ id: "a", level: 2, rating: 75 }]).kind, "aligned");
  // Exhaustive parity sweep.
  for (let L = 0; L <= 4; L++) for (let r = 0; r <= 100; r += 5) for (const b of [undefined, 0, 1, 2]) {
    const its = [{ id: "a", level: 2, ...(b === undefined ? {} : { beyond: b }) }, { id: "b", level: 4 }];
    const rs = { a: r, b: 100 - r };
    assert.deepEqual(plain(E.divergenceFor(L, its, rs)), plain(PE.divergenceFor(L, its, rs)));
  }
});

test("signalsFromAnswers matches prototype", () => {
  const cases: Answers[] = [WEEKLY, NEVER, TRIED_NOTHING, UNEASY_DAILY, { offer: ["demos", "one-to-one"], offerOther: "a podcast", pay: "yes" }, { offer: [], pay: "" }];
  for (const a of cases) assert.deepEqual(plain(E.signalsFromAnswers(a)), plain(PE.signalsFromAnswers(a)));
  assert.deepEqual(E.signalsFromAnswers(WEEKLY), { offerKeys: ["peer-halfday"], pay: "maybe", wouldPayFor: "A half-day with peers from this network" });
  assert.deepEqual(E.signalsFromAnswers(NEVER), { offerKeys: [], pay: "", wouldPayFor: "" });
  assert.deepEqual(E.signalsFromAnswers(null), { offerKeys: [], pay: "", wouldPayFor: "" });
});

test("buildInterviewSystem routing: never / tried-with-nothing / uneasy daily user", () => {
  const m = { name: "Anneke", role: "team coach" };
  const never = P.buildInterviewSystem(m, NEVER);
  assert.match(never, /has not used AI tools in their work/);
  assert.match(never, /how AI has or hasn't come up around their work/);
  assert.doesNotMatch(never, /1\. PRACTICE/);
  const tried = P.buildInterviewSystem(m, TRIED_NOTHING);
  assert.match(tried, /tried AI tools once or a few times but named no area/);
  assert.match(tried, /the most recent time they tried it/);
  assert.doesNotMatch(tried, /1\. PRACTICE/);
  const uneasy = P.buildInterviewSystem(m, UNEASY_DAILY);
  assert.match(uneasy, /1\. PRACTICE/);
  assert.match(uneasy, /said they feel uneasy about AI/);
  assert.doesNotMatch(uneasy, /They said they could show a/);
  const weekly = P.buildInterviewSystem(m, WEEKLY);
  assert.match(weekly, /They said they could show a/);
  assert.doesNotMatch(weekly, /said they feel/);
  // The web interviewer knows the questionnaire also covers views, skills, scenarios and support.
  assert.match(weekly, /a list of concrete skills, two short scenarios, where they get help/);
});

// Since the second round of feedback (Oct 2026) the web questionnaire, profile prompt and aggregates
// extend the prototype's; the prototype is frozen. The original questions and shared data still match.
test("prompt data shared with the prototype; the web questionnaire only adds to it", () => {
  for (const qid of ["frequency", "tools", "stance", "offer", "pay", "canShow"]) assert.deepEqual(plain(P.QUESTIONNAIRE[qid]), plain(PP.QUESTIONNAIRE[qid]), qid);
  assert.deepEqual(plain(P.QUESTIONNAIRE.uses.options.slice(0, -1)), plain(PP.QUESTIONNAIRE.uses.options));
  assert.equal(P.QUESTIONNAIRE.uses.options.at(-1)!.key, "search");
  // Same lines as the prototype for the original questions ("could show a colleague" moved up a page).
  for (const a of [WEEKLY, NEVER, null]) assert.deepEqual(P.formatQuestionnaire(a).split("\n").sort(), PP.formatQuestionnaire(a).split("\n").sort());
  assert.equal(P.formatRatingsTurn(RATE_ITEMS, { r1: 10, r3: 90 }), PP.formatRatingsTurn(RATE_ITEMS, { r1: 10, r3: 90 }));
  assert.deepEqual(plain(P.DOMAINS), plain(PP.DOMAINS));
  assert.deepEqual(plain(P.LADDER), plain(PP.LADDER));
  assert.deepEqual(plain(P.NUDGES), plain(PP.NUDGES));
});

test("interviewMessages: kick-off user turn, never the instruction block; rest identical", () => {
  const m = { name: "Anneke", role: "coach" };
  const turns = [{ role: "interviewer" as const, text: "Q1" }, { role: "member" as const, text: "A1", tapped: true }];
  for (const opts of [{}, { endNow: true }, { nudge: P.NUDGES.forceRate }, { nudge: P.NUDGES.forceClose }]) {
    for (const ts of [[], turns.slice(0, 1), turns]) {
      const mine = P.interviewMessages(m, ts, { ...opts, answers: WEEKLY });
      const theirs = PP.interviewMessages(m, ts, { ...opts, answers: WEEKLY });
      assert.equal(mine[0].role, "user");
      assert.ok(mine[0].content.startsWith(P.KICKOFF));
      for (const msg of mine) assert.ok(!msg.content.includes("# Rules of the conversation"));
      // The prototype's first message is system + "\n\n" + kick-off; everything after it is identical.
      assert.ok(theirs[0].content.endsWith("\n\n" + mine[0].content));
      assert.deepEqual(plain(mine.slice(1)), plain(theirs.slice(1)));
      assert.equal(mine[mine.length - 1].role, "user");
    }
  }
});

/** Scripted model shared by the TS and prototype interviews: answers by assistant-turn count. */
function scriptFor(seq: (string | Error)[]) {
  return (msgs: { role: string; content: string }[]) => {
    const n = msgs.filter((m) => m.role === "assistant").length;
    const lu = [...msgs].reverse().find((m) => m.role === "user")!.content;
    if (lu.includes("[I need to stop here.]")) return "Thanks, stopping.\n<<PHASE: close >>\n<<COMPLETE>>";
    const v = seq[Math.min(n, seq.length - 1)];
    if (v instanceof Error) throw v;
    return v;
  };
}

function tsLlm(script: (msgs: ChatMessage[]) => string, log?: { system: string; messages: ChatMessage[] }[]): Llm {
  return {
    async chat(system, messages, opts) {
      if (log) log.push({ system, messages: plain(messages) });
      const text = script(messages);
      if (opts.onText) { for (let i = 5; i < text.length; i += 5) opts.onText(text.slice(0, i)); opts.onText(text); }
      return { text };
    },
  };
}

test("full interview parity: same transcript, state and per-call messages as the prototype", async () => {
  const seq = [
    "Hi Anneke. What does a week look like?\n<<PHASE: orient >>",
    "When was the last time?\n<<CHIPS: [\"This week\", \"Longer ago\"] >>\n<<PHASE: practice >>",
    "What did you type?\n<<PHASE: practice >>",
    RATE_TEXT,
    "Why the gap?\n<<PHASE: close >>",
    "Thank you.\n<<PHASE: close >>\n<<COMPLETE>>",
  ];
  const script = scriptFor(seq);
  const tsLog: { system: string; messages: ChatMessage[] }[] = [];
  const protoLog: any[] = [];
  const pw = loadPrototype(async (messages: any[], opts: any) => {
    protoLog.push(plain(messages));
    const text = script(messages);
    if (opts && opts.onText) opts.onText({ text });
    return { text };
  });
  const a = new E.Interview({ name: "Anneke", role: "coach" }, WEEKLY, tsLlm(script, tsLog));
  const b = new pw.Engine.Interview({ name: "Anneke", role: "coach" }, WEEKLY);
  const streamed: string[] = [];
  const steps: [string, any][] = [["", null], ["A week of workshops", null], ["This week", { tapped: true }], ["I typed my notes", null]];
  for (const [ans, o] of steps) {
    if (ans) { a.answer(ans, o || undefined); b.answer(ans, o || undefined); }
    const ra = await a.next((v) => streamed.push(v));
    const rb = await b.next(() => {});
    assert.deepEqual(plain(ra), plain(rb));
  }
  assert.equal(a.status, "rating");
  for (const s of streamed) assert.ok(!s.includes("<<"), s);
  a.submitRatings({ r1: 80, r2: 40, r3: 20, bogus: 5 }); b.submitRatings({ r1: 80, r2: 40, r3: 20, bogus: 5 });
  assert.deepEqual(plain(await a.next()), plain(await b.next()));
  a.answer("Because it is live"); b.answer("Because it is live");
  const last = await a.next(); assert.deepEqual(plain(last), plain(await b.next()));
  assert.equal(last.complete, true);
  const ja: any = plain(a.toJSON()), jb: any = plain(b.toJSON());
  delete ja.startedAt; delete jb.startedAt;
  assert.deepEqual(ja, jb);
  // Per call: system + kick-off replaces the prototype's first message; the rest is identical.
  assert.equal(tsLog.length, protoLog.length);
  tsLog.forEach((c, i) => {
    assert.equal(c.system, a.system());
    assert.ok(protoLog[i][0].content.endsWith("\n\n" + c.messages[0].content));
    assert.deepEqual(c.messages.slice(1), protoLog[i].slice(1));
  });
  // Round trip.
  const back = E.Interview.fromJSON(a.toJSON());
  assert.deepEqual(plain(back.toJSON()), plain(a.toJSON()));
  // assembleProfile parity (ids and timestamps differ by design).
  const out = { practice: { level: 2, domains: [{ key: "writing", evidence: "x" }, { key: "nope", evidence: "y" }], probedNoEpisode: ["prep", "writing", "admin"], stance: "worried" }, feedback: { headline: "H", nextSteps: [{ title: "T" }, {}] }, quotes: ["q"] };
  const pa: any = plain(E.assembleProfile(a, out, "live")), pb: any = plain(PE.assembleProfile(b, out, "live"));
  for (const k of ["id", "createdAt"]) { delete pa[k]; delete pb[k]; }
  // Web-only additions: the self-check and the richer feedback fields.
  assert.equal(pa.selfCheck.skillIndex, null);
  assert.deepEqual([pa.feedback.calibration, pa.feedback.followUp, pa.feedback.nextSteps[0].steps], ["", "", []]);
  delete pa.selfCheck; delete pa.feedback.calibration; delete pa.feedback.followUp;
  for (const n of pa.feedback.nextSteps) delete n.steps;
  assert.deepEqual(pa, pb);
  assert.equal(pa.practice.stance, "pragmatic"); // questionnaire answer wins
  assert.deepEqual(pa.practice.probedNoEpisode, ["prep"]);
});

test("forced rating: counted only once a reply arrives; termination without a RATE marker", async () => {
  const q = "Tell me more.\n<<PHASE: practice >>";
  let fail = false;
  const calls: string[] = [];
  const llm: Llm = {
    async chat(_s, messages) {
      const lu = messages[messages.length - 1].content;
      calls.push(lu);
      if (fail) throw new Error("boom");
      if (lu.includes("close the interview now")) return { text: "Thank you.\n<<PHASE: close >>\n<<COMPLETE>>" };
      return { text: q }; // never a RATE marker, never phase "rate"
    },
  };
  const iv = new E.Interview({ name: "Ben", role: "trainer" }, WEEKLY, llm);
  for (let i = 0; i < E.LIMITS.maxQuestionsBeforeRate; i++) { if (i) iv.answer("answer " + i); await iv.next(); }
  assert.equal(iv.interviewerCount, 9);
  iv.answer("answer 9");
  // A failed call does not use up a forced attempt.
  fail = true;
  await assert.rejects(iv.next());
  assert.equal(iv.forcedRateAttempts, 0);
  assert.ok(calls[calls.length - 1].includes(P.NUDGES.forceRate));
  fail = false;
  await iv.next();
  assert.equal(iv.forcedRateAttempts, 1);
  iv.answer("answer 10");
  await iv.next();
  assert.equal(iv.forcedRateAttempts, 2);
  iv.answer("answer 11");
  const r = await iv.next();
  assert.ok(calls[calls.length - 1].includes(P.NUDGES.forceClose));
  assert.equal(r.complete, true);
  assert.equal(iv.status, "complete");
  assert.equal(iv.rateItems, null);
  const p = E.assembleProfile(iv, {}, "live");
  assert.equal(p.divergence.kind, "unrated");
  assert.equal(p.confidence.mean, null);
});

test("missing RATE marker: one engine retry with the missingRate nudge", async () => {
  const seen: string[] = [];
  const llm: Llm = {
    async chat(_s, messages, opts) {
      const lu = messages[messages.length - 1].content;
      seen.push(lu);
      const text = lu.includes("did not include a valid RATE marker") ? RATE_TEXT : "Please rate.\n<<PHASE: rate >>";
      opts.onText?.(text);
      return { text };
    },
  };
  const iv = new E.Interview({ name: "C", role: "r" }, WEEKLY, llm);
  const r = await iv.next();
  assert.equal(seen.length, 2);
  assert.equal(r.rateItems?.length, 3);
  assert.equal(iv.status, "rating");
  assert.equal(iv.turns.length, 1);
  assert.equal(iv.turns[0].text, "Please rate these."); // the retry's message replaces the first
});

test("after ratings: at most 3 interviewer turns, the third forced to close", async () => {
  const llm: Llm = { async chat(_s, messages) { const lu = messages[messages.length - 1].content; return { text: lu.includes("close the interview now") ? "Bye.\n<<COMPLETE>>" : "One more?\n<<PHASE: close >>" }; } };
  const iv = new E.Interview({ name: "D", role: "r" }, WEEKLY, llm);
  iv.rateItems = RATE_ITEMS; iv.status = "rating";
  iv.submitRatings({ r1: 50 });
  await iv.next(); iv.answer("x"); await iv.next(); iv.answer("y");
  const r = await iv.next();
  assert.equal(r.complete, true);
  assert.equal(iv.afterRateCount, 3);
});

test("chatJson: tolerant parse, one retry, then bad_json", async () => {
  let n = 0;
  const llm: Llm = { async chat() { n++; return { text: n === 1 ? "nope" : "```json\n{\"a\":1}\n```" }; } };
  assert.deepEqual(await E.chatJson(llm, [{ role: "user", content: "x" }]), { a: 1 });
  assert.equal(n, 2);
  const never: Llm = { async chat() { return { text: "still not json" }; } };
  await assert.rejects(E.chatJson(never, [{ role: "user", content: "x" }]), (e: any) => e.code === "bad_json");
});

test("seed: identical to prototype; stats, helpMap and per-profile scoring equal seed-check output", () => {
  assert.deepEqual(plain(SEED), plain(W.SEED));
  assert.equal(SEED.length, 16);
  const webStats: any = plain(E.stats(SEED));
  // Web-only questionnaire aggregates; the seed members predate the statement blocks.
  for (const k of ["search", "items", "whyNot", "accessNotAsked", "calibration"]) delete webStats.questionnaire[k];
  assert.deepEqual(webStats, plain(PE.stats(W.SEED)));
  const names = (h: any[]) => h.map((x) => ({ d: x.domain, h: x.helpers.map((p: any) => p.member.name), s: x.seekers.map((p: any) => p.member.name) }));
  assert.deepEqual(plain(names(E.helpMap(SEED))), plain(names(PE.helpMap(W.SEED))));
  for (const p of SEED) {
    const ratings: Record<string, number> = {};
    for (const it of p.confidence.items) if (typeof it.rating === "number") ratings[it.id] = it.rating;
    const mean = E.meanRating(p.confidence.items, ratings);
    assert.equal(mean, p.confidence.mean, p.member.name);
    assert.equal(E.band(mean), p.confidence.band, p.member.name);
    const d = E.divergenceFor(p.practice.level, p.confidence.items, ratings);
    assert.equal(d.kind, p.divergence.kind, p.member.name);
    assert.equal(d.note, p.divergence.note, p.member.name);
    assert.deepEqual(E.signalsFromAnswers(p.questionnaire).offerKeys, p.productSignals.offerKeys, p.member.name);
  }
  const st = E.stats(SEED);
  assert.equal(st.n, 16);
  assert.equal(st.questionnaire.answered, 16);
  assert.deepEqual(E.stats([]).byLevel, [0, 0, 0, 0, 0]);
});

// ---------------------------------------------------------------------------
// Second-round additions: statement blocks, self-check, richer feedback, aggregates
// ---------------------------------------------------------------------------
const BLOCKS_DAILY: Answers = {
  ...WEEKLY, frequency: "daily", uses: ["writing", "search"],
  viewEssential: "a", viewQuality: "sa", viewChange: "n", viewBehind: "d", doubtReliability: "a", doubtPrivacy: "sa", doubtTime: "sd",
  reservation: "It flattens my thinking",
  skillFollowUp: "yes", skillCheck: "always", skillOwnMaterial: "yes", skillPrompt: "sometimes", skillAnonymise: "na", skillReusable: "no", skillAgents: "no",
  scenarioCheck: "verify", scenarioData: "paste",
  supInOrg: "na", supOutside: "yes", supFormal: "no", supOnline: "yes", supAsked: "no", supTraining: "no", supSelfTaught: "yes",
  whyNot: ["noTime", "embarrassed"],
};

test("pages cover every question once; block items carry their scale metadata", () => {
  const ids = P.PAGES.flatMap((pg) => pg.qids);
  assert.deepEqual(ids, P.QUESTION_ORDER);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(new Set(ids), new Set(Object.keys(P.QUESTIONNAIRE)));
  assert.equal(P.PAGES.length, 4);
  for (const id of ids) {
    const q = P.QUESTIONNAIRE[id];
    if (q.block === "skills") assert.ok(q.level && q.skipIf && q.skipIf.frequency.includes("never"), id);
    if (q.block === "scenario") assert.ok(q.options.some((o) => o.key === q.correct), id);
  }
});

test("computeSelfCheck: weighted skill index, scenarios, views, support and calibration", () => {
  const sc = P.computeSelfCheck(BLOCKS_DAILY, 80)!;
  // weights 1,1,2,2,(na skipped),4,4: (1 + 1 + 2 + 2/3 + 0 + 0) / 14
  assert.equal(sc.skillIndex, Math.round((100 * (1 + 1 + 2 + 2 * (1 / 3))) / 14));
  assert.equal(sc.skillsAnswered, 6);
  assert.deepEqual(sc.scenarios, { answered: 2, careful: 1 });
  assert.equal(sc.conviction, 3.5); // agree 4, strongly agree 5, neither 3, disagree 2
  assert.deepEqual(sc.doubts, ["doubtReliability", "doubtPrivacy"]);
  assert.deepEqual(sc.access, ["supOutside", "supOnline"]);
  assert.deepEqual(sc.used, ["supSelfTaught"]);
  assert.deepEqual(sc.whyNot, ["noTime", "embarrassed"]);
  assert.equal(sc.reservation, "It flattens my thinking");
  assert.equal(sc.calibration.kind, "confidence-above-skills");
  assert.equal(P.computeSelfCheck(BLOCKS_DAILY, sc.skillIndex)!.calibration.kind, "in-line");
  assert.equal(P.computeSelfCheck(BLOCKS_DAILY, 0)!.calibration.kind, "skills-above-confidence");
  assert.equal(P.computeSelfCheck(BLOCKS_DAILY, null)!.calibration.kind, "unknown");
  // Never-users skip the skill items: no index, still the scenarios.
  const nev = P.computeSelfCheck({ ...NEVER, skillCheck: "always", scenarioCheck: "unsure" }, 20)!;
  assert.equal(nev.skillIndex, null);
  assert.deepEqual(nev.scenarios, { answered: 1, careful: 0 });
  assert.equal(P.computeSelfCheck(null, 50), null);
});

test("profile prompt carries the self-check and the new feedback rules", () => {
  const pr = P.buildProfilePrompt({ name: "Anneke", role: "coach" }, [], RATE_ITEMS, { r1: 90, r2: 90, r3: 90 }, BLOCKS_DAILY);
  assert.match(pr, /Concrete skill index \(from the skill items, advanced behaviour weighted more\): \d+ \/ 100/);
  assert.match(pr, /Scenarios: 1 of 2 answered with the careful option/);
  assert.match(pr, /Why they have not asked for help: I don't have the time; I feel embarrassed/);
  assert.match(pr, /confidence-above-skills/);
  assert.match(pr, /Scepticism is a valid position, not a deficit/);
  assert.match(pr, /Describe routes by type/);
  assert.match(pr, /"steps": \[/);
  assert.doesNotMatch(pr, /without new tools or budget/);
  assert.match(P.formatQuestionnaire(BLOCKS_DAILY), /What is your biggest reservation about using AI in your work\? \(optional\) "It flattens my thinking"/);
});

test("assembleProfile stores the self-check and feedback extras; members get feedback but no self-check", async () => {
  const { memberResult } = await import("../../lib/member");
  const iv = { member: { name: "Anneke", role: "coach" }, turns: [], rateItems: RATE_ITEMS, ratings: { r1: 90, r2: 90, r3: 90 }, answers: BLOCKS_DAILY, status: "complete" as const };
  const out = { practice: { level: 2 }, feedback: { headline: "H", nextSteps: [{ title: "A", detail: "d", steps: ["one", "two", "three", "four"] }, { title: "B" }, { title: "C" }, { title: "D" }], calibration: "Gentle.", followUp: "A short course." } };
  const p = E.assembleProfile(iv as any, out, "live");
  assert.equal(p.selfCheck!.calibration.kind, "confidence-above-skills");
  assert.equal(p.feedback.nextSteps.length, 3);
  assert.deepEqual(p.feedback.nextSteps[0].steps, ["one", "two", "three"]);
  const mr: any = memberResult(p);
  assert.equal(mr.feedback.calibration, "Gentle.");
  assert.equal(mr.feedback.followUp, "A short course.");
  assert.deepEqual(mr.feedback.nextSteps[0].steps, ["one", "two", "three"]);
  assert.ok(!("selfCheck" in mr) && !JSON.stringify(mr).includes("skillIndex"));
});

test("stats: statement counts, why-not, access-not-asked, search and calibration", () => {
  const iv = (answers: Answers, r: number) => ({ member: { name: "X", role: "r" }, turns: [], rateItems: RATE_ITEMS, ratings: { r1: r, r2: r, r3: r }, answers, status: "complete" as const });
  const a = E.assembleProfile(iv(BLOCKS_DAILY, 90) as any, { practice: { level: 2 } });
  const b = E.assembleProfile(iv({ ...BLOCKS_DAILY, supAsked: "yes", whyNot: undefined as any, scenarioData: "strip", uses: ["writing"] }, 30) as any, { practice: { level: 2 } });
  const c = E.assembleProfile(iv(NEVER, 10) as any, { practice: { level: 0 } });
  const q = E.stats([a, b, c]).questionnaire;
  assert.equal(q.search, 1);
  assert.deepEqual(q.items.scenarioData, { answered: 2, positive: 1 });
  assert.deepEqual(q.items.viewQuality, { answered: 2, positive: 2 });
  assert.deepEqual(q.items.skillCheck, { answered: 2, positive: 2 });
  assert.deepEqual(q.items.supOutside, { answered: 2, positive: 2 });
  assert.equal(q.whyNot.noTime, 1);
  assert.equal(q.accessNotAsked, 1);
  assert.equal(q.calibration["confidence-above-skills"], 1);
  assert.equal(q.calibration["in-line"], 1);
  assert.equal(q.calibration.unknown, 1);
});

// ---------------------------------------------------------------------------
// Dutch version
// ---------------------------------------------------------------------------
test("Dutch: every question, option, hint and page has Dutch wording; UI strings match in both languages", async () => {
  const { QUESTIONS_NL, PAGES_NL } = await import("../../app/components/member/questionnaire-nl");
  const { STRINGS } = await import("../../app/components/member/i18n");
  for (const pg of P.PAGES) assert.ok(PAGES_NL[pg.id]?.title && PAGES_NL[pg.id]?.intro, "page " + pg.id);
  for (const [id, q] of Object.entries(P.QUESTIONNAIRE)) {
    const nl = QUESTIONS_NL[id];
    assert.ok(nl && nl.label, "question " + id);
    if (q.sub) assert.ok(nl.sub, "subheading " + id);
    for (const o of q.options) {
      // Product names (ChatGPT, Claude…) need no translation; everything else must have it.
      const same = id === "tools" && o.key === o.label;
      assert.ok(same || nl.options?.[o.key], `option ${id}.${o.key}`);
      if (o.hint) assert.ok(nl.hints?.[o.key], `hint ${id}.${o.key}`);
    }
  }
  const keys = (o: object) => Object.keys(o).sort();
  assert.deepEqual(keys(STRINGS.nl), keys(STRINGS.en));
  assert.deepEqual(keys(STRINGS.nl.err), keys(STRINGS.en.err));
  assert.deepEqual(keys(STRINGS.nl.phase), keys(STRINGS.en.phase));
  assert.deepEqual(keys(STRINGS.nl.voice), keys(STRINGS.en.voice));
});

test("Dutch: interviewer speaks Dutch with 'je'; feedback in Dutch, organiser fields in English; share-back in Dutch; lang round-trips", async () => {
  const m = { name: "Anneke", role: "teamcoach" };
  const nl = P.buildInterviewSystem(m, WEEKLY, "nl");
  assert.match(nl, /one-to-one interview, in Dutch, for the AI at Work Diagnostic run by \nMakersnetwerk|in Dutch, for the AI at Work Diagnostic run by Makersnetwerk/);
  assert.match(nl, /addressing Anneke with "je" \(never "u"\)/);
  assert.match(nl, /"Iets anders"/);
  assert.doesNotMatch(P.buildInterviewSystem(m, WEEKLY), /Dutch: natural|"je"/);
  assert.match(P.buildInterviewSystem(m, WEEKLY), /in English, for the AI at Work Diagnostic run by Makersnetwerk/);
  const pr = P.buildProfilePrompt(m, [], RATE_ITEMS, {}, WEEKLY, "nl");
  assert.match(pr, /Write every string inside "feedback" in natural, plain Dutch/);
  assert.match(pr, /Dank je, Anneke/);
  assert.match(P.buildProfilePrompt(m, [], RATE_ITEMS, {}, WEEKLY), /All strings in English/);
  assert.match(P.buildSharebackPrompt(SEED, E.stats(SEED)), /Write for the members, in Dutch/);
  assert.doesNotMatch(P.buildProductReadPrompt(SEED, E.stats(SEED)), /Write [^.]*in Dutch/);
  for (const prompt of [nl, pr, P.buildSharebackPrompt(SEED, E.stats(SEED)), P.buildProductReadPrompt(SEED, E.stats(SEED))]) assert.doesNotMatch(prompt, /Systeeminterventies/);
  const iv = new E.Interview(m, WEEKLY);
  assert.equal(iv.lang, "en");
  assert.equal("lang" in iv.toJSON(), false, "English interviews serialise as before");
  iv.lang = "nl";
  const back = E.Interview.fromJSON(JSON.parse(JSON.stringify(iv.toJSON())));
  assert.equal(back.lang, "nl");
  assert.match(back.system(), /in Dutch/);
  assert.equal(E.assembleProfile(back, { practice: { level: 1 } }).lang, "nl");
  assert.equal(E.assembleProfile(new E.Interview(m, WEEKLY), { practice: { level: 1 } }).lang, undefined);
});
