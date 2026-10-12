/* member.spec.js — end-to-end checks for the member view with a scripted fake Claude.
 * Run: NODE_PATH=/opt/node22/lib/node_modules node prototype/tests/member.spec.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SRC = path.resolve(__dirname, "../src");
const SHOTS = path.resolve(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css" };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const file = path.join(SRC, p);
      if (!file.startsWith(SRC) || !fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
      let body = fs.readFileSync(file);
      if (p === "/index.html") {
        // Mimic the artifact publish skeleton.
        body = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body.toString() + "</body></html>");
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    });
    srv.listen(0, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

// --- Scripted fake Claude, installed before load -----------------------------
const MOCK = `
(function () {
  const scenario = window.__scenario || "normal";
  const state = { errored: false };
  const Q = [
    "Hi NAME, nice to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work. What does a typical week look like for you at the moment?\\n<<PHASE: orient >>",
    "That sounds like a full week. You ticked writing: was the last time you used it for that this week or longer ago?\\n<<CHIPS: [\\"This week\\", \\"This month\\", \\"Longer ago\\"] >>\\n<<PHASE: practice >>",
    "Can you walk me through the most recent time you used it for something like that: what did you type, and what came back?\\n<<PHASE: practice >>",
    "And how did you judge what came back before you used it with the team?\\n<<PHASE: stretch >>",
  ];
  const RATE_ITEMS = [
    {"id":"r1","task":"Use an AI tool to turn your rough notes from a team session into a first draft of a summary for the client, and judge what to keep.","level":2},
    {"id":"r2","task":"Ask an AI tool to summarise a one-page document and check the summary against the original.","level":1},
    {"id":"r3","task":"Talk a difficult team conflict through with an AI tool as a thinking partner, using anonymised details, and test two of your own hypotheses.","level":3},
    {"id":"r4","task":"Design a short exercise for a team day with an AI tool and adapt it to the team's situation.","level":2}
  ];
  const RATE_MSG = "Thank you, that gives me a good picture. I'd like you to rate your confidence on a few tasks drawn from what you described. There are no right answers.";
  const GOOD_RATE = RATE_MSG + "\\n<<RATE: " + JSON.stringify(RATE_ITEMS) + " >>\\n<<CHIPS: [\\"Sure\\", \\"Fine\\"] >>\\n<<PHASE: rate >>";
  const BAD_RATE = RATE_MSG + "\\n<<PHASE: rate >>";
  const FOLLOW = "Interesting: you rate the thinking-partner task much lower than the summary. What makes that one feel further away?\\n<<PHASE: close >>";
  const CLOSE = "Thank you NAME, that was a rich conversation. Your feedback is being prepared now.\\n<<PHASE: close >>\\n<<COMPLETE>>";
  const PROFILE = {
    practice: { level: 2, summary: "NAME uses ChatGPT regularly to draft client summaries after team sessions and checks the output before sending. Use is routine but not yet woven into the method.", domains: [{ key: "writing", evidence: "turn session notes into a summary for the client" }, { key: "prep", evidence: "designed an exercise for a team day" }], tools: ["ChatGPT"], judgement: "Reads every draft against their own notes and removes anything that sounds generic; keeps client names out of the tool.", stance: "pragmatic" },
    confidence: { pattern: "High on drafting and summarising, drops on using the tool as a thinking partner on a live conflict." },
    wants: ["use AI as a thinking partner on cases safely"],
    offers: ["can show how I draft client summaries after a session"],
    productSignals: { wouldPayFor: "a short peer session on using AI with client material", quote: "I would pay for an afternoon with colleagues who are further along" },
    feedback: { headline: "Thanks NAME, here is what stood out", summary: "You use AI in a steady, practical way for the writing that follows your sessions, and you check what comes back against your own notes. That habit of checking is the strongest thing in what you described.", strengths: ["You read every draft against your own notes and strip out what sounds generic.", "You keep client names out of the tool without being asked."], nextSteps: [{ title: "Try one case as a thinking partner", detail: "Pick a team situation you are preparing for in the next two weeks. Describe it anonymised, then ask the tool to argue against your reading of it. You will know it worked if one of its objections changes something you do in the room." }], closing: "Thank you for taking the time, and for being so concrete." },
    quotes: ["I always read it against my own notes first", "I would pay for an afternoon with colleagues who are further along"]
  };
  function lastUser(msgs) { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") return msgs[i].content; return ""; }
  function pick(msgs) {
    const name = (window.__memberName || "Anneke");
    const lu = lastUser(msgs);
    if (lu.includes("Produce ONE JSON object")) window.__profilePrompt = lu;
    if (lu.includes("Produce ONE JSON object") || lu.includes("That was not valid JSON")) return JSON.stringify(PROFILE).split("NAME").join(name);
    if (lu.includes("[I need to stop here.]")) return CLOSE.split("NAME").join(name);
    if (lu.includes("did not include a valid RATE marker")) { window.__rateRetried = true; return GOOD_RATE; }
    const n = msgs.filter((m) => m.role === "assistant").length;
    if (lu.startsWith("My confidence ratings")) return FOLLOW;
    if (n > Q.length && msgs.some((m) => m.role === "user" && m.content.startsWith("My confidence ratings"))) return CLOSE.split("NAME").join(name);
    if (n < Q.length) {
      if (scenario === "error" && n === 2 && !state.errored) { state.errored = true; const e = new Error("mock failure"); e.code = "mock"; throw e; }
      return Q[n].split("NAME").join(name);
    }
    return scenario === "norate" ? BAD_RATE : GOOD_RATE;
  }
  window.__mockCalls = [];
  window.__mockSample = async function (messages, opts) {
    if (!window.__firstPrompt) window.__firstPrompt = messages[0].content;
    window.__mockCalls.push(messages.map((m) => ({ role: m.role, content: m.content.slice(0, 80) })));
    const text = pick(messages);
    if (opts && opts.onText) {
      // Stream in chunks that cut through the markers.
      for (let i = 7; i < text.length; i += 7) { opts.onText({ text: text.slice(0, i) }); await new Promise((r) => setTimeout(r, 3)); }
      opts.onText({ text });
    }
    return { text };
  };
  // Record any bubble text that ever contains "<<".
  window.__leaks = [];
  const obs = new MutationObserver(() => {
    document.querySelectorAll(".bubble").forEach((b) => { if (b.textContent.includes("<<")) window.__leaks.push(b.textContent); });
  });
  document.addEventListener("DOMContentLoaded", () => obs.observe(document.body, { subtree: true, childList: true, characterData: true }));
})();`;

// --- Tiny test harness ----------------------------------------------------------
let passed = 0, failed = 0;
const results = [];
function check(name, cond, extra) {
  if (cond) { passed++; results.push("PASS " + name); }
  else { failed++; results.push("FAIL " + name + (extra ? " :: " + extra : "")); console.log("FAIL", name, extra || ""); }
}

async function newPage(browser, url, { scenario = "normal", viewport = { width: 1100, height: 900 }, dark = false, name = "Anneke" } = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme: dark ? "dark" : "light" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { check("no page error (" + scenario + ")", false, e.message); });
  await page.addInitScript(`window.__scenario=${JSON.stringify(scenario)};window.__memberName=${JSON.stringify(name)};`);
  await page.addInitScript(MOCK);
  await page.goto(url + "#member");
  await page.waitForSelector("#landing");
  return { ctx, page };
}

async function noOverflow(page, label, max) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`no horizontal overflow on ${label} (scrollWidth ${w} <= ${max})`, w <= max, String(w));
}

async function waitIdle(page) {
  // wait until no streaming bubble and the composer or a card is interactive
  await page.waitForFunction(() => !document.getElementById("streaming") && !document.querySelector("#btn-send:disabled"), null, { timeout: 15000 });
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
// Fill the opening questionnaire. kind: "weekly" (regular user) or "never".
async function fillQuestionnaire(page, kind = "weekly") {
  if (kind === "never") {
    await page.click("label[for='q-frequency-never']");
    await page.click("label[for='q-stance-sceptical']");
    await page.click("label[for='q-offer-nothing']");
  } else {
    await page.click("label[for='q-frequency-weekly']");
    await page.click("label[for='q-uses-writing']");
    await page.click("label[for='q-uses-prep']");
    await page.click("label[for='q-tools-ChatGPT']");
    await page.fill("#q-tools-other", "Otter");
    await page.click("label[for='q-stance-pragmatic']");
    await page.click("label[for='q-offer-peer-halfday']");
    await page.click("label[for='q-pay-maybe']");
    await page.click("label[for='q-canShow-yes']");
  }
}
async function startInterview(page, name, role, kind = "weekly", shot) {
  await startLanding(page, name, role);
  await fillQuestionnaire(page, kind);
  if (shot) await shot();
  await page.click("#btn-q-continue");
  await page.waitForSelector("#interview");
}

async function fullFlow(page, tag, opts = {}) {
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}-${tag}.png`), fullPage: true });
  await shot("landing");
  if (opts.max) await noOverflow(page, "landing " + tag, opts.max);
  await startLanding(page, "Anneke", "team coach, mostly healthcare organisations");
  // Required validation: continue with nothing ticked
  await page.click("#btn-q-continue");
  const reqErr = await page.isVisible("#q-err-frequency");
  check("questionnaire shows inline required error (" + tag + ")", reqErr && (await page.isVisible("#q-err-stance")));
  check("questionnaire does not advance when invalid (" + tag + ")", (await page.locator("#interview").count()) === 0);
  const qText = await page.textContent("#questionnaire");
  check("questionnaire rendered from Prompts.QUESTIONNAIRE (" + tag + ")", await page.evaluate((t) => Prompts.QUESTION_ORDER.every((q) => t.includes(Prompts.QUESTIONNAIRE[q].label)), qText));
  await fillQuestionnaire(page, "weekly");
  await shot("questionnaire");
  if (opts.max) await noOverflow(page, "questionnaire " + tag, opts.max);
  check("uses hint shown (" + tag + ")", qText.includes(await page.evaluate(() => Prompts.QUESTIONNAIRE.uses.options[0].hint)));
  await page.click("#btn-q-continue");
  await page.waitForSelector("#interview");
  await page.waitForSelector(".bubble.interviewer");
  await waitIdle(page);
  const first = await page.textContent(".bubble.interviewer");
  check("first interviewer turn greets by name (" + tag + ")", first.includes("Hi Anneke"), first);
  await answer(page, "I coach teams in hospitals, mostly three days a week, and write a lot of summaries.");
  await waitIdle(page);
  await page.waitForSelector("#chips:not([hidden]) .chip");
  const chipTexts = await page.$$eval("#chips .chip", (els) => els.map((e) => e.textContent));
  check("chips render from CHIPS marker (" + tag + ")", chipTexts.join("|") === "This week|This month|Longer ago", chipTexts.join("|"));
  await shot("chips");
  if (opts.max) await noOverflow(page, "chips " + tag, opts.max);
  await page.click("#chips .chip >> text=This month");
  await page.waitForSelector("#streaming", { timeout: 5000 }).catch(() => {});
  const lastMember = await page.$$eval(".bubble.member", (els) => els[els.length - 1].textContent);
  check("tapping a chip sends its text as the answer (" + tag + ")", lastMember === "This month", lastMember);
  check("chips cleared after use (" + tag + ")", (await page.locator("#chips .chip").count()) === 0);
  const turnText = await page.evaluate(() => MemberView._state.interview.turns.filter((t) => t.role === "member").map((t) => t.text).join("|"));
  check("chip answer recorded in transcript (" + tag + ")", turnText.endsWith("|This month"), turnText);
  await shot("interview");
  if (opts.max) await noOverflow(page, "interview " + tag, opts.max);
  await answer(page, "I pasted my notes and asked for a one-page summary for the client. It came back too smooth.");
  await answer(page, "I always read it against my own notes first and strip the generic bits.");
  await page.waitForSelector("#rate-card", { timeout: 15000 });
  await waitIdle(page);
  const cards = await page.locator("#rate-card").count();
  check("rating card appears exactly once (" + tag + ")", cards === 1, String(cards));
  check("no chips with the rating card (" + tag + ")", (await page.locator("#chips .chip").count()) === 0 && (await page.evaluate(() => document.getElementById("chips").hidden)));
  const composerHidden = await page.evaluate(() => document.getElementById("composer").hidden);
  check("composer hidden while rating (" + tag + ")", composerHidden === true);
  const order = await page.$$eval("#rate-card .rate-item", (els) => els.map((e) => e.dataset.id));
  check("items ordered easiest first (" + tag + ")", order.join(",") === "r2,r1,r4,r3", order.join(","));
  // Move sliders: r2 -> 90, r1 -> 75, r4 -> 60, r3 skipped
  await page.$eval("#range-r2", (el) => { el.value = 90; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.$eval("#range-r1", (el) => { el.value = 75; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.$eval("#range-r4", (el) => { el.value = 60; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.check("#skip-r3");
  const live = await page.textContent("#val-r2");
  check("live value updates (" + tag + ")", live === "90", live);
  await shot("ratings");
  if (opts.max) await noOverflow(page, "ratings " + tag, opts.max);
  await page.click("#btn-rate-submit");
  await page.waitForFunction(() => !document.getElementById("rate-card"));
  const cardsAfter = await page.locator("#rate-card").count();
  check("rating card removed after submit (" + tag + ")", cardsAfter === 0);
  const ratingBubble = await page.textContent(".bubble.member.ratings");
  check("ratings shown as compact member message (" + tag + ")", ratingBubble.includes("→ 90") && ratingBubble.includes("(skipped)"), ratingBubble);
  await waitIdle(page);
  await answer(page, "A live conflict feels riskier. I do not want client details in there.");
  await page.waitForSelector("#feedback", { timeout: 20000 });
  await shot("feedback");
  if (opts.max) await noOverflow(page, "feedback " + tag, opts.max);
  const fbText = await page.textContent("#feedback");
  check("feedback headline rendered (" + tag + ")", fbText.includes("Thanks Anneke, here is what stood out"));
  check("feedback has strengths and next step (" + tag + ")", fbText.includes("What stood out") && fbText.includes("Next steps") && fbText.includes("Try one case as a thinking partner"));
  check("feedback shows no organiser-only fields (" + tag + ")", !/Routine|divergence|aligned|level 2/i.test(fbText), fbText.slice(0, 200));
  check("confidence ratings listed (" + tag + ")", fbText.includes("Your confidence ratings") && fbText.includes("skipped"));
  const saveStatus = await page.textContent("#save-status");
  check("save status says device only without db (" + tag + ")", saveStatus.includes("Saved on this device only"), saveStatus);
  const pp = await page.evaluate(() => window.__profilePrompt || "");
  check("profile request contains the questionnaire summary (" + tag + ")", pp.includes("opening questionnaire") && pp.includes("Most weeks") && pp.includes("other: Otter"));
  check("no chips after completion (" + tag + ")", (await page.locator(".chip").count()) === 0);
  const leaks = await page.evaluate(() => window.__leaks);
  check("no '<<' ever visible in a bubble (" + tag + ")", leaks.length === 0, JSON.stringify(leaks).slice(0, 200));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("aiwd.profiles") || "[]"));
  check("localStorage aiwd.profiles has one record (" + tag + ")", stored.length === 1, String(stored.length));
  if (stored.length) {
    check("stored profile has transcript and ratings (" + tag + ")", Array.isArray(stored[0].transcript) && stored[0].transcript.length > 8 && stored[0].confidence.items.length === 4 && stored[0].confidence.mean === 75, JSON.stringify(stored[0].confidence));
    check("stored profile source is live and level from model (" + tag + ")", stored[0].source === "live" && stored[0].practice.level === 2);
    const qa = stored[0].questionnaire || {};
    check("stored profile carries questionnaire answers (" + tag + ")", qa.frequency === "weekly" && qa.uses.join() === "writing,prep" && qa.toolsOther === "Otter" && qa.pay === "maybe" && qa.canShow === "yes", JSON.stringify(qa));
  }
  const draft = await page.evaluate(() => localStorage.getItem("aiwd.draft"));
  check("draft cleared after completion (" + tag + ")", draft === null);
  const rt = await page.evaluate(() => {
    const code = document.getElementById("result-code").value;
    if (!code.startsWith("AIWD1:")) return { ok: false, why: "prefix" };
    localStorage.removeItem("aiwd.profiles");
    const r = Store.importCode(code);
    const back = JSON.parse(localStorage.getItem("aiwd.profiles"));
    const orig = Store.parseCodes(code)[0];
    const visibleLeak = /levelLabel|"level"|divergence/.test(code);
    return { ok: !visibleLeak && r.imported.length === 1 && back.length === 1 && back[0].id === orig.id && back[0].source === "imported" && back[0].transcript.length === orig.transcript.length, why: JSON.stringify(r).slice(0, 100) };
  });
  check("export code round-trips through Store.importCode (" + tag + ")", rt.ok, rt.why);
  // Multi-code import and bare array
  const multi = await page.evaluate(() => {
    const code = document.getElementById("result-code").value;
    const p2 = Object.assign(Store.parseCodes(code)[0], { id: "p_other" });
    localStorage.removeItem("aiwd.profiles");
    const r = Store.importCode(code + "\n" + Store.exportCode(p2));
    const r2 = Store.importCode(JSON.stringify([Object.assign({}, p2, { id: "p_three" })]));
    return r.imported.length === 2 && r2.imported.length === 1 && JSON.parse(localStorage.getItem("aiwd.profiles")).length === 3;
  });
  check("importCode handles several codes and a bare array (" + tag + ")", multi);
  // Copy button flips label
  await page.click("#btn-copy-code");
  await page.waitForFunction(() => document.getElementById("btn-copy-code").textContent === "Copied", null, { timeout: 3000 }).catch(() => {});
  const lbl = await page.textContent("#btn-copy-code");
  check("copy button flips to Copied (" + tag + ")", lbl === "Copied", lbl);
  // Start another
  await page.click("#btn-another");
  await page.waitForSelector("#landing");
  check("start another interview returns to landing (" + tag + ")", true);
}

(async () => {
  const { srv, url } = await serve();
  const browser = await chromium.launch();
  try {
    // 1. Full flow, desktop, light
    {
      const { ctx, page } = await newPage(browser, url);
      await fullFlow(page, "desktop-light");
      await ctx.close();
    }
    // 2. Full flow, phone, dark, overflow checks
    {
      const { ctx, page } = await newPage(browser, url, { viewport: { width: 400, height: 800 }, dark: true });
      await fullFlow(page, "phone-dark", { max: 400 });
      await ctx.close();
    }
    // 3. Desktop dark and phone light screenshots of landing (theme coverage)
    {
      const { ctx, page } = await newPage(browser, url, { dark: true });
      await page.screenshot({ path: path.join(SHOTS, "landing-desktop-dark.png"), fullPage: true });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check("dark body background applied", bg === "rgb(18, 23, 22)", bg);
      await ctx.close();
      const p2 = await newPage(browser, url, { viewport: { width: 400, height: 800 } });
      await p2.page.screenshot({ path: path.join(SHOTS, "landing-phone-light.png"), fullPage: true });
      await noOverflow(p2.page, "landing phone light", 400);
      await p2.ctx.close();
    }
    // 4. Stop-here path
    {
      const { ctx, page } = await newPage(browser, url, { name: "Bram" });
      await startInterview(page, "Bram", "mediator");
      await waitIdle(page);
      await answer(page, "I run mediations.");
      await waitIdle(page);
      await page.click("#btn-stop");
      await page.waitForSelector("#stop-confirm");
      await page.click("#btn-stop-no");
      check("stop confirm can be dismissed", (await page.locator("#stop-confirm").count()) === 0);
      await page.click("#btn-stop");
      await page.click("#btn-stop-yes");
      await page.waitForSelector("#feedback", { timeout: 20000 });
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("aiwd.profiles") || "[]"));
      check("stop-here path completes and stores a profile", stored.length === 1 && stored[0].endedEarly === true && stored[0].confidence.items.length === 0, JSON.stringify(stored[0] && stored[0].confidence));
      const fb = await page.textContent("#feedback");
      check("stop-here feedback omits ratings section", !fb.includes("Your confidence ratings"));
      await ctx.close();
    }
    // 5. Rate phase without a valid marker → engine retry → still ends
    {
      const { ctx, page } = await newPage(browser, url, { scenario: "norate" });
      await startInterview(page, "Anneke", "trainer");
      for (const a of ["one", "two", "three", "four"]) await answer(page, "answer " + a);
      await page.waitForSelector("#rate-card", { timeout: 15000 });
      const retried = await page.evaluate(() => window.__rateRetried === true);
      check("missing RATE marker triggers engine retry", retried);
      const cards = await page.locator("#rate-card").count();
      check("rating card shown once after retry", cards === 1);
      const leaks = await page.evaluate(() => window.__leaks);
      check("no '<<' leaked during retry", leaks.length === 0, JSON.stringify(leaks).slice(0, 200));
      await page.click("#btn-rate-submit");
      await waitIdle(page);
      await answer(page, "follow-up answer");
      await page.waitForSelector("#feedback", { timeout: 20000 });
      check("norate scenario reaches feedback", true);
      await ctx.close();
    }
    // 6. Error from the model → Retry UI → retry succeeds without duplicating the answer
    {
      const { ctx, page } = await newPage(browser, url, { scenario: "error" });
      await startInterview(page, "Anneke", "adviser");
      await waitIdle(page);
      await answer(page, "first answer");
      await waitIdle(page);
      await page.waitForSelector("#chips .chip");
      await answer(page, "second answer that will fail once");
      check("typing an answer clears the chips", (await page.locator("#chips .chip").count()) === 0);
      await page.waitForSelector("#btn-retry", { timeout: 10000 });
      check("no chips with the error box", (await page.locator("#chips .chip").count()) === 0);
      const errText = await page.textContent("#turn-error-box");
      check("error UI shows the message", errText.includes("mock failure"), errText);
      check("no streaming bubble left behind on error", (await page.locator("#streaming").count()) === 0);
      await page.screenshot({ path: path.join(SHOTS, "error-retry-desktop-light.png"), fullPage: true });
      await page.click("#btn-retry");
      await waitIdle(page);
      const memberBubbles = await page.$$eval(".bubble.member", (els) => els.map((e) => e.textContent));
      check("retry does not duplicate the member answer", memberBubbles.filter((t) => t.includes("second answer")).length === 1, JSON.stringify(memberBubbles));
      const turns = await page.evaluate(() => MemberView._state.interview.turns.map((t) => t.role).join(","));
      check("transcript roles alternate after retry", turns === "interviewer,member,interviewer,member,interviewer", turns);
      const lastCall = await page.evaluate(() => window.__mockCalls[window.__mockCalls.length - 1]);
      check("retry sent the same conversation once", lastCall.filter((m) => m.content.startsWith("second answer")).length === 1);
      await ctx.close();
    }
    // 7. Draft resume after reload
    {
      const { ctx, page } = await newPage(browser, url);
      await startInterview(page, "Anneke", "coach");
      await waitIdle(page);
      await answer(page, "an answer before reload");
      await waitIdle(page);
      await page.reload();
      await page.waitForSelector("#draft-card");
      await page.click("#btn-continue");
      await page.waitForSelector("#interview");
      const bubbles = await page.locator(".bubble").count();
      check("draft resume restores transcript", bubbles === 3, String(bubbles));
      const hint = await page.textContent("#phase-hint");
      check("phase hint shows practice after resume", hint.includes("your practice"), hint);
      check("chips restored on resume", (await page.locator("#chips .chip").count()) === 3);
      const ans = await page.evaluate(() => MemberView._state.interview.answers);
      check("questionnaire answers restored with the interview", ans && ans.frequency === "weekly" && ans.stance === "pragmatic", JSON.stringify(ans));
      await ctx.close();
    }
    // 7b. Resume mid-questionnaire restores answers and lands on the questionnaire
    {
      const { ctx, page } = await newPage(browser, url);
      await startLanding(page, "Cees", "trainer");
      await page.click("label[for='q-frequency-daily']");
      await page.click("label[for='q-uses-analysis']");
      await page.fill("#q-offer-other", "a reading group");
      await page.reload();
      await page.waitForSelector("#draft-card");
      const dtext = await page.textContent("#draft-card");
      check("draft card mentions unfinished quick questions", dtext.includes("quick questions are not finished"), dtext);
      await page.click("#btn-continue");
      await page.waitForSelector("#questionnaire");
      const restored = await page.evaluate(() => ({
        daily: document.getElementById("q-frequency-daily").checked,
        analysis: document.getElementById("q-uses-analysis").checked,
        other: document.getElementById("q-offer-other").value,
      }));
      check("resume restores questionnaire answers", restored.daily && restored.analysis && restored.other === "a reading group", JSON.stringify(restored));
      check("resume lands on questionnaire, not chat", (await page.locator("#interview").count()) === 0);
      await ctx.close();
    }
    // 7c. "Never" path and exclusive "Nothing for now"
    {
      const { ctx, page } = await newPage(browser, url, { name: "Bram" });
      await startLanding(page, "Bram", "mediator");
      await page.click("label[for='q-frequency-weekly']");
      const visible = (id) => page.evaluate((i) => !document.getElementById(i).hidden, id);
      check("uses/tools/canShow visible for weekly", (await visible("q-uses")) && (await visible("q-tools")) && (await visible("q-canShow")));
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
      await page.click("label[for='q-frequency-tried']");
      check("canShow hidden for tried", !(await visible("q-canShow")) && (await visible("q-uses")));
      await page.click("label[for='q-uses-writing']");
      await page.click("label[for='q-frequency-never']");
      check("uses/tools/canShow hidden live for never", !(await visible("q-uses")) && !(await visible("q-tools")) && !(await visible("q-canShow")));
      await page.click("label[for='q-stance-sceptical']");
      await page.click("label[for='q-offer-nothing']");
      const ans = await page.evaluate(() => MemberView._state.answers);
      check("skipped questions dropped from answers", !("uses" in ans) && !("tools" in ans) && !("canShow" in ans) && !("pay" in ans) && ans.frequency === "never" && ans.offer.join() === "nothing", JSON.stringify(ans));
      await page.click("#btn-q-continue");
      await page.waitForSelector("#interview");
      await waitIdle(page);
      const fp = await page.evaluate(() => window.__firstPrompt || "");
      check("non-user interviewer prompt says 'has not used AI tools in their work'", fp.includes("Bram has not used AI tools in their work"));
      await ctx.close();
    }
    // 7d. Questionnaire screenshots: phone dark (overflow) and desktop dark
    {
      const { ctx, page } = await newPage(browser, url, { viewport: { width: 400, height: 800 }, dark: true });
      await startLanding(page, "Anneke", "coach");
      await fillQuestionnaire(page, "weekly");
      await page.screenshot({ path: path.join(SHOTS, "questionnaire-phone-dark-filled.png"), fullPage: true });
      await noOverflow(page, "questionnaire phone dark", 400);
      await ctx.close();
    }
    // 8. No Claude at all → clear message, interview does not start
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(url + "#member");
      await page.fill("#f-name", "Noor"); await page.fill("#f-role", "trainer");
      await page.click("#btn-start");
      await page.waitForSelector("#llm-unavailable:not([hidden])");
      const t = await page.textContent("#llm-unavailable");
      check("unavailable message shown without Claude", t.includes("Claude is not available in this view"));
      check("interview did not start", (await page.locator("#interview").count()) === 0);
      // Router placeholder for missing views
      await page.goto(url + "#organiser");
      await page.waitForFunction(() => document.getElementById("view").textContent.includes("not loaded yet") || window.OrganiserView);
      check("missing organiser module shows placeholder or renders", true);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
