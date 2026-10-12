// Framework registry for the respondent-facing reflection. A study optionally selects one
// lens (studies.analysis_framework); the respondent's own answers are then read through it
// and emailed to those who opt in. Each lens is just a system prompt + a display label — the
// output shape is lens-agnostic (FRAMEWORK_REFLECTION_SCHEMA in lib/prompts.ts), so adding a
// framework is adding an entry here, nothing else.
//
// Guardrails (shared by every lens, curated or custom): ground everything in the transcript,
// this is a reflection to think with — NOT a score, diagnosis, or advice. Like the plain
// recap, the reflection is built from the transcript ONLY (never the guide), so the research
// agenda cannot leak.

import type { AnalysisFramework, CustomFramework } from "./types";

/** The minimum a study needs to expose for us to resolve its lens. */
export interface FrameworkStudy {
  analysis_framework: AnalysisFramework | null;
  analysis_framework_custom: CustomFramework | null;
}

/** A resolved lens ready to generate with. */
export interface ResolvedFramework {
  key: AnalysisFramework;
  label: string;
  system: string;
}

// Appended to every lens. Tells the model how to fill the lens-agnostic section shape
// (the schema enforces the JSON; this gives it the editorial structure).
const REFLECTION_FORMAT = `
Structure the reflection as a short set of sections — one per key element of the framework. \
Give each section a short label (the element's name), a "reading" (your grounded reflection on \
how their described experience relates to that element), and a "grounding" (a brief note, lightly \
quoting or paraphrasing, of what they actually said that this rests on). Open with a short intro \
that names the framework plainly, and end with a brief, warm closing.`;

// --- Self-Determination Theory ------------------------------------------------------------
// Lens text reused verbatim from the validated prototype (~/send-test-reports.mjs). The
// prototype's trailing "Return strict JSON…" instruction is intentionally omitted: the app
// enforces the shape structurally via output_config.format (as every other prompt does).
const SDT_SYSTEM = `\
You are writing a short, thoughtful reflection for someone who has just finished an interview \
about their experience using AI in their work. You are given only the transcript of their own interview.

Interpret what THEY said through the lens of Self-Determination Theory (SDT) — a well-established \
psychology framework which holds that people thrive when three basic psychological needs are met: \
AUTONOMY (a sense of volition and ownership over how you work), COMPETENCE (feeling effective and \
capable at what you do), and RELATEDNESS (feeling connected to and valued by the people around you).

For each of the three needs, reflect on how this person's described experience of AI at work seems \
to support or challenge that need. Ground every point in something they actually said — you may \
lightly paraphrase or quote their own words. Write in the second person ("you described…", "it \
sounds like…"), warm, plain, and non-judgemental.

Strict rules:
- Ground everything in the transcript. Do not invent views, feelings, or facts they did not express. \
Where the interview gives little signal on a need, say so honestly rather than filling the gap.
- This is a reflection to help them think, NOT a clinical assessment, a score, a diagnosis, or \
advice. Do not rate them or tell them what to do.
- Name the framework plainly; use no jargon beyond the three need names, which you briefly gloss.`;

// --- Cyborg & Centaur (Ethan Mollick, "Co-Intelligence") ----------------------------------
const CYBORG_CENTAUR_SYSTEM = `\
You are writing a short, thoughtful reflection for someone who has just finished an interview \
about how they work with AI. You are given only the transcript of their own interview.

Interpret what THEY said through Ethan Mollick's distinction between two ways of working with AI \
(from "Co-Intelligence"): the CENTAUR, who divides work cleanly — handing whole tasks to the AI \
and keeping others entirely human, with a clear line between the two; and the CYBORG, who blends \
with the AI moment to moment, weaving its help tightly into their own thinking so the line blurs.

Reflect on where this person's described way of working sits — where they act more like a Centaur, \
where more like a Cyborg, and what each mode seems to give them or cost them. Ground every point in \
something they actually said — you may lightly paraphrase or quote their own words. Write in the \
second person ("you described…", "it sounds like…"), warm, plain, and non-judgemental.

Strict rules:
- Ground everything in the transcript. Do not invent views, feelings, or facts they did not express. \
Where the interview gives little signal, say so honestly rather than filling the gap.
- This is a reflection to help them think, NOT a score, a verdict on whether they "do it right", a \
diagnosis, or advice. Neither mode is better; do not tell them what to do.
- Name the framework plainly; gloss "Centaur" and "Cyborg" briefly and use no other jargon.`;

// --- SAMR (Substitution / Augmentation / Modification / Redefinition) ----------------------
const SAMR_SYSTEM = `\
You are writing a short, thoughtful reflection for someone who has just finished an interview \
about how they use a tool or technology in their work or learning. You are given only the \
transcript of their own interview.

Interpret what THEY said through the SAMR framework, which describes four depths at which a tool \
can reshape a task: SUBSTITUTION (the tool does the same job as before, just digitally), \
AUGMENTATION (the tool does the same job but noticeably better), MODIFICATION (the task itself is \
significantly redesigned around the tool), and REDEFINITION (the tool makes possible tasks that \
were previously inconceivable).

Reflect on which of these depths the person's described use seems to sit at — it may span several — \
and what moving up or staying at a rung seems to mean for their work. Ground every point in \
something they actually said — you may lightly paraphrase or quote their own words. Write in the \
second person ("you described…", "it sounds like…"), warm, plain, and non-judgemental.

Strict rules:
- Ground everything in the transcript. Do not invent views, feelings, or facts they did not express. \
Where the interview gives little signal, say so honestly rather than filling the gap.
- This is a reflection to help them think, NOT a score, a maturity rating, a diagnosis, or advice. \
A higher rung is not "better"; do not tell them what to do.
- Name the framework plainly; briefly gloss the four levels and use no other jargon.`;

