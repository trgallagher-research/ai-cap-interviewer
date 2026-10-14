/* email.ts: sends a member their report. SERVER-ONLY.
 *
 * Off until RESEND_API_KEY and EMAIL_FROM (e.g. "AI at Work Diagnostic <report@example.org>", on a
 * domain verified in Resend) are set. EMAIL_MOCK=1 (never on production) records messages in memory
 * instead of sending, for tests. A failed send never fails the member's request: the report is on
 * screen and behind its private link either way.
 */
import type { Feedback } from "./aiwd/types";

export type EmailState = "sent" | "failed" | "not_configured" | "not_requested";

function mockOn(): boolean {
  return process.env.EMAIL_MOCK === "1" && process.env.VERCEL_ENV !== "production";
}

export function emailConfigured(): boolean {
  return mockOn() || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Messages "sent" while EMAIL_MOCK=1 (tests read them through the organiser profile's emailStatus). */
export const mockOutbox: { to: string; subject: string; text: string; html: string }[] = [];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function isEmail(v: string): boolean {
  return v.length <= 200 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(v);
}

/** Plain text and HTML versions of the report email. Every member-written or model-written string is escaped. */
export function reportEmail(name: string, fb: Feedback, url: string): { subject: string; text: string; html: string } {
  const subject = "Your AI at Work Diagnostic feedback";
  const t: string[] = [`Hi ${name},`, "", fb.headline, "", fb.summary, ""];
  const h: string[] = [`<p>Hi ${esc(name)},</p>`, `<h2 style="font-size:1.2em">${esc(fb.headline)}</h2>`, `<p>${esc(fb.summary)}</p>`];
  if (fb.strengths.length) {
    t.push("What stood out:", ...fb.strengths.map((s) => "- " + s), "");
    h.push("<h3>What stood out</h3><ul>" + fb.strengths.map((s) => `<li>${esc(s)}</li>`).join("") + "</ul>");
  }
  if (fb.nextSteps.length) {
    t.push("Next steps:");
    h.push("<h3>Next steps</h3><ol>");
    for (const s of fb.nextSteps) {
      t.push(`${s.title}: ${s.detail}`, ...(s.steps || []).map((x) => "  - " + x));
      h.push(`<li><b>${esc(s.title)}</b>: ${esc(s.detail)}${s.steps && s.steps.length ? "<ul>" + s.steps.map((x) => `<li>${esc(x)}</li>`).join("") + "</ul>" : ""}</li>`);
    }
    t.push("");
    h.push("</ol>");
  }
  if (fb.calibration) { t.push("Confidence and practice: " + fb.calibration, ""); h.push(`<h3>Confidence and practice</h3><p>${esc(fb.calibration)}</p>`); }
  if (fb.followUp) { t.push("If you want to go further: " + fb.followUp, ""); h.push(`<h3>If you want to go further</h3><p>${esc(fb.followUp)}</p>`); }
  if (fb.closing) { t.push(fb.closing, ""); h.push(`<p>${esc(fb.closing)}</p>`); }
  t.push("Your report stays available at this private link (anyone with the link can read it):", url);
  h.push(`<p>Your report stays available at <a href="${esc(url)}">this private link</a>. Anyone with the link can read it, so keep it to yourself.</p>`);
  return { subject, text: t.join("\n"), html: h.join("\n") };
}

export async function sendReport(to: string, name: string, fb: Feedback, url: string): Promise<EmailState> {
  if (!emailConfigured()) return "not_configured";
  const msg = reportEmail(name, fb, url);
  if (mockOn()) {
    mockOutbox.push({ to, ...msg });
    return "sent";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: msg.subject, text: msg.text, html: msg.html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("report email failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("report email failed", err);
    return "failed";
  }
}
