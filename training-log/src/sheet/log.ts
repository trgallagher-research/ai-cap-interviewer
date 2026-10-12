import { LOG_HEADERS } from "./schema.js";
import type { ReconciledSession, ReconciledSetEntry } from "../ingest/types.js";
import type { ProgressionResult } from "./targets.js";

export function buildLogRow(
  session: Pick<ReconciledSession, "date" | "source" | "block" | "session" | "session_notes">,
  entry: ReconciledSetEntry,
  progression: ProgressionResult,
  isFirstRowOfSession: boolean,
): string[] {
  const flags = [...progression.flags];
  if (entry.matchedVia === "alias") flags.push("alias-match");

  let notes = entry.notes ?? "";
  if (isFirstRowOfSession && session.session_notes) {
    notes = notes ? `Session: ${session.session_notes}. ${notes}` : `Session: ${session.session_notes}`;
  }

  const values: Record<(typeof LOG_HEADERS)[number], string> = {
    Date: session.date,
    Source: session.source,
    Block: session.block,
    Session: session.session,
    Order: String(entry.order),
    Exercise: entry.canonicalExercise,
    "Load (kg)": String(entry.load_kg),
    Scheme: entry.scheme,
    "Reps (per set)": entry.reps.join("/"),
    RPE: entry.rpe != null ? String(entry.rpe) : "",
    "Target next": progression.targetNextText,
    Flags: flags.join(", "),
    Notes: notes,
  };
  return LOG_HEADERS.map((h) => values[h]);
}
