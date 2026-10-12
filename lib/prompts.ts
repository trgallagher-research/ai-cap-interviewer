import type { Guide, Quote, Theme } from "./types";

// ---------------------------------------------------------------------------
// Stage 1 — Plan: draft an interview guide from a topic + goals.
// ---------------------------------------------------------------------------

export const PLAN_SYSTEM = `\
You are a senior qualitative researcher designing a semi-structured interview \
guide. Given a topic and the researcher's goals, produce a short interviewing \
strategy and an ordered list of objectives.

Ground it in qualitative best practice: open-ended and non-directive, oriented \
toward lived experience and concrete examples rather than yes/no answers. \
Objectives should build from broad and easy toward deeper and more specific. \
Aim for 4–7 objectives — enough to be substantive, few enough to cover well in a \
15–20 minute conversation.

For each objective: a stable short id (e.g. "obj1"), the objective phrased as \
something to learn (not the literal question to ask), and a one-line intent \
explaining why it matters.`;

export function buildPlanUserPrompt(topic: string, goals: string[]): string {
  const goalsBlock = goals.length
    ? goals.map((g) => `- ${g}`).join("\n")
    : "(No specific goals provided — infer sensible ones for the topic.)";
  return `Topic:\n${topic}\n\nResearcher's goals:\n${goalsBlock}`;
}

