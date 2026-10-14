"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Only same-site organiser paths are allowed as a destination.
  const nextParam = params.get("next") || "";
  const next = /^\/(organiser|network)(\/|$|\?)/.test(nextParam) && !nextParam.startsWith("/organiser/login") ? nextParam : "/organiser";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Enter the organiser passcode.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/organiser/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (r.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(r.status === 401 ? "That passcode is not right." : j.error || `Sign-in failed (${r.status}).`);
      setPasscode("");
      inputRef.current?.focus();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack login" id="login-form" onSubmit={submit} noValidate>
      <div className="stack-sm">
        <p className="eyebrow">Organiser</p>
        <h1>Sign in</h1>
      </div>
      <p className="lead">The organiser and share-back pages show what members said. Enter the organiser passcode to open them.</p>
      <label className="field" htmlFor="f-passcode">
        Passcode
        <input
          ref={inputRef}
          className="input"
          id="f-passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
      </label>
      <p className="small" id="login-error" role="alert" style={{ color: "var(--bad)" }} hidden={!error}>
        {error}
      </p>
      <div className="row">
        <button className="btn primary" type="submit" id="btn-login" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
