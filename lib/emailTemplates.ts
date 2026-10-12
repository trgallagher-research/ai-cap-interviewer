// Plain HTML + text email bodies for the respondent-facing reports. Kept minimal and
// inline-styled (email clients are unforgiving) with a plaintext alternative always
// provided. Body copy is deliberately brand-neutral — the sender name (EMAIL_FROM)
// carries the product name, so renaming never touches these templates.

import type {
  RespondentReport,
  PublicAggregateReport,
  FrameworkReflection,
} from "./types";

const CONTACT = "aligned.benchmark@gmail.com";

const wrap = (inner: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#20211d;line-height:1.6;">${inner}</div>`;

const provenance = (why: string) =>
  `<p style="font-size:12px;color:#6f6a60;margin-top:28px;border-top:1px solid #e4ddd1;padding-top:12px;">${why} If you'd rather not have received it, or want your data deleted, contact <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`;

export function individualReportEmail(
  report: RespondentReport,
  opts: { refCode?: string; deleteUrl: string },
): { subject: string; html: string; text: string } {
  const highlightsHtml = report.highlights
    .map(
      (h) =>
        `<li style="margin-bottom:8px;"><strong>${esc(h.title)}</strong> — ${esc(h.detail)}</li>`,
    )
    .join("");
  const refLine = opts.refCode
    ? `Your reference code is ${opts.refCode} — quote it if you ever want your responses deleted: ${opts.deleteUrl}`
    : `To request deletion of your responses: ${opts.deleteUrl}`;

  const html = wrap(
    `<h1 style="font-size:20px;">${esc(report.headline)}</h1>` +
      `<p>${esc(report.summary)}</p>` +
      (report.highlights.length
        ? `<ul style="padding-left:20px;">${highlightsHtml}</ul>`
        : "") +
      `<p>${esc(report.closing)}</p>` +
      `<p style="font-size:13px;color:#6f6a60;">${esc(refLine)}</p>` +
      provenance("You received this because you asked for a copy of your interview summary."),
  );

  const text = [
    report.headline,
    "",
    report.summary,
    "",
    ...report.highlights.map((h) => `• ${h.title} — ${h.detail}`),
    "",
    report.closing,
    "",
    refLine,
    "",
    "You received this because you asked for a copy of your interview summary.",
    `To delete your data, contact ${CONTACT}.`,
  ].join("\n");

  return { subject: report.headline, html, text };
}

export function frameworkAnalysisEmail(
  reflection: FrameworkReflection,
  opts: { frameworkLabel: string; refCode?: string; deleteUrl: string },
): { subject: string; html: string; text: string } {
  const sectionsHtml = reflection.sections
    .map(
      (s) =>
        `<div style="margin:16px 0;padding:14px 16px;background:#faf8f3;border:1px solid #e4ddd1;border-radius:10px;">` +
        `<div style="font-weight:700;">${esc(s.label)}</div>` +
        `<div style="margin-top:4px;">${esc(s.reading)}</div>` +
        `<div style="font-size:13px;color:#6f6a60;margin-top:8px;"><em>${esc(s.grounding)}</em></div>` +
        `</div>`,
    )
    .join("");
  const refLine = opts.refCode
    ? `Your reference code is ${opts.refCode} — quote it if you ever want your responses deleted: ${opts.deleteUrl}`
    : `To request deletion of your responses: ${opts.deleteUrl}`;

  const html = wrap(
    `<h1 style="font-size:20px;">${esc(reflection.headline)}</h1>` +
      `<p>${esc(reflection.intro)}</p>` +
      sectionsHtml +
      `<p>${esc(reflection.closing)}</p>` +
      `<p style="font-size:13px;color:#6f6a60;">${esc(refLine)}</p>` +
      provenance(
        `You received this because you asked for a reflection on your interview through ${esc(opts.frameworkLabel)}. It's an interpretation offered to think with — not a score, diagnosis, or advice.`,
      ),
  );

  const text = [
    reflection.headline,
    "",
    reflection.intro,
    "",
    ...reflection.sections.map((s) => `${s.label}\n${s.reading}\n(${s.grounding})`),
    "",
    reflection.closing,
    "",
    refLine,
    "",
    `You received this because you asked for a reflection on your interview through ${opts.frameworkLabel}. It's an interpretation offered to think with — not a score, diagnosis, or advice.`,
    `To delete your data, contact ${CONTACT}.`,
  ].join("\n");

  return { subject: reflection.headline, html, text };
}

export function aggregateReportEmail(
  report: PublicAggregateReport,
  opts: { studyTitle: string },
): { subject: string; html: string; text: string } {
  const findingsHtml = report.findings
    .map(
      (f) =>
        `<li style="margin-bottom:8px;"><strong>${esc(f.title)}</strong> — ${esc(f.detail)}</li>`,
    )
    .join("");

  const html = wrap(
    `<h1 style="font-size:20px;">${esc(report.headline)}</h1>` +
      `<p>${esc(report.intro)}</p>` +
      (report.findings.length
        ? `<ul style="padding-left:20px;">${findingsHtml}</ul>`
        : "") +
      `<p>${esc(report.closing)}</p>` +
      provenance(
        `You received this because you took part in "${esc(opts.studyTitle)}" and asked to hear the overall findings.`,
      ),
  );

  const text = [
    report.headline,
    "",
    report.intro,
    "",
    ...report.findings.map((f) => `• ${f.title} — ${f.detail}`),
    "",
    report.closing,
    "",
    `You received this because you took part in "${opts.studyTitle}" and asked to hear the overall findings.`,
    `To delete your data, contact ${CONTACT}.`,
  ].join("\n");

  return { subject: `Findings from "${opts.studyTitle}"`, html, text };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
