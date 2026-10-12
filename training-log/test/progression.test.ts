import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateProgression, parseScheme, latestEntryPerExercise } from "../src/sheet/targets.js";
import { LOG_HEADERS } from "../src/sheet/schema.js";
import type { LibraryEntry } from "../src/sheet/library.js";

const lib: LibraryEntry = { canonicalExercise: "Bench Press", progressionStepKg: 2.5, rpeCeiling: 8.5 };

test("parseScheme handles common formats and rejects the rest", () => {
  assert.deepEqual(parseScheme("4x8"), { sets: 4, reps: 8 });
  assert.deepEqual(parseScheme("3 x 10"), { sets: 3, reps: 10 });
  assert.equal(parseScheme("AMRAP"), null);
  assert.equal(parseScheme("3x8-10"), null);
});

test("progresses load when every set hits the target reps at an OK RPE", () => {
  const result = evaluateProgression({ load_kg: 80, scheme: "4x8", reps: [8, 8, 8, 8], rpe: 8 }, lib, null);
  assert.equal(result.targetNextLoadKg, 82.5);
  assert.ok(result.flags.includes("progress"));
});

test("repeats load when a set misses the target reps", () => {
  const result = evaluateProgression({ load_kg: 80, scheme: "4x8", reps: [8, 8, 7, 6], rpe: 7 }, lib, null);
  assert.equal(result.targetNextLoadKg, 80);
  assert.ok(result.flags.includes("repeat-missed"));
});

test("repeats load when reps are hit but RPE is over the ceiling", () => {
  const result = evaluateProgression({ load_kg: 80, scheme: "4x8", reps: [8, 8, 8, 8], rpe: 9.5 }, lib, null);
  assert.equal(result.targetNextLoadKg, 80);
  assert.ok(result.flags.includes("repeat-rpe-high"));
});

test("flags a PR when load exceeds the previous best and target is hit", () => {
  const result = evaluateProgression({ load_kg: 82.5, scheme: "4x8", reps: [8, 8, 8, 8], rpe: 8 }, lib, 80);
  assert.ok(result.flags.includes("PR"));
});

test("does not compute a target for an unparseable scheme", () => {
  const result = evaluateProgression({ load_kg: 80, scheme: "AMRAP", reps: [12], rpe: 8 }, lib, null);
  assert.equal(result.targetNextText, "");
  assert.ok(result.flags.includes("scheme-unparsed"));
});

test("latestEntryPerExercise picks the most recent date and the best earlier load", () => {
  const rows: string[][] = [
    [...LOG_HEADERS],
    ["2026-06-01", "HYP", "Block 1", "Push A", "1", "Bench Press", "77.5", "4x8", "8/8/8/8", "8", "", "", ""],
    ["2026-06-08", "HYP", "Block 1", "Push A", "1", "Bench Press", "80", "4x8", "8/8/8/8", "8", "", "", ""],
    ["2026-06-15", "HYP", "Block 1", "Push A", "1", "Bench Press", "80", "4x8", "8/8/7/6", "9", "", "", ""],
  ];
  const latest = latestEntryPerExercise(rows);
  const entry = latest.get("bench press");
  assert.ok(entry);
  assert.equal(entry!.date, "2026-06-15");
  assert.equal(entry!.loadKg, 80);
  assert.equal(entry!.previousBestLoadKg, 80);
});
