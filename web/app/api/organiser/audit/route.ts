import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, noStore } from "@/lib/http";
import { listAudit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → {entries: [{at, who, name, action, detail?}]}, newest first. Owner only. */
export async function GET(req: NextRequest) {
  const auth = await requireOrganiser(req, { owner: true });
  if (auth.denied) return auth.denied;
  try {
    return noStore({ entries: await listAudit(60) });
  } catch (err) {
    return errorResponse(err);
  }
}
