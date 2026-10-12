import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSessionFile } from "../src/ingest/parse.js";
import { reconcileSession } from "../src/ingest/reconcile.js";
import { buildSessionWrites } from "../src/ingest/process.js";
import { loadLibraryIndex } from "../src/sheet/library.js";
import { LOG_HEADERS } from "../src/sheet/schema.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

test("buildSessionWrites produces one Log row per exercise with session_notes on the first row only", async () => {
  const [sessionRaw, libraryRaw] = await Promise.all([
    readFile(path.join(fixturesDir, "valid-session.json"), "utf-8"),
    readFile(path.join(fixturesDir, "library.sample.json"), "utf-8"),
  ]);
  const library = loadLibraryIndex(JSON.parse(libraryRaw));
  const parsed = parseSessionFile(sessionRaw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const reconciled = reconcileSession(parsed.value, library);
  assert.equal(reconciled.ok, true);
  if (!reconciled.ok) return;

  const { logRows, targetsUpdates } = buildSessionWrites(reconciled.value, library, new Map());

  assert.equal(logRows.length, 3);
  assert.equal(targetsUpdates.length, 3);

  const notesCol = LOG_HEADERS.indexOf("Notes");
  assert.match(logRows[0][notesCol], /^Session: /);
  assert.doesNotMatch(logRows[2][notesCol], /^Session: /);

  const orderCol = LOG_HEADERS.indexOf("Order");
  assert.deepEqual(logRows.map((r) => r[orderCol]), ["1", "2", "3"]);
});
