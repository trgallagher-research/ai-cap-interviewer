import { redirect, notFound } from "next/navigation";
import { getCreator } from "@/lib/auth";
import type { ScanReport, ScanState } from "@/lib/types";
import { ScanRun } from "./ScanRun";

export const dynamic = "force-dynamic";

export default async function ScanRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const creator = await getCreator();
  if (!creator) redirect("/login");

  // RLS scopes this to the creator's own scans.
  const { data } = await creator.supabase
    .from("scans")
    .select("run_id,question,state,spent_usd,budget_usd,report")
    .eq("run_id", runId)
    .single();
  if (!data) notFound();

  return (
    <ScanRun
      runId={data.run_id as string}
      question={data.question as string}
      initialState={data.state as ScanState}
      initialReport={(data.report as ScanReport | null) ?? null}
      spentUsd={Number(data.spent_usd ?? 0)}
      budgetUsd={Number(data.budget_usd ?? 0)}
    />
  );
}
