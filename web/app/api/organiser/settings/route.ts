import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { errorResponse, jsonError, noStore, readJson } from "@/lib/http";
import { audit, getSettings, saveSettings, type EmailMode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: EmailMode[] = ["required", "optional", "none"];

/** GET → {emailMode, emailSending}. */
export async function GET(req: NextRequest) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  try {
    return noStore({ ...(await getSettings()), emailSending: emailConfigured() });
  } catch (err) {
    return errorResponse(err);
  }
}

/** PUT {emailMode} → the saved settings. Any organiser may change them. */
export async function PUT(req: NextRequest) {
  const auth = await requireOrganiser(req);
  if (auth.denied) return auth.denied;
  try {
    const body = await readJson(req, 4000);
    const mode = body.emailMode as EmailMode;
    if (!MODES.includes(mode)) return jsonError(400, "emailMode must be required, optional or none", "invalid");
    const prev = await getSettings();
    await saveSettings({ ...prev, emailMode: mode });
    if (prev.emailMode !== mode) await audit(auth.organiser, "changed the email setting", `${prev.emailMode} → ${mode}`);
    return noStore({ ...(await getSettings()), emailSending: emailConfigured() });
  } catch (err) {
    return errorResponse(err);
  }
}
