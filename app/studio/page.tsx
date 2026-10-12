import Link from "next/link";
import { redirect } from "next/navigation";
import { getCreator } from "@/lib/auth";
import { ShareLink } from "./ShareLink";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  visibility: string;
  status: string;
  created_at: string;
  interviews: { count: number }[];
};

export default async function Studio() {
  const creator = await getCreator();
  if (!creator) redirect("/login");

  const { data } = await creator.supabase
    .from("studies")
    .select("id,title,visibility,status,created_at,interviews(count)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">Aligned Interviewer</div>
        <form action="/auth/signout" method="post">
          <button className="secondary">Sign out</button>
        </form>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Your studies</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/scans">
            <button className="secondary">Landscape scans →</button>
          </Link>
          <Link href="/studio/new">
            <button>+ New study</button>
          </Link>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="lede" style={{ marginTop: 20 }}>
          No studies yet — create your first one.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {rows.map((s) => (
          <div className="card" key={s.id}>
            <Link href={`/studio/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h3 style={{ margin: 0 }}>{s.title}</h3>
            </Link>
            <div style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 10px" }}>
              {s.visibility} · {s.status} · {s.interviews?.[0]?.count ?? 0} responses
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <ShareLink path={`/s/${s.id}`} />
              <Link href={`/studio/${s.id}`}>
                <button className="secondary">View responses →</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
