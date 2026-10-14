import { transcriptionEnabled } from "@/lib/groq";
import { storageKind } from "@/lib/store";
import { noStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, member-safe configuration for the pages. */
export async function GET() {
  return noStore({
    voice: transcriptionEnabled(),
    memberCodeRequired: !!process.env.MEMBER_ACCESS_CODE,
    storage: storageKind(),
  });
}
