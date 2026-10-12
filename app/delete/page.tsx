"use client";

import { useState } from "react";
import Link from "next/link";

type Result = "idle" | "done" | "notfound";

export default function DeletePage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/interview/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refCode: code.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Something went wrong");
      }
      const { deleted } = (await r.json()) as { deleted: boolean };
      setResult(deleted ? "done" : "notfound");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell" style={{ maxWidth: 560, justifyContent: "center" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Delete my responses</h1>
        {result === "done" ? (
          <p className="lede">
            Done — the interview with that reference code, and everything you shared
            in it, has been permanently deleted.
          </p>
        ) : (
          <>
            <p className="lede">
              Enter the reference code shown at the end of your interview and we’ll
              permanently delete that session.
            </p>
            <label>
              Reference code
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="INT-XXXXXX"
                autoCapitalize="characters"
              />
            </label>
            {result === "notfound" && (
              <p className="error">
                No session found for that code. Check it and try again, or contact us.
              </p>
            )}
            {error && <p className="error">{error}</p>}
            <button onClick={submit} disabled={busy || !code.trim()}>
              {busy ? "Deleting…" : "Delete my responses"}
            </button>
          </>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>
          <Link href="/privacy">← Back to the privacy notice</Link>
        </p>
      </div>
    </main>
  );
}
