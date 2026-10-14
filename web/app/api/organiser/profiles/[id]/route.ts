import { NextResponse, type NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { audit, deleteProfile, getProfile } from "@/lib/store";

export const runtime = "nodejs";

/** DELETE → 204 (also when the profile was already gone). */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  try {
    const { id } = await ctx.params;
    if (id && id.length <= 200) {
      const p = await getProfile(id);
      if (await deleteProfile(id)) await audit(auth.organiser, "deleted a result", p ? p.member.name : id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
