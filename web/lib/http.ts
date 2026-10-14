/* http.ts: small helpers shared by the API routes. SERVER-ONLY. */
import { NextResponse, type NextRequest } from "next/server";
import { ValidationError } from "./validate";
import { LlmError } from "./llm";

export function jsonError(status: number, error: string, code?: string): NextResponse {
  return NextResponse.json(code ? { error, code } : { error }, { status, headers: { "cache-control": "no-store" } });
}

export function noStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Parse a JSON body (max ~64 KB). Returns an object or throws ValidationError. */
export async function readJson(req: NextRequest, maxBytes = 64_000): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ValidationError("request body too large");
  if (!text.trim()) return {};
  let v: unknown;
  try { v = JSON.parse(text); } catch { throw new ValidationError("body must be JSON"); }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ValidationError("body must be a JSON object");
  return v as Record<string, unknown>;
}

/** Client IP: first entry of x-forwarded-for (Vercel sets it), else x-real-ip. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) { const first = xff.split(",")[0].trim(); if (first) return first; }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Map thrown errors to a JSON response. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ValidationError) return jsonError(400, err.message, "invalid");
  if (err instanceof LlmError) return jsonError(err.status, err.message, err.code);
  console.error(err);
  return jsonError(500, "Something went wrong on the server. Please try again.", "server");
}

export function isInterviewId(v: unknown): v is string {
  return typeof v === "string" && /^iv_[0-9a-f]{32}$/.test(v);
}
