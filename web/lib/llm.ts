/* llm.ts: the only place the server talks to Claude. SERVER-ONLY (reads ANTHROPIC_API_KEY).
 *
 * getLlm() returns an object matching the engine's injected `Llm` interface:
 *   chat(system, messages, {onText, tier}) → {text}
 * - tier "interview": MODEL_INTERVIEW, effort low (one interview turn, streamed).
 * - tier "reasoning": MODEL_REASONING, effort medium (profile, product read, share-back).
 * Every call: client.beta.messages.stream with the server-side fallback beta, system block cached,
 * stop_reason "refusal" checked before the text is used. No `thinking` param: it is always on for
 * claude-opus-5-5, and {type:"disabled"} or a budget would be rejected.
 *
 * getLlm({kind, interviewId}) also records each call's priced usage (lib/pricing.ts) in the cost
 * counters, including refused and failed-after-output attempts, so the owner sees what was spent.
 *
 * AIWD_MOCK_LLM=1 swaps in a scripted mock (same scenarios as prototype/tests/member.spec.js);
 * the scenario is read from the member name (see mockScenario()).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Llm, LlmTier } from "./aiwd/types";
import { priceUsage, type PricedUsage } from "./pricing";
import { recordCost, type CostKind } from "./store";

export const MODELS = {
  interview: process.env.MODEL_INTERVIEW || "claude-opus-5-5",
  reasoning: process.env.MODEL_REASONING || "claude-opus-5-5",
};

export type LlmErrorCode = "rate_limited" | "overloaded" | "refusal" | "failed" | "unavailable" | "bad_json";

export class LlmError extends Error {
  code: LlmErrorCode;
  status: number;
  /** Priced usage of a call that was billed but failed (e.g. a refusal after output). */
  usage?: PricedUsage;
  constructor(message: string, code: LlmErrorCode, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Map anything thrown by the SDK (or the mock) to a clear, member-safe LlmError. */
export function toLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.RateLimitError) {
    return new LlmError("Claude is busy right now (rate limit). Please wait a minute and try again.", "rate_limited", 429);
  }
  if (err instanceof Anthropic.APIError && err.status === 529) {
    return new LlmError("Claude is overloaded right now. Please try again in a moment.", "overloaded", 503);
  }
  if (err instanceof Anthropic.InternalServerError) {
    return new LlmError("Claude had a temporary problem. Please try again.", "overloaded", 503);
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new LlmError("The site's connection to Claude is not configured correctly.", "unavailable", 503);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new LlmError("Could not reach Claude. Please try again.", "failed", 502);
  }
  if (err instanceof Anthropic.APIError) {
    return new LlmError("Claude could not answer (" + (err.status ?? "error") + "). Please try again.", "failed", 502);
  }
  const code = (err as { code?: string } | null)?.code;
  // Anything else (storage, programming errors) is logged; members get a generic message.
  console.error(err);
  if (code === "bad_json") return new LlmError("Claude's answer could not be read. Please try again.", "bad_json", 502);
  return new LlmError("Something went wrong while preparing the answer. Please try again.", "failed", 502);
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LlmError("The site is not connected to Claude yet (ANTHROPIC_API_KEY is not set).", "unavailable", 503);
  }
  // Retries: the SDK retries 429/5xx itself; keep it to one. Timeouts are set per call (see TIMEOUT_MS).
  if (!client) client = new Anthropic({ maxRetries: 1 });
  return client;
}

// Per-call timeouts sized to the route limits: interview turns run in a 120 s function (up to two calls),
// profile / product read / share-back in a 300 s function (finish and generate routes).
const TIMEOUT_MS = { interview: 55_000, reasoning: 240_000 } as const;

