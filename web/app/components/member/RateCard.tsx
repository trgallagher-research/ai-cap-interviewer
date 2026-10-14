"use client";

import { useMemo, useState } from "react";
import type { RateItem } from "./api";

interface Props {
  items: RateItem[];
  disabled?: boolean;
  onSubmit: (ratings: Record<string, number>) => void;
}

/** Confidence sliders 0–100 step 5, easiest task first, with a per-item skip (port of showRateCard). */
export function RateCard({ items, disabled, onSubmit }: Props) {
  // Easiest first, stable.
  const sorted = useMemo(
    () =>
      items
        .map((it, i) => ({ it, i }))
        .sort((a, b) => (a.it.level ?? 0) - (b.it.level ?? 0) || a.i - b.i)
        .map((x) => x.it),
    [items],
  );
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(items.map((it) => [it.id, 50])));
  const [skips, setSkips] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);

  function submit() {
    if (sent || disabled) return;
    const ratings: Record<string, number> = {};
    for (const it of sorted) if (!skips[it.id]) ratings[it.id] = values[it.id] ?? 50;
    setSent(true);
    onSubmit(ratings);
  }

  return (
    <div className="card rate-card stack-sm" id="rate-card">
      <p className="eyebrow">Rate your confidence</p>
      <p className="small">
        For each task, how confident are you that you can do it right now? 0 = cannot do at all, 100 = highly certain you can do it. There are no
        right answers.
      </p>
      <div>
        {sorted.map((it) => {
          const v = values[it.id] ?? 50;
          const sk = !!skips[it.id];
          return (
            <div key={it.id} className={"rate-item" + (sk ? " skipped" : "")} data-id={it.id}>
              <p className="rate-task">{it.task}</p>
              <div className="rate-slider">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={v}
                  id={"range-" + it.id}
                  disabled={sk}
                  aria-label={"Confidence for: " + it.task}
                  aria-valuetext={String(v)}
                  onChange={(e) => setValues((p) => ({ ...p, [it.id]: Number(e.target.value) }))}
                />
                <span className="rate-value" id={"val-" + it.id}>
                  {v}
                </span>
              </div>
              <div className="rate-anchors" aria-hidden="true">
                <span>Cannot do at all</span>
                <span>Moderately certain</span>
                <span>Highly certain</span>
              </div>
              <label className="skip" htmlFor={"skip-" + it.id}>
                <input
                  type="checkbox"
                  id={"skip-" + it.id}
                  checked={sk}
                  onChange={(e) => setSkips((p) => ({ ...p, [it.id]: e.target.checked }))}
                />
                Skip this one
              </label>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button className="btn primary" type="button" id="btn-rate-submit" disabled={sent || disabled} onClick={submit}>
          Send my ratings
        </button>
      </div>
    </div>
  );
}
