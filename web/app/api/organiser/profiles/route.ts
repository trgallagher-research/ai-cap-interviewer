import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, noStore } from "@/lib/http";
import { listProfiles } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → {profiles: Profile[]} (stored live + imported profiles, newest first; no SEED). */
export async function GET(req: NextRequest) {
  const denied = await requireOrganiser(req);
  if (denied) return denied;
  try {
    return noStore({ profiles: await listProfiles() });
  } catch (err) {
    return errorResponse(err);
  }
}
