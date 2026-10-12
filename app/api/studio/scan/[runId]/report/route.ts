import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { getScanReport } from "@/lib/scanner";

export const runtime = "nodejs";

// Creator-only: the finished report for one of the caller's scans. Served from the cached
// `report` column (populated by the status route on the "done" transition); if the cache
// is somehow empty but the run is done, fetch it from the engine once and backfill.
// Ownership is enforced by RLS — the authed client only returns the creator's own rows.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await creator.supabase
    .from("scans")
    .select("id,state,report")
    .eq("run_id", runId)
    .single();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.report) {
    return NextResponse.json({ report: row.report });
  }

  if (row.state !== "done") {
    return NextResponse.json(
      { error: "Scan is not finished yet" },
      { status: 409 },
    );
  }

  // Done but uncached (e.g. the cache write was missed) — backfill from the engine.
  try {
    const report = await getScanReport(runId);
    await creator.supabase.from("scans").update({ report }).eq("id", row.id);
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch report" },
      { status: 502 },
    );
  }
}
