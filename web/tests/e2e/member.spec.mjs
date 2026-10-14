/* member.spec.mjs — end-to-end checks for the member flow at "/" against the real app
 * (server started with AIWD_MOCK_LLM=1 and ORGANISER_PASSCODE=test; scenario chosen by member name).
 * Run: BASE_URL=http://127.0.0.1:3100 NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/member.spec.mjs
 * Ported from prototype/tests/member.spec.js. */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
// "localhost", not 127.0.0.1: in production the organiser cookie is Secure, which browsers accept
// over plain http only on localhost (and the server's redirects name localhost).
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "").replace("//127.0.0.1:", "//localhost:");
const PASSCODE = process.env.ORGANISER_PASSCODE || "test";
// A unique suffix so repeated runs against one server can be told apart in the organiser API.
const RUN = Date.now().toString(36).slice(-4);
// The server rate-limits starts per IP (5 an hour); give every browser context its own address.
let ipN = 0;
const ipHeader = () => ({ "x-forwarded-for": `10.${(Date.now() >> 8) & 255}.${(ipN = (ipN + 1) % 250)}.${Math.floor(Math.random() * 250) + 1}` });

let passed = 0, failed = 0;
const results = [];
function check(name, cond, extra) {
  if (cond) { passed++; results.push("PASS " + name); }
  else { failed++; results.push("FAIL " + name + (extra ? " :: " + extra : "")); console.log("FAIL", name, extra || ""); }
}

// Records any bubble text that ever contains "<<" (a leaked marker).
const LEAK_WATCH = `
  window.__leaks = [];
  const obs = new MutationObserver(() => {
    document.querySelectorAll(".bubble").forEach((b) => { if (b.textContent.includes("<<")) window.__leaks.push(b.textContent); });
  });
  document.addEventListener("DOMContentLoaded", () => obs.observe(document.body, { subtree: true, childList: true, characterData: true }));
`;

async function newPage(browser, { viewport = { width: 1200, height: 900 }, dark = false, path: p = "/", permissions } = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme: dark ? "dark" : "light", permissions, extraHTTPHeaders: ipHeader() });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => check("no page error", false, e.message));
  await page.addInitScript(LEAK_WATCH);
  await page.goto(BASE + p);
  await page.waitForSelector("#landing");
  await page.waitForFunction(() => !document.querySelector("#btn-start:disabled"));
  return { ctx, page };
}

async function noOverflow(page, label, max) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`no horizontal overflow on ${label} (scrollWidth ${w} <= ${max})`, w <= max, String(w));
}

async function waitIdle(page, timeout = 20000) {
  await page.waitForFunction(() => !document.getElementById("streaming") && !document.querySelector("#btn-send:disabled"), null, { timeout });
}

async function answer(page, text) {
  await waitIdle(page);
  await page.fill("#answer", text);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#streaming", { timeout: 5000 }).catch(() => {});
}

async function startLanding(page, name, role) {
  await page.fill("#f-name", name);
  await page.fill("#f-role", role);
  await page.click("#btn-start");
  await page.waitForSelector("#questionnaire");
}

/** The questionnaire is paged: basics → views → skills → support. Next/Back keep the answers. */
async function qPage(page) { return page.getAttribute("#questionnaire", "data-page"); }
async function nextPage(page, expected) {
  await page.click("#btn-q-next");
  await page.waitForSelector(`#questionnaire[data-page='${expected}']`);
}

/** Fills all four pages and ends on the last one (the caller clicks #btn-q-continue). */
async function fillQuestionnaire(page, kind = "weekly", onPage) {
  if (kind === "never") {
    await page.click("label[for='q-frequency-never']");
    await page.click("label[for='q-stance-sceptical']");
    if (onPage) await onPage("basics");
    await nextPage(page, "views");
    await page.click("label[for='q-doubtCraft-sa']");
    if (onPage) await onPage("views");
    await nextPage(page, "skills");
    await page.click("label[for='q-scenarioCheck-unsure']");
    if (onPage) await onPage("skills");
    await nextPage(page, "support");
    await page.click("label[for='q-offer-nothing']");
  } else {
    await page.click("label[for='q-frequency-weekly']");
    await page.click("label[for='q-uses-writing']");
    await page.click("label[for='q-uses-prep']");
    await page.click("label[for='q-tools-ChatGPT']");
    await page.fill("#q-tools-other", "Otter");
    await page.click("label[for='q-stance-pragmatic']");
    if (onPage) await onPage("basics");
    await nextPage(page, "views");
    await page.click("label[for='q-viewEssential-a']");
    await page.click("label[for='q-doubtPrivacy-sa']");
    await page.fill("#q-reservation-text", "Clients may not want it");
    if (onPage) await onPage("views");
    await nextPage(page, "skills");
    await page.click("label[for='q-skillCheck-always']");
    await page.click("label[for='q-skillAgents-no']");
    await page.click("label[for='q-canShow-yes']");
    await page.click("label[for='q-scenarioCheck-verify']");
    if (onPage) await onPage("skills");
    await nextPage(page, "support");
    await page.click("label[for='q-supOutside-yes']");
    await page.click("label[for='q-supAsked-no']");
    await page.click("label[for='q-whyNot-noTime']");
    await page.click("label[for='q-offer-peer-halfday']");
    await page.click("label[for='q-pay-maybe']");
  }
  if (onPage) await onPage("support");
}

