/* seed-check.js — verifies src/seed.js against engine.js (run: node tests/seed-check.js) */
const fs = require("fs"); const path = require("path");
const src = (f) => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8");
globalThis.window = {};
eval(src("prompts.js")); eval(src("engine.js")); eval(src("seed.js"));
const { Prompts: P, Engine: E, SEED } = window;
const keys = new Set(P.DOMAINS.map((d) => d.key));
const errs = []; const ids = new Set();
const byLevel = [0,0,0,0,0], byStance = {}, byDiv = {};
for (const p of SEED) {
  const n = p.member.name;
  if (ids.has(p.id)) errs.push(`${n}: duplicate id ${p.id}`); ids.add(p.id);
  if (p.source !== "seed") errs.push(`${n}: source`);
  if (!Array.isArray(p.transcript)) errs.push(`${n}: transcript missing`);
  const lvl = p.practice.level;
  if (!(lvl >= 0 && lvl <= 4)) errs.push(`${n}: bad level`);
  if (P.LADDER[lvl].label !== p.practice.levelLabel) errs.push(`${n}: levelLabel ${p.practice.levelLabel} != ${P.LADDER[lvl].label}`);
  if (!P.STANCES.includes(p.practice.stance)) errs.push(`${n}: bad stance ${p.practice.stance}`);
  for (const d of p.practice.domains) { if (!keys.has(d.key)) errs.push(`${n}: bad domain ${d.key}`); if (!d.evidence) errs.push(`${n}: empty evidence ${d.key}`); }
  if (lvl === 0 && p.practice.tools.length) errs.push(`${n}: level 0 with tools`);
  const items = p.confidence.items, ratings = {};
  if (items.length < 3 || items.length > 5) errs.push(`${n}: ${items.length} items`);
  const iid = new Set();
  for (const it of items) {
    if (iid.has(it.id)) errs.push(`${n}: dup item id`); iid.add(it.id);
    if (!(it.level >= 1 && it.level <= 4)) errs.push(`${n}: item level ${it.level}`);
    if (it.rating !== undefined) { if (!(it.rating >= 0 && it.rating <= 100 && it.rating % 5 === 0)) errs.push(`${n}: rating ${it.rating}`); ratings[it.id] = it.rating; }
  }
  const mean = E.meanRating(items, ratings), band = E.band(mean), div = E.divergence(lvl, mean);
  if (mean !== p.confidence.mean) errs.push(`${n}: mean ${p.confidence.mean} should be ${mean}`);
  if (band !== p.confidence.band) errs.push(`${n}: band ${p.confidence.band} should be ${band}`);
  if (div.kind !== p.divergence.kind) errs.push(`${n}: divergence ${p.divergence.kind} should be ${div.kind}`);
  if (div.note !== p.divergence.note) errs.push(`${n}: divergence note differs`);
  if (p.wants.length > 3 || p.offers.length > 2) errs.push(`${n}: too many wants/offers`);
  if (p.feedback.strengths.length < 1 || p.feedback.strengths.length > 2 || p.feedback.nextSteps.length < 1 || p.feedback.nextSteps.length > 2) errs.push(`${n}: feedback counts`);
  if (p.quotes.length < 2 || p.quotes.length > 4) errs.push(`${n}: quotes count`);
  const t = Date.parse(p.createdAt); if (!(t >= Date.parse("2026-09-01") && t <= Date.parse("2026-10-12T23:59:59Z"))) errs.push(`${n}: createdAt`);
  byLevel[lvl]++; byStance[p.practice.stance] = (byStance[p.practice.stance]||0)+1; byDiv[div.kind] = (byDiv[div.kind]||0)+1;
  console.log(`${p.id} ${n.padEnd(8)} L${lvl} ${p.practice.stance.padEnd(10)} mean=${String(mean).padStart(3)} ${band.padEnd(8)} ${div.kind}${p.endedEarly ? "  (ended early)" : ""}`);
}
console.log("n =", SEED.length, "byLevel", byLevel, "byStance", byStance, "byDivergence", byDiv);
const st = E.stats(SEED); console.log("stats.gaps", st.gaps, "strongByDomain", st.strongByDomain, "byDomain", st.byDomain);
for (const h of E.helpMap(SEED)) console.log(`help ${h.domain.padEnd(8)} helpers=[${h.helpers.map(p=>p.member.name)}] seekers=[${h.seekers.map(p=>p.member.name)}]`);
if (/—/.test(src("seed.js"))) errs.push("em-dash present in seed.js");
console.log("size", fs.statSync(path.join(__dirname, "..", "src", "seed.js")).size, "bytes");
if (errs.length) { console.log("ERRORS:\n" + errs.join("\n")); process.exit(1); } else console.log("OK: all checks pass");
