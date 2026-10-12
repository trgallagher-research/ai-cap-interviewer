import type { drive_v3, sheets_v4 } from "googleapis";
import { appendRows, readAllRows } from "../google/sheets.js";
import {
  downloadFileText,
  ensureManagedFolders,
  isGoogleNativeFile,
  listInboxFiles,
  moveFile,
  setFileDescription,
  type InboxFile,
  type ManagedFolders,
} from "../google/drive.js";
import { TARGETS_HEADERS, TAB } from "../sheet/schema.js";
import { loadLibraryIndex, type LibraryIndex } from "../sheet/library.js";
import { loadTargetsIndex, upsertTargetsRow, type TargetsIndex } from "../sheet/targets.js";
import { parseSessionFile } from "./parse.js";
import { reconcileSession } from "./reconcile.js";
import { buildSessionWrites } from "./process.js";
import { hashContent, loadLedger, saveLedger, type Ledger } from "./ledger.js";
import type { Config } from "../config.js";
import type { Logger } from "../logger.js";

export interface RunSummary {
  filesSeen: number;
  appended: number;
  quarantined: number;
  duplicates: number;
  orphansRecovered: number;
  targetsRefreshFailures: number;
  errors: number;
}

function emptySummary(): RunSummary {
  return {
    filesSeen: 0,
    appended: 0,
    quarantined: 0,
    duplicates: 0,
    orphansRecovered: 0,
    targetsRefreshFailures: 0,
    errors: 0,
  };
}

interface Ctx {
  clients: { sheets: sheets_v4.Sheets; drive: drive_v3.Drive };
  config: Config;
  logger: Logger;
  folders: ManagedFolders;
  library: LibraryIndex;
  targetsIndex: TargetsIndex;
  ledger: Ledger;
  summary: RunSummary;
}

export async function runIngestPipeline(
  clients: { sheets: sheets_v4.Sheets; drive: drive_v3.Drive },
  config: Config,
  logger: Logger,
): Promise<RunSummary> {
  const summary = emptySummary();

  const folders = await ensureManagedFolders(clients.drive, config.inboxFolderId, {
    archive: config.archiveFolderName,
    quarantine: config.quarantineFolderName,
    duplicates: config.duplicatesFolderName,
  });

  const [libraryRows, targetsIndex, ledger] = await Promise.all([
    readAllRows(clients.sheets, config.sheetId, TAB.LIBRARY),
    loadTargetsIndex(clients.sheets, config.sheetId),
    loadLedger(config.ledgerPath),
  ]);
  const library = loadLibraryIndex(libraryRows);
  if (library.entries.length === 0) {
    logger.warn("Library tab has no exercises defined — every session will be quarantined", {});
  }

  const files = await listInboxFiles(clients.drive, config.inboxFolderId);
  summary.filesSeen = files.length;
  logger.info("inbox scan complete", { count: files.length });

  const ctx: Ctx = { clients, config, logger, folders, library, targetsIndex, ledger, summary };

  for (const file of files) {
    try {
      await processFile(file, ctx);
    } catch (e) {
      summary.errors += 1;
      logger.error("unexpected error processing file — left in inbox, will retry next run", {
        fileId: file.id,
        fileName: file.name,
        error: (e as Error).message,
      });
    }
  }

  logger.info("run complete", { ...summary });
  return summary;
}

async function quarantineFile(file: InboxFile, reason: string, ctx: Ctx): Promise<void> {
  ctx.logger.warn("quarantining file", { fileId: file.id, fileName: file.name, reason });
  try {
    await setFileDescription(ctx.clients.drive, file.id, `Quarantined by training-log-ingest: ${reason}`);
    await moveFile(ctx.clients.drive, file.id, ctx.config.inboxFolderId, ctx.folders.quarantineId);
  } catch (e) {
    ctx.logger.error("failed to move file into quarantine — it will be retried next run", {
      fileId: file.id,
      error: (e as Error).message,
    });
  }
  ctx.summary.quarantined += 1;
}

