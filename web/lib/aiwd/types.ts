/* types.ts: shared data shapes for the AI at Work Diagnostic (see prototype/docs/architecture.md).
 * No runtime code; safe to import from client and server. */

export type DomainKey = "writing" | "prep" | "analysis" | "thinking" | "client" | "learning" | "admin" | "building";
export type Stance = "enthusiast" | "pragmatic" | "cautious" | "sceptical" | "worried";
export type Phase = "orient" | "practice" | "stretch" | "rate" | "close";
export type DivergenceKind = "aligned" | "confident-starter" | "cautious-practitioner" | "unrated";
export type Band = "low" | "moderate" | "high" | "none";
export type InterviewStatus = "in_progress" | "rating" | "complete" | "ended_early";
export type ProfileSource = "seed" | "live" | "imported";

/** Opening questionnaire answers. Skipped questions are absent. */
export interface Answers {
  frequency?: string;
  uses?: string[];
  tools?: string[];
  toolsOther?: string;
  stance?: string;
  offer?: string[];
  offerOther?: string;
  pay?: string;
  canShow?: string;
}

export interface Member {
  name: string;
  role: string;
}

export interface Turn {
  role: "interviewer" | "member";
  text: string;
  tapped?: boolean;
}

export interface RateItem {
  id: string;
  task: string;
  level: number;
  beyond?: number;
}

export type Ratings = Record<string, number>;

export interface ParsedTurn {
  visible: string;
  phase: Phase | null;
  rateItems: RateItem[] | null;
  chips: string[] | null;
  complete: boolean;
}

export interface TurnResult {
  visible: string;
  phase: Phase;
  rateItems: RateItem[] | null;
  chips: string[] | null;
  complete: boolean;
}

/** Serialised Interview (Interview.toJSON). */
export interface InterviewState {
  member: Member;
  answers: Answers | null;
  chips: string[] | null;
  turns: Turn[];
  phase: Phase;
  rateItems: RateItem[] | null;
  ratings: Ratings | null;
  status: InterviewStatus;
  interviewerCount: number;
  afterRateCount: number;
  rateRetries: number;
  forcedRateAttempts: number;
  startedAt: string;
}

export interface QuestionOption {
  key: string;
  label: string;
  hint?: string;
  exclusive?: boolean;
}

export interface Question {
  id: string;
  type: "single" | "multi";
  required?: boolean;
  other?: boolean;
  skipIf?: Record<string, string[]>;
  skipIfEmpty?: string[];
  label: string;
  options: QuestionOption[];
}

export interface Domain {
  key: DomainKey;
  label: string;
  hint: string;
}

export interface LadderStep {
  level: number;
  label: string;
  short: string;
}

export interface ConfidenceItem {
  id: string;
  task: string;
  level: number;
  beyond?: number;
  rating?: number;
}

export interface Divergence {
  kind: DivergenceKind | string;
  note: string;
  expected?: number | null;
  residual?: number | null;
}

export interface NextStep {
  title: string;
  detail: string;
}

export interface Feedback {
  headline: string;
  summary: string;
  strengths: string[];
  nextSteps: NextStep[];
  closing: string;
}

export interface SelfReport {
  frequency: string;
  domains: string[];
  tools: string[];
  canShow: string;
}

export interface ProductSignals {
  wouldPayFor: string;
  offerKeys?: string[];
  pay?: string;
  quote: string;
}

/** The one record everything else reads. */
export interface Profile {
  id: string;
  createdAt: string;
  source: ProfileSource | string;
  importedAt?: string;
  member: { name: string; role: string; org: string };
  practice: {
    level: number;
    levelLabel: string;
    summary: string;
    domains: { key: string; evidence: string }[];
    tools: string[];
    judgement: string;
    probedNoEpisode?: string[];
    stance: Stance | string;
  };
  confidence: {
    items: ConfidenceItem[];
    mean: number | null;
    band: Band | string;
    pattern: string;
  };
  divergence: Divergence;
  wants: string[];
  offers: string[];
  productSignals: ProductSignals;
  questionnaire?: Answers | null;
  selfReport?: SelfReport | null;
  feedback: Feedback;
  quotes: string[];
  transcript?: Turn[];
  endedEarly?: boolean;
}

/** What /api/interview/finish returns to the member. Never level, divergence, stance or quotes. */
export interface MemberResult {
  feedback: Feedback;
  ratings: { task: string; rating: number | null }[];
  endedEarly: boolean;
}

export interface QuestionnaireStats {
  frequency: Record<string, number>;
  offer: Record<string, number>;
  pay: Record<string, number>;
  selfDomains: Record<string, number>;
  claimedNoEpisode: Record<string, number>;
  probedNoEpisode: Record<string, number>;
  answered: number;
}

export interface Stats {
  n: number;
  questionnaire: QuestionnaireStats;
  byLevel: number[];
  byDomain: Record<string, number>;
  strongByDomain: Record<string, number>;
  gaps: string[];
  byStance: Record<string, number>;
  byDivergence: Record<string, number>;
  meanConfidence: number | null;
  wants: string[];
  offers: string[];
  wouldPayFor: string[];
}

export interface HelpEntry {
  domain: string;
  label: string;
  helpers: Profile[];
  seekers: Profile[];
}

/** Minimal chat message shape (compatible with Anthropic.MessageParam). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type LlmTier = "interview" | "reasoning";

/** Injected LLM: the system block goes in `system`, the transcript in `messages`. */
export interface Llm {
  chat(system: string, messages: ChatMessage[], opts: { onText?: (visible: string) => void; tier: LlmTier }): Promise<{ text: string }>;
}

/** Product read shape (prompts.buildProductReadPrompt). */
export interface ProductRead {
  verdict?: string;
  demand?: string[];
  options?: { name?: string; forWhom?: string; shape?: string; evidence?: string; risk?: string }[];
  notSupported?: string[];
  nextTest?: string;
}

/** Share-back shape (prompts.buildSharebackPrompt). */
export interface Shareback {
  title?: string;
  intro?: string;
  picture?: string;
  findings?: { title: string; detail: string }[];
  quotes?: string[];
  helpMap?: { need: string; whoCanHelp: string }[];
  tryThisWeek?: { title: string; detail: string }[];
  closing?: string;
}

/** Cached generate result (organiser API). */
export interface GeneratedResult<T = unknown> {
  n: number;
  samples: number;
  at: string;
  result: T;
  edited?: boolean;
}
