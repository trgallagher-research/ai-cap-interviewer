"use client";

import { useEffect, useRef, useState } from "react";
import {
  startInterview,
  streamTurn,
  submitEmailPrefs,
  generateReport,
  generateAnalysis,
} from "@/lib/respondent";
import { VoiceButton } from "@/app/components/VoiceButton";
import type { Intro, Objective, RespondentReport } from "@/lib/types";

interface Props {
  studyId: string;
  topic: string;
  objectives: Objective[];
  intro: Intro;
  consentText: string;
  /** Server-resolved: false hides the mic entirely when no transcription key is set. */
  voiceEnabled: boolean;
  /** Display label of the study's optional framework reflection, or null when none. */
  framework: string | null;
}

interface Msg {
  role: "interviewer" | "respondent";
  text: string;
}

type Phase = "landing" | "consent" | "interviewing" | "complete" | "full";

export function Respondent({ studyId, topic, objectives, intro, consentText, voiceEnabled, framework }: Props) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1, monotonic
  const [confirmExit, setConfirmExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [report, setReport] = useState<RespondentReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [wantsIndividual, setWantsIndividual] = useState(true);
  const [wantsAggregate, setWantsAggregate] = useState(false);
  const [wantsAnalysis, setWantsAnalysis] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function appendDelta(text: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "interviewer") {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...prev, { role: "interviewer", text }];
    });
  }

  // Map covered objectives to a monotonic progress fraction. The coverage signal
  // can be lumpy and is hidden from the respondent — they only ever see the bar.
  function advanceProgress(coveredIds: string[], completed: boolean) {
    const total = Math.max(objectives.length, 1);
    const raw = completed ? 1 : Math.min(coveredIds.length / total, 0.92);
    setProgress((p) => Math.max(p, raw));
  }

  async function runTurn(id: string, answer?: string, endNow?: boolean) {
    setBusy(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "interviewer", text: "" }]);
    try {
      await streamTurn(id, answer, {
        onDelta: appendDelta,
        onDone: ({ completed, coverage: ids }) => {
          advanceProgress(ids, completed);
          if (completed) {
            setPhase("complete");
            void loadReport(id);
            // If the study has a framework lens, warm the cache now so the opt-in email
            // send is instant. Fire-and-forget; failures are non-fatal (the email route
            // regenerates on demand if needed).
            if (framework) void generateAnalysis(id).catch(() => {});
          }
        },
      }, { endNow });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    if (startedRef.current) return;
    startedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await startInterview(studyId);
      if (res.full) {
        setPhase("full");
        return;
      }
      setInterviewId(res.interviewId!);
      setRefCode(res.refCode ?? null);
      setPhase("interviewing");
      await runTurn(res.interviewId!); // opening question
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      startedRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  function send() {
    if (!interviewId || !draft.trim() || busy) return;
    const answer = draft.trim();
    setDraft("");
    setMessages((prev) => [...prev, { role: "respondent", text: answer }]);
    void runTurn(interviewId, answer);
  }

  function endEarly() {
    if (!interviewId || busy) return;
    setConfirmExit(false);
    // No answer — ask the interviewer to wrap up gracefully in one closing turn.
    void runTurn(interviewId, undefined, true);
  }

  // Generate the respondent's own summary once the interview ends. Non-fatal: if it
  // fails or there's too little to summarise, we just fall back to a plain thank-you.
  async function loadReport(id: string) {
    setReportLoading(true);
    try {
      const { report: r } = await generateReport(id);
      setReport(r);
    } catch {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  async function saveEmail() {
    if (!interviewId || !email.trim()) return;
    setError(null);
    try {
      await submitEmailPrefs(interviewId, {
        email: email.trim(),
        // Can only email a copy if a summary was actually produced.
        wantsIndividual: !!report && wantsIndividual,
        wantsAggregate,
        // Only meaningful when the study has a framework lens.
        wantsAnalysis: !!framework && wantsAnalysis,
      });
      setEmailDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const minutesLeft = Math.max(1, Math.round(intro.minutes * (1 - progress)));
  const progressLabel =
    phase === "complete" || progress >= 1
      ? "Complete"
      : progress >= 0.9
        ? "Almost done"
        : `~${minutesLeft} min left (estimated)`;

  if (phase === "landing") {
    return (
      <main className="shell" style={{ maxWidth: 640, justifyContent: "center" }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>{topic}</h1>
          <p className="lede">{intro.purpose}</p>
          <p style={{ color: "var(--ink)" }}>{intro.whatToExpect}</p>
          <p className="hint" style={{ marginBottom: 20 }}>
            Takes about {intro.minutes} minutes · you can stop any time
          </p>
          {error && <p className="error">{error}</p>}
          <button onClick={() => setPhase("consent")}>Continue →</button>
        </div>
      </main>
    );
  }

  if (phase === "consent") {
    return (
      <main className="shell" style={{ maxWidth: 640, justifyContent: "center" }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Before we begin</h1>
          <p className="lede" style={{ whiteSpace: "pre-wrap" }}>{consentText}</p>
          <p className="hint">
            Read our <a href="/privacy" target="_blank">privacy notice</a>.
          </p>
          {error && <p className="error">{error}</p>}
          <div className="center-actions">
            <button className="secondary" onClick={() => setPhase("landing")}>
              ← Back
            </button>
            <button onClick={begin} disabled={busy}>
              {busy ? "Starting…" : "I agree — begin"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "full") {
    return (
      <main className="shell" style={{ justifyContent: "center" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>This study is full</h1>
          <p className="lede" style={{ margin: "0 auto" }}>
            Thank you for your interest — we’ve reached the number of responses we
            need. Please check back another time.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">{topic}</div>
        {phase === "complete" && <span className="badge">Complete</span>}
      </header>

      <section className="interview">
        <div className="progress" aria-label={`Progress: ${progressLabel}`}>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="progress-label">{progressLabel}</span>
        </div>

        <div className="transcript" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              <span className="who">
                {m.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <p>{m.text || (busy && m.role === "interviewer" ? "…" : "")}</p>
            </div>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {phase === "complete" ? (
          <div className="card" style={{ marginTop: 16 }}>
            {emailDone ? (
              <p className="done-note">
                Thank you — your responses have been saved. You can close this
                window.
                {refCode && (
                  <>
                    {" "}
                    Your reference code is <strong>{refCode}</strong> — quote it if
                    you ever want your responses deleted.
                  </>
                )}
              </p>
            ) : (
              <>
                {reportLoading && (
                  <p className="lede" style={{ marginTop: 0 }}>
                    Putting together a short summary of what you shared…
                  </p>
                )}
                {report && (
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ marginTop: 0 }}>{report.headline}</h2>
                    <p>{report.summary}</p>
                    {report.highlights.length > 0 && (
                      <ul style={{ paddingLeft: 20 }}>
                        {report.highlights.map((h, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <strong>{h.title}</strong> — {h.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p style={{ marginBottom: 0 }}>{report.closing}</p>
                  </div>
                )}
                <p style={{ marginTop: report ? 16 : 0 }}>
                  {report
                    ? "Want this summary by email, or to hear the study’s overall findings later? Leave your email (optional):"
                    : "Thank you — that’s the end of the interview. If you’d like to hear about what we learn (optional), leave your email:"}
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com (optional)"
                  style={{
                    width: "100%",
                    font: "inherit",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    margin: "12px 0",
                  }}
                >
                  {report && (
                    <label className="opt-in">
                      <input
                        type="checkbox"
                        checked={wantsIndividual}
                        onChange={(e) => setWantsIndividual(e.target.checked)}
                      />
                      Email me a copy of this summary
                    </label>
                  )}
                  <label className="opt-in">
                    <input
                      type="checkbox"
                      checked={wantsAggregate}
                      onChange={(e) => setWantsAggregate(e.target.checked)}
                    />
                    Email me the study’s overall findings when they’re ready
                  </label>
                  {framework && (
                    <label className="opt-in">
                      <input
                        type="checkbox"
                        checked={wantsAnalysis}
                        onChange={(e) => setWantsAnalysis(e.target.checked)}
                      />
                      Email me a reflection on your interview (through {framework})
                    </label>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEmail} disabled={!email.trim()}>
                    Submit
                  </button>
                  <button className="secondary" onClick={() => setEmailDone(true)}>
                    Skip
                  </button>
                </div>
                {refCode && (
                  <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
                    Reference code <strong>{refCode}</strong> — keep it to{" "}
                    <a href="/delete" target="_blank">request deletion</a> of your
                    responses.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="composer">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy ? "Interviewer is responding…" : "Type or speak your answer…"}
                disabled={busy}
              />
              {interviewId && (
                <VoiceButton
                  interviewId={interviewId}
                  enabled={voiceEnabled}
                  disabled={busy}
                  onText={(t) =>
                    setDraft((d) => (d.trim() ? `${d.trim()} ${t}` : t))
                  }
                />
              )}
              <button onClick={send} disabled={busy || !draft.trim()}>
                Send
              </button>
            </div>
            <div className="finish-bar">
              {confirmExit ? (
                <>
                  <span className="note">
                    End the interview now? We’ll keep everything you’ve shared.
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button
                      className="secondary"
                      onClick={() => setConfirmExit(false)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button onClick={endEarly} disabled={busy}>
                      End now
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="note">Need to stop early? That’s fine.</span>
                  <button
                    className="secondary"
                    onClick={() => setConfirmExit(true)}
                    disabled={busy}
                  >
                    Wrap up now
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
