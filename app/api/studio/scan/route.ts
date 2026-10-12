import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { scannerEnabled, startScan } from "@/lib/scanner";
import {
  SCAN_BUDGET_DEFAULT,
  SCAN_BUDGET_MAX,
  SCAN_MAX_ACTIVE,
} from "@/lib/flags";

export const runtime = "nodejs";

// Creator-only: start a landscape scan. The engine runs the scan in the background on the
// separate service, so this returns promptly (well under the 60s ceiling) with a run id.
// The scan is recorded under the authed (RLS) client, owned by the logged-in creator.
//
// Keys: bring-your-own-key. In v1 the engine uses its own keys on the NUC, so we send
// none here; per-request keys are a later phase (see docs/scanner-service-contract.md).
export async function POST(req: Request) {
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!scannerEnabled()) {
    return NextResponse.json(
      { error: "Scanning is not configured" },
      { status: 503 },
    );
  }

  try {
    const { question, budgetUsd, studyId, modelProfile } = (await req.json()) as {
      question?: string;
      budgetUsd?: number;
      studyId?: string;
      modelProfile?: string;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "A question is required" }, { status: 400 });
    }

    // Per-creator fair-share: cap how many scans one creator can have running at once, so a
    // single creator can't monopolise the shared engine. RLS scopes this count to the
    // creator's own rows. The recency window means a stale/orphaned row (e.g. left "running"
    // after an engine restart, never re-polled) can't lock the creator out forever — a real
    // scan finishes in minutes. The engine's SCANNER_MAX_CONCURRENT_RUNS is the hard backstop.
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { count: active } = await creator.supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .in("state", ["starting", "running"])
      .gte("created_at", sixHoursAgo);
    if ((active ?? 0) >= SCAN_MAX_ACTIVE) {
      return NextResponse.json(
        {
          error: `You already have ${active} scans running — wait for one to finish (max ${SCAN_MAX_ACTIVE} at once).`,
        },
        { status: 429 },
      );
    }

    // Clamp the per-scan budget: default if unset/invalid, never above the server max.
    let budget = Number(budgetUsd);
    if (!Number.isFinite(budget) || budget <= 0) budget = SCAN_BUDGET_DEFAULT;
    budget = Math.min(budget, SCAN_BUDGET_MAX);

    // Optional study link: only honour it if the caller actually owns that study.
    let linkedStudyId: string | null = null;
    if (studyId) {
      const { data } = await creator.supabase
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .single();
      if (data) linkedStudyId = data.id as string;
    }

    const { run_id } = await startScan({
      question: question.trim(),
      budgetUsd: budget,
      modelProfile,
    });

    const { data, error } = await creator.supabase
      .from("scans")
      .insert({
        owner_id: creator.user.id,
        study_id: linkedStudyId,
        run_id,
        question: question.trim(),
        budget_usd: budget,
        state: "starting",
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to record scan" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data.id, runId: run_id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start scan" },
      { status: 500 },
    );
  }
}
