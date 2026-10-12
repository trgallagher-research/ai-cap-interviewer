import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { getScanReport } from "@/lib/scanner";
import { scanReportToDocx, scanReportToHtml, scanSlug } from "@/lib/scanExport";
import type { ScanReport } from "@/lib/types";

export const runtime = "nodejs";

// Creator-only: download a finished scan as a self-contained HTML file or an editable Word
// (.docx) document. Both are rendered from the cached `report` JSON (so a download works even
// if the engine is offline); if the cache is empty but the run is done, we backfill from the
// engine once. Ownership is enforced by RLS — the authed client only returns the creator's rows.
// Usage: /api/studio/scan/<runId>/export?format=html|docx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "html";

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

  let report = row.report as ScanReport | null;
  if (!report) {
    if (row.state !== "done") {
      return NextResponse.json({ error: "Scan is not finished yet" }, { status: 409 });
    }
    try {
      report = await getScanReport(runId);
      await creator.supabase.from("scans").update({ report }).eq("id", row.id);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to fetch report" },
        { status: 502 },
      );
    }
  }

  const slug = scanSlug(report);

  if (format === "docx") {
    const buffer = await scanReportToDocx(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const html = scanReportToHtml(report);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
