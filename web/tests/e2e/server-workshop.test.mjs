// Suzanne's additions (2026-10-15): workshop interest + first thing to learn; privacy paragraph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./run.mjs";

const BASE = { frequency: "weekly", uses: ["writing"], tools: ["ChatGPT"], stance: "pragmatic", offer: ["demos"], pay: "maybe", canShow: "yes" };
let ip = 10;
const post = (url, path, body, headers = {}) => fetch(url + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "7.7.7." + (ip++), ...headers }, body: JSON.stringify(body) });

async function sse(res) { await res.text(); }

test("workshop answers are stored for the organiser; 'no' drops the open box", async () => {
  const s = await startServer({ build: false, env: { ORGANISER_PASSCODE: "test", AIWD_MOCK_LLM: "1" } });
  try {
    const run = async (name, extra) => {
      const st = await post(s.url, "/api/interview/start", { name, role: "coach", answers: { ...BASE, ...extra } });
      assert.equal(st.status, 200, await st.clone().text());
      const { interviewId } = await st.json();
      await sse(await post(s.url, "/api/interview/turn", { interviewId, endNow: true }));
      const fin = await post(s.url, "/api/interview/finish", { interviewId });
      assert.equal(fin.status, 200);
    };
    await run("Wil", { workshop: "yes", workshopFirst: "Hoe ik Claude gebruik om een workshop voor te bereiden" });
    await run("Niet", { workshop: "no", workshopFirst: "should be dropped" });

    const login = await post(s.url, "/api/organiser/login", { passcode: "test" });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const { profiles } = await (await fetch(s.url + "/api/organiser/profiles", { headers: { cookie } })).json();
    const wil = profiles.find((p) => p.member.name === "Wil");
    const niet = profiles.find((p) => p.member.name === "Niet");
    assert.equal(wil.questionnaire.workshop, "yes");
    assert.match(wil.questionnaire.workshopFirst, /workshop voor te bereiden/);
    assert.equal(niet.questionnaire.workshop, "no");
    assert.equal(niet.questionnaire.workshopFirst, undefined);

    // unknown workshop option is rejected
    const bad = await post(s.url, "/api/interview/start", { name: "X", role: "coach", answers: { ...BASE, workshop: "definitely" } });
    assert.equal(bad.status, 400);
  } finally { await s.stop(); }
});
