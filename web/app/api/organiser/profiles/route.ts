import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, noStore } from "@/lib/http";
import { audit, listProfiles, withinLimit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → {profiles: Profile[]} (stored live + imported profiles, newest first; no SEED). */
export async function GET(req: NextRequest) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  try {
    // One "opened the dashboard" entry per organiser per half hour, not one per page load.
    if (await withinLimit("auditview:" + auth.organiser.id, 1, 30 * 60)) await audit(auth.organiser, "opened the organiser view");
    return noStore({ profiles: await listProfiles() });
  } catch (err) {
    return errorResponse(err);
  }
}