const anthropicLlm: Llm = {
  async chat(system: string, messages: ChatMessage[], opts: { onText?: (text: string) => void; tier: LlmTier }) {
    const tier = opts.tier;
    // Built as a variable (as aligned-interviewer does for output_config) so beta-only fields
    // never trip excess-property checks if the SDK's param types lag behind.
    const params = {
      model: tier === "interview" ? MODELS.interview : MODELS.reasoning,
      // Thinking is always on for this model and counts against max_tokens: leave headroom.
      max_tokens: tier === "interview" ? 4096 : 16000,
      ...(system
        ? { system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }] }
        : {}),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      output_config: { effort: tier === "interview" ? ("low" as const) : ("medium" as const) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default" as const,
    };
    try {
      const stream = getClient().beta.messages.stream(params, { timeout: TIMEOUT_MS[tier === "interview" ? "interview" : "reasoning"] });
      let full = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          full += event.delta.text;
          if (opts.onText) opts.onText(full);
        }
      }
      const final = await stream.finalMessage();
      const usage = priceUsage(params.model, final.model, final.usage as Parameters<typeof priceUsage>[2]);
      // Check the stop reason before using the text: a refusal's partial output is discarded.
      if (final.stop_reason === "refusal") {
        const e = new LlmError("Claude declined to answer this one. Please rephrase your last answer, or stop here.", "refusal", 422);
        e.usage = usage;
        throw e;
      }
      const text = final.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      return { text: text || full, usage };
    } catch (err) {
      throw toLlmError(err);
    }
  },
};