/** Build the system prompt for a creator's own framework, wrapped in the shared guardrails. */
function customSystem(fw: CustomFramework): string {
  return `\
You are writing a short, thoughtful reflection for someone who has just finished an interview. \
You are given only the transcript of their own interview.

Interpret what THEY said through the following framework, which the study's author has chosen as a \
lens for reflection:

${fw.name} — ${fw.definition}

Reflect on how this person's described experience relates to the framework above. Ground every point \
in something they actually said — you may lightly paraphrase or quote their own words. Write in the \
second person ("you described…", "it sounds like…"), warm, plain, and non-judgemental.

Strict rules:
- Ground everything in the transcript. Do not invent views, feelings, or facts they did not express. \
Where the interview gives little signal, say so honestly rather than filling the gap.
- This is a reflection to help them think, NOT a score, a diagnosis, or advice. Do not rate them or \
tell them what to do.
- Name the framework plainly and keep jargon to a minimum, briefly glossing any terms you use.`;
}

const LABELS: Record<AnalysisFramework, string> = {
  sdt: "Self-Determination Theory",
  cyborg_centaur: "Cyborg & Centaur",
  samr: "SAMR",
  custom: "a chosen framework", // overridden by the custom name when available
};

const CURATED_SYSTEMS: Record<Exclude<AnalysisFramework, "custom">, string> = {
  sdt: SDT_SYSTEM,
  cyborg_centaur: CYBORG_CENTAUR_SYSTEM,
  samr: SAMR_SYSTEM,
};

/** The display label for a study's lens, or null when the study has no framework. Used to
 *  name the opt-in checkbox and the email. */
export function frameworkLabel(study: FrameworkStudy): string | null {
  const key = study.analysis_framework;
  if (!key) return null;
  if (key === "custom") return study.analysis_framework_custom?.name?.trim() || LABELS.custom;
  return LABELS[key];
}

/** Resolve a study's framework into a ready-to-generate lens, or null when there is none
 *  (or a 'custom' selection is missing its definition — treated as off rather than erroring). */
export function resolveFramework(study: FrameworkStudy): ResolvedFramework | null {
  const key = study.analysis_framework;
  if (!key) return null;

  if (key === "custom") {
    const fw = study.analysis_framework_custom;
    if (!fw?.name?.trim() || !fw?.definition?.trim()) return null;
    return { key, label: fw.name.trim(), system: customSystem(fw) + REFLECTION_FORMAT };
  }

  return { key, label: LABELS[key], system: CURATED_SYSTEMS[key] + REFLECTION_FORMAT };
}

/** A curated lens plus the creator-facing explainer shown in the study builder. */
export interface CuratedFramework {
  key: Exclude<AnalysisFramework, "custom">;
  label: string;
  /** One-line summary shown at a glance. */
  blurb: string;
  /** Fuller construct write-up so a creator who doesn't know the framework can choose well. */
  about: string;
  /** Which kinds of studies this lens suits. */
  goodFor: string;
}

/** The curated (non-custom) lenses, for the study builder's dropdown + explainer. */
export const CURATED_FRAMEWORKS: CuratedFramework[] = [
  {
    key: "sdt",
    label: LABELS.sdt,
    blurb: "Reflects their experience against three basic psychological needs.",
    about:
      "Self-Determination Theory (Deci & Ryan) is one of the most established theories of human " +
      "motivation. People are most engaged and well when three basic needs are met: autonomy " +
      "(volition and ownership over what you do), competence (feeling effective and able to grow), " +
      "and relatedness (feeling connected to and valued by others). When these are supported people " +
      "thrive; when thwarted, motivation and wellbeing suffer. The reflection reads the respondent's " +
      "own words for where their experience supports or strains each need.",
    goodFor:
      "Motivation, wellbeing, or someone's lived experience of a tool, role, or change.",
  },
  {
    key: "cyborg_centaur",
    label: LABELS.cyborg_centaur,
    blurb: "Reflects how they divide vs. blend their work with AI.",
    about:
      "From Ethan Mollick's Co-Intelligence. A Centaur draws a clear line and divides labour — doing " +
      "some tasks themselves, handing whole tasks to the AI, keeping a strategic boundary. A Cyborg " +
      "blends with the AI moment to moment, weaving its help into their own thinking so the boundary " +
      "blurs. Neither is “better” — different styles with different strengths. The reflection " +
      "notices where their described way of working leans each way, and what each gives them.",
    goodFor: "How people actually integrate AI (or another tool) into their workflow.",
  },
  {
    key: "samr",
    label: LABELS.samr,
    blurb: "Reflects how deeply the tool reshapes their task.",
    about:
      "SAMR (Ruben Puentedura) describes four depths at which a technology changes a task. " +
      "Substitution: same job, no real change. Augmentation: same job, done better. Modification: " +
      "the task is significantly redesigned around the tool. Redefinition: the tool makes possible " +
      "what was previously inconceivable. The lower two enhance a task; the upper two transform it. " +
      "The reflection considers which levels their described use sits at — often several — and what " +
      "that means.",
    goodFor:
      "Education and technology-adoption studies — how a tool is changing a practice.",
  },
];
