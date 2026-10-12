import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCreator } from "@/lib/auth";
import { ShareLink } from "../ShareLink";
import { SynthesisPanel } from "./SynthesisPanel";
import type { Guide } from "@/lib/types";

export const dynamic = "force-dynamic";

type Interview = {
  id: string;
  status: string;
  created_at: string;
  email: string | null;
  turns: { count: number }[];
};

export default async function StudyResults({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const creator = await getCreator();
  if (!creator) redirect("/login");

  const { data: study } = await creator.supabase
    .from("studies")
    .select("id,title,topic,visibility,status,guide")
    .eq("id", studyId)
    .single();
  if (!study) notFound(); // RLS returns nothing if it isn't yours

  const { data } = await creator.supabase
    .from("interviews")
    .select("id,status,created_at,email,turns(count)")
    .eq("study_id", studyId)
    .order("created_at", { ascending: false });
  const interviews = (data ?? []) as Interview[];
  const completed = interviews.filter((i) => i.status === "completed").length;

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">{study.title}</div>
        <Link href="/studio">
          <button className="secondary">← Studio</button>
        </Link>
      </header>

      <p className="lede">{study.topic}</p>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          margin: "12px 0 18px",
        }}
      >
        <span className="pill">{interviews.length} responses</span>
        <span className="pill">{completed} completed</span>
        <a href={`/api/studio/${study.id}/export?format=csv`}>
          <button className="secondary">Export CSV</button>
        </a>
        <a href={`/api/studio/${study.id}/export?format=json`}>
          <button className="secondary">Export JSON</button>
        </a>
      </div>
      <ShareLink path={`/s/${study.id}`} />

      <h2 style={{ marginTop: 28 }}>Responses</h2>
      {interviews.length === 0 && (
        <p className="lede">No responses yet — share the link above.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {interviews.map((i) => (
          <Link
            key={i.id}
            href={`/studio/${study.id}/i/${i.id}`}
            className="card"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{new Date(i.created_at).toLocaleString()}</strong>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {i.status === "completed_early" ? "completed early" : i.status} ·{" "}
                  {i.turns?.[0]?.count ?? 0} turns
                  {i.email ? ` · ${i.email}` : ""}
                </div>
              </div>
              <span style={{ color: "var(--accent)" }}>Read →</span>
            </div>
          </Link>
        ))}
      </div>

      <SynthesisPanel
        studyId={study.id}
        objectives={(study.guide as Guide).objectives}
      />
    </main>
  );
}
