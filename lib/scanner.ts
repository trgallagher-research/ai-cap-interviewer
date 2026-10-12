// Server-only client for the landscape-scanner engine, which runs as a separate Python
// service (the NUC, behind a Cloudflare Tunnel) — see docs/scanner-service-contract.md.
// A scan takes minutes and can't run inside a Vercel function, so the website never runs
// the engine: it starts a run, polls status, and fetches the finished report.
//
// Never import this into a client component — it carries the service token. Only the
// /api/studio/scan/* route handlers (server-side, creator-gated) call it.

const BASE = process.env.SCANNER_SERVICE_URL;

/** Whether the scanner integration is configured. Mirrors emailEnabled()/groq gating:
 *  unset SCANNER_SERVICE_URL ⇒ the feature is simply off, no crash. */
export function scannerEnabled(): boolean {
  return !!BASE;
}

import type { ScanReport } from "./types";

/** Live status snapshot from the engine (mirrors its RunStatus). */
export interface ScanStatus {
  run_id: string;
  question: string;
  state: "starting" | "running" | "done" | "halted" | "error";
  stage: string;
  detail: string;
  profiled: number;
  shortlist_total: number;
  spent_usd: number;
  budget_usd: number;
  error: string;
}

/** Optional per-request BYOK keys. Omitted in v1 (the engine uses its own NUC env). */
export interface ScanKeys {
  serper?: string;
  anthropic?: string;
  brave?: string;
  openrouter?: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.SCANNER_SERVICE_TOKEN) {
    h["Authorization"] = `Bearer ${process.env.SCANNER_SERVICE_TOKEN}`;
  }
  // Cloudflare Access service token (when the tunnel is fronted by Access).
  if (process.env.SCANNER_CF_ACCESS_CLIENT_ID) {
    h["CF-Access-Client-Id"] = process.env.SCANNER_CF_ACCESS_CLIENT_ID;
  }
  if (process.env.SCANNER_CF_ACCESS_CLIENT_SECRET) {
    h["CF-Access-Client-Secret"] = process.env.SCANNER_CF_ACCESS_CLIENT_SECRET;
  }
  return h;
}

function requireBase(): string {
  if (!BASE) throw new Error("Scanner not configured — set SCANNER_SERVICE_URL");
  return BASE.replace(/\/+$/, "");
}

/** Pull a clean error message out of a non-2xx engine response. */
async function errText(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

/** Start a scan. Returns promptly with a run id; the engine runs it in the background. */
export async function startScan(input: {
  question: string;
  budgetUsd: number;
  modelProfile?: string;
  keys?: ScanKeys;
}): Promise<{ run_id: string; state: string }> {
  const res = await fetch(`${requireBase()}/scans`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      question: input.question,
      budget_usd: input.budgetUsd,
      ...(input.modelProfile ? { model_profile: input.modelProfile } : {}),
      ...(input.keys ? { keys: input.keys } : {}),
    }),
  });
  if (!res.ok) throw new Error(await errText(res, "Failed to start scan"));
  return res.json();
}

/** Fetch the live status of a run. */
export async function getScanStatus(runId: string): Promise<ScanStatus> {
  const res = await fetch(`${requireBase()}/scans/${encodeURIComponent(runId)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await errText(res, "Failed to fetch scan status"));
  return res.json();
}

/** Fetch the finished report. Only valid once state === "done". */
export async function getScanReport(runId: string): Promise<ScanReport> {
  const res = await fetch(
    `${requireBase()}/scans/${encodeURIComponent(runId)}/report`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(await errText(res, "Failed to fetch scan report"));
  return res.json();
}
