import { STRINGS, type Lang } from "./i18n";

// Progress steps shown to the member: the questionnaire first, then the interview phases.
const STEP_ORDER = ["quick", "orient", "practice", "stretch", "rate", "close"];

export function PhaseHint({ step, lang = "en" }: { step: string; lang?: Lang }) {
  const t = STRINGS[lang];
  const idx = Math.max(0, STEP_ORDER.indexOf(step));
  return (
    <span>
      <span className="phase-dots" aria-hidden="true">
        {STEP_ORDER.map((p, i) => (
          <i key={p} className={i <= idx ? "on" : ""} />
        ))}
      </span>
      <span className="visually-hidden">{t.stepOf(idx + 1, STEP_ORDER.length)}</span>
      {t.phase[step] || t.phase.orient}
    </span>
  );
}
