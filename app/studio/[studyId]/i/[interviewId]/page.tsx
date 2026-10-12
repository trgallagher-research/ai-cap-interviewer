import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCreator } from "@/lib/auth";

export const dynamic = "force-dynamic";

type TurnRow = { role: string; text: string; idx: number };

export default async function Transcript({
  params,
}: {
  params: Promise<{ studyId: string; interviewId: string }>;
}) {
  const { studyId, interviewId } = await params;
  const creator = await getCreator();
  if (!creator) redirect("/login");

  const { data: interview } = await creator.supabase
    .from("interviews")
    .select("id,study_id,status,created_at,email,consent_version")
    .eq("id", interviewId)
    .single();
  if (!interview || interview.study_id !== studyId) notFound();

  const { data } = await creator.supabase
    .from("turns")
    .select("role,text,idx")
    .eq("interview_id", interviewId)
    .order("idx", { ascending: true });
  const turns = (data ?? []) as TurnRow[];

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">Transcript</div>
        <Link href={`/studio/${studyId}`}>
          <button className="secondary">← Responses</button>
        </Link>
      </header>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        {new Date(interview.created_at).toLocaleString()} · {interview.status}
        {interview.email ? ` · ${interview.email}` : ""} · consent{" "}
        {interview.consent_version}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role}`}>
            <span className="who">
              {t.role === "interviewer" ? "Interviewer" : "Respondent"}
            </span>
            <p>{t.text}</p>
          </div>
        ))}
        {turns.length === 0 && <p className="lede">No turns recorded.</p>}
      </div>
    </main>
  );
}
