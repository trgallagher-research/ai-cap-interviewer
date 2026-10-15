"use client";

import { useMemo, useState } from "react";
import type { RateItem } from "./api";
import { STRINGS, type Lang } from "./i18n";

interface Props {
  items: RateItem[];
  lang: Lang;
  disabled?: boolean;
  onSubmit: (ratings: Record<string, number>) => void;
}

/** Confidence sliders 0–100 step 5, easiest task first, with a per-item skip (port of showRateCard).
 *  Sliders start unset (no anchor value); every item must be rated or skipped before sending. */
export function RateCard({ items, lang, disabled, onSubmit }: Props) {
  const t = STRINGS[lang];
  // Easiest first, stable.
  const sorted = useMemo(
    () =>
      items
        .map((it, i) => ({ it, i }))
        .sort((a, b) => (a.it.level ?? 0) - (b.it.level ?? 0) || a.i - b.i)
        .map((x) => x.it),
    [items],
  );
  const [values, setValues] = useState<Record<string, number>>({});
  const [skips, setSkips] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);

  const remaining = sorted.filter((it) => !skips[it.id] && typeof values[it.id] !== "number").length;
  const set = (id: string, raw: string) => setValues((p) => ({ ...p, [id]: Number(raw) }));

  function submit() {
    if (sent || disabled || remaining) return;
    const ratings: Record<string, number> = {};
    for (const it of sorted) if (!skips[it.id] && typeof values[it.id] === "number") ratings[it.id] = values[it.id];
    setSent(true);
    onSubmit(ratings);
  }

  return (
    <div className="card rate-card stack-sm" id="rate-card">
      <p className="eyebrow">{t.rateEyebrow}</p>
      <p className="small">{t.rateIntro}</p>
      <div>
        {sorted.map((it) => {
          const v = values[it.id];
          const unset = typeof v !== "number";
          const sk = !!skips[it.id];
          return (
            <div key={it.id} className={"rate-item" + (sk ? " skipped" : "")} data-id={it.id}>
              <p className="rate-task">{it.task}</p>
              <div className={"rate-slider" + (unset ? " unset" : "")}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={unset ? 50 : v}
                  id={"range-" + it.id}
                  disabled={sk}
                  aria-label={t.rateFor + it.task}
                  aria-valuetext={unset ? t.rateNotYet : String(v)}
                  onChange={(e) => set(it.id, e.target.value)}
                  // A tap on the hidden midpoint fires no change event, so record it on release too.
                  onPointerUp={(e) => set(it.id, e.currentTarget.value)}
                  onKeyUp={(e) => set(it.id, e.currentTarget.value)}
                />
                <span className="rate-value" id={"val-" + it.id}>
                  {unset ? "–" : v}
                </span>
              </div>
              <div className="rate-anchors" aria-hidden="true">
                <span>{t.rateCannot}</span>
                <span>{t.rateModerate}</span>
                <span>{t.rateHigh}</span>
              </div>
              <label className="skip" htmlFor={"skip-" + it.id}>
                <input
                  type="checkbox"
                  id={"skip-" + it.id}
                  checked={sk}
                  onChange={(e) => setSkips((p) => ({ ...p, [it.id]: e.target.checked }))}
                />
                {t.rateSkip}
              </label>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button className="btn primary" type="button" id="btn-rate-submit" disabled={sent || disabled || remaining > 0} onClick={submit}>
          {t.rateSend}
        </button>
        {remaining > 0 && (
          <span className="small muted" id="rate-remaining">
            {t.rateRemaining(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
