/* The member's report: feedback sections and their confidence ratings. No hooks, so it renders
 * both inside the member app and on the server-rendered private report page (/r/<token>). */
import type { Feedback } from "./api";
import { STRINGS, type Lang } from "./i18n";

export function FeedbackView({ feedback: fb, ratings, lang = "en" }: { feedback: Feedback; ratings: { task: string; rating: number | null }[]; lang?: Lang }) {
  const t = STRINGS[lang];
  return (
    <>
      <div className="stack-sm">
        <p className="eyebrow">{t.yourFeedback}</p>
        <h1>{fb.headline}</h1>
        <p className="lead">{fb.summary}</p>
      </div>
      {fb.strengths && fb.strengths.length > 0 && (
        <section className="stack-sm">
          <h2>{t.stoodOut}</h2>
          <ul className="clean">
            {fb.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {fb.nextSteps && fb.nextSteps.length > 0 && (
        <section className="stack-sm">
          <h2>{t.nextSteps}</h2>
          <div className="steps">
            {fb.nextSteps.map((s, i) => (
              <div className="step" key={i}>
                <span className="num">{i + 1}</span>
                <div className="stack-sm" style={{ gap: "0.15rem" }}>
                  <h3>{s.title}</h3>
                  <p className="small">{s.detail}</p>
                  {s.steps && s.steps.length > 0 && (
                    <ul className="small step-list">
                      {s.steps.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {fb.calibration && (
        <section className="stack-sm" id="fb-calibration">
          <h2>{t.calibration}</h2>
          <p>{fb.calibration}</p>
        </section>
      )}
      {fb.followUp && (
        <section className="stack-sm" id="fb-followup">
          <h2>{t.followUp}</h2>
          <p>{fb.followUp}</p>
        </section>
      )}
      {fb.closing && <p className="lead">{fb.closing}</p>}
      {ratings && ratings.length > 0 && (
        <section className="stack-sm">
          <h2>{t.yourRatings}</h2>
          <table className="ratings">
            <tbody>
              {ratings.map((it, i) => (
                <tr key={i}>
                  <td>{it.task}</td>
                  <td className="num">{typeof it.rating === "number" ? String(it.rating) : t.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
