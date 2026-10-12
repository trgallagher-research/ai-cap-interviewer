/* organiser.spec.js — Playwright checks for organiser.js and network.js with a self-contained harness.
 * Run: NODE_PATH=/opt/node22/lib/node_modules node prototype/tests/organiser.spec.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const SHOTS = path.join(__dirname, "shots-organiser");
fs.mkdirSync(SHOTS, { recursive: true });

// ---------------------------------------------------------------------------
// Fixture profiles (schema per docs/architecture.md)
// ---------------------------------------------------------------------------
function profile(o) {
  const base = {
    id: o.id, createdAt: "2026-10-01T09:00:00Z", source: "seed",
    member: { name: o.name, role: o.role, org: o.org || "independent" },
    practice: { level: o.level, levelLabel: ["Not yet", "Exploring", "Routine", "Integrated", "Shaping"][o.level], summary: o.summary, domains: o.domains, tools: o.tools || [], judgement: o.judgement || "Checks output against own notes.", stance: o.stance },
    confidence: { items: o.items || [], mean: o.mean, band: o.mean === null ? "none" : o.mean < 40 ? "low" : o.mean > 70 ? "high" : "moderate", pattern: o.pattern || "" },
    divergence: { kind: o.kind, note: o.note || "" },
    wants: o.wants || [], offers: o.offers || [],
    productSignals: { wouldPayFor: o.pay || "", quote: o.quote || "" },
    feedback: { headline: "Thanks " + o.name + ", here is what stood out", summary: "You described your work clearly.", strengths: ["Clear judgement about when not to use AI."], nextSteps: [{ title: "Try one small experiment", detail: "On your own notes, this week." }], closing: "Good luck." },
    quotes: o.quotes || [],
  };
  if (o.transcript) base.transcript = o.transcript;
  if (o.endedEarly) base.endedEarly = true;
  return base;
}
const SEED = [
  profile({ id: "p_a", name: "Anneke", role: "team coach", level: 3, mean: 74, kind: "aligned", stance: "pragmatic",
    summary: "Uses Claude as a thinking partner on team cases and to prepare workshop designs.",
    domains: [{ key: "thinking", evidence: "I talk a case through before I go in." }, { key: "prep", evidence: "I ask it for three workshop openings and pick one." }, { key: "writing", evidence: "Drafts proposals from my intake notes." }],
    tools: ["Claude", "ChatGPT"], items: [{ id: "r1", task: "Draft a proposal from intake notes", level: 2, rating: 85 }, { id: "r2", task: "Use AI as a sparring partner on a stuck team case", level: 3, rating: 70 }, { id: "r3", task: "Build a reusable prompt for workshop design", level: 4, rating: 66 }],
    wants: ["learn to build reusable prompts for workshop design"], offers: ["can show how I use it to prepare workshop designs"], pay: "a half-day with peers on real cases", quote: "I would pay for a half-day with peers on real cases.", quotes: ["I talk a case through before I go in."],
    transcript: [{ role: "interviewer", text: "Hello Anneke, what does a typical week look like?" }, { role: "member", text: "Mostly team sessions and a lot of preparation." }] }),
  profile({ id: "p_b", name: "Bram", role: "mediator", level: 1, mean: 78, kind: "confident-starter", stance: "enthusiast",
    summary: "Has tried ChatGPT a few times for quick summaries.", domains: [{ key: "writing", evidence: "Summarised a long email thread once." }],
    tools: ["ChatGPT"], items: [{ id: "r1", task: "Summarise a document", level: 1, rating: 90 }, { id: "r2", task: "Draft a mediation agreement", level: 2, rating: 66 }],
    wants: ["use AI to analyse interview notes"], offers: [], pay: "", quotes: ["It feels like magic, honestly."] }),
  profile({ id: "p_c", name: "Carla", role: "organisational adviser", level: 3, mean: 40, kind: "cautious-practitioner", stance: "cautious",
    summary: "Integrated AI into analysis of survey results and documents, but doubts herself.", domains: [{ key: "analysis", evidence: "I feed it anonymised survey comments and ask for patterns." }, { key: "learning", evidence: "I read up on new methods with it." }],
    tools: ["Copilot"], items: [{ id: "r1", task: "Find patterns in survey comments", level: 3, rating: 45 }, { id: "r2", task: "Translate a report", level: 1, rating: 35 }],
    wants: ["get more confident with client material"], offers: ["can show my survey-analysis routine"], pay: "a checklist for client confidentiality", quotes: ["I never put a client name in."] }),
  profile({ id: "p_d", name: "Dirk", role: "trainer", level: 0, mean: 18, kind: "aligned", stance: "sceptical",
    summary: "Has not used AI tools in his work and doubts the value for relational work.", domains: [], tools: [],
    items: [{ id: "r1", task: "Open a free AI chat tool and ask it to summarise a one-page document", level: 1, rating: 25 }, { id: "r2", task: "Ask it for three icebreakers for a training", level: 1, rating: 11 }],
    wants: [], offers: [], pay: "", quotes: ["I do not see what it adds to being in the room."] }),
  profile({ id: "p_e", name: "Els", role: "manager", level: 4, mean: 88, kind: "aligned", stance: "enthusiast",
    summary: "Builds custom GPTs for her team and sets data rules.", domains: [{ key: "building", evidence: "Built a project GPT for our intake process." }, { key: "client", evidence: "Ran a session with a team using it live." }, { key: "writing", evidence: "All first drafts." }, { key: "thinking", evidence: "Sparring partner on hard conversations." }],
    tools: ["ChatGPT", "Claude"], items: [{ id: "r1", task: "Build a project for a recurring task", level: 4, rating: 92 }, { id: "r2", task: "Teach a colleague a prompt routine", level: 4, rating: 84 }],
    wants: ["learn where the limits of client-facing use are"], offers: ["can show how to build a project GPT"], pay: "a peer group that meets monthly", quote: "A peer group, monthly, that I would pay for.", quotes: ["Rules first, then tools."] }),
  profile({ id: "p_f", name: "Femke", role: "conflict coach", level: 2, mean: 55, kind: "aligned", stance: "pragmatic",
    summary: "Regular use for session preparation and admin.", domains: [{ key: "prep", evidence: "Prepares session outlines every time." }, { key: "admin", evidence: "Invoices and planning." }],
    tools: ["ChatGPT"], items: [{ id: "r1", task: "Prepare a session outline", level: 2, rating: 70 }, { id: "r2", task: "Analyse a set of interview notes", level: 3, rating: 40 }],
    wants: ["prepare a workshop faster with AI"], offers: [], pay: "", quotes: ["It saves me an evening a week."], endedEarly: true }),
  profile({ id: "p_g", name: "Gijs", role: "adviser", level: 2, mean: null, kind: "unrated", stance: "worried",
    summary: "Uses it routinely for writing but worries about data.", domains: [{ key: "writing", evidence: "Emails and reports." }],
    tools: ["Copilot"], items: [], wants: ["keep meeting notes with AI without leaking data"], offers: [], pay: "", quotes: ["Where does the text go?"] }),
];

const PRODUCT_JSON = { verdict: "There is a small, real product: peer sessions on real cases, not generic training.", demand: ["3 members would pay for a peer half-day on real cases", "2 want help with client confidentiality"], options: [{ name: "Peer case half-day", forWhom: "integrated users", shape: "Four members bring a case. Facilitated.", evidence: "Anneke and Els asked for it", risk: "Small group" }, { name: "Confidentiality checklist", forWhom: "cautious users", shape: "One page. Workshop to introduce.", evidence: "Carla and Gijs", risk: "Hard to charge for" }], notSupported: ["A generic AI course"], nextTest: "Offer one paid half-day and count sign-ups." };
const SHARE_JSON = { title: "How AI shows up in our work", intro: "Seven of us talked with an AI interviewer about how we use AI.", picture: "A few of us have woven it in; most use it now and then; one or two have not started.", findings: [{ title: "Confidence and practice do not always match", detail: "Some rate themselves higher than their practice; some lower." }, { title: "Scepticism is reasoned", detail: "Those who do not use it have thought about why." }, { title: "Preparation is the common ground", detail: "Most use it for session preparation." }], quotes: ["I talk a case through before I go in.", "Rules first, then tools.", "I do not see what it adds to being in the room."], helpMap: [{ need: "Building reusable prompts", whoCanHelp: "a manager who builds project GPTs" }, { need: "Analysing survey comments", whoCanHelp: "an adviser with a weekly routine" }, { need: "Client confidentiality rules", whoCanHelp: "a manager who set data rules for her team" }], tryThisWeek: [{ title: "Talk a case through first", detail: "Before a hard session, explain the case to the AI and ask what you are missing." }, { title: "Three openings", detail: "Ask for three workshop openings and pick one." }, { title: "Anonymise first", detail: "Strip names before pasting notes." }], closing: "Tell us what you recognise and what you do not. We will meet in November." };

const HARNESS = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Organiser harness</title>
<style>
:root { --font-display: "IBM Plex Serif", Georgia, serif; --font-body: "IBM Plex Sans", system-ui, sans-serif; --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --bg:#F7F8F7; --surface:#FFFFFF; --surface-2:#EEF1F0; --fg:#19211F; --fg-2:#46514E; --muted:#778481; --line:#D5DBD9; --accent:#0F6E72; --accent-fg:#FFFFFF; --accent-soft:#DDEFEF; --warm:#B5731C; --good:#2E7D4F; --warn:#B26A00; --bad:#B23A3A; --radius:6px; --radius-lg:12px; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#121716; --surface:#1B2321; --surface-2:#232D2B; --fg:#EAF0EE; --fg-2:#B6C2BF; --muted:#7F8D8A; --line:#324240; --accent:#5FC2C4; --accent-fg:#0B1F20; --accent-soft:#16393A; --warm:#E0A24A; --good:#6CC48E; --warn:#E5A33B; --bad:#E07070; } }
:root[data-theme="dark"] { --bg:#121716; --surface:#1B2321; --surface-2:#232D2B; --fg:#EAF0EE; --fg-2:#B6C2BF; --muted:#7F8D8A; --line:#324240; --accent:#5FC2C4; --accent-fg:#0B1F20; --accent-soft:#16393A; --warm:#E0A24A; --good:#6CC48E; --warn:#E5A33B; --bad:#E07070; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-body); }
.btn { font: inherit; font-size: .9rem; padding: .45rem .9rem; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }
.btn.primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.btn.quiet { border-color: transparent; background: transparent; color: var(--accent); }
.btn:focus-visible, .input:focus-visible, .textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn[disabled] { opacity: .5; cursor: default; }
.input, .textarea { font: inherit; padding: .5rem .6rem; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--fg); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 1rem; }
.pill { display: inline-block; font-size: .75rem; padding: .1rem .5rem; border-radius: 999px; border: 1px solid var(--line); color: var(--fg-2); background: var(--surface); }
.pill.good { border-color: var(--good); color: var(--good); } .pill.warn { border-color: var(--warn); color: var(--warn); } .pill.bad { border-color: var(--bad); color: var(--bad); } .pill.accent { border-color: var(--accent); color: var(--accent); }
.eyebrow { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
a { color: var(--accent); }
</style></head>
<body>
<main id="organiser"></main>
<main id="network"></main>
<script>
window.__mockSample = async function (messages, opts) {
  const text = messages[0].content;
  if (/product read/i.test(text)) return { text: "\`\`\`json\\n" + JSON.stringify(${JSON.stringify(PRODUCT_JSON)}) + "\\n\`\`\`" };
  if (/share-back/i.test(text)) return { text: JSON.stringify(${JSON.stringify(SHARE_JSON)}) };
  return { text: "{}" };
};
window.App = { ui: {
  el: function (tag, attrs, children) { const n = document.createElement(tag); if (attrs) { for (const k in attrs) { if (k === "class") n.className = attrs[k]; else if (k === "on") { for (const e in attrs.on) n.addEventListener(e, attrs.on[e]); } else n.setAttribute(k, attrs[k]); } } (Array.isArray(children) ? children : [children]).forEach((c) => { if (c == null) return; n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return n; },
  toast: function (msg) { window.__toasts = (window.__toasts || []).concat([msg]); },
  copy: function (text, btn) { window.__copied = text; if (btn) btn.textContent = "Copied"; },
}, navigate: function (h) { location.hash = h; }, currentView: "organiser" };
window.Store = {
  loadAll: function () { try { return JSON.parse(localStorage.getItem("aiwd.profiles") || "[]"); } catch (e) { return []; } },
  save: function (p) { const a = this.loadAll(); a.push(p); localStorage.setItem("aiwd.profiles", JSON.stringify(a)); return { where: ["local"] }; },
  exportCode: function (p) { return JSON.stringify(p); },
  importCode: function (text) { const p = JSON.parse(text); p.source = "imported"; this.save(p); return { imported: [p], skipped: 0 }; },
  clearLocal: function () { localStorage.removeItem("aiwd.profiles"); },
};
window.SEED = ${JSON.stringify(SEED)};
</script>
<script src="${SRC}/prompts.js"></script>
<script src="${SRC}/engine.js"></script>
<script src="${SRC}/organiser.js"></script>
<script src="${SRC}/network.js"></script>
<script>
window.__boot = async function (which) {
  document.getElementById("organiser").hidden = which !== "organiser";
  document.getElementById("network").hidden = which !== "network";
  if (which === "organiser") await OrganiserView.render(document.getElementById("organiser"));
  else await NetworkView.render(document.getElementById("network"));
  return true;
};
</script>
</body></html>`;

const HARNESS_PATH = path.join(SHOTS, "_harness.html");
fs.writeFileSync(HARNESS_PATH, HARNESS);

// ---------------------------------------------------------------------------
let failures = 0; let passes = 0;
function check(name, ok, extra) { if (ok) { passes++; console.log("  ok   " + name); } else { failures++; console.log("  FAIL " + name + (extra ? " :: " + extra : "")); } }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function newPage(opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1200, height: 900 } }, opts || {}));
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    await page.goto("file://" + HARNESS_PATH);
    return { ctx, page };
  }

  // ---- Desktop light: organiser ------------------------------------------------
  let { ctx, page } = await newPage();
  await page.evaluate(() => __boot("organiser"));
  await page.waitForSelector("#og-root");
  const N = SEED.length;
  console.log("Organiser view");
  for (const id of ["og-summary", "og-scatter", "og-heat", "og-help", "og-signals", "og-members", "og-import"]) {
    check("section " + id + " renders", await page.$("#" + id) !== null);
  }
  check("banner says 7 fictional members", (await page.textContent("#og-banner")).includes("fictional members are shown as samples"));
  check("spread bar renders with 5 segments", (await page.$$("#og-summary .og-spreadbar .seg")).length === 5);
  const withMean = SEED.filter((p) => p.confidence.mean !== null).length;
  check("scatter has one dot per rated profile (" + withMean + ")", (await page.$$("#og-scatter .dot")).length === withMean);
  check("scatter kinds present", (await page.$$("#og-scatter .dot.k-confident-starter")).length === 1 && (await page.$$("#og-scatter .dot.k-cautious-practitioner")).length === 1);
  check("heatmap has N rows", (await page.$$("#og-heat tbody tr")).length === N);
  check("heatmap has 8 columns per row", (await page.$$("#og-heat tbody tr:first-child td.cell")).length === 8);
  const gapCount = (await page.$$("#og-heat thead .gap")).length;
  check("gaps flagged in heatmap (" + gapCount + ")", gapCount >= 1);
  const stats = await page.evaluate(() => Engine.stats(SEED).gaps);
  check("gap flags match Engine.stats.gaps", gapCount === stats.length, JSON.stringify(stats));
  check("help map lists a helper", (await page.$$("#og-help .helpers li")).length >= 1);
  check("help map lists a seeker", (await page.$$("#og-help .seekers li")).length >= 1);
  check("help map says nobody for a seeker-only domain", (await page.textContent("#og-help")).includes("Nobody in the network yet"));
  check("wants/offers/pay lists", (await page.$$("#og-signals .wants ul.full li")).length >= 3 && (await page.$$("#og-signals .offers ul.full li")).length >= 2 && (await page.$$("#og-signals .pay ul.full li")).length >= 2);
  check("wants theme tally present", (await page.$$("#og-signals .wants ul.tally li")).length >= 2);
  check("scatter labels every mark with a name", (await page.$$("#og-scatter text.lbl")).length === withMean);
  check("scatter draws a per-member expected tick per rated mark, no band", (await page.$$("#og-scatter .ticks .tickline")).length === withMean && (await page.$("#og-scatter .band")) === null);
  check("heatmap notes members without evidence", (await page.textContent("#og-heat")).includes("has not used AI tools"));
  check("average confidence caption mentions rough comparison", (await page.textContent("#og-summary")).includes("rough comparison"));
  check("heatmap gap line above table", (await page.textContent("#og-heat")).indexOf("Columns marked \"gap\"") < (await page.textContent("#og-heat")).indexOf("Member"));
  check("members list has N cards", (await page.$$("#og-members .og-member")).length === N);
  check("sample markers shown", (await page.$$("#og-members .og-sample-tag")).length === N);
  check("endedEarly marked", (await page.textContent("#og-members")).includes("stopped early"));
  check("unrated member gets a 'No ratings given' pill", await page.$eval("#og-members .og-member[data-id='p_g']", (n) => n.textContent.includes("No ratings given")));
  check("summary counts unrated", (await page.textContent("#og-summary")).includes("1 gave no ratings"));

  // hover tooltip on a dot
  await page.hover("#og-scatter .dot[data-id='p_b']");
  check("scatter tooltip shows name", (await page.textContent("#og-scatter .og-tip")).includes("Bram"));
  // click dot opens detail
  await page.click("#og-scatter .dot[data-id='p_a']");
  await page.waitForSelector("#og-drawer"); await page.waitForTimeout(300);
  const drawerText = await page.textContent("#og-drawer");
  check("detail panel opens with member name", drawerText.includes("Anneke"));
  check("detail shows confidence bars", (await page.$$("#og-drawer .og-bar")).length === 3);
  check("detail shows transcript collapsed", (await page.$("#og-drawer details")) !== null);
  check("detail shows residual in words", /rated \d+ points? (above|below) what their tasks would predict|rated exactly/.test(drawerText));
  await page.screenshot({ path: path.join(SHOTS, "desktop-light-detail.png") });
  await page.keyboard.press("Escape");
  check("Escape closes panel", (await page.$("#og-drawer")) === null);
  // heatmap cell tooltip
  await page.hover("#og-heat .hm.has");
  check("heatmap tooltip shows evidence", (await page.textContent("#og-heat .og-tip")) !== "" && (await page.$eval("#og-heat .og-tip", (n) => n.classList.contains("show"))));
  // product read
  await page.click("#og-product button.primary");
  await page.waitForSelector("#og-product .verdict");
  check("product read renders verdict + options", (await page.textContent("#og-product .verdict")).includes("peer sessions") && (await page.$$("#og-product .opt")).length === 2);
  check("product read cached", await page.evaluate(() => !!localStorage.getItem("aiwd.productRead")));
  await page.screenshot({ path: path.join(SHOTS, "desktop-light.png"), fullPage: true });

  // import a code
  const newP = profile({ id: "p_new", name: "Hanna", role: "coach", level: 2, mean: 60, kind: "aligned", stance: "pragmatic", summary: "Regular use.", domains: [{ key: "prep", evidence: "Session outlines." }], items: [{ id: "r1", task: "x", level: 2, rating: 60 }] });
  await page.fill("#og-import textarea", JSON.stringify(newP));
  await page.click("#og-import button.primary");
  await page.waitForFunction((n) => document.querySelectorAll("#og-members .og-member").length === n, N + 1);
  check("import adds a row", (await page.$$("#og-members .og-member")).length === N + 1);
  check("imported row has no sample tag", await page.$eval("#og-members .og-member[data-id='p_new']", (n) => !n.querySelector(".og-sample-tag")));
  // sample toggle off
  await page.click("#og-samples");
  await page.waitForFunction(() => document.querySelectorAll("#og-members .og-member").length === 1);
  check("sample toggle off hides seed rows", (await page.$$("#og-members .og-member")).length === 1 && (await page.$("#og-banner")) === null);
  // copy json
  await page.click("#og-import button:has-text('Copy all results as JSON')");
  check("copy JSON gives real results only", await page.evaluate(() => JSON.parse(window.__copied).length === 1));
  // remove local: two-step
  await page.click("#og-import button:has-text('Remove local results')");
  check("remove asks for confirmation", (await page.$("#og-import button:has-text('Yes, remove them')")) !== null);
  await page.click("#og-import button:has-text('Yes, remove them')");
  await page.waitForSelector(".og-empty");
  check("empty state after removal with samples off", (await page.textContent(".og-empty")).includes("No interviews yet"));
  await page.screenshot({ path: path.join(SHOTS, "desktop-light-empty.png"), fullPage: true });
  await page.click("#og-samples");
  await page.waitForSelector("#og-summary");

  // ---- Network view --------------------------------------------------------------
  console.log("Network view");
  await page.evaluate(() => __boot("network"));
  await page.waitForSelector("#nw-generate");
  check("network empty state with generate button", true);
  await page.click("#nw-generate");
  await page.waitForSelector("#nw-copy");
  check("share-back renders title", (await page.textContent("#nw-root h1")).includes("How AI shows up"));
  check("share-back has quotes, help map, three tries", (await page.$$(".nw-quote")).length === 3 && (await page.$$(".nw-help .row")).length === 3 && (await page.$$(".nw-try .row")).length === 3);
  check("spread bar reused", (await page.$("#nw-spread .og-spreadbar")) !== null);
  await page.click("#nw-copy");
  const copied = await page.evaluate(() => window.__copied);
  check("copy as text produces non-empty text", typeof copied === "string" && copied.length > 200 && copied.startsWith("# "));
  await page.click("#nw-edit");
  check("edit toggles contenteditable", (await page.$$("[contenteditable='true']")).length > 5);
  await page.evaluate(() => { const h = document.querySelector("#nw-root h1"); h.textContent = "Edited title"; h.dispatchEvent(new Event("input")); });
  await page.click("#nw-edit");
  check("edits persist to localStorage", await page.evaluate(() => JSON.parse(localStorage.getItem("aiwd.shareback")).data.title === "Edited title"));
  await page.screenshot({ path: path.join(SHOTS, "network-desktop-light.png"), fullPage: true });
  await ctx.close();

  // ---- Dark desktop ----------------------------------------------------------------
  ({ ctx, page } = await newPage({ colorScheme: "dark" }));
  await page.evaluate(() => { localStorage.setItem("aiwd.productRead", JSON.stringify({ n: 7, at: "2026-10-12", result: window.__pr })); });
  await page.evaluate((pr) => localStorage.setItem("aiwd.productRead", JSON.stringify({ n: 7, at: "2026-10-12T10:00:00Z", result: pr })), PRODUCT_JSON);
  await page.evaluate((sb) => localStorage.setItem("aiwd.shareback", JSON.stringify({ n: 7, samples: 7, at: "2026-10-12T10:00:00Z", data: sb })), SHARE_JSON);
  await page.evaluate(() => __boot("organiser"));
  await page.waitForSelector("#og-summary");
  check("product read shows at rest from cache", (await page.$("#og-product .verdict")) !== null);
  await page.click("#og-scatter .dot[data-id='p_c']");
  await page.waitForSelector("#og-drawer"); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, "desktop-dark-detail.png") });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: path.join(SHOTS, "desktop-dark.png"), fullPage: true });
  await page.evaluate(() => __boot("network"));
  await page.waitForSelector("#nw-copy");
  await page.screenshot({ path: path.join(SHOTS, "network-desktop-dark.png"), fullPage: true });
  await ctx.close();

  // ---- Phone 400px, light and dark ----------------------------------------------------
  for (const scheme of ["light", "dark"]) {
    ({ ctx, page } = await newPage({ viewport: { width: 400, height: 800 }, colorScheme: scheme, isMobile: true, hasTouch: true }));
    await page.evaluate((pr) => localStorage.setItem("aiwd.productRead", JSON.stringify({ n: 7, at: "2026-10-12T10:00:00Z", result: pr })), PRODUCT_JSON);
    await page.evaluate((sb) => localStorage.setItem("aiwd.shareback", JSON.stringify({ n: 7, samples: 7, at: "2026-10-12T10:00:00Z", data: sb })), SHARE_JSON);
    await page.evaluate(() => __boot("organiser"));
    await page.waitForSelector("#og-summary");
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check("no horizontal overflow at 400px (" + scheme + ")", overflow.sw <= overflow.cw, JSON.stringify(overflow));
    await page.screenshot({ path: path.join(SHOTS, "phone-" + scheme + ".png"), fullPage: true });
    await page.click("#og-members .og-member[data-id='p_e']");
    await page.waitForSelector("#og-drawer"); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, "phone-" + scheme + "-detail.png") });
    await page.keyboard.press("Escape");
    await page.evaluate(() => __boot("network"));
    await page.waitForSelector("#nw-copy");
    const ov2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check("network: no horizontal overflow at 400px (" + scheme + ")", ov2.sw <= ov2.cw, JSON.stringify(ov2));
    await page.screenshot({ path: path.join(SHOTS, "network-phone-" + scheme + ".png"), fullPage: true });
    await ctx.close();
  }

  check("no console errors", errors.length === 0, errors.join(" | "));

  // ---- Integration pass: the real index.html with the real seed ------------------------
  const INDEX = path.join(SRC, "index.html");
  if (fs.existsSync(INDEX) && fs.existsSync(path.join(SRC, "seed.js"))) {
    console.log("Integration pass (real index.html + seed.js)");
    const realErrors = [];
    for (const [scheme, vp] of [["light", { width: 1200, height: 900 }], ["dark", { width: 1200, height: 900 }], ["light", { width: 400, height: 800 }]]) {
      const c = await browser.newContext({ viewport: vp, colorScheme: scheme });
      const pg = await c.newPage();
      pg.on("console", (m) => { if (m.type() === "error" && !/fonts.googleapis|net::ERR|Failed to load resource/.test(m.text())) realErrors.push("console: " + m.text()); });
      pg.on("pageerror", (e) => realErrors.push("pageerror: " + e.message));
      await pg.addInitScript(({ pr, sb }) => {
        window.__mockSample = async function (messages) {
          const text = messages[0].content;
          if (/product read/i.test(text)) return { text: JSON.stringify(pr) };
          if (/share-back/i.test(text)) return { text: JSON.stringify(sb) };
          return { text: "{}" };
        };
      }, { pr: PRODUCT_JSON, sb: SHARE_JSON });
      await pg.goto("file://" + INDEX + "#organiser");
      await pg.waitForSelector("#og-members .og-member");
      const seedN = await pg.evaluate(() => window.SEED.length);
      const tag = scheme + "-" + vp.width;
      check("real: members list has SEED.length cards (" + tag + ")", (await pg.$$("#og-members .og-member")).length === seedN);
      check("real: heatmap rows = SEED.length (" + tag + ")", (await pg.$$("#og-heat tbody tr")).length === seedN);
      const ov = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      check("real: no horizontal overflow (" + tag + ")", ov.sw <= ov.cw, JSON.stringify(ov));
      if (vp.width > 600) {
        check("real: pay list merges duplicates with a count (" + tag + ")", /\u00B7 [2-9] \u00B7/.test(await pg.textContent("#og-signals .pay")));
        check("real: wants list collapsed with Show all (" + tag + ")", (await pg.$$("#og-signals .wants ul.full li")).length === 8 && (await pg.$("#og-signals .wants button")) !== null);
        await pg.click("#og-signals .wants button");
        check("real: Show all expands (" + tag + ")", (await pg.$$("#og-signals .wants ul.full li")).length > 8);
      }
      await pg.screenshot({ path: path.join(SHOTS, "real-organiser-" + tag + ".png"), fullPage: true });
      await pg.click("#og-members .og-member");
      await pg.waitForSelector("#og-drawer"); await pg.waitForTimeout(300);
      await pg.screenshot({ path: path.join(SHOTS, "real-organiser-" + tag + "-detail.png") });
      await pg.keyboard.press("Escape");
      // import via a real export code
      const code = await pg.evaluate(() => Store.exportCode(Object.assign({}, window.SEED[0], { id: "p_real_import", source: "live", member: { name: "Imported Iris", role: "coach", org: "" } })));
      await pg.fill("#og-import textarea", code);
      await pg.click("#og-import button.primary");
      await pg.waitForFunction((n) => document.querySelectorAll("#og-members .og-member").length === n, seedN + 1);
      check("real: import of Store.exportCode adds a row (" + tag + ")", (await pg.textContent("#og-members")).includes("Imported Iris"));
      await pg.evaluate(() => App.navigate("network"));
      await pg.waitForSelector("#nw-generate");
      await pg.click("#nw-generate");
      await pg.waitForSelector("#nw-copy");
      check("real: share-back generates (" + tag + ")", (await pg.$$(".nw-try .row")).length === 3);
      await pg.screenshot({ path: path.join(SHOTS, "real-network-" + tag + ".png"), fullPage: true });
      await c.close();
    }
    check("real: no console errors", realErrors.length === 0, realErrors.join(" | "));
  } else {
    console.log("Integration pass skipped: index.html or seed.js not present yet");
  }
  await browser.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
