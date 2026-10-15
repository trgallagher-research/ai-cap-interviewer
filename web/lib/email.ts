/* email.ts: sends a member their report. SERVER-ONLY.
 *
 * Replies go to EMAIL_REPLY_TO, else ORGANISER_CONTACT_EMAIL (the organiser members know).
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

/** Who members can reach: the organiser's name and address (from env, so it stays out of the public repo). */
export function contact(): { name: string; email: string } {
  return { name: (process.env.ORGANISER_CONTACT_NAME || "").trim(), email: (process.env.ORGANISER_CONTACT_EMAIL || "").trim() };
}
export function replyTo(): string { return (process.env.EMAIL_REPLY_TO || contact().email || "").trim(); }

export function emailConfigured(): boolean {
  return mockOn() || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Messages "sent" while EMAIL_MOCK=1 (tests read them through the organiser profile's emailStatus). */
export const mockOutbox: { to: string; subject: string; text: string; html: string; replyTo?: string }[] = [];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function isEmail(v: string): boolean {
  return v.length <= 200 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(v);
}

/** Plain text and HTML versions of the report email. Every member-written or model-written string is escaped. */
export function reportEmail(name: string, fb: Feedback, url: string, opts: { days?: number; contactName?: string; replies?: boolean } = {}): { subject: string; text: string; html: string } {
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
  const days = opts.days ? ` for ${opts.days} days` : "";
  t.push(`Your report stays available${days} at this private link (anyone with the link can read it):`, url);
  h.push(`<p>Your report stays available${esc(days)} at <a href="${esc(url)}">this private link</a>. Anyone with the link can read it, so keep it to yourself.</p>`);
  if (opts.replies) {
    const who = opts.contactName || "the organiser";
    t.push("", `Questions? Just reply to this email to reach ${who}.`);
    h.push(`<p>Questions? Just reply to this email to reach ${esc(who)}.</p>`);
  }
  return { subject, text: t.join("\n"), html: h.join("\n") };
}

export async function sendReport(to: string, name: string, fb: Feedback, url: string, days?: number): Promise<EmailState> {
  if (!emailConfigured()) return "not_configured";
  const rt = replyTo();
  const msg = reportEmail(name, fb, url, { days, contactName: contact().name, replies: !!rt });
  if (mockOn()) {
    mockOutbox.push({ to, ...msg, ...(rt ? { replyTo: rt } : {}) });
    return "sent";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: msg.subject, text: msg.text, html: msg.html, ...(rt ? { reply_to: rt } : {}) }),
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
