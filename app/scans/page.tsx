import Link from "next/link";
import { redirect } from "next/navigation";
import { getCreator } from "@/lib/auth";
import { scannerEnabled } from "@/lib/scanner";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  run_id: string;
  question: string;
  state: string;
  spent_usd: number | null;
  budget_usd: number | null;
  created_at: string;
};

const STATE_LABEL: Record<string, string> = {
  starting: "Starting",
  running: "Running",
  done: "Done",
  halted: "Halted (budget)",
  error: "Error",
};

export default async function Scans() {
  const creator = await getCreator();
  if (!creator) redirect("/login");

  const { data } = await creator.supabase
    .from("scans")
    .select("id,run_id,question,state,spent_usd,budget_usd,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand">Landscape scans</div>
        <Link href="/studio">
          <button className="secondary">← Studio</button>
        </Link>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Your scans</h1>
        {scannerEnabled() && (
          <Link href="/scans/new">
            <button>+ New scan</button>
          </Link>
        )}
      </div>

      {!scannerEnabled() && (
        <p className="error" style={{ marginTop: 20 }}>
          Scanning isn&apos;t configured on this deployment (no scanner service URL set).
        </p>
      )}

      {scannerEnabled() && rows.length === 0 && (
        <p className="lede" style={{ marginTop: 20 }}>
          No scans yet — start your first landscape scan.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {rows.map((s) => (
          <Link
            key={s.id}
            href={`/scans/${s.run_id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="card">
              <h3 style={{ margin: 0 }}>{s.question}</h3>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                <span className={`scan-pill ${s.state}`}>
                  {STATE_LABEL[s.state] ?? s.state}
                </span>{" "}
                · ${Number(s.spent_usd ?? 0).toFixed(2)} of $
                {Number(s.budget_usd ?? 0).toFixed(2)} ·{" "}
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
