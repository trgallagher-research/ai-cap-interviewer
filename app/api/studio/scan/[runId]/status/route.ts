import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { getScanReport, getScanStatus } from "@/lib/scanner";

export const runtime = "nodejs";

// Creator-only: live status of one of the caller's scans (polled by the UI). Ownership is
// enforced by RLS — the authed client only returns the creator's own scan rows. We refresh
// the engine's snapshot into the row, and on the transition to "done" we fetch the report
// once and cache it, so it's served from Postgres thereafter (reports are private to the
// creator; deleting the engine's on-disk run never loses it).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Owns this scan? (RLS scopes the select to the creator's rows.)
  const { data: row } = await creator.supabase
    .from("scans")
    .select("id,state")
    .eq("run_id", runId)
    .single();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let status;
  try {
    status = await getScanStatus(runId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch status" },
      { status: 502 },
    );
  }

  // Cache the report once, on the first time we see the run finish.
  const justFinished = status.state === "done" && row.state !== "done";
  let report: unknown = undefined;
  if (justFinished) {
    try {
      report = await getScanReport(runId);
    } catch {
      // Report not retrievable yet — leave it; the next poll will try again.
      report = undefined;
    }
  }

  await creator.supabase
    .from("scans")
    .update({
      state: status.state,
      stage: status.stage,
      detail: status.detail,
      spent_usd: status.spent_usd,
      error: status.error || null,
      ...(report !== undefined ? { report } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return NextResponse.json({
    runId,
    state: status.state,
    stage: status.stage,
    detail: status.detail,
    profiled: status.profiled,
    shortlistTotal: status.shortlist_total,
    spentUsd: status.spent_usd,
    budgetUsd: status.budget_usd,
    error: status.error || null,
  });
}
