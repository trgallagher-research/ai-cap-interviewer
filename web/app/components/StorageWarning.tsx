"use client";

import { useEffect, useState } from "react";

/** Warns the organiser when the server keeps results in memory (no Redis configured). */
export function StorageWarning() {
  const [memory, setMemory] = useState(false);
  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { storage?: string } | null) => setMemory(!!c && c.storage === "memory"))
      .catch(() => setMemory(false));
  }, []);
  if (!memory) return null;
  return (
    <div className="notice warn" id="storage-warning" role="status" style={{ marginBottom: "1rem" }}>
      <strong>Results are only kept in memory.</strong> No database is connected, so every interview and edit is lost when the server restarts.
      Connect Upstash for Redis in the Vercel project (Storage → Marketplace) before members take part.
    </div>
  );
}