async function startInterview(page, name, role, kind = "weekly") {
  await startLanding(page, name, role);
  await fillQuestionnaire(page, kind);
  await page.click("#btn-q-continue");
  await page.waitForSelector("#interview", { timeout: 15000 });
}

/** Organiser API access from the test, to check what the server stored. */
async function organiserProfiles(browser) {
  const ctx = await browser.newContext();
  const r = await ctx.request.post(BASE + "/api/organiser/login", { data: { passcode: PASSCODE } });
  if (!r.ok()) { await ctx.close(); return null; }
  const j = await (await ctx.request.get(BASE + "/api/organiser/profiles")).json();
  await ctx.close();
  return j.profiles || [];
}

async function fullFlow(browser, page, tag, name, opts = {}) {
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `member-${n}-${tag}.png`), fullPage: true });
  await shot("landing");
  if (opts.max) await noOverflow(page, "landing " + tag, opts.max);
  await startLanding(page, name, "team coach, mostly healthcare organisations");
  // Required validation: Next with nothing ticked
  await page.click("#btn-q-next");
  check("questionnaire shows inline required errors (" + tag + ")", (await page.isVisible("#q-err-frequency")) && (await page.isVisible("#q-err-stance")));
  check("questionnaire does not advance when invalid (" + tag + ")", (await qPage(page)) === "basics" && (await page.locator("#interview").count()) === 0);
  const fieldsets = await page.locator("#q-form fieldset.q").count();
  check("first page renders the 4 basic questions (" + tag + ")", fieldsets === 4, String(fieldsets));
  check("progress shows part 1 of 4 (" + tag + ")", (await page.textContent("#q-step")).includes("1 of 4"));
  const qText = await page.textContent("#questionnaire");
  check("questionnaire labels and hints shown (" + tag + ")", qText.includes("How often does an AI tool") && qText.includes("Instead of a search engine") && (await page.locator(".opt-hint").count()) >= 9);
  await fillQuestionnaire(page, "weekly", async (pg) => {
    if (pg === "basics") check("required error clears after answering (" + tag + ")", !(await page.isVisible("#q-err-frequency")));
    if (pg === "views") check("views page: 10 statements + open question (" + tag + ")", (await page.locator("#q-form fieldset.q-item").count()) === 10 && (await page.locator("#q-reservation-text").count()) === 1);
    if (pg === "skills") check("skills page shows skills, canShow and 2 scenarios (" + tag + ")", (await page.locator("#q-form fieldset.q-item").count()) === 7 && (await page.isVisible("#q-canShow")) && (await page.locator("#q-scenarioCheck, #q-scenarioData").count()) === 2);
    if (pg === "support") check("why-not shown after 'not asked' (" + tag + ")", (await page.isVisible("#q-whyNot")) && (await page.isVisible("#q-pay")));
    await shot("questionnaire-" + pg);
    if (opts.max) await noOverflow(page, "questionnaire " + pg + " " + tag, opts.max);
  });
  await page.click("#btn-q-back");
  await page.waitForSelector("#questionnaire[data-page='skills']");
  check("Back keeps answers (" + tag + ")", await page.isChecked("#q-skillCheck-always"));
  await nextPage(page, "support");
  await page.click("#btn-q-continue");
  await page.waitForSelector("#interview", { timeout: 15000 });
  await page.waitForSelector(".bubble.interviewer");
  await waitIdle(page);
  const first = await page.textContent(".bubble.interviewer");
  check("first interviewer turn greets by name (" + tag + ")", first.includes("Hi " + name), first);
  check("interview id kept in localStorage (" + tag + ")", !!(await page.evaluate(() => localStorage.getItem("aiwd.interviewId"))));
  check("questionnaire draft cleared once the interview exists (" + tag + ")", (await page.evaluate(() => localStorage.getItem("aiwd.draft"))) === null);
  await answer(page, "I coach teams in hospitals, mostly three days a week, and write a lot of summaries.");
  await waitIdle(page);
  await page.waitForSelector("#chips:not([hidden]) .chip");
  const chipTexts = await page.$$eval("#chips .chip", (els) => els.map((e) => e.textContent));
  check("chips render from CHIPS marker (" + tag + ")", chipTexts.join("|") === "This week|This month|Longer ago", chipTexts.join("|"));
  const hint = await page.textContent("#phase-hint");
  check("phase hint follows the interview (" + tag + ")", hint.includes("your practice"), hint);
  await shot("chips");
  if (opts.max) await noOverflow(page, "chips " + tag, opts.max);
  await page.click("#chips .chip >> text=This month");
  await page.waitForSelector("#streaming", { timeout: 5000 }).catch(() => {});
  const lastMember = await page.$$eval(".bubble.member", (els) => els[els.length - 1].textContent);
  check("tapping a chip sends its text as the answer (" + tag + ")", lastMember === "This month", lastMember);
  check("chips cleared after use (" + tag + ")", (await page.locator("#chips .chip").count()) === 0);
  await waitIdle(page);
  await shot("interview");
  if (opts.max) await noOverflow(page, "interview " + tag, opts.max);
  await answer(page, "I pasted my notes and asked for a one-page summary for the client. It came back too smooth.");
  await answer(page, "I always read it against my own notes first and strip the generic bits.");
  await page.waitForSelector("#rate-card", { timeout: 20000 });
  await waitIdle(page);
  check("rating card appears exactly once (" + tag + ")", (await page.locator("#rate-card").count()) === 1);
  check("no chips with the rating card (" + tag + ")", (await page.locator("#chips .chip").count()) === 0 && (await page.evaluate(() => document.getElementById("chips").hidden)));
  check("composer hidden while rating (" + tag + ")", await page.evaluate(() => document.getElementById("composer").hidden === true));
  const order = await page.$$eval("#rate-card .rate-item", (els) => els.map((e) => e.dataset.id));
  check("items ordered easiest first (" + tag + ")", order.join(",") === "r2,r1,r4,r3", order.join(","));
  check("slider is 0-100 step 5 (" + tag + ")", await page.$eval("#range-r2", (el) => el.min === "0" && el.max === "100" && el.step === "5"));
  check("sliders start unset (" + tag + ")", (await page.textContent("#val-r2")) === "–" && (await page.locator("#rate-card .rate-slider.unset").count()) === 4);
  check("send disabled until each task is rated or skipped (" + tag + ")", await page.$eval("#btn-rate-submit", (el) => el.disabled));
  await page.fill("#range-r2", "90");
  await page.fill("#range-r1", "75");
  await page.fill("#range-r4", "60");
  await page.check("#skip-r3");
  check("live value updates (" + tag + ")", (await page.textContent("#val-r2")) === "90", await page.textContent("#val-r2"));
  check("skipping disables that slider (" + tag + ")", await page.$eval("#range-r3", (el) => el.disabled));
  check("send enabled once all rated or skipped (" + tag + ")", await page.$eval("#btn-rate-submit", (el) => !el.disabled));
  await shot("ratings");
  if (opts.max) await noOverflow(page, "ratings " + tag, opts.max);
  await page.click("#btn-rate-submit");
  await page.waitForFunction(() => !document.getElementById("rate-card"));
  check("rating card removed after submit (" + tag + ")", (await page.locator("#rate-card").count()) === 0);
  const ratingBubble = await page.textContent(".bubble.member.ratings");
  check("ratings shown as compact member message (" + tag + ")", ratingBubble.includes("→ 90") && ratingBubble.includes("(skipped)"), ratingBubble);
  await waitIdle(page);
  check("rating card never comes back (" + tag + ")", (await page.locator("#rate-card").count()) === 0);
  await answer(page, "A live conflict feels riskier. I do not want client details in there.");
  await page.waitForSelector("#feedback", { timeout: 30000 });
  await shot("feedback");
  if (opts.max) await noOverflow(page, "feedback " + tag, opts.max);
  const fbText = await page.textContent("#feedback");
  check("feedback headline rendered (" + tag + ")", fbText.includes(`Thanks ${name}, here is what stood out`), fbText.slice(0, 120));
  check("feedback has strengths and next step (" + tag + ")", fbText.includes("What stood out") && fbText.includes("Next steps") && fbText.includes("Try one case as a thinking partner"));
  check("advice has 2 pieces with concrete steps (" + tag + ")", (await page.locator("#feedback .step").count()) === 2 && (await page.locator("#feedback .step-list li").count()) === 5);
  check("calibration and follow-up shown (" + tag + ")", (await page.isVisible("#fb-calibration")) && (await page.isVisible("#fb-followup")) && fbText.includes("If you want to go further"));
  check("feedback never shows the skill index (" + tag + ")", !/skill index|skillIndex/i.test(fbText));
  const reportUrl = await page.inputValue("#report-url");
  check("private report link shown (" + tag + ")", /\/r\/r_[0-9a-f]{32}$/.test(reportUrl), reportUrl);
  const rp = await page.request.get(reportUrl);
  check("report link opens the same feedback (" + tag + ")", rp.status() === 200 && (await rp.text()).includes(`Thanks ${name}, here is what stood out`));
  check("feedback shows no level, score or divergence (" + tag + ")", !/Routine|Integrated|Exploring|divergence|aligned|level \d|practice level|\/ 100|average/i.test(fbText), fbText.slice(0, 300));
  check("confidence ratings listed (" + tag + ")", fbText.includes("Your confidence ratings") && fbText.includes("skipped") && fbText.includes("90"));
  check("saved line and no result code (" + tag + ")", fbText.includes("Your answers have been saved for the organiser.") && !/result code|AIWD1:/i.test(fbText) && (await page.locator("#result-code").count()) === 0);
  check("no chips after completion (" + tag + ")", (await page.locator(".chip").count()) === 0);
  const leaks = await page.evaluate(() => window.__leaks);
  check("no '<<' ever visible in a bubble (" + tag + ")", leaks.length === 0, JSON.stringify(leaks).slice(0, 200));
  // What the server stored for the organiser
  const profiles = await organiserProfiles(browser);
  const mine = (profiles || []).find((p) => p.member && p.member.name === name);
  check("server stored the profile for the organiser (" + tag + ")", !!mine, profiles ? profiles.length + " profiles" : "login failed");
  if (mine) {
    check("stored profile has ratings and transcript (" + tag + ")", mine.confidence.items.length === 4 && mine.confidence.mean === 75 && Array.isArray(mine.transcript) && mine.transcript.length > 8, JSON.stringify(mine.confidence).slice(0, 200));
    const qa = mine.questionnaire || {};
    check("stored profile carries questionnaire answers (" + tag + ")", qa.frequency === "weekly" && (qa.uses || []).join() === "writing,prep" && qa.toolsOther === "Otter" && qa.pay === "maybe" && qa.canShow === "yes", JSON.stringify(qa));
    check("stored profile carries statement answers (" + tag + ")", qa.viewEssential === "a" && qa.reservation === "Clients may not want it" && qa.skillCheck === "always" && (qa.whyNot || []).join() === "noTime", JSON.stringify(qa));
    const sc = mine.selfCheck || {};
    check("stored profile carries the self-check (" + tag + ")", sc.skillIndex === Math.round(100 * 1 / 5) && sc.scenarios.careful === 1 && sc.access.join() === "supOutside" && sc.whyNot.join() === "noTime", JSON.stringify(sc));
    check("tapped chip recorded as tapped (" + tag + ")", mine.transcript.some((t) => t.role === "member" && t.text === "This month" && t.tapped));
  }
  // Reload on the feedback screen: the finished interview can be shown again (finish is idempotent)
  await page.reload();
  await page.waitForSelector("#draft-card");
  check("finished interview offered after reload (" + tag + ")", (await page.textContent("#draft-card")).includes("finished"));
  await page.click("#btn-continue");
  await page.waitForSelector("#feedback", { timeout: 20000 });
  check("feedback shown again after reload (" + tag + ")", (await page.textContent("#feedback h1")).includes(name));
  await page.click("#btn-another");
  await page.waitForSelector("#landing");
  check("start another interview returns to a clean landing (" + tag + ")", (await page.evaluate(() => localStorage.getItem("aiwd.interviewId"))) === null && (await page.locator("#draft-card").count()) === 0);
}

