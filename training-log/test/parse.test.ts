import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSessionFile } from "../src/ingest/parse.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name: string) => readFile(path.join(fixturesDir, name), "utf-8");

test("parses a valid session file", async () => {
  const raw = await read("valid-session.json");
  const result = parseSessionFile(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.exercises.length, 3);
    assert.equal(result.value.date, "2026-07-06");
  }
});

test("rejects a session missing a required field", async () => {
  const raw = await read("invalid-missing-field.json");
  const result = parseSessionFile(raw);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /scheme/);
  }
});

test("rejects malformed JSON without throwing", () => {
  const result = parseSessionFile("{ not: json");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /not valid JSON/);
  }
});

test("rejects an unknown schema_version", () => {
  const result = parseSessionFile(JSON.stringify({ schema_version: 2 }));
  assert.equal(result.ok, false);
});
