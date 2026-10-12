export const TAB = {
  LOG: "Log",
  TARGETS: "Targets",
  LIBRARY: "Library",
  PT_BRIEF: "PT_Brief",
  README: "README",
} as const;

// Column order is meaningful — it's the contract with the Sheet as it
// already exists. Changing this after the Sheet is in use means migrating
// existing rows by hand.
export const LOG_HEADERS = [
  "Date",
  "Source",
  "Block",
  "Session",
  "Order",
  "Exercise",
  "Load (kg)",
  "Scheme",
  "Reps (per set)",
  "RPE",
  "Target next",
  "Flags",
  "Notes",
] as const;

// One row per exercise, refreshed (upserted) after every ingested session.
// Always derivable from Log — `recompute-targets` rebuilds it from scratch.
export const TARGETS_HEADERS = [
  "Exercise",
  "Source",
  "Block",
  "Last Date",
  "Last Load (kg)",
  "Last Scheme",
  "Last Reps",
  "Last RPE",
  "Target Load (kg)",
  "Target Scheme",
  "Notes",
] as const;

// Canonical exercise names + Dutch aliases the parser reconciles against,
// plus the per-exercise progression knobs the Targets heuristic reads.
export const LIBRARY_HEADERS = [
  "Canonical Exercise",
  "Alias (Dutch)",
  "Progression Step (kg)",
  "RPE Ceiling",
  "Category",
  "Notes",
] as const;

// Tabs the service leaves alone entirely (owner-authored content /
// reserved for the future PT coach-loop) — only ensured to exist.
export const PASSTHROUGH_TABS = [TAB.PT_BRIEF, TAB.README] as const;

export const MANAGED_TABS: Record<string, readonly string[]> = {
  [TAB.LOG]: LOG_HEADERS,
  [TAB.TARGETS]: TARGETS_HEADERS,
  [TAB.LIBRARY]: LIBRARY_HEADERS,
};

export type LogRow = Record<(typeof LOG_HEADERS)[number], string>;
export type TargetsRow = Record<(typeof TARGETS_HEADERS)[number], string>;
export type LibraryRow = Record<(typeof LIBRARY_HEADERS)[number], string>;