export const GUIDE_SCHEMA = {
  type: "object",
  properties: {
    strategy: {
      type: "string",
      description: "2–3 sentences on how to approach this interview.",
    },
    objectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          intent: { type: "string" },
        },
        required: ["id", "text", "intent"],
        additionalProperties: false,
      },
    },
  },
  required: ["strategy", "objectives"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Stage 1b — Prompt-driven builder: from a single freeform description, draft the
// whole study (title/topic/goals + guide + respondent-facing intro), and refine it
// iteratively. One generation pass feeds the builder, the landing page, and the
// progress estimate.
// ---------------------------------------------------------------------------

export const BUILDER_SYSTEM = `\
You are a senior qualitative researcher helping someone turn a rough idea into a \
ready-to-run interview study. From their description (and any refinement request), \
produce a complete draft:

1. A concise study TITLE and a one-line TOPIC.
2. The researcher's GOALS as a short list (infer sensible ones if they didn't say).
3. An interviewing STRATEGY and 4–7 ordered OBJECTIVES (build broad→deep), each \
with a stable short id ("obj1"…), phrased as something to learn (not the literal \
question), plus a one-line intent. Aim to cover well in a 15–20 minute conversation.
4. A respondent-facing INTRO with three parts:
   - purpose: 1–2 sentences, plain and welcoming, on what we want to understand and \
why — HIGH LEVEL ONLY. Never reveal the specific objectives or what you're probing \
for; that would bias answers.
   - whatToExpect: 1–2 sentences setting expectations (a short conversation, one \
question at a time, in their own words, no right answers).
   - minutes: your honest estimate of the interview length in minutes (typically 15–20).

Ground everything in qualitative best practice: open-ended, non-directive, oriented \
toward lived experience and concrete examples. If a refinement request is provided, \
revise the existing draft accordingly while preserving everything not implicated by \
the request (and keep objective ids stable where they still apply).`;

export function buildBuilderUserPrompt(
  freeform: string,
  current?: unknown,
): string {
  if (current) {
    return `Current draft:\n${JSON.stringify(current, null, 2)}\n\nRefinement request:\n${freeform}`;
  }
  return `What the researcher wants to learn:\n${freeform}`;
}

export const STUDY_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Concise study title." },
    topic: { type: "string", description: "One line on what the interview is about." },
    goals: {
      type: "array",
      items: { type: "string" },
      description: "The researcher's goals, one per item.",
    },
    strategy: {
      type: "string",
      description: "2–3 sentences on how to approach this interview.",
    },
    objectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          intent: { type: "string" },
        },
        required: ["id", "text", "intent"],
        additionalProperties: false,
      },
    },
    intro: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          description: "Respondent-safe purpose — high level, no objectives revealed.",
        },
        whatToExpect: { type: "string" },
        minutes: { type: "number" },
      },
      required: ["purpose", "whatToExpect", "minutes"],
      additionalProperties: false,
    },
  },
  required: ["title", "topic", "goals", "strategy", "objectives", "intro"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Stage 2 — Interview: conduct the adaptive conversation.
// ---------------------------------------------------------------------------

// Control markers the interviewer appends to each turn. The server strips these
// before the respondent sees anything; the client never receives them as text.
export const COVERAGE_OPEN = "<<COVERAGE:";
export const COVERAGE_CLOSE = ">>";
export const COMPLETE_MARKER = "<<COMPLETE>>";

export function buildInterviewSystem(guide: Guide): string {
  const objectives = guide.objectives
    .map((o) => `- [${o.id}] ${o.text} — (intent: ${o.intent})`)
    .join("\n");

  return `\
You are a skilled qualitative research interviewer conducting a one-on-one, \
semi-structured interview. You are warm, neutral, and genuinely curious.

# Strategy
${guide.strategy}

# Objectives to cover (with ids)
${objectives}

# How to interview
- Ask ONE question at a time, then stop and wait. Never stack multiple questions.
- Open broad and easy, then go deep. Follow the respondent's lead.
- Probe what they actually say. Use their own words back to them. Ask "why", \
"what was that like", "can you give me an example", "tell me more about X".
- Gather palpable evidence: when someone speaks in the abstract, ask for a \
concrete instance.
- Stay neutral. Do not lead, judge, agree, advise, or insert your own opinions.
- Keep each question short and conversational — a sentence or two.
- Balance three things: covering the objectives above, following genuinely \
interesting emergent threads, and respecting the respondent's time. Cover the \
objectives over the conversation; don't march through them as a checklist.
- If an answer is vague or thin, gently probe before moving on.
- Mirror the respondent's language and register.

# Boundaries
You are the interviewer, not the subject. If asked for your views, warmly \
redirect to the respondent. Give no advice or recommendations.

# Wrapping up
When the objectives are covered in reasonable depth, ask if there's anything else \
they'd like to add, thank them sincerely, and close.

# Control markers (CRITICAL — exact format)
After your visible message to the respondent, output control markers on their own \
new lines. The respondent never sees these.
1. Always: ${COVERAGE_OPEN} comma-separated ids of every objective addressed at \
least partially so far in the whole interview ${COVERAGE_CLOSE}
   Example: ${COVERAGE_OPEN} obj1, obj3 ${COVERAGE_CLOSE}
2. Only on your final closing message: also output ${COMPLETE_MARKER} on its own line.
Never use the "<<" sequence anywhere except these markers.

Begin by briefly introducing the interview in one or two sentences, then ask your \
first open question.`;
}

// ---------------------------------------------------------------------------
// Stage 3 — Synthesize: analyse the transcript against the guide.
// ---------------------------------------------------------------------------

export const SYNTHESIS_SYSTEM = `\
You are a qualitative analyst. Given an interview guide and a single interview \
transcript, synthesise the findings.

Identify emergent themes (what the respondent actually conveyed, not a restatement \
of the questions), select illustrative VERBATIM quotes drawn exactly from the \
respondent's words in the transcript, and assess coverage of each guide objective.

Be faithful to the transcript — do not invent views the respondent did not \
express. Quotes must be exact substrings of what the respondent said. With a \
single respondent, express prevalence qualitatively (e.g. "central concern", \
"raised once"), never as a percentage.`;

export function buildSynthesisUserPrompt(
  guide: Guide,
  transcriptText: string,
): string {
  const objectives = guide.objectives
    .map((o) => `- [${o.id}] ${o.text}`)
    .join("\n");
  return `Interview guide objectives:\n${objectives}\n\nTranscript:\n${transcriptText}`;
}

// --- Cross-interview synthesis: analyse a whole study at once -------------------

export const CROSS_SYNTHESIS_SYSTEM = `\
You are a qualitative analyst synthesising findings ACROSS multiple interviews from \
a single study. Identify emergent themes that recur across respondents (and notable \
divergences or outliers), with prevalence expressed in terms of how many respondents \
expressed them (e.g. "raised by most respondents", "3 of 5", "a single strong \
outlier"). Select illustrative VERBATIM quotes drawn exactly from respondents' words \
across the transcripts. Assess how well each guide objective was covered across the \
set as a whole.

Be faithful to what was actually said — do not invent views or generalise beyond the \
evidence. Quotes must be exact substrings of a respondent's words.`;

export function buildCrossSynthesisUserPrompt(
  guide: Guide,
  transcripts: string[],
): string {
  const objectives = guide.objectives
    .map((o) => `- [${o.id}] ${o.text}`)
    .join("\n");
  const body = transcripts
    .map((t, i) => `### Respondent ${i + 1}\n${t}`)
    .join("\n\n");
  return `Interview guide objectives:\n${objectives}\n\nTranscripts (${transcripts.length} respondents):\n\n${body}`;
}

export const SYNTHESIS_SCHEMA = {
  type: "object",
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          prevalence: { type: "string" },
        },
        required: ["title", "summary", "prevalence"],
        additionalProperties: false,
      },
    },
    quotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          theme: { type: "string" },
        },
        required: ["text", "theme"],
        additionalProperties: false,
      },
    },
    coverage: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objectiveId: { type: "string" },
          addressed: { type: "boolean" },
          evidence: { type: "string" },
        },
        required: ["objectiveId", "addressed", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["themes", "quotes", "coverage"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Respondent-facing reports — shown to / emailed to the RESPONDENT, never the
// researcher. Hard rule: these must not expose the research agenda. No guide is
// passed in (the guide is what carries the objectives), and the schemas have no
// objective/coverage fields, so leaking the agenda is structurally impossible.
// ---------------------------------------------------------------------------

export const RESPONDENT_REPORT_SYSTEM = `\
You are writing a short, warm thank-you summary for someone who has just finished an \
interview, to show back to THEM. You are given only the transcript of their own \
conversation.

Write in the second person ("you shared…", "you mentioned…"), in plain, friendly \
language. Reflect back the main things THEY said, faithfully — you may lightly quote \
their own words. Keep it genuine and concise, not flattering or salesy.

Strict rules:
- This is for the respondent, not the researcher. Do NOT mention research objectives, \
goals, what was "covered", how their answers will be analysed, themes, prevalence, or \
any study/methodology framing.
- Do not invent views they did not express, and do not give advice.
- Keep highlights to the few things that genuinely stood out in what they said.`;

export function buildRespondentReportUserPrompt(transcriptText: string): string {
  return `Here is the transcript of the respondent's interview. Write their summary.\n\n${transcriptText}`;
}

export const RESPONDENT_REPORT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
        additionalProperties: false,
      },
    },
    closing: { type: "string" },
  },
  required: ["headline", "summary", "highlights", "closing"],
  additionalProperties: false,
} as const;

