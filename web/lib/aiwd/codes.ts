/* codes.ts: result codes from the artifact ("AIWD1:" + base64 JSON, or bare JSON).
 * Port of prototype/src/store.js exportCode/parseCodes. Pure; works in Node and browsers. */
import type { Profile } from "./types";

export const CODE_PREFIX = "AIWD1:";

function encodeB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function decodeB64(b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportCode(profile: Profile): string {
  return CODE_PREFIX + encodeB64(JSON.stringify(profile));
}

function tryJson(t: string): any {
  try { const v = JSON.parse(t); return (v && typeof v === "object") ? v : null; } catch (_) { return null; }
}

/**
 * Parse one or more codes (AIWD1:{...} tokens, a bare JSON object or array, or any mix,
 * one per line or concatenated). Returns the candidate objects (not yet validated).
 */
export function parseCodes(text: unknown): unknown[] {
  const found: unknown[] = [];
  const s = String(text || "").trim();
  if (!s) return found;
  // 1. Bare JSON array or object.
  if (!s.includes(CODE_PREFIX)) {
    const v = tryJson(s);
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") return [v];
  }
  // 2. One or more prefixed codes anywhere in the text. Take the JSON that follows each prefix.
  let idx = s.indexOf(CODE_PREFIX);
  while (idx !== -1) {
    const start = idx + CODE_PREFIX.length;
    const nextIdx = s.indexOf(CODE_PREFIX, start);
    const chunk = (nextIdx === -1 ? s.slice(start) : s.slice(start, nextIdx)).trim();
    let v = tryJson(chunk) || tryJson(chunk.slice(0, chunk.lastIndexOf("}") + 1));
    if (!v) { // base64 form (current); tolerate trailing prose after the code
      const m = chunk.match(/^[A-Za-z0-9+/=]+/);
      if (m) { try { v = tryJson(decodeB64(m[0])); } catch (_) { v = null; } }
    }
    if (Array.isArray(v)) found.push(...v); else if (v) found.push(v);
    idx = nextIdx;
  }
  return found;
}

export function isProfileLike(p: unknown): p is Profile {
  const o = p as Profile | null;
  return !!(o && typeof o === "object" && typeof o.id === "string" && o.member && o.practice);
}