// ---------------------------------------------------------------------------
// Scripted mock (AIWD_MOCK_LLM=1). Mirrors prototype/tests/member.spec.js.
// Scenario from the member name (case-insensitive): contains "norate" → rate request without a
// RATE marker (engine retries); "error" → the third interviewer turn fails once; "badjson" → the
// profile is not JSON the first time (engine retries); "refuse" → every interview turn is a refusal;
// "slow" → slow streaming (for concurrency tests). Anything else → normal.
// ---------------------------------------------------------------------------
const Q = [
  "Hi NAME, nice to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work. What does a typical week look like for you at the moment?\n<<PHASE: orient >>",
  "That sounds like a full week. You ticked writing: was the last time you used it for that this week or longer ago?\n<<CHIPS: [\"This week\", \"This month\", \"Longer ago\"] >>\n<<PHASE: practice >>",
  "Can you walk me through the most recent time you used it for something like that: what did you type, and what came back?\n<<PHASE: practice >>",
  "And how did you judge what came back before you used it with the team?\n<<PHASE: stretch >>",
];
const RATE_ITEMS = [
  { id: "r1", task: "Use an AI tool to turn your rough notes from a team session into a first draft of a summary for the client, and judge what to keep.", level: 2 },
  { id: "r2", task: "Ask an AI tool to summarise a one-page document and check the summary against the original.", level: 1 },
  { id: "r3", task: "Talk a difficult team conflict through with an AI tool as a thinking partner, using anonymised details, and test two of your own hypotheses.", level: 3 },
  { id: "r4", task: "Design a short exercise for a team day with an AI tool and adapt it to the team's situation.", level: 2 },
];
const RATE_MSG = "Thank you, that gives me a good picture. I'd like you to rate your confidence on a few tasks drawn from what you described. There are no right answers.";
const GOOD_RATE = RATE_MSG + "\n<<RATE: " + JSON.stringify(RATE_ITEMS) + " >>\n<<CHIPS: [\"Sure\", \"Fine\"] >>\n<<PHASE: rate >>";
const BAD_RATE = RATE_MSG + "\n<<PHASE: rate >>";
const FOLLOW = "Interesting: you rate the thinking-partner task much lower than the summary. What makes that one feel further away?\n<<PHASE: close >>";
const CLOSE = "Thank you NAME, that was a rich conversation. Your feedback is being prepared now.\n<<PHASE: close >>\n<<COMPLETE>>";
const PROFILE = {
  practice: { level: 2, summary: "NAME uses ChatGPT regularly to draft client summaries after team sessions and checks the output before sending. Use is routine but not yet woven into the method.", domains: [{ key: "writing", evidence: "turn session notes into a summary for the client" }, { key: "prep", evidence: "designed an exercise for a team day" }], tools: ["ChatGPT"], judgement: "Reads every draft against their own notes and removes anything that sounds generic; keeps client names out of the tool.", stance: "pragmatic" },
  confidence: { pattern: "High on drafting and summarising, drops on using the tool as a thinking partner on a live conflict." },
  wants: ["use AI as a thinking partner on cases safely"],
  offers: ["can show how I draft client summaries after a session"],
  productSignals: { wouldPayFor: "a short peer session on using AI with client material", quote: "I would pay for an afternoon with colleagues who are further along" },
  feedback: { headline: "Thanks NAME, here is what stood out", summary: "You use AI in a steady, practical way for the writing that follows your sessions, and you check what comes back against your own notes. That habit of checking is the strongest thing in what you described.", strengths: ["You read every draft against your own notes and strip out what sounds generic.", "You keep client names out of the tool without being asked."], nextSteps: [{ title: "Try one case as a thinking partner", detail: "You already check drafts well; the next step is using the tool before the session, not only after it. You will know it worked if one of its objections changes something you do in the room.", steps: ["Pick a team situation you are preparing for in the next two weeks and describe it without names.", "Ask the tool to argue against your reading of the situation.", "Note which objection you would act on, and check it against what happens in the room."] }, { title: "Ask your colleague one question", detail: "You said there is someone you could ask but you have not yet.", steps: ["Write down the one thing you most want to get better at.", "Ask your colleague for twenty minutes to show you how they would do it."] }], calibration: "You rated yourself highly on checking output, and your scenario answers back that up.", followUp: "Since you might pay for something, a short peer session with colleagues who are further along would be a low-cost next step.", closing: "Thank you for taking the time, and for being so concrete." },
  quotes: ["I always read it against my own notes first", "I would pay for an afternoon with colleagues who are further along"],
};
const PRODUCT_READ = {
  verdict: "There is a modest product here: peer-led half-days on using AI with client material, not generic AI training.",
  demand: ["A half-day with peers (most members who ticked anything)", "A checklist for client material (about a third)"],
  options: [
    { name: "Peer half-day", forWhom: "Routine users", shape: "Two members who use it daily show their method; the rest try it on their own material.", evidence: "Peer half-day is the most ticked offer.", risk: "Depends on two or three members willing to show their work." },
    { name: "Client-material checklist", forWhom: "Cautious members", shape: "A one-page checklist written with the network's own rules.", evidence: "Confidentiality comes up in most judgement notes.", risk: "Hard to charge for on its own." },
  ],
  notSupported: ["A paid course for beginners: few non-users said they would pay."],
  nextTest: "Offer one paid peer half-day to the whole network and count sign-ups in two weeks.",
};
const SHAREBACK = {
  title: "How we use AI in our work: what the network told us",
  intro: "Members each had a short AI-led interview about how AI does or does not show up in their work. Here is what we heard.",
  picture: "Most of us use AI now and then for writing; a few have woven it into how they prepare sessions, and some have chosen not to use it at all.",
  findings: [
    { title: "Writing comes first", detail: "Most of us start with emails and proposals." },
    { title: "Confidence and practice do not always match", detail: "Some rate themselves higher than what they describe doing, others lower." },
    { title: "Scepticism is grounded", detail: "Those who doubt it point to client confidentiality and the quality of thinking." },
  ],
  quotes: ["I always read it against my own notes first"],
  helpMap: [{ need: "Using AI as a sparring partner on a case", whoCanHelp: "A team coach who clusters interview notes" }],
  tryThisWeek: [
    { title: "Check one summary against your notes", detail: "Ask a tool to summarise your notes, then mark what it got wrong." },
    { title: "Strip names first", detail: "Before pasting anything, remove names and the organisation." },
    { title: "Ask it to argue against you", detail: "Describe a case and ask for the strongest objection to your reading." },
  ],
  closing: "We will run a first peer session next month. Reply to tell us what you would want from it.",
};

/** Scenario switch for e2e tests, read from the member name. */
export function mockScenario(name: string): "normal" | "norate" | "error" | "badjson" | "refuse" | "slow" {
  const n = (name || "").toLowerCase();
  if (n.includes("norate")) return "norate";
  if (n.includes("error")) return "error";
  if (n.includes("badjson")) return "badjson";
  if (n.includes("refuse")) return "refuse";
  if (n.includes("slow")) return "slow";
  return "normal";
}

