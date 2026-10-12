import type { LibraryIndex } from "../sheet/library.js";
import { buildLogRow } from "../sheet/log.js";
import { buildTargetsRow, evaluateProgression, type ProgressionResult } from "../sheet/targets.js";
import type { ReconciledSession } from "./types.js";

export interface TargetsUpdate {
  canonicalExercise: string;
  row: string[];
  progression: ProgressionResult;
}

export interface ProcessedSession {
  logRows: string[][];
  targetsUpdates: TargetsUpdate[];
}

/** Pure transform: reconciled session -> the Sheet rows it produces. No
 * network calls, so this is exactly the surface `dry-run` exercises and
 * unit tests cover directly. */
export function buildSessionWrites(
  session: ReconciledSession,
  library: LibraryIndex,
  previousBestLoadKgByExercise: Map<string, number | null>,
): ProcessedSession {
  const logRows: string[][] = [];
  const targetsUpdates: TargetsUpdate[] = [];

  session.exercises.forEach((entry, i) => {
    const libMatch = library.byName.get(entry.canonicalExercise.toLowerCase());
    if (!libMatch) {
      throw new Error(
        `internal error: "${entry.canonicalExercise}" was reconciled but is missing from the library index`,
      );
    }
    const previousBest =
      previousBestLoadKgByExercise.get(entry.canonicalExercise.toLowerCase()) ?? null;
    const progression = evaluateProgression(entry, libMatch.entry, previousBest);

    logRows.push(buildLogRow(session, entry, progression, i === 0));
    targetsUpdates.push({
      canonicalExercise: entry.canonicalExercise,
      row: buildTargetsRow({
        canonicalExercise: entry.canonicalExercise,
        source: session.source,
        block: session.block,
        date: session.date,
        loadKg: entry.load_kg,
        scheme: entry.scheme,
        reps: entry.reps,
        rpe: entry.rpe,
        progression,
      }),
      progression,
    });
  });

  return { logRows, targetsUpdates };
}
