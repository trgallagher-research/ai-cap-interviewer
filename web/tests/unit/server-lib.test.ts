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

test("auth: HMAC cookie and constant-time compare", async () => {
  process.env.ORGANISER_PASSCODE = "open sesame";
  delete process.env.AUTH_SECRET;
  const auth = await import("../../lib/auth");
  const c1 = await auth.expectedCookie();
  assert.match(c1, /^[0-9a-f]{64}$/);
  assert.equal(await auth.passcodeMatches("open sesame"), true);
  assert.equal(await auth.passcodeMatches("open sesamE"), false);
  assert.equal(await auth.passcodeMatches(""), false);
  process.env.AUTH_SECRET = "other";
  assert.notEqual(await auth.expectedCookie(), c1);
  assert.equal(auth.safeEqual("abc", "abc"), true);
  assert.equal(auth.safeEqual("abc", "abd"), false);
  assert.equal(auth.safeEqual("abc", "abcd"), false);
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
