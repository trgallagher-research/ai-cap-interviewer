/* Server helpers: validation, import codes, auth, memory store, member-safe views, mock LLM. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { exportCode, isProfileLike, parseCodes } from "../../lib/aiwd/codes";
import { SEED } from "../../lib/aiwd/seed";
import { validateAnswers, validateRatings, cleanText, ValidationError } from "../../lib/validate";
import { memberResult } from "../../lib/member";
import { loadPrototype, plain } from "./proto";

const W = loadPrototype();

test("validateAnswers: normalises like member.js, rejects unknown keys and options", () => {
  const a = validateAnswers({ frequency: "weekly", uses: ["writing"], tools: ["ChatGPT"], toolsOther: " Otter ", stance: "pragmatic", offer: ["peer-halfday"], pay: "maybe", canShow: "yes" });
  assert.deepEqual(a, { frequency: "weekly", uses: ["writing"], tools: ["ChatGPT"], toolsOther: "Otter", stance: "pragmatic", offer: ["peer-halfday"], pay: "maybe", canShow: "yes" });
  // Skip rules drop answers to skipped questions.
  const n = validateAnswers({ frequency: "never", uses: ["writing"], stance: "sceptical", offer: ["nothing"], pay: "yes", canShow: "yes" });
  assert.deepEqual(n, { frequency: "never", stance: "sceptical", offer: ["nothing"] });
  // Multi questions default to empty arrays; pay skipped when offer empty.
  // Statement blocks: scale answers kept, text trimmed and capped, skip rules applied, unknown options rejected.
  const blk = validateAnswers({ frequency: "never", stance: "sceptical", viewEssential: "sd", reservation: "  Too much hype  ", skillCheck: "always", scenarioCheck: "unsure", supAsked: "yes", whyNot: ["noTime"], offer: [] });
  assert.equal(blk.viewEssential, "sd");
  assert.equal(blk.reservation, "Too much hype");
  assert.equal(blk.skillCheck, undefined);       // skills skipped for never-users
  assert.equal(blk.scenarioCheck, "unsure");     // scenarios are for everyone
  assert.equal(blk.whyNot, undefined);           // only asked when they have not asked for help
  assert.deepEqual(validateAnswers({ frequency: "weekly", stance: "pragmatic", supAsked: "no", whyNot: ["noTime"] }).whyNot, ["noTime"]);
  assert.throws(() => validateAnswers({ frequency: "weekly", stance: "pragmatic", viewEssential: "maybe" }));
  assert.throws(() => validateAnswers({ frequency: "weekly", stance: "pragmatic", reservation: "x".repeat(301) }));
  for (const f of ["multi", "constant"]) assert.equal(validateAnswers({ frequency: f, stance: "enthusiast" })?.frequency, f);
  assert.deepEqual(validateAnswers({ frequency: "tried", stance: "cautious" }), { frequency: "tried", uses: [], tools: [], stance: "cautious", offer: [] });
  const bad = [
    {}, { frequency: "weekly" }, { frequency: "hourly", stance: "pragmatic" }, { frequency: "weekly", stance: "pragmatic", uses: ["cooking"] },
    { frequency: "weekly", stance: "pragmatic", offer: ["nothing", "demos"] }, { frequency: "weekly", stance: "pragmatic", hack: 1 },
    { frequency: "weekly", stance: "pragmatic", uses: "writing" }, null, [], "x",
    { frequency: "weekly", stance: "pragmatic", toolsOther: "x".repeat(300) },
  ];
  for (const b of bad) assert.throws(() => validateAnswers(b), ValidationError, JSON.stringify(b));
});

test("validateRatings and cleanText caps", () => {
  assert.deepEqual(validateRatings({ r1: 50.4, r2: null }, ["r1", "r2"]), { r1: 50 });
  assert.throws(() => validateRatings({ r9: 50 }, ["r1"]), ValidationError);
  assert.throws(() => validateRatings({ r1: 101 }, ["r1"]), ValidationError);
  assert.throws(() => validateRatings({ r1: "50" }, ["r1"]), ValidationError);
  assert.throws(() => cleanText("x".repeat(81), "name", 80, true), ValidationError);
  assert.equal(cleanText("  Anneke  ", "name", 80, true), "Anneke");
  assert.throws(() => cleanText("   ", "name", 80, true), ValidationError);
});

test("import codes: parses prototype exportCode output (base64), JSON, arrays and mixes", () => {
  const p = plain(SEED[0]);
  const protoCode = W.Store.exportCode(p);
  assert.equal(exportCode(p), protoCode);
  assert.deepEqual(plain(parseCodes(protoCode)), [p]);
  const two = protoCode + "\nsome prose\n" + W.Store.exportCode(plain(SEED[1])) + " thanks!";
  assert.deepEqual(plain(parseCodes(two)).map((x: any) => x.id), ["seed_01", "seed_02"]);
  assert.deepEqual(plain(parseCodes(JSON.stringify([p, SEED[2]]))).map((x: any) => x.id), ["seed_01", "seed_03"]);
  assert.deepEqual(plain(parseCodes("AIWD1:" + JSON.stringify(p))).map((x: any) => x.id), ["seed_01"]);
  assert.deepEqual(parseCodes("garbage"), []);
  for (const t of [protoCode, two, JSON.stringify(p), "AIWD1:" + JSON.stringify(p), "", "nonsense AIWD1:@@@"]) {
    assert.deepEqual(plain(parseCodes(t)), plain(W.Store.parseCodes(t)));
  }
  assert.equal(isProfileLike({ id: "x" }), false);
  assert.equal(isProfileLike(p), true);
});

test("memberResult never carries organiser-only coding", () => {
  const r = memberResult(SEED[0]);
  const s = JSON.stringify(r);
  for (const k of ["level", "divergence", "stance", "quotes", "practice", "transcript"]) assert.ok(!s.includes('"' + k + '"'), k);
  assert.equal(r.ratings.length, SEED[0].confidence.items.length);
});

test("auth: personal passcodes, per-account cookies, revocation, owner-only guard", async () => {
  const { NextRequest } = await import("next/server");
  const auth = await import("../../lib/auth");
  const ACC = [{ id: "tim", name: "Tim", role: "owner", passcode: "owner-pass-1" }, { id: "suz", name: "Suzanne", role: "organiser", passcode: "org-pass-22" },
    { id: "short", name: "X", role: "owner", passcode: "short" }, { id: "bad id!", name: "Y", role: "owner", passcode: "longenough" }];
  process.env.ORGANISER_ACCOUNTS = JSON.stringify(ACC);
  process.env.AUTH_SECRET = "secret-1";
  // Short passcodes and invalid ids are ignored; roles other than owner become organiser.
  assert.deepEqual(auth.accounts().map((a) => a.id), ["tim", "suz"]);
  assert.deepEqual(await auth.accountForPasscode("org-pass-22"), { id: "suz", name: "Suzanne", role: "organiser" });
  assert.equal(await auth.accountForPasscode("org-pass-2"), null);
  assert.equal(await auth.accountForPasscode(""), null);
  const req = (cookie: string) => new NextRequest("http://localhost/api/organiser/me", { headers: { cookie: "aiwd_org=" + cookie } });
  const cTim = (await auth.cookieForId("tim"))!;
  const cSuz = (await auth.cookieForId("suz"))!;
  assert.match(cTim, /^tim\.[0-9a-f]{64}$/);
  assert.equal((await auth.currentOrganiser(req(cTim)))?.role, "owner");
  assert.equal((await auth.currentOrganiser(req(cSuz)))?.id, "suz");
  assert.equal(await auth.currentOrganiser(req("tim." + cSuz.split(".")[1])), null, "a signature is bound to its account");
  assert.equal((await auth.requireOrganiser(req(cSuz), { owner: true })).denied?.status, 403);
  assert.ok((await auth.requireOrganiser(req(cTim), { owner: true })).organiser);
  assert.equal((await auth.requireOrganiser(req("nope"))).denied?.status, 401);
  // Changing a passcode revokes only that person's cookie; removing an account revokes it too.
  process.env.ORGANISER_ACCOUNTS = JSON.stringify([ACC[0], { ...ACC[1], passcode: "new-org-pass" }]);
  assert.equal(await auth.currentOrganiser(req(cSuz)), null);
  assert.equal((await auth.currentOrganiser(req(cTim)))?.id, "tim");
  process.env.ORGANISER_ACCOUNTS = JSON.stringify([ACC[1]]);
  assert.equal(await auth.currentOrganiser(req(cTim)), null);
  // A broken value means no accounts (closed in production), never open.
  process.env.ORGANISER_ACCOUNTS = "{not json";
  assert.deepEqual(auth.accounts(), []);
  // Without ORGANISER_ACCOUNTS, ORGANISER_PASSCODE is one owner account (the original setup).
  delete process.env.ORGANISER_ACCOUNTS;
  process.env.ORGANISER_PASSCODE = "test";
  assert.deepEqual(await auth.accountForPasscode("test"), { id: "owner", name: "Organiser", role: "owner" });
  delete process.env.AUTH_SECRET;
  assert.equal(auth.safeEqual("abc", "abc"), true);
  assert.equal(auth.safeEqual("abc", "abd"), false);
  assert.equal(auth.safeEqual("abc", "abcd"), false);
});

test("pricing: per attempt, fallbacks at their own rate, cache writes by TTL, unknown models flagged", async () => {
  const { priceUsage, voiceMicro } = await import("../../lib/pricing");
  // 1M input + 1M output on Opus 5.5 = $4 + $20.
  assert.equal(priceUsage("claude-opus-5-5", "claude-opus-5-5", { input_tokens: 1e6, output_tokens: 1e6 }).micro, 24e6);
  // Cache: 1M read = $0.20; 1M written at 5 min = $5; 1M at 1 h = $8.
  const cached = priceUsage("claude-opus-5-5", null, { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 2e6, cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 1e6 } });
  assert.equal(cached.micro, (0.2 + 5 + 8) * 1e6);
  assert.equal(cached.cacheWrite, 2e6);
  // A refusal on Opus 5.5 then a fallback to Opus 4.8: each attempt at its own price.
  const fb = priceUsage("claude-opus-5-5", "claude-opus-4-8", { input_tokens: 1e6, output_tokens: 0, iterations: [
    { type: "message", model: "claude-opus-5-5", input_tokens: 1e6, output_tokens: 0 },
    { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 1e6, output_tokens: 1e6 },
  ] });
  assert.equal(fb.micro, (4 + 5 + 25) * 1e6);
  assert.equal(fb.fallbacks, 1);
  assert.equal(fb.estimated, false);
  const unk = priceUsage("claude-opus-5-5", "claude-mystery-9", { input_tokens: 1e6, output_tokens: 0 });
  assert.equal(unk.micro, 4e6);
  assert.equal(unk.estimated, true);
  // Voice: one hour at the default rate; very short clips count as 10 seconds.
  delete process.env.GROQ_PRICE_PER_HOUR;
  assert.equal(voiceMicro(3600), 111000);
  assert.equal(voiceMicro(2), voiceMicro(10));
  process.env.GROQ_PRICE_PER_HOUR = "0.04";
  assert.equal(voiceMicro(3600), 40000);
  delete process.env.GROQ_PRICE_PER_HOUR;
});

test("email: address check, escaped report email, not configured / mock", async () => {
  const em = await import("../../lib/email");
  assert.equal(em.isEmail("anneke@example.nl"), true);
  for (const bad of ["anneke", "a@b", "a b@c.nl", "<x>@y.nl", "a@b.c"]) assert.equal(em.isEmail(bad), false, bad);
  const fb = { headline: "Thanks <b>Ann</b>", summary: "S & more", strengths: ["one"], nextSteps: [{ title: "T", detail: "D", steps: ["s1", "s2"] }], calibration: "C", followUp: "F", closing: "Bye" };
  const m = em.reportEmail("Ann<script>", fb, "https://x.example/r/r_abc");
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>Ann</b>"));
  assert.ok(m.html.includes("&lt;b&gt;Ann&lt;/b&gt;") && m.html.includes("S &amp; more"));
  assert.ok(m.text.includes("  - s2") && m.text.includes("https://x.example/r/r_abc") && m.text.includes("If you want to go further: F"));
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; delete process.env.EMAIL_MOCK;
  assert.equal(em.emailConfigured(), false);
  assert.equal(await em.sendReport("a@b.nl", "A", fb, "u"), "not_configured");
  process.env.EMAIL_MOCK = "1";
  assert.equal(await em.sendReport("a@b.nl", "A", fb, "u"), "sent");
  assert.equal(em.mockOutbox.at(-1)!.to, "a@b.nl");
  delete process.env.EMAIL_MOCK;
});

test("memory store: lock NX, rate limit, slots, profiles newest first", async () => {
  delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  process.env.MAX_INTERVIEWS = "2";
  const s = await import("../../lib/store");
  assert.equal(s.storageKind(), "memory");
  const id = s.newInterviewId();
  const t = await s.acquireLock(id);
  assert.ok(t);
  assert.equal(await s.acquireLock(id), null);
  await s.releaseLock(id, "wrong");
  assert.equal(await s.acquireLock(id), null);
  await s.releaseLock(id, t!);
  assert.ok(await s.acquireLock(id));
  for (let i = 0; i < 5; i++) assert.equal(await s.allowStart("1.2.3.4"), true);
  assert.equal(await s.allowStart("1.2.3.4"), false);
  assert.equal(await s.allowStart("5.6.7.8"), true);
  assert.equal(await s.reserveInterviewSlot(), true);
  assert.equal(await s.reserveInterviewSlot(), true);
  assert.equal(await s.reserveInterviewSlot(), false);
  await s.saveProfile({ ...SEED[0], id: "old", createdAt: "2026-01-01T00:00:00Z" });
  await s.saveProfile({ ...SEED[1], id: "new", createdAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual((await s.listProfiles()).map((p) => p.id), ["new", "old"]);
  assert.equal(await s.deleteProfile("old"), true);
  assert.deepEqual((await s.listProfiles()).map((p) => p.id), ["new"]);
  assert.equal(await s.getInterview("../../etc"), null);
});

test("mock LLM: scenarios from the member name", async () => {
  process.env.AIWD_MOCK_LLM = "1";
  const { getLlm, mockScenario } = await import("../../lib/llm");
  const { Interview } = await import("../../lib/aiwd/engine");
  assert.equal(mockScenario("Anneke"), "normal");
  assert.equal(mockScenario("Error Eva"), "error");
  assert.equal(mockScenario("norate"), "norate");
  const iv = new Interview({ name: "Anneke", role: "coach" }, { frequency: "weekly", uses: ["writing"], tools: [], stance: "pragmatic", offer: [] }, getLlm());
  const r1 = await iv.next();
  assert.match(r1.visible, /^Hi Anneke/);
  iv.answer("busy week");
  const r2 = await iv.next();
  assert.deepEqual(r2.chips, ["This week", "This month", "Longer ago"]);
});

test("memory store: settings, report links, activity log, cost counters", async () => {
  const s = await import("../../lib/store");
  assert.deepEqual(await s.getSettings(), { emailMode: "none" });
  await s.saveSettings({ emailMode: "optional" });
  assert.equal((await s.getSettings()).emailMode, "optional");
  await s.saveSettings({ emailMode: "none" });
  const p = { ...SEED[0], id: "p_report_test" } as any;
  await s.saveProfile(p);
  const tok = s.newReportToken();
  assert.equal(s.isReportToken(tok), true);
  await s.saveReportToken(tok, p.id);
  assert.equal((await s.profileForReport(tok))?.id, p.id);
  assert.equal(await s.profileForReport("r_" + "f".repeat(32)), null);
  assert.equal(await s.profileForReport("../etc"), null);
  await s.deleteProfile(p.id);
  assert.equal(await s.profileForReport(tok), null);
  await s.audit({ id: "a", name: "A" }, "first");
  await new Promise((r) => setTimeout(r, 5));
  await s.audit({ id: "b", name: "B" }, "second", "x".repeat(300));
  const log = await s.listAudit(2);
  assert.deepEqual(log.map((e) => e.action), ["second", "first"]);
  assert.equal(log[0].detail!.length, 200);
  const iv = s.newInterviewId();
  const before = await s.costTotals();
  await s.recordCost("turn", { micro: 100, calls: 1, input: 10, output: 5 }, iv);
  await s.recordCost("voice", { micro: 7, calls: 1, seconds: 12 }, iv);
  const after = await s.costTotals();
  assert.equal((after["turn.micro"] || 0) - (before["turn.micro"] || 0), 100);
  assert.equal((after["voice.seconds"] || 0) - (before["voice.seconds"] || 0), 12);
  const ivs = await s.costInterviews();
  assert.equal(ivs[0].id, iv);
  assert.deepEqual(ivs[0].counters, { "turn.micro": 100, "turn.calls": 1, "turn.input": 10, "turn.output": 5, "voice.micro": 7, "voice.calls": 1, "voice.seconds": 12 });
  const days = await s.costDays(3);
  assert.equal(days.length, 3);
  assert.equal(days[2].date, new Date().toISOString().slice(0, 10));
});

test("getLlm({kind, interviewId}) records each call's cost, including refusals", async () => {
  process.env.AIWD_MOCK_LLM = "1";
  const { getLlm } = await import("../../lib/llm");
  const s = await import("../../lib/store");
  const iv = s.newInterviewId();
  const llm = getLlm({ kind: "turn", interviewId: iv });
  await llm.chat("The person you are talking to is Anna, who described", [{ role: "user", content: "[The interview begins now.]" }], { tier: "interview" });
  await assert.rejects(llm.chat("The person you are talking to is Refuse Rita, who described", [{ role: "user", content: "x" }], { tier: "interview" }));
  const mine = (await s.costInterviews()).find((r) => r.id === iv)!;
  assert.equal(mine.counters["turn.calls"], 1, "the mock's refusal carries no usage; a real refusal does");
  assert.equal(mine.counters["turn.micro"], 8000);
  // Untracked calls record nothing.
  const before = JSON.stringify(await s.costTotals());
  await getLlm().chat("The person you are talking to is Anna, who described", [{ role: "user", content: "x" }], { tier: "interview" });
  assert.equal(JSON.stringify(await s.costTotals()), before);
});
