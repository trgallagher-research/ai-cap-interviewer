import { SessionFileSchema, type SessionFile } from "./types.js";
import { type Result, ok, err } from "./result.js";

/** Parses + validates raw inbox file text. Never throws — bad input is
 * always reported as a Result so the caller can quarantine it. */
export function parseSessionFile(raw: string): Result<SessionFile> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return err(`not valid JSON: ${(e as Error).message}`);
  }

  const parsed = SessionFileSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return err(`schema validation failed: ${issues}`);
  }

  return ok(parsed.data);
}