const mockErrored = new Set<string>();
/** Counters for tests (mock only). */
export const mockCalls: { system: string; messages: ChatMessage[]; tier: LlmTier }[] = [];

function nameFrom(system: string, first: string): string {
  const m = system.match(/The person you are talking to is (.+?), who\s/) || first.match(/^Member: (.+?), role:/m);
  return m ? m[1] : "Anneke";
}

const mockLlm: Llm = {
  async chat(system: string, messages: ChatMessage[], opts: { onText?: (text: string) => void; tier: LlmTier }) {
    mockCalls.push({ system, messages, tier: opts.tier });
    if (mockCalls.length > 500) mockCalls.splice(0, mockCalls.length - 500);
    const first = messages.length ? messages[0].content : "";
    const name = nameFrom(system, first);
    const scenario = mockScenario(name);
    let lu = "";
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") { lu = messages[i].content; break; }

    let text: string;
    if (first.includes("Give her a sober product read")) {
      text = JSON.stringify(PRODUCT_READ);
    } else if (first.includes("short share-back page")) {
      text = JSON.stringify(SHAREBACK);
    } else if (lu.includes("Produce ONE JSON object") || lu.includes("That was not valid JSON")) {
      if (scenario === "badjson" && !lu.includes("That was not valid JSON")) text = "Here is the profile you asked for, in prose rather than JSON.";
      else text = JSON.stringify(PROFILE).split("NAME").join(name);
    } else {
      if (scenario === "refuse") throw new LlmError("Claude declined to answer this one. Please rephrase your last answer, or stop here.", "refusal", 422);
      const n = messages.filter((m) => m.role === "assistant").length;
      if (lu.includes("[I need to stop here.]")) text = CLOSE.split("NAME").join(name);
      else if (lu.includes("did not include a valid RATE marker")) text = GOOD_RATE;
      else if (lu.startsWith("My confidence ratings")) text = FOLLOW;
      else if (n > Q.length && messages.some((m) => m.role === "user" && m.content.startsWith("My confidence ratings"))) text = CLOSE.split("NAME").join(name);
      else if (n < Q.length) {
        if (scenario === "error" && n === 2) {
          const key = system + "\u0000" + JSON.stringify(messages);
          if (!mockErrored.has(key)) { mockErrored.add(key); throw new LlmError("mock failure", "failed", 502); }
        }
        text = Q[n].split("NAME").join(name);
      } else text = scenario === "norate" ? BAD_RATE : GOOD_RATE;
    }
    if (opts.onText) {
      // Stream in chunks that cut through the markers.
      const delay = scenario === "slow" ? 40 : 3;
      for (let i = 7; i < text.length; i += 7) { opts.onText(text.slice(0, i)); await new Promise((r) => setTimeout(r, delay)); }
      opts.onText(text);
    }
    // Fixed usage per call so cost tracking is testable: 1000 input + 200 output tokens on Opus 5.5
    // = $0.004 + $0.004 = 8000 micro-dollars.
    return { text, usage: priceUsage(MODELS.interview, "claude-opus-5-5", { input_tokens: 1000, output_tokens: 200 }) };
  },
};

export function isMockLlm(): boolean {
  // Never on a production deployment, whatever the env says.
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.AIWD_MOCK_LLM === "1";
}

/** What a call is for, so its cost lands on the right counters. */
export interface CostTrack { kind: CostKind; interviewId?: string }

async function track(t: CostTrack, u: PricedUsage | undefined): Promise<void> {
  if (!u) return;
  try {
    await recordCost(t.kind, { micro: u.micro, calls: 1, input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite, fallbacks: u.fallbacks }, t.interviewId);
  } catch (err) {
    console.error("cost record failed", err); // never fail the member's request over bookkeeping
  }
}

export function getLlm(t?: CostTrack): Llm {
  const base = isMockLlm() ? mockLlm : anthropicLlm;
  if (!t) return base;
  return {
    async chat(system, messages, opts) {
      try {
        const r = await base.chat(system, messages, opts);
        await track(t, r.usage as PricedUsage | undefined);
        return r;
      } catch (err) {
        await track(t, (err as LlmError).usage);
        throw err;
      }
    },
  };
}
