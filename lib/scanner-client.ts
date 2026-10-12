import type { ScanReport, ScanStatusResponse } from "./types";

// Browser-side helpers for the studio scan routes, mirroring lib/studio-client.ts.
// These call our own /api/studio/scan/* endpoints (creator-gated), never the engine.

/** Start a scan. Returns the new scan row id + the engine run id (used in the URL). */
export async function startScan(input: {
  question: string;
  budgetUsd: number;
  studyId?: string;
}): Promise<{ id: string; runId: string }> {
  const r = await fetch("/api/studio/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to start scan"));
  return r.json();
}

/** Poll the live status of a run. */
export async function getScanStatus(runId: string): Promise<ScanStatusResponse> {
  const r = await fetch(`/api/studio/scan/${encodeURIComponent(runId)}/status`);
  if (!r.ok) throw new Error(await errText(r, "Failed to fetch status"));
  return r.json();
}

/** Fetch the finished report. */
export async function getScanReport(runId: string): Promise<ScanReport> {
  const r = await fetch(`/api/studio/scan/${encodeURIComponent(runId)}/report`);
  if (!r.ok) throw new Error(await errText(r, "Failed to fetch report"));
  const { report } = (await r.json()) as { report: ScanReport };
  return report;
}

async function errText(r: Response, fallback: string): Promise<string> {
  try {
    return (await r.json()).error || fallback;
  } catch {
    return `${fallback} (${r.status})`;
  }
}
