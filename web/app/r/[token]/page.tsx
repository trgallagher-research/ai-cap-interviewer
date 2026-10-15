/* Private report link: /r/<token>. Anyone with the link can read this one report; no login.
 * Not indexed, never cached, and the token is not sent on as a referrer. Deleting the profile
 * (organiser view) ends the link. */
import type { Metadata } from "next";
import { FeedbackView } from "@/app/components/member/FeedbackView";
import { memberResult } from "@/lib/member";
import { deleteAfter, profileDate, profileForReport } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your feedback · AI at Work Diagnostic", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await profileForReport(token).catch(() => null);
  if (!p) {
    return (
      <main id="view">
        <div className="stack" id="report-missing">
          <h1>This report is not available</h1>
          <p className="lead">The link may be mistyped, or the report has been removed. If you think this is a mistake, ask the organiser.</p>
        </div>
      </main>
    );
  }
  const r = memberResult(p);
  return (
    <main id="view">
      <div className="stack feedback" id="report">
        <FeedbackView feedback={r.feedback} ratings={r.ratings} />
        <p className="small" id="report-note">
          This is your private report. Anyone with this link can read it, so keep it to yourself. It will be deleted on{" "}
          {deleteAfter(profileDate(p)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
    </main>
  );
}
