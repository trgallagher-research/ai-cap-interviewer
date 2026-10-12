// Spend cap: the maximum number of interviews per study before a respondent sees a
// graceful "study full" state instead of triggering a Claude call. This is the
// in-app ceiling that guards the bill; the hard backstop is the Anthropic Console
// monthly cap (set that too). Tune via the MAX_INTERVIEWS env var.
export const MAX_INTERVIEWS = Number(process.env.MAX_INTERVIEWS ?? "300");

// Landscape scans are bring-your-own-key (the creator's Serper/Anthropic keys, so the
// creator pays). The hard per-scan cap below is therefore about protecting *their* key
// from a runaway scan, not the platform bill. The creator picks a budget per scan; we
// default it and clamp it to a server-enforced ceiling so a fat-fingered value can't burn
// their credits. The engine's BudgetMeter enforces the cap mid-run (and can resume).
export const SCAN_BUDGET_DEFAULT = Number(process.env.SCAN_BUDGET_DEFAULT ?? "2");
export const SCAN_BUDGET_MAX = Number(process.env.SCAN_BUDGET_MAX ?? "5");

// Per-creator fair-share: the most scans one creator may have in flight at once. Keeps a
// single creator from monopolising the shared engine (which has its own hard global cap,
// SCANNER_MAX_CONCURRENT_RUNS). Tune via SCAN_MAX_ACTIVE.
export const SCAN_MAX_ACTIVE = Number(process.env.SCAN_MAX_ACTIVE ?? "3");
