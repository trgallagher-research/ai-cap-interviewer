const PHASE_HINT: Record<string, string> = {
  quick: "quick questions",
  orient: "getting oriented",
  practice: "your practice",
  stretch: "your edges",
  rate: "your confidence",
  close: "wrapping up",
};
// Progress steps shown to the member: the questionnaire first, then the interview phases.
const STEP_ORDER = ["quick", "orient", "practice", "stretch", "rate", "close"];

export function PhaseHint({ step }: { step: string }) {
  const idx = Math.max(0, STEP_ORDER.indexOf(step));
  return (
    <span>
      <span className="phase-dots" aria-hidden="true">
        {STEP_ORDER.map((p, i) => (
          <i key={p} className={i <= idx ? "on" : ""} />
        ))}
      </span>
      <span className="visually-hidden">{`Step ${idx + 1} of ${STEP_ORDER.length}: `}</span>
      {PHASE_HINT[step] || PHASE_HINT.orient}
    </span>
  );
}
