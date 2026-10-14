import type { NextRequest } from "next/server";
import { isProfileLike, parseCodes } from "@/lib/aiwd/codes";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, jsonError, noStore, readJson } from "@/lib/http";
import { audit, saveProfile } from "@/lib/store";
import type { Profile } from "@/lib/aiwd/types";
import { sanitiseImported } from "@/lib/validate";

export const runtime = "nodejs";

/** POST {text} → {imported, skipped}. Accepts artifact result codes (AIWD1:+base64, or JSON). */
export async function POST(req: NextRequest) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  try {
    const body = await readJson(req, 4_000_000);
    if (typeof body.text !== "string" || !body.text.trim()) return jsonError(400, "Paste one or more result codes.", "invalid");
    const candidates = parseCodes(body.text);
    let imported = 0, skipped = 0;
    const now = new Date().toISOString();
    for (const c of candidates) {
      if (!isProfileLike(c) || c.id.length > 200) { skipped++; continue; }
      const p: Profile = Object.assign(sanitiseImported(c), { source: "imported", importedAt: now }) as unknown as Profile;
      if (typeof p.createdAt !== "string" || !Number.isFinite(Date.parse(p.createdAt))) p.createdAt = now;
      await saveProfile(p);
      imported++;
    }
    if (imported) await audit(auth.organiser, "imported results", String(imported));
    return noStore({ imported, skipped });
  } catch (err) {
    return errorResponse(err);
  }
}
