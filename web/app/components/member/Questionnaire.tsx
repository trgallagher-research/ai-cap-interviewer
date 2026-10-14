"use client";

/* The opening questionnaire, rendered entirely from QUESTIONNAIRE in QUESTION_ORDER
 * (port of renderQuestionnaire in prototype/src/member.js). Skipped questions hide live and
 * are dropped from the answers; exclusive options untick the others and vice versa. */

import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONNAIRE, QUESTION_ORDER, questionSkipped } from "@/lib/aiwd/prompts";
import { PhaseHint } from "./PhaseHint";

export type Answers = Record<string, string | string[]>;

interface QOption {
  key: string;
  label: string;
  hint?: string;
  exclusive?: boolean;
}
interface QDef {
  id: string;
  type: "single" | "multi";
  required?: boolean;
  other?: boolean;
  label: string;
  options: QOption[];
}

const Q = QUESTIONNAIRE as unknown as Record<string, QDef>;
const ORDER = QUESTION_ORDER as readonly string[];
const skipped = (qid: string, a: Answers) => questionSkipped(qid as never, a as never) as boolean;

const domId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "_");

/** Raw form state → answers with skipped questions dropped (same rules as the prototype's sync()). */
export function deriveAnswers(raw: Answers): Answers {
  const a: Answers = {};
  for (const qid of ORDER) {
    const q = Q[qid];
    if (!q) continue;
    if (skipped(qid, raw)) continue;
    const v = raw[qid];
    if (q.type === "multi") a[qid] = Array.isArray(v) ? v : [];
    else if (typeof v === "string" && v) a[qid] = v;
    const other = raw[qid + "Other"];
    if (q.other && typeof other === "string" && other.trim()) a[qid + "Other"] = other.trim();
  }
  return a;
}

interface Props {
  member: { name: string; role: string };
  initial: Answers;
  busy: boolean;
  error: React.ReactNode;
  onChange: (answers: Answers) => void;
  onSubmit: (answers: Answers) => void;
}

export function Questionnaire({ member, initial, busy, error, onChange, onSubmit }: Props) {
  const [raw, setRaw] = useState<Answers>(() => ({ ...initial }));
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const setsRef = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const answers = useMemo(() => deriveAnswers(raw), [raw]);

  useEffect(() => {
    onChange(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  function toggle(qid: string, opt: QOption, checked: boolean) {
    const q = Q[qid];
    setRaw((prev) => {
      const next = { ...prev };
      if (q.type === "multi") {
        let cur = Array.isArray(prev[qid]) ? (prev[qid] as string[]).slice() : [];
        if (checked) {
          // Exclusive options untick the others, and ticking another unticks an exclusive one.
          const exclusiveKeys = q.options.filter((o) => o.exclusive).map((o) => o.key);
          cur = opt.exclusive ? [] : cur.filter((k) => !exclusiveKeys.includes(k));
          if (!cur.includes(opt.key)) cur.push(opt.key);
          // keep option order stable
          cur = q.options.map((o) => o.key).filter((k) => cur.includes(k));
        } else {
          cur = cur.filter((k) => k !== opt.key);
        }
        next[qid] = cur;
      } else {
        next[qid] = opt.key;
      }
      return next;
    });
    setInvalid((p) => (p[qid] ? { ...p, [qid]: false } : p));
  }

  function setOther(qid: string, v: string) {
    setRaw((prev) => ({ ...prev, [qid + "Other"]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const bad: Record<string, boolean> = {};
    let firstBad: string | null = null;
    for (const qid of ORDER) {
      const q = Q[qid];
      if (!q || !q.required || skipped(qid, answers)) continue;
      const v = answers[qid];
      const ok = Array.isArray(v) ? v.length > 0 : !!v;
      if (!ok) {
        bad[qid] = true;
        if (!firstBad) firstBad = qid;
      }
    }
    setInvalid(bad);
    if (firstBad) {
      const fs = setsRef.current[firstBad];
      const inp = fs?.querySelector("input");
      if (inp) {
        try {
          inp.focus({ preventScroll: true });
        } catch {
          inp.focus();
        }
      }
      fs?.scrollIntoView?.({ block: "center" });
      return;
    }
    onSubmit(answers);
  }

  return (
    <div className="stack" id="questionnaire">
      <div className="progress">
        <span>
          <PhaseHint step="quick" />
        </span>
        <span>
          {member.name}, {member.role}
        </span>
      </div>
      <p className="lead">A few quick questions first, about a minute. Then a short conversation about one or two real examples.</p>

      <form className="stack q-form" id="q-form" noValidate onSubmit={submit}>
        {ORDER.map((qid) => {
          const q = Q[qid];
          if (!q) return null;
          const multi = q.type === "multi";
          const hide = skipped(qid, raw);
          const val = raw[qid];
          return (
            <fieldset
              key={qid}
              className={"q" + (invalid[qid] ? " invalid" : "")}
              id={"q-" + qid}
              data-qid={qid}
              hidden={hide}
              ref={(n) => {
                setsRef.current[qid] = n;
              }}
            >
              <legend>
                {q.label}
                {q.required ? <span className="q-req"> (required)</span> : null}
              </legend>
              <div className={"q-options" + (multi ? " multi" : "")}>
                {q.options.map((o) => {
                  const id = domId(`q-${qid}-${o.key}`);
                  const checked = multi ? Array.isArray(val) && val.includes(o.key) : val === o.key;
                  return (
                    <label key={o.key} className={"opt" + (o.exclusive ? " opt-exclusive" : "")} htmlFor={id}>
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={"q-" + qid}
                        value={o.key}
                        id={id}
                        checked={checked}
                        data-exclusive={o.exclusive ? "1" : undefined}
                        onChange={(e) => toggle(qid, o, e.target.checked)}
                      />
                      <span className="opt-text">
                        <span className="opt-label">{o.label}</span>
                        {o.hint ? <span className="opt-hint">{o.hint}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
              {q.other ? (
                <label className="field q-other" htmlFor={`q-${qid}-other`}>
                  <span className="small">Other</span>
                  <input
                    className="input"
                    type="text"
                    id={`q-${qid}-other`}
                    maxLength={120}
                    value={typeof raw[qid + "Other"] === "string" ? (raw[qid + "Other"] as string) : ""}
                    onChange={(e) => setOther(qid, e.target.value)}
                  />
                </label>
              ) : null}
              <p className="q-error" id={"q-err-" + qid} role="alert" hidden={!invalid[qid]}>
                Please choose one.
              </p>
            </fieldset>
          );
        })}
        {error}
        <div className="row">
          <button className="btn primary" type="submit" id="btn-q-continue" disabled={busy}>
            {busy ? "Starting…" : "Continue to the conversation"}
          </button>
        </div>
      </form>
    </div>
  );
}
