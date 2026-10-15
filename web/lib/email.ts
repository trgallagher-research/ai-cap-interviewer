/* email.ts: sends a member their report. SERVER-ONLY.
 *
 * Replies go to EMAIL_REPLY_TO, else ORGANISER_CONTACT_EMAIL (the organiser members know).
 * Off until RESEND_API_KEY and EMAIL_FROM (e.g. "AI at Work Diagnostic <report@example.org>", on a
 * domain verified in Resend) are set. EMAIL_MOCK=1 (never on production) records messages in memory
 * instead of sending, for tests. A failed send never fails the member's request: the report is on
 * screen and behind its private link either way.
 */
import type { Feedback, Lang } from "./aiwd/types";

const STR = {
  en: { subject: "Your AI at Work Diagnostic feedback", hi: "Hi", stood: "What stood out", next: "Next steps", cal: "Confidence and practice", further: "If you want to go further",
    avail: (d: string) => `Your report stays available${d} at this private link (anyone with the link can read it):`,
    availHtml: (d: string, a: string) => `Your report stays available${d} at ${a}this private link</a>. Anyone with the link can read it, so keep it to yourself.`,
    days: (n: number) => ` for ${n} days`, reply: (w: string) => `Questions? Just reply to this email to reach ${w}.`, organiser: "the organiser" },
  nl: { subject: "Je feedback van de AI at Work Diagnostic", hi: "Hoi", stood: "Wat opviel", next: "Volgende stappen", cal: "Vertrouwen en praktijk", further: "Als je verder wilt",
    avail: (d: string) => `Je rapport blijft${d} beschikbaar via deze persoonlijke link (iedereen met de link kan het lezen):`,
    availHtml: (d: string, a: string) => `Je rapport blijft${d} beschikbaar via ${a}deze persoonlijke link</a>. Iedereen met de link kan het lezen, dus houd hem voor jezelf.`,
    days: (n: number) => ` ${n} dagen`, reply: (w: string) => `Vragen? Beantwoord deze e-mail om ${w} te bereiken.`, organiser: "de organisator" },
};

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
export function reportEmail(name: string, fb: Feedback, url: string, opts: { days?: number; contactName?: string; replies?: boolean; lang?: Lang } = {}): { subject: string; text: string; html: string } {
  const L = STR[opts.lang === "nl" ? "nl" : "en"];
  const subject = L.subject;
  const t: string[] = [`${L.hi} ${name},`, "", fb.headline, "", fb.summary, ""];
  const h: string[] = [`<p>${L.hi} ${esc(name)},</p>`, `<h2 style="font-size:1.2em">${esc(fb.headline)}</h2>`, `<p>${esc(fb.summary)}</p>`];
  if (fb.strengths.length) {
    t.push(L.stood + ":", ...fb.strengths.map((s) => "- " + s), "");
    h.push(`<h3>${L.stood}</h3><ul>` + fb.strengths.map((s) => `<li>${esc(s)}</li>`).join("") + "</ul>");
  }
  if (fb.nextSteps.length) {
    t.push(L.next + ":");
    h.push(`<h3>${L.next}</h3><ol>`);
    for (const s of fb.nextSteps) {
      t.push(`${s.title}: ${s.detail}`, ...(s.steps || []).map((x) => "  - " + x));
      h.push(`<li><b>${esc(s.title)}</b>: ${esc(s.detail)}${s.steps && s.steps.length ? "<ul>" + s.steps.map((x) => `<li>${esc(x)}</li>`).join("") + "</ul>" : ""}</li>`);
    }
    t.push("");
    h.push("</ol>");
  }
  if (fb.calibration) { t.push(`${L.cal}: ${fb.calibration}`, ""); h.push(`<h3>${L.cal}</h3><p>${esc(fb.calibration)}</p>`); }
  if (fb.followUp) { t.push(`${L.further}: ${fb.followUp}`, ""); h.push(`<h3>${L.further}</h3><p>${esc(fb.followUp)}</p>`); }
  if (fb.closing) { t.push(fb.closing, ""); h.push(`<p>${esc(fb.closing)}</p>`); }
  const days = opts.days ? L.days(opts.days) : "";
  t.push(L.avail(days), url);
  h.push(`<p>${L.availHtml(esc(days), `<a href="${esc(url)}">`)}</p>`);
  if (opts.replies) {
    const who = opts.contactName || L.organiser;
    t.push("", L.reply(who));
    h.push(`<p>${esc(L.reply(who))}</p>`);
  }
  return { subject, text: t.join("\n"), html: h.join("\n") };
}

export async function sendReport(to: string, name: string, fb: Feedback, url: string, days?: number, lang?: Lang): Promise<EmailState> {
  if (!emailConfigured()) return "not_configured";
  const rt = replyTo();
  const msg = reportEmail(name, fb, url, { days, contactName: contact().name, replies: !!rt, lang });
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
