import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSessionFile } from "../src/ingest/parse.js";
import { reconcileSession } from "../src/ingest/reconcile.js";
import { loadLibraryIndex } from "../src/sheet/library.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name: string) => readFile(path.join(fixturesDir, name), "utf-8");

async function library() {
  const raw = await read("library.sample.json");
  return loadLibraryIndex(JSON.parse(raw));
}

test("resolves canonical names and Dutch aliases", async () => {
  const raw = await read("valid-session.json");
  const parsed = parseSessionFile(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const reconciled = reconcileSession(parsed.value, await library());
  assert.equal(reconciled.ok, true);
  if (!reconciled.ok) return;

  assert.equal(reconciled.value.exercises[0].canonicalExercise, "Bench Press");
  assert.equal(reconciled.value.exercises[0].matchedVia, "canonical");
  // "Bankdrukken" is the Dutch alias for Bench Press in the fixture.
  assert.equal(reconciled.value.exercises[1].canonicalExercise, "Bench Press");
  assert.equal(reconciled.value.exercises[1].matchedVia, "alias");
});

test("rejects a session with an exercise name not in the Library", async () => {
  const raw = await read("invalid-unknown-exercise.json");
  const parsed = parseSessionFile(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const reconciled = reconcileSession(parsed.value, await library());
  assert.equal(reconciled.ok, false);
  if (!reconciled.ok) {
    assert.match(reconciled.error, /Cuban Press/);
  }
});

test("match is case-insensitive", async () => {
  const raw = await read("valid-session.json");
  const parsed = parseSessionFile(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  parsed.value.exercises[0].exercise = "bench press";
  const reconciled = reconcileSession(parsed.value, await library());
  assert.equal(reconciled.ok, true);
});
