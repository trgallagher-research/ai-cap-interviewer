// Thin, swappable transactional-email seam. Defaults to Resend via its REST API (no
// SDK dependency, mirroring lib/groq.ts). Only ever imported by server-side route
// handlers — the key never reaches the browser.
//
// Leave RESEND_API_KEY unset to disable email: respondent reports still render
// on-screen, and the creator's "Send aggregate report" action is gated off.

const RESEND_URL = "https://api.resend.com/emails";

// Dev uses Resend's test sender; production needs a verified domain (set EMAIL_FROM,
// including the product name once it's chosen).
const FROM = process.env.EMAIL_FROM || "Research interview <onboarding@resend.dev>";

/** Server-only check used to gate the email UI when no key is configured. */
export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Email send failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
}
