import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface LedgerEntry {
  fileId: string;
  fileName: string;
  status: "done" | "quarantined";
  processedAt: string;
  reason?: string;
  exercises?: string[];
  targetsRefreshed?: boolean;
}

export interface Ledger {
  version: 1;
  entries: Record<string /* sha256 hex */, LedgerEntry>;
}

export function hashContent(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export async function loadLedger(ledgerPath: string): Promise<Ledger> {
  try {
    const raw = await readFile(ledgerPath, "utf-8");
    const parsed = JSON.parse(raw) as Ledger;
    if (parsed.version !== 1 || typeof parsed.entries !== "object") {
      throw new Error("unrecognized ledger format");
    }
    return parsed;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, entries: {} };
    }
    throw e;
  }
}

/** Atomic write (tmp file + rename) so a crash mid-write never leaves a
 * corrupt ledger — the file that exists is always either the old or the
 * new complete version, never a partial one. */
export async function saveLedger(
  ledgerPath: string,
  ledger: Ledger,
): Promise<void> {
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  const tmpPath = `${ledgerPath}.tmp-${process.pid}`;
  await writeFile(tmpPath, JSON.stringify(ledger, null, 2), "utf-8");
  await rename(tmpPath, ledgerPath);
}
