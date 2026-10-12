#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { createGoogleClients } from "./google/auth.js";
import { listInboxFiles } from "./google/drive.js";
import { readAllRows } from "./google/sheets.js";
import { TAB } from "./sheet/schema.js";
import { initSheet } from "./sheet/init.js";
import { loadLibraryIndex } from "./sheet/library.js";
import { recomputeTargetsFromLog } from "./sheet/targets.js";
import { runIngestPipeline } from "./ingest/pipeline.js";
import { dryRunFile } from "./ingest/dryrun.js";
import { parseSessionFile } from "./ingest/parse.js";
import { createLogger } from "./logger.js";

function parseFlags(argv: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function cmdRun() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const clients = createGoogleClients(config);
  const summary = await runIngestPipeline(clients, config, logger);
  if (summary.errors > 0) process.exitCode = 1;
}

async function cmdWatch() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const clients = createGoogleClients(config);

  let stopping = false;
  const stop = () => {
    stopping = true;
    logger.info("received stop signal, finishing current pass then exiting", {});
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  logger.info("watch mode started", { pollIntervalSeconds: config.pollIntervalSeconds });
  while (!stopping) {
    try {
      await runIngestPipeline(clients, config, logger);
    } catch (e) {
      logger.error("run failed — will retry next interval", { error: (e as Error).message });
    }
    if (stopping) break;
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalSeconds * 1000));
  }
}

async function cmdDryRun(flags: Record<string, string | boolean>) {
  const filePath = flags.file;
  if (typeof filePath !== "string") {
    console.error("usage: dry-run --file <path/to/session.json> [--offline]");
    process.exitCode = 1;
    return;
  }
  const logger = createLogger("info");
  const result = await dryRunFile(filePath, logger, { offline: Boolean(flags.offline) });
  console.log("\n" + result.report + "\n");
  if (!result.ok) process.exitCode = 1;
}

async function cmdValidate(flags: Record<string, string | boolean>) {
  const filePath = flags.file;
  if (typeof filePath !== "string") {
    console.error("usage: validate --file <path/to/session.json>");
    process.exitCode = 1;
    return;
  }
  const raw = await readFile(filePath, "utf-8");
  const result = parseSessionFile(raw);
  if (result.ok) {
    console.log(`OK — schema valid. ${result.value.exercises.length} exercise(s), date=${result.value.date}.`);
  } else {
    console.error(`INVALID — ${result.error}`);
    process.exitCode = 1;
  }
}

async function cmdInitSheet() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const clients = createGoogleClients(config);
  const report = await initSheet(clients.sheets, config.sheetId, logger);
  console.log(JSON.stringify(report, null, 2));
  if (report.mismatched.length > 0) {
    console.error(
      "\nSome tabs have a header row that doesn't match the expected schema — fix these by hand, " +
        "the tool won't overwrite them automatically.",
    );
    process.exitCode = 1;
  }
}

async function cmdRecomputeTargets() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const clients = createGoogleClients(config);
  const libraryRows = await readAllRows(clients.sheets, config.sheetId, TAB.LIBRARY);
  const library = loadLibraryIndex(libraryRows);
  const result = await recomputeTargetsFromLog(clients.sheets, config.sheetId, library, logger);
  console.log(JSON.stringify(result, null, 2));
}

async function cmdVerifyAccess() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const clients = createGoogleClients(config);

  console.log(`Service account key: ${config.googleApplicationCredentials}`);

  try {
    const meta = await clients.sheets.spreadsheets.get({
      spreadsheetId: config.sheetId,
      fields: "properties(title), sheets(properties(title))",
    });
    const tabs = (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean);
    console.log(`Sheet OK: "${meta.data.properties?.title}" — tabs: ${tabs.join(", ")}`);
  } catch (e) {
    console.error(`Sheet FAILED: ${(e as Error).message}`);
    console.error(`Make sure SHEET_ID is correct and the Sheet is shared with the service account as Editor.`);
    process.exitCode = 1;
  }

  try {
    const files = await listInboxFiles(clients.drive, config.inboxFolderId);
    console.log(`Inbox folder OK: ${files.length} file(s) currently present.`);
  } catch (e) {
    console.error(`Inbox folder FAILED: ${(e as Error).message}`);
    console.error(`Make sure INBOX_FOLDER_ID is correct and the folder is shared with the service account as Editor.`);
    process.exitCode = 1;
  }

  if (process.exitCode !== 1) {
    console.log(`\nAll good — service account: see scripts/bootstrap-gcp.sh output, or:`);
    console.log(`  ${JSON.parse(await readFile(config.googleApplicationCredentials, "utf-8")).client_email}`);
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const { flags } = parseFlags(rest);

  switch (command) {
    case "run":
      return cmdRun();
    case "watch":
      return cmdWatch();
    case "dry-run":
      return cmdDryRun(flags);
    case "validate":
      return cmdValidate(flags);
    case "init-sheet":
      return cmdInitSheet();
    case "recompute-targets":
      return cmdRecomputeTargets();
    case "verify-access":
      return cmdVerifyAccess();
    default:
      console.error(
        [
          "Usage: tsx src/cli.ts <command> [flags]",
          "",
          "Commands:",
          "  run                          one pass over the inbox",
          "  watch                        loop `run` every POLL_INTERVAL_SECONDS",
          "  dry-run --file <path>        preview what a local session file would write (no network needed if --offline)",
          "  validate --file <path>       schema-check a local session file only, fully offline",
          "  init-sheet                   create/validate Log, Targets, Library tabs + headers",
          "  recompute-targets            rebuild the Targets tab from the entire Log tab",
          "  verify-access                confirm the service account can reach the Sheet + inbox folder",
        ].join("\n"),
      );
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exitCode = 1;
});