function previousBestLoadMap(targetsIndex: TargetsIndex): Map<string, number | null> {
  const lastLoadCol = TARGETS_HEADERS.indexOf("Last Load (kg)");
  const map = new Map<string, number | null>();
  for (const [key, { row }] of targetsIndex.rowsByExercise) {
    const n = Number(row[lastLoadCol]);
    map.set(key, Number.isFinite(n) ? n : null);
  }
  return map;
}

async function processFile(file: InboxFile, ctx: Ctx): Promise<void> {
  const { clients, config, logger, ledger, summary } = ctx;

  if (isGoogleNativeFile(file.mimeType) || !file.name.toLowerCase().endsWith(".json")) {
    await quarantineFile(
      file,
      `unsupported file type (mimeType=${file.mimeType}, name=${file.name}) — expected a .json session file`,
      ctx,
    );
    return;
  }

  const content = await downloadFileText(clients.drive, file.id);
  const hash = hashContent(content);
  const existing = ledger.entries[hash];

  if (existing?.status === "done") {
    if (existing.fileId === file.id) {
      // Same file, already logged — the archive move must have failed last
      // time. Retry it; no Sheet writes happen here.
      await moveFile(clients.drive, file.id, config.inboxFolderId, ctx.folders.archiveId);
      summary.orphansRecovered += 1;
      logger.info("recovered orphaned already-processed file into archive", {
        fileId: file.id,
        fileName: file.name,
      });
    } else {
      await moveFile(clients.drive, file.id, config.inboxFolderId, ctx.folders.duplicatesId);
      summary.duplicates += 1;
      logger.warn("duplicate session content — moved to duplicates without re-appending", {
        fileId: file.id,
        fileName: file.name,
        originalFileId: existing.fileId,
      });
    }
    return;
  }

  const parsed = parseSessionFile(content);
  if (!parsed.ok) {
    await quarantineFile(file, parsed.error, ctx);
    return;
  }

  const reconciled = reconcileSession(parsed.value, ctx.library);
  if (!reconciled.ok) {
    await quarantineFile(file, reconciled.error, ctx);
    return;
  }

  const previousBest = previousBestLoadMap(ctx.targetsIndex);
  const { logRows, targetsUpdates } = buildSessionWrites(reconciled.value, ctx.library, previousBest);

  await appendRows(clients.sheets, config.sheetId, TAB.LOG, logRows);

  // Durability boundary: once the Log rows are appended, this file must
  // never be appended again. Persist that fact before doing anything else.
  ledger.entries[hash] = {
    fileId: file.id,
    fileName: file.name,
    status: "done",
    processedAt: new Date().toISOString(),
    exercises: targetsUpdates.map((t) => t.canonicalExercise),
    targetsRefreshed: false,
  };
  await saveLedger(config.ledgerPath, ledger);
  summary.appended += 1;
  logger.info("appended session to Log", {
    fileId: file.id,
    fileName: file.name,
    rows: logRows.length,
  });

  try {
    for (const update of targetsUpdates) {
      await upsertTargetsRow(
        clients.sheets,
        config.sheetId,
        ctx.targetsIndex,
        update.canonicalExercise,
        update.row,
      );
    }
    ledger.entries[hash].targetsRefreshed = true;
    await saveLedger(config.ledgerPath, ledger);
  } catch (e) {
    summary.targetsRefreshFailures += 1;
    logger.error("Targets refresh failed after a successful Log append — run `recompute-targets` to fix", {
      fileId: file.id,
      fileName: file.name,
      error: (e as Error).message,
    });
  }

  try {
    await moveFile(clients.drive, file.id, config.inboxFolderId, ctx.folders.archiveId);
  } catch (e) {
    logger.error("archive move failed — file stays in inbox and will be recovered next run", {
      fileId: file.id,
      error: (e as Error).message,
    });
  }
}
