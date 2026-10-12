"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getScanReport, getScanStatus } from "@/lib/scanner-client";
import type { ScanReport, ScanState } from "@/lib/types";
import { ScanReportView } from "./ScanReport";

// Ported from the engine's STAGE_LABELS / STAGE_ORDER (app/runner.py).
const STAGES: { key: string; label: string }[] = [
  { key: "frame", label: "Planning searches" },
  { key: "discover", label: "Searching & finding entities" },
  { key: "triage", label: "Ranking candidates" },
  { key: "profile", label: "Profiling & verifying entities" },
  { key: "read", label: "Writing the overview" },
];

const TERMINAL: ScanState[] = ["done", "halted", "error"];

// Stop polling after this many consecutive failed status fetches (~15s at 3s each).
const MAX_POLL_FAILURES = 5;

export function ScanRun({
  runId,
  question,
  initialState,
  initialReport,
  spentUsd,
  budgetUsd,
}: {
  runId: string;
  question: string;
  initialState: ScanState;
  initialReport: ScanReport | null;
  spentUsd: number;
  budgetUsd: number;
}) {
  const [state, setState] = useState<ScanState>(initialState);
  const [stage, setStage] = useState("frame");
  const [detail, setDetail] = useState("");
  const [spent, setSpent] = useState(spentUsd);
  const [budget] = useState(budgetUsd);
  const [report, setReport] = useState<ScanReport | null>(initialReport);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const loadReport = useCallback(async () => {
    try {
      setReport(await getScanReport(runId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [runId]);

  useEffect(() => {
    // Already finished when the page loaded: fetch the report if we don't have it,
    // and don't start polling.
    if (TERMINAL.includes(initialState)) {
      if (initialState === "done" && !initialReport) loadReport();
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      if (stopped.current) return;
      try {
        const s = await getScanStatus(runId);
        failures = 0;
        setState(s.state);
        setStage(s.stage || "frame");
        setDetail(s.detail || "");
        setSpent(s.spentUsd);
        if (TERMINAL.includes(s.state)) {
          stopped.current = true;
          if (s.state === "done") await loadReport();
          else if (s.error) setError(s.error);
          return;
        }
      } catch (e) {
        // Give up after a run of failures rather than polling (and erroring)
        // forever — e.g. the scan service is down or the run was lost.
        failures += 1;
        if (failures >= MAX_POLL_FAILURES) {
          stopped.current = true;
          setError("Lost contact with the scan service — refresh to retry.");
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
      }
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [runId, initialState, initialReport, loadReport]);

  const stageIdx = STAGES.findIndex((s) => s.key === stage);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">Scan</div>
        <Link href="/scans">
          <button className="secondary">← Scans</button>
        </Link>
      </header>

      <h1 style={{ marginTop: 8 }}>{question}</h1>

      {state !== "done" && (
        <div className="card" style={{ marginTop: 12 }}>
          {state === "error" ? (
            <p className="error" style={{ margin: 0 }}>
              {error ?? "The scan failed."}
            </p>
          ) : state === "halted" ? (
            <p style={{ margin: 0 }}>
              <strong>Halted</strong> — the budget cap was reached. {error}
            </p>
          ) : (
            <>
              <ol className="scan-stages">
                {STAGES.map((s, i) => (
                  <li
                    key={s.key}
                    className={
                      i < stageIdx ? "done" : i === stageIdx ? "active" : ""
                    }
                  >
                    {s.label}
                  </li>
                ))}
              </ol>
              <p style={{ color: "var(--muted)", margin: "10px 0 0" }}>
                {detail || "Starting…"}
              </p>
            </>
          )}
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
            Spent ${spent.toFixed(2)} of ${budget.toFixed(2)}
          </p>
        </div>
      )}

      {error && state === "done" && <p className="error">{error}</p>}

      {report && (
        <div style={{ marginTop: 20 }}>
          <div className="scan-downloads">
            <span className="hint">Download:</span>
            <a
              className="scan-dl"
              href={`/api/studio/scan/${encodeURIComponent(runId)}/export?format=html`}
            >
              HTML
            </a>
            <a
              className="scan-dl"
              href={`/api/studio/scan/${encodeURIComponent(runId)}/export?format=docx`}
            >
              Word (.docx)
            </a>
          </div>
          <ScanReportView report={report} />
        </div>
      )}
    </main>
  );
}