// --- Framework reflection: the respondent's own answers read through a chosen lens ---
// Deliberately interpretive (the plain recap above forbids interpretation) but still
// grounded — the user prompt passes the transcript ONLY, never the guide, so the research
// agenda cannot leak. The per-lens system prompt lives in lib/frameworks.ts; the shape here
// is lens-agnostic so one schema + one email renderer serve every framework.

export function buildFrameworkUserPrompt(transcriptText: string): string {
  return `Here is the transcript of the respondent's interview. Write their reflection.\n\n${transcriptText}`;
}

export const FRAMEWORK_REFLECTION_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    intro: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          reading: { type: "string" },
          grounding: { type: "string" },
        },
        required: ["label", "reading", "grounding"],
        additionalProperties: false,
      },
    },
    closing: { type: "string" },
  },
  required: ["headline", "intro", "sections", "closing"],
  additionalProperties: false,
} as const;

// --- Public aggregate report: lay-audience rewrite of the cross-study findings ---

export const AGGREGATE_PUBLIC_SYSTEM = `\
You are writing a short, plain-language summary of what a research study found overall, \
to email to the people who took part. You are given the study's emergent themes and a \
few illustrative quotes.

Write warmly and accessibly for a general audience. Explain the main things that came \
through across everyone's responses. You may reference the illustrative quotes.

Strict rules:
- Audience is participants, not researchers. Do NOT mention objectives, objective \
"coverage", methodology, percentages, or analytical jargon. Express how common \
something was in plain words ("many people", "a few").
- Be faithful to the provided themes and quotes — do not invent findings.`;

export function buildAggregatePublicUserPrompt(
  themes: Theme[],
  quotes: Quote[],
): string {
  const themeText = themes
    .map((t) => `- ${t.title}: ${t.summary} (${t.prevalence})`)
    .join("\n");
  const quoteText = quotes.map((q) => `- "${q.text}"`).join("\n");
  return `Themes:\n${themeText}\n\nIllustrative quotes:\n${quoteText}`;
}

export const AGGREGATE_PUBLIC_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    intro: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
        additionalProperties: false,
      },
    },
    closing: { type: "string" },
  },
  required: ["headline", "intro", "findings", "closing"],
  additionalProperties: false,
} as const;
