import { LIBRARY_HEADERS } from "./schema.js";

export interface LibraryEntry {
  canonicalExercise: string;
  progressionStepKg: number;
  rpeCeiling: number;
}

export interface LibraryIndex {
  /** lowercase name (canonical or alias) -> entry */
  byName: Map<string, { entry: LibraryEntry; matchedVia: "canonical" | "alias" }>;
  entries: LibraryEntry[];
}

const DEFAULT_PROGRESSION_STEP_KG = 2.5;
const DEFAULT_RPE_CEILING = 8.5;

/** Builds a case-insensitive canonical/alias lookup from the Library tab's
 * raw rows (including the header row at index 0). Rows with no canonical
 * name are skipped. Blank Progression Step / RPE Ceiling fall back to
 * sane defaults rather than blocking reconciliation. */
export function loadLibraryIndex(rows: string[][]): LibraryIndex {
  const header = rows[0] ?? [];
  const col = (name: string) => header.indexOf(name);
  const canonicalCol = col(LIBRARY_HEADERS[0]);
  const aliasCol = col(LIBRARY_HEADERS[1]);
  const stepCol = col(LIBRARY_HEADERS[2]);
  const rpeCol = col(LIBRARY_HEADERS[3]);

  const byName: LibraryIndex["byName"] = new Map();
  const entries: LibraryEntry[] = [];

  for (const row of rows.slice(1)) {
    const canonicalExercise = (row[canonicalCol] ?? "").trim();
    if (!canonicalExercise) continue;

    const stepRaw = Number(row[stepCol]);
    const rpeRaw = Number(row[rpeCol]);
    const entry: LibraryEntry = {
      canonicalExercise,
      progressionStepKg: Number.isFinite(stepRaw) && row[stepCol]
        ? stepRaw
        : DEFAULT_PROGRESSION_STEP_KG,
      rpeCeiling: Number.isFinite(rpeRaw) && row[rpeCol]
        ? rpeRaw
        : DEFAULT_RPE_CEILING,
    };
    entries.push(entry);

    byName.set(canonicalExercise.toLowerCase(), { entry, matchedVia: "canonical" });

    const aliasField = (row[aliasCol] ?? "").trim();
    if (aliasField) {
      for (const alias of aliasField.split(",").map((a) => a.trim()).filter(Boolean)) {
        const key = alias.toLowerCase();
        if (!byName.has(key)) {
          byName.set(key, { entry, matchedVia: "alias" });
        }
      }
    }
  }

  return { byName, entries };
}
