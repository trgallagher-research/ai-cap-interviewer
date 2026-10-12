import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const trainingLogDir = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ConfigError(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in ` +
        `(see scripts/bootstrap-gcp.sh for the guided setup).`,
    );
  }
  return value;
}

export class ConfigError extends Error {}

export interface Config {
  googleApplicationCredentials: string;
  sheetId: string;
  inboxFolderId: string;
  archiveFolderName: string;
  quarantineFolderName: string;
  duplicatesFolderName: string;
  ledgerPath: string;
  pollIntervalSeconds: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): Config {
  const logLevel = (process.env.LOG_LEVEL ?? "info") as Config["logLevel"];
  return {
    googleApplicationCredentials: path.resolve(
      trainingLogDir,
      required("GOOGLE_APPLICATION_CREDENTIALS"),
    ),
    sheetId: required("SHEET_ID"),
    inboxFolderId: required("INBOX_FOLDER_ID"),
    archiveFolderName: process.env.ARCHIVE_FOLDER_NAME ?? "_archive",
    quarantineFolderName: process.env.QUARANTINE_FOLDER_NAME ?? "_quarantine",
    duplicatesFolderName: process.env.DUPLICATES_FOLDER_NAME ?? "_duplicates",
    ledgerPath: path.resolve(
      trainingLogDir,
      process.env.LEDGER_PATH ?? "./data/ledger.json",
    ),
    pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? "90"),
    logLevel: ["debug", "info", "warn", "error"].includes(logLevel)
      ? logLevel
      : "info",
  };
}
