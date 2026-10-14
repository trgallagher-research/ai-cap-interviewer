import { transcriptionEnabled } from "@/lib/groq";
import { emailConfigured } from "@/lib/email";
import { getSettings, storageKind } from "@/lib/store";
import { noStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, member-safe configuration for the pages. */
export async function GET() {
  let emailMode = "none";
  try { emailMode = (await getSettings()).emailMode; } catch { /* storage not configured: the page shows its own error on start */ }
  return noStore({
    voice: transcriptionEnabled(),
    memberCodeRequired: !!process.env.MEMBER_ACCESS_CODE,
    storage: storageKind(),
    emailMode,
    emailSending: emailConfigured(),
  });
}
