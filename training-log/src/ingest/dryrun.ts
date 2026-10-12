import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, loadConfig } from "../config.js";
import { createGoogleClients } from "../google/auth.js";
import { readAllRows } from "../google/sheets.js";
import { TAB, LOG_HEADERS, TARGETS_HEADERS } from "../sheet/schema.js";
import { loadLibraryIndex, type LibraryIndex } from "../sheet/library.js";
import { loadTargetsIndex } from "../sheet/targets.js";
import { parseSessionFile } from "./parse.js";
import { reconcileSession } from "./reconcile.js";
import { buildSessionWrites } from "./process.js";
import type { Logger } from "../logger.js";

const trainingLogDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SAMPLE_LIBRARY_PATH = path.join(trainingLogDir, "test/fixtures/library.sample.json");

async function loadSampleLibrary(): Promise<LibraryIndex> {
  const raw = await readFile(SAMPLE_LIBRARY_PATH, "utf-8");
  return loadLibraryIndex(JSON.parse(raw) as string[][]);
}

interface OnlineContext {
  library: LibraryIndex;
  previousBestLoadKgByExercise: Map<string, number | null>;
  source: "sheet" | "sample-fixture";
}

async function loadContext(logger: Logger, forceOffline: boolean): Promise<OnlineContext> {
  if (!forceOffline) {
    try {
      const config = loadConfig();
      const clients = createGoogleClients(config);
      const [libraryRows, targetsIndex] = await Promise.all([
        readAllRows(clients.sheets, config.sheetId, TAB.LIBRARY),
        loadTargetsIndex(clients.sheets, config.sheetId),
      ]);
      const library = loadLibraryIndex(libraryRows);
      const lastLoadCol = TARGETS_HEADERS.indexOf("Last Load (kg)");
      const previousBestLoadKgByExercise = new Map<string, number | null>();
      for (const [key, { row }] of targetsIndex.rowsByExercise) {
        const n = Number(row[lastLoadCol]);
        previousBestLoadKgByExercise.set(key, Number.isFinite(n) ? n : null);
      }
      logger.info("dry-run: using live Library + Targets from the configured Sheet", {});
      return { library, previousBestLoadKgByExercise, source: "sheet" };
    } catch (e) {
      if (!(e instanceof ConfigError)) {
        logger.warn("dry-run: could not reach the configured Sheet, falling back to the sample Library", {
          error: (e as Error).message,
        });
      } else {
        logger.info("dry-run: no Google config found — using the bundled sample Library (fully offline)", {});
      }
    }
  }
  return {
    library: await loadSampleLibrary(),
    previousBestLoadKgByExercise: new Map(),
    source: "sample-fixture",
  };
}

export async function dryRunFile(
  filePath: string,
  logger: Logger,
  opts: { offline?: boolean } = {},
): Promise<{ ok: boolean; report: string }> {
  const raw = await readFile(filePath, "utf-8");
  const ctx = await loadContext(logger, Boolean(opts.offline));

  const parsed = parseSessionFile(raw);
  if (!parsed.ok) {
    return { ok: false, report: `PARSE FAILED — would be quarantined:\n  ${parsed.error}` };
  }

  const reconciled = reconcileSession(parsed.value, ctx.library);
  if (!reconciled.ok) {
    return { ok: false, report: `RECONCILE FAILED — would be quarantined:\n  ${reconciled.error}` };
  }

  const { logRows, targetsUpdates } = buildSessionWrites(
    reconciled.value,
    ctx.library,
    ctx.previousBestLoadKgByExercise,
  );

  const lines: string[] = [];
  lines.push(`Library source: ${ctx.source === "sheet" ? "live Sheet" : "bundled sample fixture (offline)"}`);
  lines.push("");
  lines.push(`Would append ${logRows.length} row(s) to Log:`);
  for (const row of logRows) {
    lines.push("  " + LOG_HEADERS.map((h, i) => `${h}=${JSON.stringify(row[i])}`).join(" "));
  }
  lines.push("");
  lines.push(`Would upsert ${targetsUpdates.length} row(s) in Targets:`);
  for (const update of targetsUpdates) {
    lines.push(
      `  ${update.canonicalExercise}: ${TARGETS_HEADERS.map((h, i) => `${h}=${JSON.stringify(update.row[i])}`).join(" ")}`,
    );
  }
  lines.push("");
  lines.push("No writes were made (dry run).");

  return { ok: true, report: lines.join("\n") };
}
