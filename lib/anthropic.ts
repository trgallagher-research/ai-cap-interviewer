import Anthropic from "@anthropic-ai/sdk";

// Single server-side client. Reads ANTHROPIC_API_KEY from the environment
// (.env.local locally, a project env var on Vercel). Never expose this to the
// browser — it is only imported by API route handlers.
export const anthropic = new Anthropic();

// Overridable via env so you can run cheap models for plumbing tests
// (e.g. MODEL_INTERVIEW=claude-haiku-4-5) and switch back for the real demo,
// with no code changes. Server-side only — never exposed to the browser.
export const MODELS = {
  // Snappy turns for the live interview — latency matters with a person waiting.
  interview: process.env.MODEL_INTERVIEW || "claude-sonnet-4-6",
  // Quality matters more than latency for planning and synthesis.
  reasoning: process.env.MODEL_REASONING || "claude-opus-4-8",
};

/**
 * Run a single structured-output generation and return the parsed JSON.
 * Uses Opus with adaptive thinking; `output_config.format` constrains the
 * response to the given JSON schema, so the first text block is valid JSON.
 */
export async function generateStructured<T>(opts: {
  system: string;
  user: string;
  schema: unknown;
  maxTokens?: number;
  /** Override the model — defaults to MODELS.reasoning (Opus). Lighter generations
   *  (e.g. respondent-facing report summaries) pass MODELS.interview (Sonnet). */
  model?: string;
  /** Extended ("adaptive") thinking — on by default. Pass false for latency-sensitive,
   *  low-reasoning generations (e.g. a warm respondent summary) to skip it. */
  thinking?: boolean;
}): Promise<T> {
  // Build as a variable so the extra `output_config` field (not yet in the
  // SDK's param types in every version) passes without an excess-property error.
  const params = {
    model: opts.model ?? MODELS.reasoning,
    max_tokens: opts.maxTokens ?? 6000,
    ...(opts.thinking === false
      ? {}
      : { thinking: { type: "adaptive" as const } }),
    system: opts.system,
    messages: [{ role: "user" as const, content: opts.user }],
    output_config: {
      format: {
        type: "json_schema" as const,
        schema: opts.schema as Record<string, unknown>,
      },
    },
  };
  const res = await anthropic.messages.create(params);
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text content in structured response");
  }
  return JSON.parse(block.text) as T;
}
