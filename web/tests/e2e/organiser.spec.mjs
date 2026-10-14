/* organiser.spec.mjs — the organiser area against the real app (AIWD_MOCK_LLM=1, ORGANISER_PASSCODE=test):
 * login gate, every section of the organiser view with SEED, the drawer, product read and share-back
 * through the server mock, import of an artifact result code, per-member delete, sign out.
 * Run: BASE_URL=http://127.0.0.1:3100 NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/organiser.spec.mjs
 * Ported from prototype/tests/organiser.spec.js. */
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
const RUN = Date.now().toString(36).slice(-4);

let passes = 0, failures = 0;
function check(name, ok, extra) {
  if (ok) { passes++; console.log("  ok   " + name); }
  else { failures++; console.log("  FAIL " + name + (extra ? " :: " + extra : "")); }
}

const errors = [];
async function newContext(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1200, height: 900 } }, opts));
  return ctx;
}
function watch(page) {
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
}
/** Go to a gated page and wait until we land on the login page (a redirect, maybe client-side). */
async function gotoLogin(page, url) {
  await page.goto(url).catch(() => {});
  await page.waitForURL(/\/organiser\/login/, { timeout: 10000 }).catch(() => {});
}
async function login(page) {
  await page.goto(BASE + "/organiser/login");
  await page.fill("#f-passcode", PASSCODE);
  await page.click("#btn-login");
  await page.waitForURL(/\/organiser$/);
}
async function openOrganiser(page) {
  await page.goto(BASE + "/organiser");
  await page.waitForSelector("#og-root");
  await page.waitForSelector("#og-members .og-member, .og-empty");
}
async function noOverflow(page, label) {
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check("no horizontal overflow " + label, ov.sw <= ov.cw, JSON.stringify(ov));
}
/** Make sure the samples toggle is on (it is per browser, default on). */
async function samplesOn(page, on) {
  const cur = await page.isChecked("#og-samples");
  if (cur !== on) {
    await page.click("#og-samples");
    await page.waitForFunction((want) => document.getElementById("og-samples") && document.getElementById("og-samples").checked === want && !!document.querySelector("#og-root"), on);
    await page.waitForTimeout(300);
  }
}

