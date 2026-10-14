/* server-accounts.test.mjs: personal organiser passcodes (owner vs organiser), the activity log,
 * the email setting, private report links, the mock email, and cost tracking.
 * Run: npm run test:e2e (builds once), or AIWD_E2E_SKIP_BUILD=1 node --test tests/e2e/server-accounts.test.mjs */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./run.mjs";

const OWNER = "owner-passcode-1";
const ORG = "organiser-passcode-2";
const ACCOUNTS = JSON.stringify([
  { id: "tim", name: "Tim", role: "owner", passcode: OWNER },
  { id: "suzanne", name: "Suzanne", role: "organiser", passcode: ORG },
]);
const WEEKLY = { frequency: "weekly", uses: ["writing"], tools: ["ChatGPT"], stance: "pragmatic", offer: ["demos"], pay: "maybe", canShow: "yes" };
// The mock reports 1000 input + 200 output tokens per Claude call on Opus 5.5 = $0.008.
const MICRO_PER_CALL = 8000;

let ipN = 0;
const nextIp = () => `10.30.${Math.floor(ipN / 250)}.${(ipN++ % 250) + 1}`;

function client(url) {
  const req = async (method, p, body, cookie) => {
    const r = await fetch(url + p, { method, headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* html or empty */ }
    return { status: r.status, json, text, headers: r.headers };
  };
  async function login(passcode) {
    const r = await fetch(url + "/api/organiser/login", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": nextIp() }, body: JSON.stringify({ passcode }) });
    const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get("set-cookie")];
    return { status: r.status, cookie: (sc || []).filter(Boolean).map((c) => c.split(";")[0]).join("; ") };
  }
  /** Start, one interviewer turn, stop early, finish: three Claude calls. */
  async function quickInterview(name, extra = {}) {
    const s = await req("POST", "/api/interview/start", { name, role: "coach", answers: WEEKLY, ...extra });
    if (s.status !== 200) return { start: s };
    const id = s.json.interviewId;
    for (const body of [{ interviewId: id }, { interviewId: id, endNow: true }]) {
      const t = await fetch(url + "/api/interview/turn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      await t.text();
    }
    const f = await req("POST", "/api/interview/finish", { interviewId: id });
    return { start: s, id, finish: f };
  }
  return { req, login, quickInterview };
}

describe("organiser accounts, email setting, report links and costs", () => {
  let srv, c, owner, org;
  before(async () => {
    srv = await startServer({ env: { ORGANISER_PASSCODE: null, ORGANISER_ACCOUNTS: ACCOUNTS, EMAIL_MOCK: "1" } });
    c = client(srv.url);
  });
  after(async () => { await srv?.stop(); });

  test("each person signs in with their own passcode; a wrong one fails", async () => {
    owner = await c.login(OWNER);
    org = await c.login(ORG);
    assert.equal(owner.status, 204);
    assert.equal(org.status, 204);
    assert.notEqual(owner.cookie, org.cookie);
    assert.equal((await c.login("not-a-passcode")).status, 401);
    assert.deepEqual((await c.req("GET", "/api/organiser/me", undefined, owner.cookie)).json, { id: "tim", name: "Tim", role: "owner" });
    assert.deepEqual((await c.req("GET", "/api/organiser/me", undefined, org.cookie)).json, { id: "suzanne", name: "Suzanne", role: "organiser" });
    assert.equal((await c.req("GET", "/api/organiser/me")).status, 401);
    // A forged cookie for another account id does not work.
    const forged = "aiwd_org=tim." + org.cookie.split(".").slice(1).join(".");
    assert.equal((await c.req("GET", "/api/organiser/me", undefined, forged)).status, 401);
  });

  test("both see profiles; only the owner sees costs and activity", async () => {
    assert.equal((await c.req("GET", "/api/organiser/profiles", undefined, org.cookie)).status, 200);
    assert.equal((await c.req("GET", "/api/organiser/costs", undefined, org.cookie)).status, 403);
    assert.equal((await c.req("GET", "/api/organiser/audit", undefined, org.cookie)).status, 403);
    assert.equal((await c.req("GET", "/api/organiser/costs", undefined, owner.cookie)).status, 200);
    assert.equal((await c.req("GET", "/api/organiser/audit", undefined, owner.cookie)).status, 200);
  });

  test("email setting: defaults to none; the organiser can change it; it is enforced at start", async () => {
    assert.equal((await c.req("GET", "/api/config")).json.emailMode, "none");
    // Not collected: an email sent anyway is ignored.
    const ignored = await c.quickInterview("Ignored", { email: "ignored@example.org" });
    assert.equal(ignored.finish.status, 200);
    assert.equal(ignored.finish.json.emailState, undefined);
    assert.equal((await c.req("PUT", "/api/organiser/settings", { emailMode: "bogus" }, org.cookie)).status, 400);
    const put = await c.req("PUT", "/api/organiser/settings", { emailMode: "required" }, org.cookie);
    assert.equal(put.status, 200);
    assert.deepEqual(put.json, { emailMode: "required", emailSending: true });
    assert.equal((await c.req("GET", "/api/config")).json.emailMode, "required");
    const missing = await c.quickInterview("Noemail");
    assert.equal(missing.start.status, 400);
    assert.equal(missing.start.json.code, "email");
    const bad = await c.quickInterview("Bademail", { email: "not-an-email" });
    assert.equal(bad.start.status, 400);
  });

  test("finish: private report link, mock email sent, organiser sees email and status, member does not see coding", async () => {
    const r = await c.quickInterview("Rosa", { email: "Rosa@Example.org" });
    assert.equal(r.finish.status, 200);
    const res = r.finish.json;
    assert.match(res.reportToken, /^r_[0-9a-f]{32}$/);
    assert.equal(res.emailState, "sent");
    assert.ok(!JSON.stringify(res).includes("rosa@example.org"), "the member result does not echo the email");
    const page = await c.req("GET", "/r/" + res.reportToken);
    assert.equal(page.status, 200);
    assert.ok(page.text.includes("Thanks Rosa"), "report page shows the feedback");
    assert.ok(page.text.includes("noindex"), "report page is not indexed");
    assert.ok(!/"level"|practice level/i.test(page.text), "report page shows no coding");
    assert.ok((await c.req("GET", "/r/r_" + "0".repeat(32))).text.includes("This report is not available"));
    const profiles = (await c.req("GET", "/api/organiser/profiles", undefined, org.cookie)).json.profiles;
    const p = profiles.find((x) => x.member.name === "Rosa");
    assert.equal(p.member.email, "rosa@example.org");
    assert.equal(p.emailStatus.state, "sent");
    assert.equal(p.reportToken, res.reportToken);
    assert.equal(p.interviewId, r.id);
    // Deleting the result ends the link.
    assert.equal((await c.req("DELETE", "/api/organiser/profiles/" + p.id, undefined, org.cookie)).status, 204);
    assert.ok((await c.req("GET", "/r/" + res.reportToken)).text.includes("This report is not available"));
  });

  test("costs: every Claude call is counted per kind and per interview", async () => {
    const before = (await c.req("GET", "/api/organiser/costs", undefined, owner.cookie)).json;
    const r = await c.quickInterview("Costa", { email: "costa@example.org" });
    assert.equal(r.finish.status, 200);
    const after = (await c.req("GET", "/api/organiser/costs", undefined, owner.cookie)).json;
    assert.equal(after.total.kinds.turn.calls - before.total.kinds.turn.calls, 2);
    assert.equal(after.total.kinds.profile.calls - before.total.kinds.profile.calls, 1);
    assert.equal(Math.round((after.total.usd - before.total.usd) * 1e6), 3 * MICRO_PER_CALL);
    const iv = after.interviews.find((i) => i.id === r.id);
    assert.deepEqual({ name: iv.name, finished: iv.finished, calls: iv.calls, micro: Math.round(iv.usd * 1e6) }, { name: "Costa", finished: true, calls: 3, micro: 3 * MICRO_PER_CALL });
    assert.ok(after.avgPerFinished > 0);
    assert.equal(after.days.length, 30);
    assert.equal(Math.round(after.days.at(-1).usd * 1e6) >= 3 * MICRO_PER_CALL, true);
    assert.equal(after.pricing.prices["claude-opus-5-5"].input, 4);
  });

  test("activity log: sign-ins and organiser changes, newest first, owner only", async () => {
    const entries = (await c.req("GET", "/api/organiser/audit", undefined, owner.cookie)).json.entries;
    const text = entries.map((e) => `${e.name}: ${e.action}${e.detail ? " (" + e.detail + ")" : ""}`);
    assert.ok(text.includes("Suzanne: changed the email setting (none → required)"), text.join("\n"));
    assert.ok(text.includes("Suzanne: signed in"));
    assert.ok(text.includes("Tim: signed in"));
    assert.ok(text.includes("Suzanne: deleted a result (Rosa)"));
    assert.ok(text.some((t) => t.startsWith("Suzanne: opened the organiser view")));
    assert.ok(Date.parse(entries[0].at) >= Date.parse(entries.at(-1).at));
  });
});
