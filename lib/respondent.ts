// Browser-side client for the respondent flow (Phase 1). Talks to the
// interviewId-based persistence routes; the server owns the guide + transcript.

import type { RespondentReport, FrameworkReflection } from "@/lib/types";

export async function startInterview(
  studyId: string,
): Promise<{ interviewId?: string; refCode?: string; full?: boolean }> {
  const r = await fetch("/api/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studyId }),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to start"));
  return r.json();
}

interface TurnHandlers {
  onDelta: (text: string) => void;
  onDone: (info: { completed: boolean; coverage: string[] }) => void;
}

/** Stream one interviewer turn. Pass the respondent's answer, or undefined for the
 *  opening turn. Pass `{ endNow: true }` to ask the interviewer to wrap up gracefully. */
export async function streamTurn(
  interviewId: string,
  answer: string | undefined,
  handlers: TurnHandlers,
  opts?: { endNow?: boolean },
): Promise<void> {
  const r = await fetch("/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId, answer, endNow: opts?.endNow ?? false }),
  });
  if (!r.ok || !r.body) throw new Error(await errText(r, "Interview stream failed"));

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === "delta") handlers.onDelta(payload.text);
      else if (event === "done") handlers.onDone(payload);
      else if (event === "error") throw new Error(payload.message);
    }
  }
}

export async function submitEmailPrefs(
  interviewId: string,
  prefs: {
    email: string;
    wantsIndividual: boolean;
    wantsAggregate: boolean;
    wantsAnalysis?: boolean;
  },
): Promise<void> {
  const r = await fetch("/api/interview/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId, ...prefs }),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to save email"));
}

/** Generate (or fetch cached) the respondent's framework reflection once the interview ends,
 *  when the study has a lens configured. Fire-and-forget from the completion screen so it's
 *  cached by the time they opt in; returns null when there's no framework or too little said. */
export async function generateAnalysis(
  interviewId: string,
): Promise<{ analysis: FrameworkReflection | null; skipped?: string }> {
  const r = await fetch("/api/interview/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to build reflection"));
  return r.json();
}

/** Generate (or fetch cached) the respondent's own summary once the interview ends.
 *  Returns null when there's too little to summarise (the UI shows a plain thank-you). */
export async function generateReport(
  interviewId: string,
): Promise<{ report: RespondentReport | null; tooShort?: boolean }> {
  const r = await fetch("/api/interview/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to build summary"));
  return r.json();
}

async function errText(r: Response, fallback: string): Promise<string> {
  try {
    return (await r.json()).error || fallback;
  } catch {
    return `${fallback} (${r.status})`;
  }
}
