import { NextResponse, type NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { deleteProfile } from "@/lib/store";

export const runtime = "nodejs";

/** DELETE → 204 (also when the profile was already gone). */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireOrganiser(req);
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    if (id && id.length <= 200) await deleteProfile(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
