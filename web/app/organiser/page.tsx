import type { Metadata } from "next";
import { LegacyMount } from "@/app/components/LegacyMount";
import { StorageWarning } from "@/app/components/StorageWarning";

export const metadata: Metadata = { title: "Organiser · AI at Work Diagnostic" };
export const dynamic = "force-dynamic";

export default function OrganiserPage() {
  return (
    <main id="view" className="wide">
      <StorageWarning />
      <LegacyMount view="organiser" />
    </main>
  );
}
