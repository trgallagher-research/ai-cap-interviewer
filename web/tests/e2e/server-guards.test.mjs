// Guards added after the pre-deploy security review (docs/security-review.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./run.mjs";

const ANSWERS = { frequency: "weekly", uses: ["writing"], tools: ["ChatGPT"], stance: "pragmatic", offer: ["demos"], pay: "maybe", canShow: "yes" };
const post = (url, path, body, headers = {}) => fetch(url + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("on Vercel without Redis the API refuses instead of running uncapped", async () => {
  const s = await startServer({ build: false, env: { VERCEL: "1", ORGANISER_PASSCODE: "test", AIWD_MOCK_LLM: "1" } });
  try {
    const r = await post(s.url, "/api/interview/start", { name: "A", role: "coach", answers: ANSWERS }, { "x-forwarded-for": "9.9.9.1" });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "not_configured");
  } finally { await s.stop(); }
});

test("production deployment without an access code refuses starts unless opened deliberately", async () => {
  const s = await startServer({ build: false, env: { VERCEL_ENV: "production", ORGANISER_PASSCODE: "test", AIWD_MOCK_LLM: "1" } });
  try {
    const r = await post(s.url, "/api/interview/start", { name: "A", role: "coach", answers: ANSWERS }, { "x-forwarded-for": "9.9.9.2" });
    assert.equal(r.status, 503);
  } finally { await s.stop(); }
});

test("finish attempts are capped, login failures are limited, imports are sanitised", async () => {
  const s = await startServer({ build: false, env: { ORGANISER_PASSCODE: "test", AIWD_MOCK_LLM: "1" } });
  try {
    // login: 10 failures then 429 even for the right passcode
    for (let i = 0; i < 10; i++) assert.equal((await post(s.url, "/api/organiser/login", { passcode: "nope" }, { "x-forwarded-for": "9.9.9.3" })).status, 401);
    assert.equal((await post(s.url, "/api/organiser/login", { passcode: "test" }, { "x-forwarded-for": "9.9.9.3" })).status, 429);
    const ok = await post(s.url, "/api/organiser/login", { passcode: "test" }, { "x-forwarded-for": "9.9.9.4" });
    assert.equal(ok.status, 204);
    const cookie = ok.headers.get("set-cookie").split(";")[0];

    // import: hostile shapes are coerced so the organiser page cannot break
    const bad = { id: "p_evil", member: { name: { x: 1 }, role: ["<img src=x onerror=alert(1)>"] }, practice: { level: "9", domains: "nope" }, createdAt: "2026-10-01T00:00:00Z" };
    const imp = await post(s.url, "/api/organiser/import", { text: JSON.stringify(bad) }, { cookie });
    assert.deepEqual(await imp.json(), { imported: 1, skipped: 0 });
    const list = await (await fetch(s.url + "/api/organiser/profiles", { headers: { cookie } })).json();
    const p = list.profiles.find((x) => x.id === "p_evil");
    assert.equal(typeof p.member.name, "string");
    assert.equal(typeof p.member.role, "string");
    assert.equal(p.practice.level, 4);
    assert.deepEqual(p.practice.domains, []);

    // finish: a profile that keeps failing (badjson twice) stops after 3 attempts
    const st = await post(s.url, "/api/interview/start", { name: "badjson badjson", role: "coach", answers: ANSWERS }, { "x-forwarded-for": "9.9.9.5" });
    const { interviewId } = await st.json();
    const end = await post(s.url, "/api/interview/turn", { interviewId, endNow: true });
    await end.text();
    const codes = [];
    for (let i = 0; i < 5; i++) { const r = await post(s.url, "/api/interview/finish", { interviewId }); codes.push(r.status); await r.text(); if (r.status === 200) break; }
    assert.ok(codes.filter((c) => c !== 200).length <= 4, "codes " + codes.join(","));
    assert.ok(codes.includes(200) || codes[codes.length - 1] === 429, "finish ends with success or the cap: " + codes.join(","));
  } finally { await s.stop(); }
});
