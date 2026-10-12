"use client";

import { useEffect, useState } from "react";

// Shows the full shareable URL (resolved on the client) with a copy button.
// Renders the bare path on the server / first paint to avoid a hydration mismatch.
export function ShareLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <code style={{ fontSize: 13, wordBreak: "break-all" }}>{url}</code>
      <button
        className="secondary"
        style={{ padding: "4px 12px" }}
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
