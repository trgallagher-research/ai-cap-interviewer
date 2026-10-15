/* Member-side API client (contract: web/docs/contract.md, "Member API"). */

export interface RateItem {
  id: string;
  task: string;
  level?: number;
  beyond?: number;
}

export interface Turn {
  role: "interviewer" | "member";
  text: string;
  tapped?: boolean;
}

export interface AppConfig {
  voice: boolean;
  memberCodeRequired: boolean;
  storage: "redis" | "memory";
  /** The organiser's setting: ask for an email (required/optional) or not at all. */
  emailMode?: "required" | "optional" | "none";
  emailSending?: boolean;
  /** The organiser members can reach (empty when not configured). */
  contactName?: string;
  contactEmail?: string;
  /** True when report-email replies go to the contact address. */
  repliesToContact?: boolean;
  /** Days before survey data is deleted. */
  retentionDays?: number;
  /** Language the start page opens in when the member has not chosen one. */
  defaultLang?: "nl" | "en";
}

export interface InterviewStateResponse {
  lang?: "nl" | "en";
  member: { name: string; role: string };
  answers: Record<string, unknown>;
  turns: Turn[];
  phase: string;
  status: string;
  rateItems: RateItem[] | null;
  chips: string[] | null;
  ratingsSubmitted: boolean;
  finished: boolean;
}

export interface Feedback {
  headline: string;
  summary: string;
  strengths: string[];
  nextSteps: { title: string; detail: string; steps?: string[] }[];
  calibration?: string;
  followUp?: string;
  closing: string;
}

export interface FinishResponse {
  feedback: Feedback;
  ratings: { task: string; rating: number | null }[];
  endedEarly: boolean;
  reportToken?: string;
  emailState?: string;
}

export interface TurnDone {
  phase: string;
  rateItems: RateItem[] | null;
  chips: string[] | null;
  complete: boolean;
  /** The final visible message (the stream may stop early when the engine retries). */
  text?: string;
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function errorFrom(r: Response): Promise<ApiError> {
  const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
  return new ApiError(j.error || `Request failed (${r.status})`, j.code, r.status);
}

export async function getConfig(): Promise<AppConfig> {
  const r = await fetch("/api/config", { cache: "no-store" });
  if (!r.ok) throw await errorFrom(r);
  return (await r.json()) as AppConfig;
}

export async function startInterview(body: {
  name: string;
  role: string;
  answers: Record<string, unknown>;
  accessCode?: string;
  email?: string;
  lang?: "nl" | "en";
}): Promise<{ interviewId: string }> {
  const r = await fetch("/api/interview/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw await errorFrom(r);
  return (await r.json()) as { interviewId: string };
}

export async function getState(id: string): Promise<InterviewStateResponse> {
  const r = await fetch("/api/interview/state?id=" + encodeURIComponent(id), { cache: "no-store" });
  if (!r.ok) throw await errorFrom(r);
  return (await r.json()) as InterviewStateResponse;
}

export async function finishInterview(interviewId: string): Promise<FinishResponse> {
  const r = await fetch("/api/interview/finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });
  if (!r.ok) throw await errorFrom(r);
  return (await r.json()) as FinishResponse;
}

/**
 * One interviewer turn over SSE. `onDelta` receives each new piece of visible text to append.
 * Resolves with the `done` payload; rejects with ApiError on an HTTP error or an `error` event.
 */
export async function runTurn(
  body: { interviewId: string; answer?: string; tapped?: boolean; ratings?: Record<string, number>; endNow?: boolean },
  onDelta: (text: string) => void,
): Promise<TurnDone> {
  const r = await fetch("/api/interview/turn", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) throw await errorFrom(r);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const st: { done: TurnDone | null; failure: ApiError | null } = { done: null, failure: null };

  const handle = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) return;
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(data.join("\n")) as Record<string, unknown>;
    } catch {
      return;
    }
    if (event === "delta") {
      if (typeof payload.text === "string" && payload.text) onDelta(payload.text);
    } else if (event === "done") {
      st.done = payload as unknown as TurnDone;
    } else if (event === "error") {
      st.failure = new ApiError(String(payload.message || "The interviewer could not answer"), payload.code as string | undefined);
    }
  };

  for (;;) {
    const { value, done: end } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    buf = buf.replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      handle(buf.slice(0, idx));
      buf = buf.slice(idx + 2);
    }
    if (end) break;
  }
  if (buf.trim()) handle(buf);
  if (st.failure) throw st.failure;
  if (!st.done) throw new ApiError("The connection closed before the interviewer finished. Try again.", "failed");
  return st.done;
}
