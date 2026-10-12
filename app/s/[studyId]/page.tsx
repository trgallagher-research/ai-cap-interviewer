import { getStudy } from "@/lib/db";
import { CONSENT_TEXT } from "@/lib/consent";
import { frameworkLabel } from "@/lib/frameworks";
import { transcriptionEnabled } from "@/lib/groq";
import { Respondent } from "./Respondent";
import type { Intro } from "@/lib/types";

// Always render on demand — this hits the database with a request-time study id.
export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;

  let study = null;
  try {
    study = await getStudy(studyId);
  } catch {
    // Supabase not configured yet — fall through to the not-available message.
  }

  if (!study || study.status !== "active") {
    return (
      <main className="shell" style={{ justifyContent: "center" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>Interview not available</h1>
          <p className="lede" style={{ margin: "0 auto" }}>
            This interview link isn’t active. Please check the link or come back
            later.
          </p>
        </div>
      </main>
    );
  }

  // Older studies created before the landing-page feature have no intro — derive a
  // gentle fallback from the topic so they still get a welcome screen.
  const intro: Intro = study.intro ?? {
    purpose: `We'd like to understand your experience with ${study.topic}.`,
    whatToExpect:
      "It's a short, friendly conversation — one question at a time, in your own words. There are no right answers.",
    minutes: study.target_minutes ?? 15,
  };

  return (
    <Respondent
      studyId={study.id}
      topic={study.topic}
      objectives={study.guide.objectives}
      intro={intro}
      consentText={CONSENT_TEXT}
      voiceEnabled={transcriptionEnabled()}
      framework={frameworkLabel(study)}
    />
  );
}
