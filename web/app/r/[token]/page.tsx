/* Private report link: /r/<token>. Anyone with the link can read this one report; no login.
 * Not indexed, never cached, and the token is not sent on as a referrer. Deleting the profile
 * (organiser view) ends the link. */
import type { Metadata } from "next";
import { FeedbackView } from "@/app/components/member/FeedbackView";
import { STRINGS } from "@/app/components/member/i18n";
import { memberResult } from "@/lib/member";
import { deleteAfter, profileDate, profileForReport } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your feedback · AI at Work Diagnostic", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await profileForReport(token).catch(() => null);
  if (!p) {
    // Unknown link: say so in both languages (we do not know whose it was).
    return (
      <main id="view">
        <div className="stack" id="report-missing">
          <h1>{STRINGS.nl.reportMissingTitle}</h1>
          <p className="lead" lang="nl">{STRINGS.nl.reportMissingText}</p>
          <p className="small" lang="en">
            {STRINGS.en.reportMissingTitle}. {STRINGS.en.reportMissingText}
          </p>
        </div>
      </main>
    );
  }
  const lang = p.lang === "nl" ? "nl" : "en";
  const t = STRINGS[lang];
  const r = memberResult(p);
  return (
    <main id="view" lang={lang}>
      <div className="stack feedback" id="report">
        <FeedbackView feedback={r.feedback} ratings={r.ratings} lang={lang} />
        <p className="small" id="report-note">
          {t.reportPrivate}
          {deleteAfter(profileDate(p)).toLocaleDateString(lang === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
    </main>
  );
}
