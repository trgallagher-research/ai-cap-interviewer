/* pricing.ts: turns API usage into an estimated cost. Pure; no server imports.
 *
 * Anthropic first-party list prices in US$ per million tokens (checked 2026-10-14 against the
 * claude-api reference). Cache writes cost 1.25× input for the 5-minute TTL and 2× for 1 hour.
 * A server-side refusal fallback bills each attempt at the rate of the model that ran it, so usage
 * is priced per attempt (usage.iterations) when the API reports attempts.
 * The figure is an estimate: the Anthropic Console's usage page for this API key is the bill.
 */

export interface ModelPrice { input: number; output: number; cacheRead: number }

export const PRICES: Record<string, ModelPrice> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-7": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-fable-5": { input: 10, output: 50, cacheRead: 1 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

/** Groq Whisper (whisper-large-v3), US$ per hour of audio. The default is an assumption to check
 *  against groq.com/pricing; GROQ_PRICE_PER_HOUR overrides it. */
export function groqPricePerHour(): number {
  const n = Number(process.env.GROQ_PRICE_PER_HOUR);
  return Number.isFinite(n) && n >= 0 ? n : 0.111;
}

/** Assumes a 10-second minimum per request, as Groq has published; check when confirming the rate. */
export function voiceMicro(seconds: number): number {
  return Math.round((Math.max(10, seconds) / 3600) * groqPricePerHour() * 1e6);
}

/** One sampling attempt's usage, as the API reports it (top-level usage or a usage.iterations entry). */
export interface AttemptUsage {
  model?: string | null;
  type?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } | null;
}

export interface PricedUsage {
  micro: number; input: number; output: number; cacheRead: number; cacheWrite: number;
  /** Attempts served by a fallback model. */
  fallbacks: number;
  /** True when a model had no price in PRICES and was priced as the requested model. */
  estimated: boolean;
}

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Price a response: per attempt when `iterations` lists them, else the top-level usage at `model`.
 * Attempts with no model are priced at the requested model.
 */
export function priceUsage(requested: string, model: string | null | undefined, usage: AttemptUsage & { iterations?: AttemptUsage[] | null }): PricedUsage {
  const attempts = Array.isArray(usage.iterations) && usage.iterations.length
    ? usage.iterations.filter((a) => a && typeof a.input_tokens === "number")
    : [{ ...usage, model: model || requested }];
  const out: PricedUsage = { micro: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, fallbacks: 0, estimated: false };
  for (const a of attempts) {
    const name = a.model || requested;
    let price = PRICES[name];
    if (!price) { price = PRICES[requested] || PRICES["claude-opus-5-5"]; out.estimated = true; }
    const cw = n(a.cache_creation_input_tokens);
    const w1h = a.cache_creation ? n(a.cache_creation.ephemeral_1h_input_tokens) : 0;
    const w5m = cw - w1h;
    const usd =
      (n(a.input_tokens) * price.input + n(a.output_tokens) * price.output + n(a.cache_read_input_tokens) * price.cacheRead +
        w5m * price.input * 1.25 + w1h * price.input * 2) / 1e6;
    out.micro += Math.round(usd * 1e6);
    out.input += n(a.input_tokens);
    out.output += n(a.output_tokens);
    out.cacheRead += n(a.cache_read_input_tokens);
    out.cacheWrite += cw;
    if (a.type === "fallback_message") out.fallbacks++;
  }
  return out;
}
