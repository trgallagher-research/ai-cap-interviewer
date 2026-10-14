import type { Metadata } from "next";
import { LegacyMount } from "@/app/components/LegacyMount";
import { StorageWarning } from "@/app/components/StorageWarning";

export const metadata: Metadata = { title: "Share-back · AI at Work Diagnostic" };
export const dynamic = "force-dynamic";

export default function NetworkPage() {
  return (
    <main id="view">
      <StorageWarning />
      <LegacyMount view="network" />
    </main>
  );
}
