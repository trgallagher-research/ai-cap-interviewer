"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startScan } from "@/lib/scanner-client";

export function NewScan({
  studies,
  budgetDefault,
  budgetMax,
}: {
  studies: { id: string; title: string }[];
  budgetDefault: number;
  budgetMax: number;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [budget, setBudget] = useState(budgetDefault);
  const [studyId, setStudyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!question.trim()) {
      setError("Describe the landscape you want to scan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { runId } = await startScan({
        question: question.trim(),
        budgetUsd: budget,
        studyId: studyId || undefined,
      });
      router.push(`/scans/${runId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">New scan</div>
        <Link href="/scans">
          <button className="secondary">← Scans</button>
        </Link>
      </header>

      <div style={{ marginTop: 24 }}>
        <label>
          What landscape do you want to map?
          <span className="hint">
            A plain-English question. The scan finds the entities, profiles them, and
            verifies every claim against a real source.
          </span>
          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. entrepreneurship training programmes for young people in Kenya, current and past"
          />
        </label>

        <label>
          Budget (USD)
          <span className="hint">
            A typical scan spends ~$0.50–$2. The scan hard-stops at this cap (and can be
            resumed). Max ${budgetMax.toFixed(2)}.
          </span>
          <input
            type="number"
            min={0.5}
            max={budgetMax}
            step={0.5}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || budgetDefault)}
            style={{
              font: "inherit",
              padding: "11px 13px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--card)",
              width: 140,
            }}
          />
        </label>

        {studies.length > 0 && (
          <label>
            Link to a study <span className="hint">optional</span>
            <select
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              style={{
                font: "inherit",
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "var(--card)",
              }}
            >
              <option value="">No link — standalone scan</option>
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <div style={{ marginTop: 16 }}>
          <button onClick={run} disabled={busy || !question.trim()}>
            {busy ? "Starting…" : "Start scan →"}
          </button>
        </div>
      </div>
    </main>
  );
}
