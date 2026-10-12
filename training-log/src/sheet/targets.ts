import type { sheets_v4 } from "googleapis";
import { appendRows, readAllRows, writeRow } from "../google/sheets.js";
import { LOG_HEADERS, TARGETS_HEADERS, TAB } from "./schema.js";
import type { LibraryEntry, LibraryIndex } from "./library.js";
import type { Logger } from "../logger.js";

export interface ProgressionInput {
  load_kg: number;
  scheme: string;
  reps: number[];
  rpe?: number | null;
}

export interface ProgressionResult {
  /** Human-readable next-session target, e.g. "85kg x 4x8". Empty if the
   * scheme couldn't be parsed (see `scheme-unparsed` flag). */
  targetNextText: string;
  targetNextLoadKg: number | null;
  targetNextScheme: string | null;
  flags: string[];
}

/** Parses schemes like "4x8" or "3 x 10" into set/rep counts. Anything else
 * (e.g. "AMRAP", "3x8-10") is left alone rather than guessed at — the
 * session still logs fine, it just doesn't get an auto-computed target. */
export function parseScheme(
  scheme: string,
): { sets: number; reps: number } | null {
  const m = scheme.trim().match(/^(\d+)\s*x\s*(\d+)$/i);
  if (!m) return null;
  return { sets: Number(m[1]), reps: Number(m[2]) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** v1 progression heuristic: simple double progression. Hit every set at or
 * above the scheme's target reps, at an acceptable RPE, and next session's
 * target load goes up by the Library's configured step; otherwise repeat.
 * Intentionally simple — this is not the PT coach-loop (deferred); it just
 * keeps the Targets snapshot from going stale between sessions. */
export function evaluateProgression(
  entry: ProgressionInput,
  lib: LibraryEntry,
  previousBestLoadKg: number | null,
): ProgressionResult {
  const flags: string[] = [];
  const parsed = parseScheme(entry.scheme);

  if (!parsed) {
    flags.push("scheme-unparsed");
    return { targetNextText: "", targetNextLoadKg: null, targetNextScheme: null, flags };
  }

  const { sets, reps: targetReps } = parsed;
  if (entry.reps.length !== sets) flags.push("set-count-differs");

  const hitTarget =
    entry.reps.length >= sets && entry.reps.every((r) => r >= targetReps);
  const rpeOk = entry.rpe == null || entry.rpe <= lib.rpeCeiling;

  let nextLoadKg = entry.load_kg;
  if (hitTarget && rpeOk) {
    nextLoadKg = round(entry.load_kg + lib.progressionStepKg);
    flags.push("progress");
  } else {
    flags.push(hitTarget ? "repeat-rpe-high" : "repeat-missed");
  }

  if (previousBestLoadKg != null && entry.load_kg > previousBestLoadKg && hitTarget) {
    flags.push("PR");
  }

  return {
    targetNextText: `${nextLoadKg}kg x ${sets}x${targetReps}`,
    targetNextLoadKg: nextLoadKg,
    targetNextScheme: entry.scheme,
    flags,
  };
}

export interface TargetsIndex {
  rowsByExercise: Map<string, { rowNumber: number; row: string[] }>;
  nextRow: number;
}

export async function loadTargetsIndex(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<TargetsIndex> {
  const rows = await readAllRows(sheets, spreadsheetId, TAB.TARGETS);
  const exerciseCol = TARGETS_HEADERS.indexOf("Exercise");
  const rowsByExercise: TargetsIndex["rowsByExercise"] = new Map();
  rows.slice(1).forEach((row, i) => {
    const exercise = (row[exerciseCol] ?? "").trim();
    if (!exercise) return;
    rowsByExercise.set(exercise.toLowerCase(), { rowNumber: i + 2, row });
  });
  return { rowsByExercise, nextRow: rows.length + 1 };
}

export function buildTargetsRow(fields: {
  canonicalExercise: string;
  source: string;
  block: string;
  date: string;
  loadKg: number;
  scheme: string;
  reps: number[];
  rpe: number | null | undefined;
  progression: ProgressionResult;
}): string[] {
  const values: Record<(typeof TARGETS_HEADERS)[number], string> = {
    Exercise: fields.canonicalExercise,
    Source: fields.source,
    Block: fields.block,
    "Last Date": fields.date,
    "Last Load (kg)": String(fields.loadKg),
    "Last Scheme": fields.scheme,
    "Last Reps": fields.reps.join("/"),
    "Last RPE": fields.rpe != null ? String(fields.rpe) : "",
    "Target Load (kg)":
      fields.progression.targetNextLoadKg != null
        ? String(fields.progression.targetNextLoadKg)
        : "",
    "Target Scheme": fields.progression.targetNextScheme ?? "",
    Notes: fields.progression.flags.join(", "),
  };
  return TARGETS_HEADERS.map((h) => values[h]);
}

/** Upserts one exercise's row in-place using the in-memory index built by
 * loadTargetsIndex, so repeated calls within a single run stay consistent
 * (and cheap — one Sheets write per exercise, not a full-tab rewrite). */
export async function upsertTargetsRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  index: TargetsIndex,
  canonicalExercise: string,
  values: string[],
): Promise<void> {
  const key = canonicalExercise.toLowerCase();
  const existing = index.rowsByExercise.get(key);
  if (existing) {
    await writeRow(sheets, spreadsheetId, TAB.TARGETS, existing.rowNumber, values);
    existing.row = values;
  } else {
    const rowNumber = index.nextRow;
    await appendRows(sheets, spreadsheetId, TAB.TARGETS, [values]);
    index.rowsByExercise.set(key, { rowNumber, row: values });
    index.nextRow += 1;
  }
}

interface LatestLogEntry {
  canonicalExercise: string;
  date: string;
  source: string;
  block: string;
  loadKg: number;
  scheme: string;
  reps: number[];
  rpe: number | null;
  previousBestLoadKg: number | null;
}

/** Pure: derives, for every exercise, its latest Log entry plus the best
 * (highest) load among all its strictly-earlier entries — everything
 * `recomputeTargetsFromLog` needs to rebuild the Targets tab from nothing
 * but the Log tab, which is the actual source of truth. */
export function latestEntryPerExercise(
  logRows: string[][],
): Map<string, LatestLogEntry> {
  const col = (name: (typeof LOG_HEADERS)[number]) => LOG_HEADERS.indexOf(name);
  const dateCol = col("Date");
  const sourceCol = col("Source");
  const blockCol = col("Block");
  const exerciseCol = col("Exercise");
  const loadCol = col("Load (kg)");
  const schemeCol = col("Scheme");
  const repsCol = col("Reps (per set)");
  const rpeCol = col("RPE");

  interface Raw {
    canonicalExercise: string;
    date: string;
    source: string;
    block: string;
    loadKg: number;
    scheme: string;
    reps: number[];
    rpe: number | null;
    rowIndex: number;
  }

  const byExercise = new Map<string, Raw[]>();
  logRows.slice(1).forEach((row, i) => {
    const exercise = (row[exerciseCol] ?? "").trim();
    if (!exercise) return;
    const key = exercise.toLowerCase();
    const list = byExercise.get(key) ?? [];
    const rpeRaw = row[rpeCol];
    list.push({
      canonicalExercise: exercise,
      date: row[dateCol] ?? "",
      source: row[sourceCol] ?? "",
      block: row[blockCol] ?? "",
      loadKg: Number(row[loadCol]) || 0,
      scheme: row[schemeCol] ?? "",
      reps: (row[repsCol] ?? "")
        .split("/")
        .map((r) => Number(r.trim()))
        .filter((n) => Number.isFinite(n)),
      rpe: rpeRaw ? Number(rpeRaw) : null,
      rowIndex: i,
    });
    byExercise.set(key, list);
  });

  const result = new Map<string, LatestLogEntry>();
  for (const [key, list] of byExercise) {
    // Latest by date, tie-broken by later row (later session same day).
    const sorted = [...list].sort((a, b) =>
      a.date === b.date ? a.rowIndex - b.rowIndex : a.date.localeCompare(b.date),
    );
    const { rowIndex: _rowIndex, ...latest } = sorted[sorted.length - 1];
    const earlier = sorted.slice(0, -1);
    const previousBestLoadKg = earlier.length
      ? Math.max(...earlier.map((e) => e.loadKg))
      : null;
    result.set(key, { ...latest, previousBestLoadKg });
  }
  return result;
}

export interface RecomputeResult {
  updated: number;
  skippedNoLibraryEntry: string[];
}

/** Rebuilds the Targets tab from the entire Log tab — the recovery path
 * when a per-file incremental refresh fails, and a good sanity check after
 * manual edits to the Sheet. Idempotent: safe to run any time. */
export async function recomputeTargetsFromLog(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  library: LibraryIndex,
  logger: Logger,
): Promise<RecomputeResult> {
  const [logRows, index] = await Promise.all([
    readAllRows(sheets, spreadsheetId, TAB.LOG),
    loadTargetsIndex(sheets, spreadsheetId),
  ]);

  const latestByKey = latestEntryPerExercise(logRows);
  const result: RecomputeResult = { updated: 0, skippedNoLibraryEntry: [] };

  for (const [key, entry] of latestByKey) {
    const libMatch = library.byName.get(key);
    if (!libMatch) {
      result.skippedNoLibraryEntry.push(entry.canonicalExercise);
      logger.warn("skipping Targets recompute for exercise no longer in Library", {
        exercise: entry.canonicalExercise,
      });
      continue;
    }
    const progression = evaluateProgression(
      { load_kg: entry.loadKg, scheme: entry.scheme, reps: entry.reps, rpe: entry.rpe },
      libMatch.entry,
      entry.previousBestLoadKg,
    );
    const row = buildTargetsRow({
      canonicalExercise: entry.canonicalExercise,
      source: entry.source,
      block: entry.block,
      date: entry.date,
      loadKg: entry.loadKg,
      scheme: entry.scheme,
      reps: entry.reps,
      rpe: entry.rpe,
      progression,
    });
    await upsertTargetsRow(sheets, spreadsheetId, index, entry.canonicalExercise, row);
    result.updated += 1;
  }

  return result;
}
