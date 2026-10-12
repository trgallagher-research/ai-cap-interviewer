import { redirect } from "next/navigation";
import { getCreator } from "@/lib/auth";
import { scannerEnabled } from "@/lib/scanner";
import { SCAN_BUDGET_DEFAULT, SCAN_BUDGET_MAX } from "@/lib/flags";
import { NewScan } from "./NewScan";

export const dynamic = "force-dynamic";

export default async function NewScanPage() {
  const creator = await getCreator();
  if (!creator) redirect("/login");
  if (!scannerEnabled()) redirect("/scans");

  // Studies the scan can optionally be linked to.
  const { data } = await creator.supabase
    .from("studies")
    .select("id,title")
    .order("created_at", { ascending: false });
  const studies = (data ?? []) as { id: string; title: string }[];

  return (
    <NewScan
      studies={studies}
      budgetDefault={SCAN_BUDGET_DEFAULT}
      budgetMax={SCAN_BUDGET_MAX}
    />
  );
}
