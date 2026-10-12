"use client";

import { useEffect, useRef, useState } from "react";
import type { Objective, Synthesis } from "@/lib/types";

export function SynthesisPanel({
  studyId,
  objectives,
}: {
  studyId: string;
  objectives: Objective[];
}) {
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<{
    pending: number;
    sent: number;
    emailEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch(`/api/studio/${studyId}/synthesis`)
      .then((r) => r.json())
      .then((d) => {
        setSynthesis(d.synthesis);
        setGeneratedAt(d.generated_at);
      })
      .catch(() => {});
    fetch(`/api/studio/${studyId}/report/send`)
      .then((r) => r.json())
      .then((d) => setRecipients(d))
      .catch(() => {});
  }, [studyId]);

  async function sendAggregate() {
    setSendBusy(true);
    setSendMsg(null);
    try {
      const r = await fetch(`/api/studio/${studyId}/report/send`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to send");
      setSendMsg(
        `Sent ${d.sent}${d.failed ? `, ${d.failed} failed` : ""}.`,
      );
      const c = await fetch(`/api/studio/${studyId}/report/send`).then((x) =>
        x.json(),
      );
      setRecipients(c);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSendBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/studio/${studyId}/synthesis`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to generate synthesis");
      setSynthesis(d.synthesis);
      setGeneratedAt(d.generated_at);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const objText = (id: string) =>
    objectives.find((o) => o.id === id)?.text ?? id;

  return (
    <section style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Synthesis</h2>
        <button onClick={generate} disabled={busy}>
          {busy ? "Analysing…" : synthesis ? "Regenerate" : "Generate synthesis"}
        </button>
      </div>
      {generatedAt && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Generated {new Date(generatedAt).toLocaleString()}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {!synthesis && !busy && (
        <p className="lede" style={{ marginTop: 12 }}>
          No synthesis yet — generate one to see themes, quotes, and coverage
          across all responses.
        </p>
      )}

      {synthesis && (
        <div className="synthesis" style={{ marginTop: 16 }}>
          <div className="card">
            <p className="section-title">Emergent themes</p>
            {synthesis.themes.map((t, i) => (
              <div className="theme" key={i}>
                <div className="theme-head">
                  <h3>{t.title}</h3>
                  <span className="prevalence">{t.prevalence}</span>
                </div>
                <p>{t.summary}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="section-title">Illustrative quotes</p>
            {synthesis.quotes.map((q, i) => (
              <blockquote className="quote" key={i}>
                “{q.text}”<span className="quote-theme">— {q.theme}</span>
              </blockquote>
            ))}
          </div>
          <div className="card">
            <p className="section-title">Objective coverage</p>
            {synthesis.coverage.map((c, i) => (
              <div className="coverage-row" key={i}>
                <span className={`mark ${c.addressed ? "yes" : "no"}`}>
                  {c.addressed ? "✓" : "—"}
                </span>
                <div>
                  <div>{objText(c.objectiveId)}</div>
                  <div className="ev">{c.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <p className="section-title" style={{ margin: 0 }}>
              Aggregate report for respondents
            </p>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              A plain-language version of the findings, emailed to respondents who
              opted in
              {recipients
                ? ` · ${recipients.pending} waiting, ${recipients.sent} already sent`
                : ""}
              .
            </div>
          </div>
          <button
            onClick={sendAggregate}
            disabled={sendBusy || !recipients?.emailEnabled}
          >
            {sendBusy ? "Sending…" : "Send aggregate report"}
          </button>
        </div>
        {recipients && !recipients.emailEnabled && (
          <p className="hint" style={{ marginBottom: 0 }}>
            Email sending isn’t configured (set RESEND_API_KEY).
          </p>
        )}
        {sendMsg && (
          <p className="hint" style={{ marginBottom: 0 }}>
            {sendMsg}
          </p>
        )}
      </div>
    </section>
  );
}
