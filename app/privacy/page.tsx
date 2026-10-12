import Link from "next/link";
import { PRIVACY_SECTIONS, CONSENT_VERSION } from "@/lib/consent";

export const metadata = {
  title: "Privacy notice",
};

export default function PrivacyPage() {
  return (
    <main className="shell" style={{ maxWidth: 720 }}>
      <header className="masthead">
        <div className="brand">Privacy notice</div>
        <Link href="/">
          <button className="secondary">← Home</button>
        </Link>
      </header>

      <p className="lede">
        How your data is handled when you take part in an interview.
      </p>

      {PRIVACY_SECTIONS.map((s) => (
        <section key={s.heading} style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>{s.heading}</h2>
          <p style={{ margin: 0, color: "var(--ink)" }}>{s.body}</p>
        </section>
      ))}

      <p className="hint" style={{ marginTop: 28 }}>
        Consent version {CONSENT_VERSION}. To request deletion, use the form at{" "}
        <Link href="/delete">/delete</Link> with the reference code from your session.
      </p>
    </main>
  );
}
