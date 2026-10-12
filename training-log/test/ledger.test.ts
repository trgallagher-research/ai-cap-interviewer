import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { hashContent, loadLedger, saveLedger } from "../src/ingest/ledger.js";

test("hashContent is deterministic and content-sensitive", () => {
  assert.equal(hashContent("abc"), hashContent("abc"));
  assert.notEqual(hashContent("abc"), hashContent("abd"));
});

test("loadLedger returns an empty ledger when the file doesn't exist yet", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "training-log-ledger-"));
  try {
    const ledger = await loadLedger(path.join(dir, "ledger.json"));
    assert.deepEqual(ledger, { version: 1, entries: {} });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("saveLedger + loadLedger round-trips", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "training-log-ledger-"));
  try {
    const ledgerPath = path.join(dir, "nested", "ledger.json");
    const written = {
      version: 1 as const,
      entries: {
        deadbeef: {
          fileId: "f1",
          fileName: "session.json",
          status: "done" as const,
          processedAt: new Date().toISOString(),
        },
      },
    };
    await saveLedger(ledgerPath, written);
    const loaded = await loadLedger(ledgerPath);
    assert.deepEqual(loaded, written);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
