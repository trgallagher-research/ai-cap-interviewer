/* Loads the prototype's plain scripts (prompts, engine, store, seed) in a VM with a fake window,
 * so the unit tests can compare the TypeScript port with the original byte for byte. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROTO_SRC = path.join(here, "..", "..", "..", "prototype", "src");

export function loadPrototype(mockSample?: (messages: any[], opts: any) => Promise<{ text: string }>): any {
  const store = new Map<string, string>();
  const window: any = {};
  if (mockSample) window.__mockSample = mockSample;
  const ctx: any = {
    window,
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, String(v)), removeItem: (k: string) => store.delete(k) },
    TextEncoder, TextDecoder, btoa, atob, console, setTimeout, Date, Math, JSON,
  };
  vm.createContext(ctx);
  for (const f of ["prompts.js", "engine.js", "store.js", "seed.js"]) {
    vm.runInContext(fs.readFileSync(path.join(PROTO_SRC, f), "utf8"), ctx, { filename: f });
  }
  return window;
}

/** Plain-object copy (strips VM realm prototypes so deepStrictEqual compares values only). */
export function plain<T>(v: T): T { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
