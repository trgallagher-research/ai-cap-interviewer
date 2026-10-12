// Shared types across the three stages. The whole session state lives in the
// browser and is passed to the stateless API routes as needed.

export interface Objective {
  id: string;
  text: string;
  /** Why this objective matters — guides the interviewer's probing. */
  intent: string;
}

export interface Guide {
  strategy: string;
  objectives: Objective[];
}

/** Respondent-facing landing copy, generated alongside the guide. Deliberately
 *  separate from the (researcher-facing) guide so the internal objectives are
 *  never exposed to respondents. */
export interface Intro {
  /** High-level, respondent-safe purpose — what we want to understand and why. */
  purpose: string;
  /** What the conversation will be like (one question at a time, own words, etc.). */
  whatToExpect: string;
  /** Rough duration in minutes, used for the progress estimate. */
  minutes: number;
}

/** Which interpretive lens a study's optional respondent-facing framework reflection uses.
 *  `null`/absent = feature off for the study. `custom` pairs with a creator-supplied
 *  definition (see `CustomFramework`). */
export type AnalysisFramework = "sdt" | "cyborg_centaur" | "samr" | "custom";

/** Creator-supplied lens for `analysis_framework = 'custom'`: a short name and a plain
 *  definition of the framework, injected into the guardrailed reflection prompt. */
export interface CustomFramework {
  name: string;
  definition: string;
}

/** A full study draft produced by the prompt-driven builder in one generation pass:
 *  the researcher-facing guide plus the respondent-facing intro and the extracted
 *  title/topic/goals. (The optional framework lens is chosen separately in the builder,
 *  not drafted by the AI — see AnalysisFramework.) */
export interface StudyDraft {
  title: string;
  topic: string;
  goals: string[];
  strategy: string;
  objectives: Objective[];
  intro: Intro;
}

export type Role = "interviewer" | "respondent";

export interface Turn {
  role: Role;
  text: string;
}

export interface Theme {
  title: string;
  summary: string;
  /** Qualitative prevalence, e.g. "central", "recurring", "mentioned once". */
  prevalence: string;
}

export interface Quote {
  text: string;
  /** Which theme this verbatim quote illustrates. */
  theme: string;
}

export interface CoverageItem {
  objectiveId: string;
  addressed: boolean;
  /** Short note on how/where it was (or wasn't) covered. */
  evidence: string;
}

export interface Synthesis {
  themes: Theme[];
  quotes: Quote[];
  coverage: CoverageItem[];
}

/** Respondent-facing summary of their OWN interview — shown on the completion screen
 *  and optionally emailed. Deliberately has NO objectives or coverage: it must never
 *  expose the research agenda (unlike the creator-facing Synthesis above). */
export interface RespondentReport {
  /** Warm one-liner, e.g. "Thanks — here's what you shared". */
  headline: string;
  /** 2–3 sentence plain-language recap of the conversation, second person, no jargon. */
  summary: string;
  /** A few things that came through, in the respondent's own framing. */
  highlights: { title: string; detail: string }[];
  /** Brief warm sign-off. */
  closing: string;
}

/** Respondent-facing framework reflection — the respondent's OWN answers read through a
 *  chosen interpretive lens (SDT, Cyborg/Centaur, SAMR, or a custom framework), emailed to
 *  those who opt in. Deliberately interpretive (unlike RespondentReport) but still grounded:
 *  built from the transcript only, never the guide, so the research agenda cannot leak. The
 *  shape is lens-agnostic — `sections` carries one labelled reading per element of the
 *  framework (e.g. the three SDT needs). */
export interface FrameworkReflection {
  headline: string;
  /** Brief plain-language framing of the lens, second person, no jargon. */
  intro: string;
  /** One reading per framework element: `label` names it, `reading` is the reflection,
   *  `grounding` ties it to what they actually said. */
  sections: { label: string; reading: string; grounding: string }[];
  closing: string;
}

/** Respondent-facing, lay-audience rendering of a study's overall findings, emailed to
 *  participants who opted in. Derived from the creator synthesis themes/quotes only —
 *  no objective coverage, no methodology. */
export interface PublicAggregateReport {
  headline: string;
  intro: string;
  findings: { title: string; detail: string }[];
  closing: string;
}

// --- Landscape scan report ---------------------------------------------------
// Mirrors the engine's pydantic models (landscape-scanner src/scanner/models.py).
// The website stores the engine's Report.model_dump() verbatim in scans.report and
// renders it natively, so these shapes must track the engine's.

export type ScanVerdict = "verified" | "unverified";
export type ScanConfidenceLevel = "high" | "medium" | "low";

/** A source attached to an entity (page text stripped before it reaches a report). */
export interface ScanSourceRef {
  url: string;
  title?: string;
  snippet?: string;
  index?: string;
  retrieved_at?: string;
  scrape_status?: "scraped" | "unreachable" | "not_attempted";
}

/** One atomic, checkable statement. Verified claims carry a verbatim supporting quote. */
export interface ScanClaim {
  label?: string;
  text: string;
  verdict: ScanVerdict;
  supporting_span?: string | null;
  source_url?: string | null;
  method?: string | null;
  note?: string;
}

export interface ScanConfidence {
  level: ScanConfidenceLevel;
  basis?: string;
}

export interface ScanEntityCard {
  name: string;
  form?: string;
  segment?: string;
  one_liner?: string;
  features: ScanClaim[];
  confidence: ScanConfidence;
  quarantined?: boolean;
  cross_index_agreement?: boolean;
  deep_profiled?: boolean;
  sources: ScanSourceRef[];
  limitations?: string;
}

export interface ScanSegmentSummary {
  label: string;
  description?: string;
  entity_names: string[];
}

export interface ScanOverview {
  headline?: string;
  segments: ScanSegmentSummary[];
  key_players: string[];
  crowded_areas: string[];
  gaps: string[];
  confidence_counts: Record<string, number>;
}

export interface ScanCostSummary {
  total_usd: number;
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  by_task: Record<string, number>;
}

export interface ScanProviderManifest {
  search_providers: Record<string, boolean>;
  models_by_task: Record<string, string>;
  demo_mode: boolean;
  notes: string[];
}

export interface ScanRunConfig {
  question: string;
  geography: string[];
  budget_usd: number;
  model_profile: string;
}

/** The full finished report — what the engine returns and the UI renders natively. */
export interface ScanReport {
  run_config: ScanRunConfig;
  created_at: string;
  overview: ScanOverview;
  entities: ScanEntityCard[];
  long_tail: ScanEntityCard[];
  manifest: ScanProviderManifest;
  cost: ScanCostSummary;
  coverage_notes: string[];
}

export type ScanState = "starting" | "running" | "done" | "halted" | "error";

/** The status shape our /api/studio/scan/[runId]/status route returns (camelCased). */
export interface ScanStatusResponse {
  runId: string;
  state: ScanState;
  stage: string;
  detail: string;
  profiled: number;
  shortlistTotal: number;
  spentUsd: number;
  budgetUsd: number;
  error: string | null;
}
