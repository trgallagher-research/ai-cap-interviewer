"use client";

/* The opening questionnaire, rendered entirely from QUESTIONNAIRE, one PAGES entry at a time
 * (port of renderQuestionnaire in prototype/src/member.js, now paged). Skipped questions hide live
 * and are dropped from the answers; exclusive options untick the others and vice versa. Statement
 * items (views, skills, scenarios, support) render as compact rows of answer pills. */

import { useEffect, useMemo, useRef, useState } from "react";
import { PAGES, QUESTIONNAIRE, QUESTION_ORDER, questionSkipped } from "@/lib/aiwd/prompts";
import { STRINGS, type Lang } from "./i18n";
import { PhaseHint } from "./PhaseHint";
import { PAGES_NL, QUESTIONS_NL } from "./questionnaire-nl";

export type Answers = Record<string, string | string[]>;

interface QOption {
  key: string;
  label: string;
  hint?: string;
  exclusive?: boolean;
}
interface QDef {
  id: string;
  type: "single" | "multi" | "text";
  required?: boolean;
  other?: boolean;
  label: string;
  options: QOption[];
  block?: string;
  sub?: string;
  max?: number;
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
    else if (q.type === "text") {
      if (typeof v === "string" && v.trim()) a[qid] = v.trim();
    } else if (typeof v === "string" && v) a[qid] = v;
    const other = raw[qid + "Other"];
    if (q.other && typeof other === "string" && other.trim()) a[qid + "Other"] = other.trim();
  }
  return a;
}

interface Props {
  lang: Lang;
  member: { name: string; role: string };
  initial: Answers;
  busy: boolean;
  error: React.ReactNode;
  onChange: (answers: Answers) => void;
  onSubmit: (answers: Answers) => void;
}

export function Questionnaire({ lang, member, initial, busy, error, onChange, onSubmit }: Props) {
  const t = STRINGS[lang];
  const nl = lang === "nl";
  const qLabel = (qid: string, q: QDef) => (nl && QUESTIONS_NL[qid]?.label) || q.label;
  const qSub = (qid: string, q: QDef) => (nl && QUESTIONS_NL[qid]?.sub) || q.sub;
  const oLabel = (qid: string, o: QOption) => (nl && QUESTIONS_NL[qid]?.options?.[o.key]) || o.label;
  const oHint = (qid: string, o: QOption) => (nl && QUESTIONS_NL[qid]?.hints?.[o.key]) || o.hint;
  const [raw, setRaw] = useState<Answers>(() => ({ ...initial }));
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const setsRef = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const topRef = useRef<HTMLDivElement | null>(null);
  const answers = useMemo(() => deriveAnswers(raw), [raw]);
  const last = page === PAGES.length - 1;
  const pg = PAGES[page];

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

  function setText(key: string, v: string) {
    setRaw((prev) => ({ ...prev, [key]: v }));
  }

  /** Required questions on the current page; focuses the first unanswered one. */
  function pageValid(): boolean {
    const bad: Record<string, boolean> = {};
    let firstBad: string | null = null;
    for (const qid of pg.qids) {
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
    if (!firstBad) return true;
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
    return false;
  }

  function go(to: number) {
    setPage(to);
    setInvalid({});
    topRef.current?.scrollIntoView?.({ block: "start" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !pageValid()) return;
    if (!last) return go(page + 1);
    onSubmit(answers);
  }

  function renderQuestion(qid: string) {
    const q = Q[qid];
    if (!q) return null;
    const multi = q.type === "multi";
    const compact = !!q.block && q.block !== "scenario";
    const hide = skipped(qid, raw);
    const val = raw[qid];
    const sub = q.sub && !hide ? (
      <h3 className="q-sub" key={qid + "-sub"}>
        {qSub(qid, q)}
      </h3>
    ) : null;
    const fieldset = (
      <fieldset
        key={qid}
        className={"q" + (compact ? " q-item" : "") + (invalid[qid] ? " invalid" : "")}
        id={"q-" + qid}
        data-qid={qid}
        hidden={hide}
        ref={(n) => {
          setsRef.current[qid] = n;
        }}
      >
        <legend>
          {qLabel(qid, q)}
          {q.required ? <span className="q-req">{t.qRequired}</span> : null}
        </legend>
        {q.type === "text" ? (
          <textarea
            className="input q-text"
            id={`q-${qid}-text`}
            rows={3}
            maxLength={q.max || 300}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setText(qid, e.target.value)}
          />
        ) : (
          <div className={"q-options" + (multi ? " multi" : "") + (compact ? " q-scale" : "")}>
            {q.options.map((o) => {
              const id = domId(`q-${qid}-${o.key}`);
              const checked = multi ? Array.isArray(val) && val.includes(o.key) : val === o.key;
              return (
                <label key={o.key} className={"opt" + (o.exclusive ? " opt-exclusive" : "") + (compact ? " pill" : "")} htmlFor={id}>
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
                    <span className="opt-label">{oLabel(qid, o)}</span>
                    {oHint(qid, o) ? <span className="opt-hint">{oHint(qid, o)}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {q.other ? (
          <label className="field q-other" htmlFor={`q-${qid}-other`}>
            <span className="small">{t.qOther}</span>
            <input
              className="input"
              type="text"
              id={`q-${qid}-other`}
              maxLength={120}
              value={typeof raw[qid + "Other"] === "string" ? (raw[qid + "Other"] as string) : ""}
              onChange={(e) => setText(qid + "Other", e.target.value)}
            />
          </label>
        ) : null}
        <p className="q-error" id={"q-err-" + qid} role="alert" hidden={!invalid[qid]}>
          {t.qChooseOne}
        </p>
      </fieldset>
    );
    return sub ? [sub, fieldset] : fieldset;
  }

  return (
    <div className="stack" id="questionnaire" data-page={pg.id} ref={topRef}>
      <div className="progress">
        <span>
          <PhaseHint step="quick" lang={lang} />
        </span>
        <span>
          {member.name}, {member.role}
        </span>
      </div>
      {page === 0 ? (
        <p className="lead">{t.qLead}</p>
      ) : null}
      <div className="stack-sm">
        <p className="eyebrow" id="q-step">
          {t.qPart(page + 1, PAGES.length)}
        </p>
        <h2 id="q-page-title">{(nl && PAGES_NL[pg.id]?.title) || pg.title}</h2>
        {page > 0 ? <p className="small">{(nl && PAGES_NL[pg.id]?.intro) || pg.intro}</p> : null}
      </div>

      <form className="stack q-form" id="q-form" noValidate onSubmit={submit}>
        {pg.qids.map(renderQuestion)}
        {error}
        <div className="row">
          {page > 0 ? (
            <button className="btn" type="button" id="btn-q-back" disabled={busy} onClick={() => go(page - 1)}>
              {t.qBack}
            </button>
          ) : null}
          {last ? (
            <button className="btn primary" type="submit" id="btn-q-continue" disabled={busy}>
              {busy ? t.qStarting : t.qContinue}
            </button>
          ) : (
            <button className="btn primary" type="submit" id="btn-q-next" disabled={busy}>
              {t.qNext}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
