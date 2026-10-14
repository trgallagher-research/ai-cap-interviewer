import type { NextRequest } from "next/server";
import { chatJson, normaliseProfile, stats } from "@/lib/aiwd/engine";
import { buildProductReadPrompt, buildSharebackPrompt } from "@/lib/aiwd/prompts";
import { SEED } from "@/lib/aiwd/seed";
import type { Profile } from "@/lib/aiwd/types";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, jsonError, noStore, readJson } from "@/lib/http";
import { getLlm } from "@/lib/llm";
import {
  acquireGenerateLock, getGenerated, listProfiles, releaseGenerateLock, setGenerated, type GenerateKind,
} from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function kindOf(v: unknown): GenerateKind | null {
  return v === "product-read" || v === "shareback" ? v : null;
}

/** GET ?kind=product-read|shareback → cached {n, samples, at, result} or {result: null}. */
export async function GET(req: NextRequest) {
  const denied = await requireOrganiser(req);
  if (denied) return denied;
  try {
    const kind = kindOf(req.nextUrl.searchParams.get("kind"));
    if (!kind) return jsonError(400, "kind must be product-read or shareback", "invalid");
    return noStore((await getGenerated(kind)) || { result: null });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Stored profiles merged with SEED when samples are on (same rule as organiser.js loadProfiles). */
async function profilesFor(includeSamples: boolean): Promise<{ profiles: Profile[]; samples: number }> {
  const stored = (await listProfiles()).map(normaliseProfile);
  const seen = new Set(stored.map((p) => p.id));
  const out = stored.slice();
  let samples = 0;
  if (includeSamples) {
    for (const s of SEED) {
      const q = normaliseProfile(s); q.source = "seed";
      if (!seen.has(q.id)) { out.push(q); seen.add(q.id); samples++; }
    }
  }
  return { profiles: out, samples };
}

/** POST {kind, includeSamples} → builds the prompt server-side, returns and caches {n, samples, at, result}. */
export async function POST(req: NextRequest) {
  const denied = await requireOrganiser(req);
  if (denied) return denied;
  try {
    const body = await readJson(req, 4000);
    const kind = kindOf(body.kind);
    if (!kind) return jsonError(400, "kind must be product-read or shareback", "invalid");
    const { profiles, samples } = await profilesFor(body.includeSamples === true);
    if (!profiles.length) return jsonError(400, "There are no profiles to read yet.", "no_profiles");
    const token = await acquireGenerateLock(kind);
    if (!token) return jsonError(409, "Claude is already writing this. Please wait for it to finish.", "busy");
    try {
      const st = stats(profiles);
      const prompt = kind === "product-read" ? buildProductReadPrompt(profiles, st) : buildSharebackPrompt(profiles, st);
      const result = await chatJson(getLlm(), [{ role: "user", content: prompt }], { tier: "reasoning" });
      const value = { n: profiles.length, samples, at: new Date().toISOString(), result };
      await setGenerated(kind, value);
      return noStore(value);
    } finally {
      await releaseGenerateLock(kind, token);
    }
  } catch (err) {
    return errorResponse(err);
  }
}

/** PUT {kind:"shareback", result} → saves the organiser's edits to the share-back. */
export async function PUT(req: NextRequest) {
  const denied = await requireOrganiser(req);
  if (denied) return denied;
  try {
    const body = await readJson(req, 200_000);
    if (body.kind !== "shareback") return jsonError(400, "Only the share-back can be edited.", "invalid");
    const result = body.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) return jsonError(400, "result must be an object", "invalid");
    const prev = await getGenerated("shareback");
    const value = { n: prev ? prev.n : 0, samples: prev ? prev.samples : 0, at: new Date().toISOString(), result, edited: true };
    await setGenerated("shareback", value);
    return noStore(value);
  } catch (err) {
    return errorResponse(err);
  }
}
