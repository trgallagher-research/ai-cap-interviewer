import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { noStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → {id, name, role} of the signed-in organiser (never the passcode). */
export async function GET(req: NextRequest) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  return noStore(auth.organiser);
}