/** Patch the `done` event of the next interview turn so it carries the given chips. */
async function patchNextChips(page, chips) {
  await page.route("**/api/interview/turn", async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    body = body.replace(/event: done\ndata: (.*)\n/, (m, json) => {
      const d = JSON.parse(json); d.chips = chips;
      return "event: done\ndata: " + JSON.stringify(d) + "\n";
    });
    await route.fulfill({ status: resp.status(), headers: resp.headers(), body });
    await page.unroute("**/api/interview/turn");
  });
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  try {
    // 1. Full flow, desktop, light
    {
      const { ctx, page } = await newPage(browser);
      await fullFlow(browser, page, "1200-light", "Anneke" + RUN);
      await ctx.close();
    }
    // 2. Full flow, phone, dark, overflow checks
    {
      const { ctx, page } = await newPage(browser, { viewport: { width: 400, height: 800 }, dark: true });
      await fullFlow(browser, page, "400-dark", "Femke" + RUN, { max: 400 });
      await ctx.close();
    }
    // 3. Themes and the other two screenshot combinations
    {
      const { ctx, page } = await newPage(browser, { dark: true });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check("dark body background applied", bg === "rgb(18, 23, 22)", bg);
      check("members see no organiser links", (await page.locator("#navlinks").count()) === 0 && !(await page.textContent("nav")).includes("Organiser"));
      await page.screenshot({ path: path.join(SHOTS, "member-landing-1200-dark.png"), fullPage: true });
      await startInterview(page, "Dirk" + RUN, "trainer");
      await waitIdle(page);
      await answer(page, "Mostly trainings for teams.");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip");
      await page.screenshot({ path: path.join(SHOTS, "member-interview-1200-dark.png"), fullPage: true });
      await ctx.close();
      const p2 = await newPage(browser, { viewport: { width: 400, height: 800 } });
      const bg2 = await p2.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check("light body background applied", bg2 === "rgb(247, 248, 247)", bg2);
      await p2.page.screenshot({ path: path.join(SHOTS, "member-landing-400-light.png"), fullPage: true });
      await noOverflow(p2.page, "landing phone light", 400);
      await startInterview(p2.page, "Joost" + RUN, "organisational adviser with a long role description that wraps");
      await waitIdle(p2.page);
      await answer(p2.page, "Advice to boards, mostly.");
      await waitIdle(p2.page);
      await p2.page.waitForSelector("#chips .chip");
      await p2.page.screenshot({ path: path.join(SHOTS, "member-interview-400-light.png"), fullPage: true });
      await noOverflow(p2.page, "interview phone light", 400);
      await p2.ctx.close();
    }
    // 4. Stop-here path, with the in-page confirm
    {
      const { ctx, page } = await newPage(browser);
      await startInterview(page, "Bram" + RUN, "mediator");
      await waitIdle(page);
      await answer(page, "I run mediations.");
      await waitIdle(page);
      await page.click("#btn-stop");
      await page.waitForSelector("#stop-confirm");
      await page.click("#btn-stop-no");
      check("stop confirm can be dismissed", (await page.locator("#stop-confirm").count()) === 0);
      await page.click("#btn-stop");
      await page.click("#btn-stop-yes");
      await page.waitForSelector("#feedback", { timeout: 30000 });
      const fb = await page.textContent("#feedback");
      check("stop-here path reaches feedback", fb.includes("here is what stood out"));
      check("stop-here feedback omits ratings section", !fb.includes("Your confidence ratings"));
      check("no '[...]' stop marker shown as a bubble", !(await page.evaluate(() => [...document.querySelectorAll(".bubble")].some((b) => /^\[/.test(b.textContent)))));
      const profiles = await organiserProfiles(browser);
      const mine = (profiles || []).find((p) => p.member && p.member.name === "Bram" + RUN);
      check("stopped interview stored as ended early", !!mine && mine.endedEarly === true && mine.confidence.items.length === 0, mine ? JSON.stringify({ e: mine.endedEarly, n: mine.confidence.items.length }) : "missing");
      await ctx.close();
    }
    // 5. Rate phase without a valid marker → engine retry → rating card once, no leak
    {
      const { ctx, page } = await newPage(browser);
      await startInterview(page, "Norate" + RUN, "trainer");
      for (const a of ["one", "two", "three", "four"]) await answer(page, "answer " + a);
      await page.waitForSelector("#rate-card", { timeout: 20000 });
      await waitIdle(page);
      check("rating card shown once after the engine's retry", (await page.locator("#rate-card").count()) === 1);
      const bubbles = await page.$$eval(".bubble.interviewer", (els) => els.map((e) => e.textContent));
      check("rate request text not duplicated by the retry", bubbles.filter((t) => t.includes("rate your confidence")).length === 1, JSON.stringify(bubbles.slice(-2)));
      check("no '<<' leaked during retry", (await page.evaluate(() => window.__leaks)).length === 0);
      for (const box of await page.$$("#rate-card .skip input")) await box.check();
      await page.click("#btn-rate-submit");
      await waitIdle(page);
      await answer(page, "follow-up answer");
      await page.waitForSelector("#feedback", { timeout: 30000 });
      check("norate scenario reaches feedback", true);
      await ctx.close();
    }
    // 6. Model error → Retry UI → retry re-sends only {interviewId}, no duplicate answer
    {
      const { ctx, page } = await newPage(browser);
      const turnBodies = [];
      page.on("request", (r) => { if (r.url().endsWith("/api/interview/turn")) turnBodies.push(r.postDataJSON()); });
      await startInterview(page, "Error" + RUN, "adviser");
      await waitIdle(page);
      await answer(page, "first answer");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip");
      await page.fill("#answer", "second answer that will fail once");
      await page.keyboard.press("Enter");
      check("sending an answer clears the chips", (await page.locator("#chips .chip").count()) === 0);
      await page.waitForSelector("#btn-retry", { timeout: 15000 });
      check("no chips with the error box", (await page.locator("#chips .chip").count()) === 0);
      check("error UI shows a message", (await page.textContent("#turn-error-box")).length > 20, await page.textContent("#turn-error-box"));
      check("no streaming bubble left behind on error", (await page.locator("#streaming").count()) === 0);
      await page.screenshot({ path: path.join(SHOTS, "member-error-retry-1200-light.png"), fullPage: true });
      await page.click("#btn-retry");
      await waitIdle(page);
      const memberBubbles = await page.$$eval(".bubble.member", (els) => els.map((e) => e.textContent));
      check("retry does not duplicate the member answer", memberBubbles.filter((t) => t.includes("second answer")).length === 1, JSON.stringify(memberBubbles));
      const roles = await page.$$eval(".bubble", (els) => els.map((e) => (e.classList.contains("member") ? "member" : "interviewer")).join(","));
      check("transcript roles alternate after retry", roles === "interviewer,member,interviewer,member,interviewer", roles);
      const last = turnBodies[turnBodies.length - 1];
      check("retry sent only {interviewId}", last && Object.keys(last).join() === "interviewId", JSON.stringify(last));
      const st = await page.evaluate(async () => (await fetch("/api/interview/state?id=" + localStorage.getItem("aiwd.interviewId"))).json());
      check("server transcript has the failed answer once", st.turns.filter((t) => t.text.includes("second answer")).length === 1);
      await ctx.close();
    }
    // 7. Resume after reload, mid-interview
    {
      const { ctx, page } = await newPage(browser);
      await startInterview(page, "Cees" + RUN, "coach");
      await waitIdle(page);
      await answer(page, "an answer before reload");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip");
      await page.reload();
      await page.waitForSelector("#draft-card");
      check("draft card says how far the interview got", (await page.textContent("#draft-card")).includes("1 answer in the conversation so far"), await page.textContent("#draft-card"));
      await page.click("#btn-continue");
      await page.waitForSelector("#interview");
      await waitIdle(page);
      check("resume restores transcript", (await page.locator(".bubble").count()) === 3, String(await page.locator(".bubble").count()));
      check("phase hint shows practice after resume", (await page.textContent("#phase-hint")).includes("your practice"));
      check("chips restored on resume", (await page.locator("#chips .chip").count()) === 3);
      await ctx.close();
    }
    // 7b. Resume mid-questionnaire restores answers and lands on the questionnaire
    {
      const { ctx, page } = await newPage(browser);
      await startLanding(page, "Cees" + RUN, "trainer");
      await page.click("label[for='q-frequency-daily']");
      await page.click("label[for='q-uses-analysis']");
      await page.click("label[for='q-stance-cautious']");
      await nextPage(page, "views");
      await nextPage(page, "skills");
      await nextPage(page, "support");
      await page.fill("#q-offer-other", "a reading group");
      await page.reload();
      await page.waitForSelector("#draft-card");
      check("draft card mentions unfinished quick questions", (await page.textContent("#draft-card")).includes("quick questions are not finished"));
      await page.click("#btn-continue");
      await page.waitForSelector("#questionnaire");
      const restored = await page.evaluate(() => ({
        daily: document.getElementById("q-frequency-daily").checked,
        analysis: document.getElementById("q-uses-analysis").checked,
      }));
      await nextPage(page, "views");
      await nextPage(page, "skills");
      await nextPage(page, "support");
      restored.other = await page.inputValue("#q-offer-other");
      check("resume restores questionnaire answers", restored.daily && restored.analysis && restored.other === "a reading group", JSON.stringify(restored));
      check("resume lands on questionnaire, not chat", (await page.locator("#interview").count()) === 0);
      await ctx.close();
    }
    // 7c. Live skips and the exclusive "Nothing for now"
    {
      const { ctx, page } = await newPage(browser);
      await startLanding(page, "Bram" + RUN, "mediator");
      await page.click("label[for='q-frequency-weekly']");
      await page.click("label[for='q-stance-pragmatic']");
      const visible = (id) => page.evaluate((i) => !document.getElementById(i).hidden, id);
      check("uses/tools visible for weekly", (await visible("q-uses")) && (await visible("q-tools")));
      await nextPage(page, "views");
      await nextPage(page, "skills");
      check("skills and canShow visible for weekly", (await visible("q-canShow")) && (await visible("q-skillCheck")) && (await visible("q-scenarioData")));
      await nextPage(page, "support");
      check("why-not hidden until 'asked for help' is answered", !(await visible("q-whyNot")));
      await page.click("label[for='q-supAsked-yes']");
      check("why-not hidden when they did ask", !(await visible("q-whyNot")));
      await page.click("label[for='q-supAsked-no']");
      check("why-not shown when they did not ask", await visible("q-whyNot"));
      check("pay hidden until an offer is ticked", !(await visible("q-pay")));
      await page.click("label[for='q-offer-demos']");
      await page.click("label[for='q-offer-one-to-one']");
      check("pay visible when an offer is ticked", await visible("q-pay"));
      await page.click("label[for='q-offer-nothing']");
      const ex1 = await page.evaluate(() => ["demos", "one-to-one", "nothing"].map((k) => document.getElementById("q-offer-" + k).checked));
      check("'Nothing for now' unticks the others", ex1.join() === "false,false,true", ex1.join());
      check("pay hidden when offer is nothing", !(await visible("q-pay")));
      await page.click("label[for='q-offer-demos']");
      const ex2 = await page.evaluate(() => ["demos", "nothing"].map((k) => document.getElementById("q-offer-" + k).checked));
      check("ticking another option unticks 'Nothing for now'", ex2.join() === "true,false", ex2.join());
      await page.click("label[for='q-offer-demos']");
      await page.click("label[for='q-offer-nothing']");
      for (const pg of ["skills", "views", "basics"]) { await page.click("#btn-q-back"); await page.waitForSelector(`#questionnaire[data-page='${pg}']`); }
      await page.click("label[for='q-frequency-tried']");
      await nextPage(page, "views");
      await nextPage(page, "skills");
      check("canShow hidden for tried, skills still shown", !(await visible("q-canShow")) && (await visible("q-skillCheck")));
      await page.click("label[for='q-skillCheck-often']");
      for (const pg of ["views", "basics"]) { await page.click("#btn-q-back"); await page.waitForSelector(`#questionnaire[data-page='${pg}']`); }
      await page.click("label[for='q-uses-writing']");
      await page.click("label[for='q-frequency-never']");
      check("uses/tools hidden live for never", !(await visible("q-uses")) && !(await visible("q-tools")));
      await page.click("label[for='q-stance-sceptical']");
      await nextPage(page, "views");
      await nextPage(page, "skills");
      check("skills and canShow hidden for never; scenarios still shown", !(await visible("q-skillCheck")) && !(await visible("q-canShow")) && (await visible("q-scenarioCheck")));
      await nextPage(page, "support");
      const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("aiwd.draft")).answers);
      check("skipped questions dropped from answers", !("uses" in draft) && !("tools" in draft) && !("canShow" in draft) && !("pay" in draft) && !("skillCheck" in draft) && draft.frequency === "never" && draft.offer.join() === "nothing" && draft.supAsked === "no", JSON.stringify(draft));
      await page.click("#btn-q-continue");
      await page.waitForSelector("#interview");
      await waitIdle(page);
      const st = await page.evaluate(async () => (await fetch("/api/interview/state?id=" + localStorage.getItem("aiwd.interviewId"))).json());
      check("server got the answers without skipped questions", st.answers && st.answers.frequency === "never" && !("uses" in st.answers), JSON.stringify(st.answers));
      await ctx.close();
    }
    // 7d. Email field follows the organiser's setting (required → optional → none), then reset
    {
      const ctx0 = await browser.newContext();
      await ctx0.request.post(BASE + "/api/organiser/login", { data: { passcode: PASSCODE } });
      const setMode = (m) => ctx0.request.put(BASE + "/api/organiser/settings", { data: { emailMode: m } });
      try {
        await setMode("required");
        const { ctx, page } = await newPage(browser);
        await page.waitForSelector("#f-email");
        check("email field shown and required when the organiser requires it", (await page.textContent("label[for='f-email']")).startsWith("Email") && !(await page.textContent("label[for='f-email']")).includes("optional"));
        await page.fill("#f-name", "Emma" + RUN);
        await page.fill("#f-role", "coach");
        await page.click("#btn-start");
        check("missing email blocks the start", (await page.isVisible("#f-error")) && (await page.textContent("#f-error")).includes("email") && (await page.locator("#questionnaire").count()) === 0);
        await page.fill("#f-email", "not an email");
        await page.click("#btn-start");
        check("bad email blocks the start", (await page.textContent("#f-error")).includes("does not look right"));
        await page.fill("#f-email", "emma@example.org");
        await page.click("#btn-start");
        await page.waitForSelector("#questionnaire");
        await fillQuestionnaire(page, "never");
        await page.click("#btn-q-continue");
        await page.waitForSelector("#interview");
        await waitIdle(page);
        await ctx.close();
        await setMode("optional");
        const b = await newPage(browser);
        await b.page.waitForSelector("#f-email");
        check("email marked optional when optional", (await b.page.textContent("label[for='f-email']")).includes("optional"));
        await b.ctx.close();
        await setMode("none");
        const c2 = await newPage(browser);
        await c2.page.waitForSelector("#f-name");
        await c2.page.waitForTimeout(300);
        check("no email field when not collected", (await c2.page.locator("#f-email").count()) === 0);
        await c2.ctx.close();
      } finally {
        await setMode("none");
        await ctx0.close();
      }
    }
    // 8. Open chip only focuses the box; typed text wins over a tap
    {
      const { ctx, page } = await newPage(browser);
      await startInterview(page, "Hanna" + RUN, "coach");
      await waitIdle(page);
      await patchNextChips(page, ["Daily", "Something else"]);
      await answer(page, "Workshops and coaching.");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip.chip-open");
      const before = await page.locator(".bubble.member").count();
      await page.click("#chips .chip >> text=Something else");
      check("open chip sends nothing", (await page.locator(".bubble.member").count()) === before);
      check("open chip hides the chips", (await page.locator("#chips .chip").count()) === 0);
      check("open chip focuses the answer box", await page.evaluate(() => document.activeElement && document.activeElement.id === "answer"));
      await patchNextChips(page, ["Yes", "No"]);
      await answer(page, "I write proposals with it.");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip");
      await page.fill("#answer", "Actually it depends on the client");
      await page.click("#chips .chip >> text=Yes");
      await page.waitForSelector("#streaming", { timeout: 5000 }).catch(() => {});
      const lastMember = await page.$$eval(".bubble.member", (els) => els[els.length - 1].textContent);
      check("typed text wins over a tapped chip", lastMember === "Actually it depends on the client", lastMember);
      check("answer box emptied after the typed text was sent", (await page.inputValue("#answer")) === "");
      await waitIdle(page);
      // Shift+Enter makes a new line, Enter sends
      await page.fill("#answer", "line one");
      await page.keyboard.press("Shift+Enter");
      await page.keyboard.type("line two");
      check("Shift+Enter makes a new line", (await page.inputValue("#answer")) === "line one\nline two");
      await ctx.close();
    }
    // 9. Access code: field only when required, prefilled from ?code= and removed from the URL
    {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, extraHTTPHeaders: ipHeader() });
      const page = await ctx.newPage();
      await page.goto(BASE + "/");
      await page.waitForSelector("#landing");
      await page.waitForFunction(() => !document.querySelector("#btn-start:disabled"));
      const cfg = await page.evaluate(async () => (await fetch("/api/config")).json());
      check("no access-code field when not required", cfg.memberCodeRequired || (await page.locator("#f-code").count()) === 0);
      await page.route("**/api/config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...cfg, memberCodeRequired: true }) }));
      await page.goto(BASE + "/?code=PILOT-42");
      await page.waitForSelector("#f-code");
      check("access code prefilled from the invite link", (await page.inputValue("#f-code")) === "PILOT-42");
      check("code removed from the URL", !page.url().includes("code="), page.url());
      check("code kept in sessionStorage", (await page.evaluate(() => sessionStorage.getItem("aiwd.accessCode"))) === "PILOT-42");
      await page.goto(BASE + "/");
      await page.waitForSelector("#f-code");
      check("code survives a reload of the page in this tab", (await page.inputValue("#f-code")) === "PILOT-42");
      await page.fill("#f-code", "");
      await page.fill("#f-name", "Iris"); await page.fill("#f-role", "coach");
      await page.click("#btn-start");
      check("empty code blocks the start", (await page.isVisible("#f-error")) && (await page.locator("#questionnaire").count()) === 0);
      await ctx.close();
    }
    // 10. Voice: mic shown when /api/config.voice; transcript goes into the box to edit
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, permissions: ["microphone"], extraHTTPHeaders: ipHeader() });
      const page = await ctx.newPage();
      await page.goto(BASE + "/");
      await page.waitForSelector("#landing");
      const cfg = await page.evaluate(async () => (await fetch("/api/config")).json());
      if (!cfg.voice) {
        await page.waitForFunction(() => !document.querySelector("#btn-start:disabled"));
        await startInterview(page, "Lot" + RUN, "coach");
        await waitIdle(page);
        check("no mic when voice is off", (await page.locator("#btn-voice").count()) === 0);
      }
      await page.route("**/api/config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...cfg, voice: true }) }));
      await page.route("**/api/transcribe", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: "spoken words here" }) }));
      await page.goto(BASE + "/");
      await page.waitForSelector("#landing");
      await page.waitForFunction(() => !document.querySelector("#btn-start:disabled"));
      if (await page.locator("#draft-card").count()) await page.click("#btn-startover");
      await startInterview(page, "Mira" + RUN, "coach");
      await waitIdle(page);
      check("mic shown when voice is on", (await page.locator("#btn-voice").count()) === 1);
      await page.fill("#answer", "Typed start.");
      await page.click("#btn-voice");
      await page.waitForSelector(".voice.recording", { timeout: 5000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(SHOTS, "member-voice-recording-400-light.png"), fullPage: false });
      await page.click(".voice-btn.keep");
      await page.waitForFunction(() => document.getElementById("answer").value.includes("spoken words here"), null, { timeout: 8000 }).catch(() => {});
      const v = await page.inputValue("#answer");
      check("transcribed text appended to the box for editing", v === "Typed start. spoken words here", v);
      check("transcribed text is not sent by itself", (await page.locator(".bubble.member").count()) === 0);
      await noOverflow(page, "interview with mic at 400", 400);
      await ctx.close();
    }
    // 11. Busy from the server → message, Try again resyncs without duplicates
    {
      const { ctx, page } = await newPage(browser);
      await startInterview(page, "Pim" + RUN, "coach");
      await waitIdle(page);
      let once = true;
      await page.route("**/api/interview/turn", async (route) => {
        if (once) { once = false; await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "A turn is already running", code: "busy" }) }); }
        else await route.continue();
      });
      await page.fill("#answer", "an answer the server refused as busy");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#btn-retry");
      check("busy shows a wait-and-retry message", (await page.textContent("#turn-error-box")).includes("still being handled"));
      await page.click("#btn-retry");
      await page.waitForFunction(() => !document.getElementById("btn-retry"));
      await waitIdle(page);
      const mem = await page.$$eval(".bubble.member", (els) => els.map((e) => e.textContent));
      check("unrecorded answer goes back into the box, not the transcript", mem.length === 0 && (await page.inputValue("#answer")) === "an answer the server refused as busy", JSON.stringify(mem));
      await ctx.close();
    }
    // 12. Questionnaire phone dark (filled) screenshot + overflow
    {
      const { ctx, page } = await newPage(browser, { viewport: { width: 400, height: 800 }, dark: true });
      await startLanding(page, "Anneke", "coach");
      await fillQuestionnaire(page, "weekly", async (pg) => {
        await page.screenshot({ path: path.join(SHOTS, `member-questionnaire-${pg}-400-dark-filled.png`), fullPage: true });
        await noOverflow(page, "questionnaire phone dark " + pg, 400);
      });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
