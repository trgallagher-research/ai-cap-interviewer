/* tests/e2e/run.mjs: start/stop a production server (`next build && next start`) for e2e tests.
 *
 * As a library (from any test file):
 *   import { startServer, buildOnce } from "./run.mjs";
 *   const srv = await startServer({ env: { MAX_INTERVIEWS: "3" } });  // builds once if needed
 *   ... fetch(srv.url + "/api/config") ...
 *   await srv.stop();
 * Defaults: AIWD_MOCK_LLM=1, ORGANISER_PASSCODE=test, no Redis env (memory store), no
 * ANTHROPIC_API_KEY, no GROQ_API_KEY, no MEMBER_ACCESS_CODE. Pass a key with value null to unset it.
 * The build goes to .next-e2e (NEXT_DIST_DIR) so it never touches a running `next dev`.
 * Set AIWD_E2E_SKIP_BUILD=1 to reuse an existing .next-e2e build.
 *
 * As a CLI (npm run test:e2e [files...]):
 *   builds once, then runs every tests/e2e/server*.test.mjs with `node --test` (they start their
 *   own servers) and every other tests/e2e/*.spec.{mjs,js} / *.test.mjs (e.g. the UI agent's
 *   Playwright member tests) with `node <file>` and BASE_URL pointing at one shared mock server.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const WEB = path.resolve(here, "..", "..");
export const DIST = ".next-e2e";
const NEXT_BIN = path.join(WEB, "node_modules", "next", "dist", "bin", "next");

const STRIP = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "ANTHROPIC_API_KEY", "GROQ_API_KEY", "MEMBER_ACCESS_CODE", "MAX_INTERVIEWS", "AUTH_SECRET", "NODE_ENV"];

function baseEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of STRIP) delete env[k];
  // DEFAULT_LANG=en keeps the existing English checks; the Dutch default is tested with ?lang=nl.
  Object.assign(env, { AIWD_MOCK_LLM: "1", ORGANISER_PASSCODE: "test", DEFAULT_LANG: "en", NEXT_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: "1" });
  for (const [k, v] of Object.entries(extra)) { if (v === null || v === undefined) delete env[k]; else env[k] = String(v); }
  return env;
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
    p.on("error", reject);
  });
}

let built = null;
/** `next build` into .next-e2e once per process (skipped when AIWD_E2E_SKIP_BUILD=1). */
export function buildOnce() {
  if (process.env.AIWD_E2E_SKIP_BUILD === "1" && fs.existsSync(path.join(WEB, DIST, "BUILD_ID"))) return Promise.resolve();
  if (!built) built = run(process.execPath, [NEXT_BIN, "build"], { cwd: WEB, env: baseEnv({ NODE_ENV: "production" }) });
  return built;
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

/** Start `next start` on a free port. Resolves {url, port, stop, logs()} once /api/config answers. */
export async function startServer({ env = {}, build = true, timeoutMs = 60_000 } = {}) {
  if (build) await buildOnce();
  const port = await freePort();
  let out = "";
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: WEB, env: baseEnv(env), stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const url = `http://127.0.0.1:${port}`;
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error("next start exited early:\n" + out);
    try { const r = await fetch(url + "/api/config"); if (r.ok) break; } catch { /* not up yet */ }
    if (Date.now() - t0 > timeoutMs) { child.kill("SIGKILL"); throw new Error("next start did not come up:\n" + out); }
    await new Promise((r) => setTimeout(r, 200));
  }
  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 5000).unref();
  });
  return { url, port, stop, logs: () => out };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const all = fs.readdirSync(here).filter((f) => /\.(test|spec)\.m?js$/.test(f)).sort();
  const files = (args.length ? args.map((a) => path.basename(a)) : all);
  await buildOnce();
  let failed = 0;
  const env = { ...process.env, AIWD_E2E_SKIP_BUILD: "1" };
  // Playwright is installed globally in this environment; let plain `node file` resolve it.
  const globalModules = "/opt/node22/lib/node_modules";
  if (!env.NODE_PATH && fs.existsSync(globalModules)) env.NODE_PATH = globalModules;
  for (const f of files.filter((f) => f.startsWith("server"))) {
    try { await run(process.execPath, ["--test", "--test-concurrency=1", path.join(here, f)], { cwd: WEB, env }); }
    catch (e) { failed++; console.error(String(e)); }
  }
  const others = files.filter((f) => !f.startsWith("server"));
  if (others.length) {
    const srv = await startServer({ build: false });
    try {
      for (const f of others) {
        try { await run(process.execPath, [path.join(here, f)], { cwd: WEB, env: { ...env, BASE_URL: srv.url } }); }
        catch (e) { failed++; console.error(String(e)); }
      }
    } finally { await srv.stop(); }
  }
  if (failed) { console.error(`${failed} e2e file(s) failed`); process.exit(1); }
  console.log("e2e: all files passed");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
