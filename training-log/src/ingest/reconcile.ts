import type { LibraryIndex } from "../sheet/library.js";
import type { ReconciledSession, SessionFile } from "./types.js";
import { type Result, ok, err } from "./result.js";

/** Resolves every exercise name in the session against the Library's
 * canonical names + aliases. Deterministic, exact (case-insensitive) match
 * only — no fuzzy guessing, so a typo never silently lands under the wrong
 * exercise. If anything is unresolved the whole file is rejected (and gets
 * quarantined by the caller) listing every unresolved name at once, so a
 * fix is one Library edit + one resubmit, not a retry-per-typo loop. */
export function reconcileSession(
  session: SessionFile,
  library: LibraryIndex,
): Result<ReconciledSession> {
  const unresolved = new Set<string>();
  const exercises = session.exercises.map((entry) => {
    const match = library.byName.get(entry.exercise.trim().toLowerCase());
    if (!match) {
      unresolved.add(entry.exercise);
      return null;
    }
    return {
      ...entry,
      canonicalExercise: match.entry.canonicalExercise,
      matchedVia: match.matchedVia,
    };
  });

  if (unresolved.size > 0) {
    return err(
      `unresolved exercise name(s) not found in Library (canonical or alias): ` +
        `${[...unresolved].map((n) => `"${n}"`).join(", ")}. ` +
        `Add them to the Library tab (canonical name or Dutch alias) and resubmit.`,
    );
  }

  return ok({
    ...session,
    exercises: exercises as NonNullable<(typeof exercises)[number]>[],
  });
}