(async () => {
  const browser = await chromium.launch();

  // ---- Login gate ---------------------------------------------------------------------------
  console.log("Login");
  {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    watch(page);
    await gotoLogin(page, BASE + "/organiser");
    check("organiser page redirects to login without the cookie", /\/organiser\/login/.test(page.url()), page.url());
    await gotoLogin(page, BASE + "/network");
    check("share-back page redirects to login without the cookie", /\/organiser\/login/.test(page.url()), page.url());
    const api = await ctx.request.get(BASE + "/api/organiser/profiles");
    check("organiser API is 401 without the cookie", api.status() === 401, String(api.status()));
    check("login page shows no organiser nav links", (await page.locator("#navlinks").count()) === 0);
    await page.fill("#f-passcode", "wrong");
    await page.click("#btn-login");
    await page.waitForSelector("#login-error:not([hidden])");
    check("wrong passcode shows an error", (await page.textContent("#login-error")).includes("not right"));
    await page.screenshot({ path: path.join(SHOTS, "organiser-login-1200-light.png"), fullPage: true });
    await page.fill("#f-passcode", PASSCODE);
    await page.click("#btn-login");
    await page.waitForURL(/\/network$/);
    check("login returns to the page asked for (next=)", page.url().endsWith("/network"), page.url());
    const nav = await page.textContent("#navlinks");
    check("organiser nav shows Organiser / Share-back / Sign out", nav.includes("Organiser") && nav.includes("Share-back") && nav.includes("Sign out"), nav);
    await page.click("#btn-signout");
    await page.waitForURL(/\/organiser\/login/);
    await gotoLogin(page, BASE + "/organiser");
    check("after sign out the organiser page needs the passcode again", /\/organiser\/login/.test(page.url()), page.url());
    await ctx.close();
  }

  // ---- Desktop light: organiser with SEED -----------------------------------------------------
  console.log("Organiser view");
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  watch(page);
  await login(page);
  await openOrganiser(page);
  await samplesOn(page, true);
  const seedN = await page.evaluate(() => window.SEED.length);
  const storedN = await page.evaluate(async () => (await (await fetch("/api/organiser/profiles")).json()).profiles.length);
  const N = seedN + storedN;
  for (const id of ["og-summary", "og-scatter", "og-heat", "og-help", "og-signals", "og-members", "og-import"]) {
    check("section " + id + " renders", (await page.$("#" + id)) !== null);
  }
  const cfg = await page.evaluate(async () => (await fetch("/api/config")).json());
  check("memory-storage warning matches /api/config", (await page.locator("#storage-warning").count()) === (cfg.storage === "memory" ? 1 : 0));
  check("samples banner shown", (await page.textContent("#og-banner")).includes("fictional members are shown as samples"));
  check("spread bar renders", (await page.$$("#og-summary .og-spreadbar .seg")).length >= 3);
  check("frequency strip renders", (await page.$("#og-freq")) !== null);
  const withMean = await page.evaluate(async () => {
    const stored = (await (await fetch("/api/organiser/profiles")).json()).profiles;
    const ids = new Set(stored.map((p) => p.id));
    const all = stored.concat(window.SEED.filter((s) => !ids.has(s.id)));
    return all.filter((p) => p.confidence && Number.isFinite(p.confidence.mean)).length;
  });
  check("scatter has one mark per rated profile (" + withMean + ")", (await page.$$("#og-scatter .dot")).length === withMean, String((await page.$$("#og-scatter .dot")).length));
  check("scatter shows all three kinds of mark", (await page.$$("#og-scatter .dot.k-confident-starter")).length >= 1 && (await page.$$("#og-scatter .dot.k-cautious-practitioner")).length >= 1 && (await page.$$("#og-scatter .dot.k-aligned")).length >= 1);
  check("scatter crossbars drawn", (await page.$$("#og-scatter .ticks .tickend")).length === withMean);
  check("scatter labels every mark", (await page.$$("#og-scatter text.lbl")).length === withMean);
  check("heatmap has one row per profile", (await page.$$("#og-heat tbody tr")).length === N, String((await page.$$("#og-heat tbody tr")).length));
  check("heatmap has 8 columns", (await page.$$("#og-heat tbody tr:first-child td.cell")).length === 8);
  const filled = (await page.$$("#og-heat .hm.has")).length;
  const probed = (await page.$$("#og-heat .hm.claim.probed")).length;
  const notAsked = (await page.$$("#og-heat .hm.claim:not(.probed)")).length;
  check(`heatmap three states: filled ${filled}, ticked-asked ${probed}, ticked-not-asked ${notAsked}`, filled > 0 && probed > 0 && notAsked > 0);
  const gapsUi = (await page.$$("#og-heat thead .gap")).length;
  const gaps = await page.evaluate(async () => {
    const stored = (await (await fetch("/api/organiser/profiles")).json()).profiles;
    const ids = new Set(stored.map((p) => p.id));
    return window.Engine.stats(stored.concat(window.SEED.filter((s) => !ids.has(s.id)).map((s) => ({ ...s, source: "seed" })))).gaps.length;
  });
  check("gap flags match Engine.stats().gaps", gapsUi === gaps, `${gapsUi} vs ${gaps}`);
  await page.hover("#og-heat .hm.claim.probed");
  check("probed cell tooltip", (await page.textContent("#og-heat .og-tip")).includes("when asked gave no real example"));
  await page.hover("#og-heat .hm.has");
  check("filled cell tooltip shows evidence", await page.$eval("#og-heat .og-tip", (n) => n.classList.contains("show") && n.textContent.length > 10));
  check("help map lists helpers and seekers", (await page.$$("#og-help .helpers li")).length >= 1 && (await page.$$("#og-help .seekers li")).length >= 1);
  const optCount = await page.evaluate(() => window.Prompts.QUESTIONNAIRE.offer.options.length - 1);
  const tally = await page.$$eval("#og-signals .pay .og-payrow", (rows) => rows.map((r) => ({ key: r.dataset.offer, total: +r.dataset.total, sum: [...r.querySelectorAll(".seg")].reduce((a, x) => a + +x.dataset.n, 0) })));
  check("pay tally: one bar per offer except 'nothing'", tally.length === optCount && !tally.some((r) => r.key === "nothing"), JSON.stringify(tally));
  check("pay tally segments sum to totals", tally.every((r) => r.sum === r.total));
  check("pay legend has five labels", JSON.stringify(await page.$$eval("#og-signals .pay .og-ramp span", (n) => n.map((x) => x.textContent))) === JSON.stringify(["Yes", "Possibly", "Don't know yet", "No", "Not answered"]));
  await page.hover("#og-signals .pay .og-paybar .seg");
  check("pay segment tooltip names members", (await page.textContent("#og-signals .pay .og-tip")).length > 5);
  check("wants and offers lists", (await page.$$("#og-signals .wants ul.full li")).length >= 3 && (await page.$$("#og-signals .offers ul.full li")).length >= 2);
  check("members list has a card per profile", (await page.$$("#og-members .og-member")).length === N);
  check("sample markers on SEED cards", (await page.$$("#og-members .og-sample-tag")).length >= seedN);
  check("import section offers artifact codes, no local removal", (await page.textContent("#og-import")).includes("artifact") && !(await page.textContent("#og-import")).includes("Remove local results"));

  // Drawer
  const firstDot = await page.$eval("#og-scatter .dot.sample", (n) => n.getAttribute("data-id"));
  await page.hover(`#og-scatter .dot[data-id='${firstDot}']`);
  check("scatter tooltip shows a name", (await page.textContent("#og-scatter .og-tip")).length > 3);
  await page.click(`#og-scatter .dot[data-id='${firstDot}']`);
  await page.waitForSelector("#og-drawer"); await page.waitForTimeout(300);
  const drawerText = await page.textContent("#og-drawer");
  check("drawer opens with quick questions, practice and ratings", drawerText.includes("Quick questions") && drawerText.includes("Practice") && (await page.$$("#og-drawer .og-bar")).length >= 1);
  check("sample member has no Delete in the drawer", (await page.$("#og-delete")) === null);
  await page.screenshot({ path: path.join(SHOTS, "organiser-drawer-1200-light.png") });
  await page.keyboard.press("Escape");
  check("Escape closes the drawer", (await page.$("#og-drawer")) === null);

  // Product read via the server mock, then at rest from the server cache
  await page.click("#og-product button.primary");
  await page.waitForSelector("#og-product .verdict", { timeout: 30000 });
  check("product read renders verdict and options", (await page.textContent("#og-product .verdict")).length > 20 && (await page.$$("#og-product .opt")).length >= 2);
  await page.screenshot({ path: path.join(SHOTS, "organiser-1200-light.png"), fullPage: true });
  await openOrganiser(page);
  await page.waitForSelector("#og-product .verdict", { timeout: 10000 }).catch(() => {});
  check("product read shown at rest from the server cache", (await page.$("#og-product .verdict")) !== null);

  // Import an artifact result code (AIWD1: + base64 JSON), then delete it from the drawer
  const name = "Imported Iris " + RUN;
  const code = await page.evaluate((nm) => {
    const s0 = window.SEED[0];
    const questionnaire = Object.assign({}, s0.questionnaire, { viewEssential: "a", doubtPrivacy: "sa", reservation: "Clients may object", skillCheck: "always", skillAgents: "no", scenarioCheck: "verify", scenarioData: "paste", supOutside: "yes", supAsked: "no", whyNot: ["embarrassed"] });
    const selfCheck = window.Prompts.computeSelfCheck(questionnaire, 90);
    const feedback = Object.assign({}, s0.feedback, { nextSteps: [{ title: "Ask once", detail: "d", steps: ["Write the question", "Send it"] }], calibration: "Gently out of step.", followUp: "A low-cost try-out first." });
    const p = Object.assign({}, s0, { id: "p_imp_" + Math.random().toString(36).slice(2, 8), source: "live", member: { name: nm, role: "coach", org: "" }, questionnaire, selfCheck, feedback });
    const bytes = new TextEncoder().encode(JSON.stringify(p));
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    return "AIWD1:" + btoa(bin);
  }, name);
  const before = (await page.$$("#og-members .og-member")).length;
  await page.fill("#og-import textarea", "Here is my code: " + code);
  await page.click("#og-import button.primary");
  await page.waitForFunction((n) => document.querySelectorAll("#og-members .og-member").length === n, before + 1, { timeout: 10000 }).catch(() => {});
  check("import of an artifact code adds a member", (await page.textContent("#og-members")).includes(name));
  await page.waitForSelector("#og-blocks", { timeout: 10000 }).catch(() => {});
  check("statement-blocks section renders four lists", (await page.$$("#og-blocks .og-list")).length === 4);
  check("support list: one bar per support statement", (await page.$$("#og-block-support .og-bars li")).length === 7);
  // Counts must match Engine.stats over the loaded profiles (the member tests store real ones too).
  const bq = await page.evaluate(async () => window.Engine.stats(await window.OrganiserView.loadProfiles()).questionnaire);
  const sc = bq.items.scenarioCheck;
  check("access-not-asked callout matches stats", bq.accessNotAsked >= 1 && (await page.textContent("#og-access-not-asked")).startsWith(bq.accessNotAsked + " "), String(bq.accessNotAsked));
  check("scenario bars show 'careful' counts", sc.answered >= 1 && (await page.textContent("#og-block-scenario")).includes(`${sc.positive} of ${sc.answered} careful`), JSON.stringify(sc));
  check("calibration callout matches stats", bq.calibration["confidence-above-skills"] >= 1 && (await page.textContent("#og-calibration")).includes(`${bq.calibration["confidence-above-skills"]} rate their confidence well above`), JSON.stringify(bq.calibration));
  await noOverflow(page, "organiser with statement blocks");
  await page.fill("#og-import textarea", "not a code at all");
  await page.click("#og-import button.primary");
  await page.waitForSelector("#og-import .msg.bad");
  check("a bad code shows an error", (await page.textContent("#og-import .msg.bad")).includes("Could not import"));
  await samplesOn(page, false);
  check("samples off hides SEED and the banner", (await page.$$("#og-members .og-sample-tag")).length === 0 && (await page.$("#og-banner")) === null);
  await page.click(`#og-members .og-member:has-text("${name}")`);
  await page.waitForSelector("#og-drawer");
  const impText = await page.textContent("#og-drawer");
  check("imported member shows source imported", impText.includes("source: imported"));
  check("drawer shows statements, skill check and reservation", impText.includes("Skill check") && impText.includes("confidence well above concrete skills") && impText.includes("Clients may object") && impText.includes("I feel embarrassed"), impText.slice(0, 200));
  check("drawer shows advice steps, calibration and follow-up", impText.includes("Write the question") && impText.includes("Gently out of step.") && impText.includes("A low-cost try-out first."));
  await page.click("#og-delete");
  await page.waitForSelector("#og-delete-yes");
  check("delete asks for confirmation", (await page.textContent("#og-drawer")).includes("cannot be undone"));
  await page.click("#og-delete-yes");
  await page.waitForFunction((nm) => !document.querySelector("#og-drawer") && !document.getElementById("og-members")?.textContent.includes(nm) , name, { timeout: 10000 }).catch(() => {});
  check("delete removes the member", !((await page.textContent("#og-root")) || "").includes(name));
  const stillThere = await page.evaluate(async (nm) => (await (await fetch("/api/organiser/profiles")).json()).profiles.some((p) => p.member.name === nm), name);
  check("delete removed it on the server", !stillThere);
  await samplesOn(page, true);

  // ---- Share-back ---------------------------------------------------------------------------
  console.log("Share-back");
  await page.goto(BASE + "/network");
  await page.waitForSelector("#nw-root", { timeout: 15000 }).catch(async (e) => {
    console.log("DEBUG url", page.url(), "main:", ((await page.textContent("body").catch(() => "")) || "").slice(0, 400));
    throw e;
  });
  await page.waitForSelector("#nw-generate, #nw-copy");
  if (await page.$("#nw-generate")) await page.click("#nw-generate");
  else await page.click("#nw-regen");
  await page.waitForSelector("#nw-copy");
  await page.waitForFunction(() => document.querySelector("#nw-root h1") && document.querySelectorAll(".nw-try .row").length >= 1, null, { timeout: 30000 });
  check("share-back renders title, findings and tries", (await page.textContent("#nw-root h1")).length > 5 && (await page.$$(".nw-try .row")).length === 3);
  check("spread bar reused on the share-back", (await page.$("#nw-spread .og-spreadbar")) !== null);
  await page.click("#nw-copy");
  await page.click("#nw-edit");
  check("edit makes blocks editable", (await page.$$("[contenteditable='true']")).length > 5);
  const newTitle = "Edited title " + RUN;
  await page.evaluate((t) => { const h = document.querySelector("#nw-root h1"); h.textContent = t; h.dispatchEvent(new Event("input")); }, newTitle);
  await page.click("#nw-edit");
  await page.waitForTimeout(800);
  await page.goto(BASE + "/network");
  await page.waitForSelector("#nw-copy");
  check("edits saved on the server (PUT) and shown after reload", (await page.textContent("#nw-root h1")) === newTitle, await page.textContent("#nw-root h1"));
  await page.screenshot({ path: path.join(SHOTS, "network-1200-light.png"), fullPage: true });
  await ctx.close();

  // ---- Screenshots: dark desktop, phone light/dark ----------------------------------------------
  for (const [scheme, vp] of [["dark", { width: 1200, height: 900 }], ["light", { width: 400, height: 800 }], ["dark", { width: 400, height: 800 }]]) {
    const c = await newContext(browser, { viewport: vp, colorScheme: scheme, ...(vp.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
    const p = await c.newPage();
    watch(p);
    await login(p);
    await openOrganiser(p);
    const tag = vp.width + "-" + scheme;
    if (scheme === "dark") {
      const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check("dark background (" + tag + ")", bg === "rgb(18, 23, 22)", bg);
    }
    await noOverflow(p, "organiser " + tag);
    await p.screenshot({ path: path.join(SHOTS, "organiser-" + tag + ".png"), fullPage: true });
    await p.click("#og-members .og-member");
    await p.waitForSelector("#og-drawer"); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, "organiser-drawer-" + tag + ".png") });
    await p.keyboard.press("Escape");
    await p.click("#navlinks a[href='/network']");
    await p.waitForSelector("#nw-copy");
    await noOverflow(p, "share-back " + tag);
    await p.screenshot({ path: path.join(SHOTS, "network-" + tag + ".png"), fullPage: true });
    await c.close();
  }

  check("no console or page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
  await browser.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
