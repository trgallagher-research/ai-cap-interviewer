"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const initial = params.get("error");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initial === "not_allowed"
      ? "That email isn’t on the creator allowlist."
      : initial === "auth"
        ? "That sign-in link was invalid or expired — please try again."
        : null,
  );

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell" style={{ maxWidth: 420, justifyContent: "center" }}>
      <div className="card">
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
            color: "var(--ink)",
          }}
        >
          Aligned Interviewer
        </p>
        <p className="hint" style={{ margin: "2px 0 16px" }}>
          AI-led interviews for qualitative research
        </p>
        <h1 style={{ marginTop: 0 }}>Sign in</h1>
        {sent ? (
          <p className="lede">
            Check your email — we sent a sign-in link to <strong>{email}</strong>.
            Open it on this device to continue.
          </p>
        ) : (
          <form onSubmit={send}>
            <p className="lede">Enter your email and we’ll send a sign-in link.</p>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
