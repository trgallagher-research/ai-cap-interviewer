import type { NextRequest } from "next/server";
import { errorResponse, isInterviewId, jsonError, noStore } from "@/lib/http";
import { memberState } from "@/lib/member";
import { getInterview } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?id= → the member's own interview (no coding, no profile). */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!isInterviewId(id)) return jsonError(404, "Interview not found", "not_found");
    const rec = await getInterview(id);
    if (!rec) return jsonError(404, "Interview not found", "not_found");
    return noStore(memberState(rec));
  } catch (err) {
    return errorResponse(err);
  }
}
