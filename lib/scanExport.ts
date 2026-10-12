// Server-only: turn a cached scan Report (the engine's JSON, mirrored in lib/types) into
// downloadable artifacts — a self-contained HTML file and an editable Word (.docx) document.
// Both are built from the structured JSON we already cache in Postgres, so downloads keep
// working even if the engine is offline. Never import this into a client component (it pulls
// in `docx`); only the export route handler uses it.

import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ScanClaim, ScanEntityCard, ScanReport } from "./types";

/** A filesystem-safe slug from the scan question, for the download filename. */
export function scanSlug(report: ScanReport): string {
  const base = (report.run_config?.question || "landscape-scan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "landscape-scan";
}

// --------------------------------------------------------------------------- HTML

function esc(s: string | number | undefined | null): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function htmlList(title: string, items: string[]): string {
  if (!items?.length) return "";
  return `<div class="col"><h4>${esc(title)}</h4><ul>${items
    .map((i) => `<li>${esc(i)}</li>`)
    .join("")}</ul></div>`;
}

function htmlClaim(c: ScanClaim): string {
  const verified = c.verdict === "verified";
  const head = `<div class="claim-head"><span class="mark ${
    verified ? "yes" : "no"
  }">${verified ? "✓ verified" : "unverified"}</span> <span>${
    c.label ? `<strong>${esc(c.label)}:</strong> ` : ""
  }${esc(c.text)}</span></div>`;
  let body = "";
  if (verified && c.supporting_span) {
    const src = c.source_url
      ? ` <a href="${esc(c.source_url)}" target="_blank" rel="noopener noreferrer">source ↗</a>`
      : "";
    body = `<blockquote>“${esc(c.supporting_span)}”${src}</blockquote>`;
  } else if (c.note) {
    body = `<p class="note">${esc(c.note)}</p>`;
  }
  return `<div class="claim">${head}${body}</div>`;
}

function htmlSources(sources: ScanEntityCard["sources"]): string {
  if (!sources?.length) return "";
  return `<div class="sources"><h4>Sources</h4><ul>${sources
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(
          s.title || s.url,
        )}</a>${s.index ? ` <span class="muted">· ${esc(s.index)}</span>` : ""}</li>`,
    )
    .join("")}</ul></div>`;
}

function htmlEntity(e: ScanEntityCard): string {
  const meta = [e.form, e.segment].filter(Boolean).map(esc).join(" · ");
  return `<section class="entity${e.quarantined ? " quarantined" : ""}">
    <div class="entity-head"><h3>${esc(e.name)}</h3><span class="conf ${esc(
      e.confidence?.level,
    )}">${esc(e.confidence?.level)} confidence</span></div>
    <div class="muted">${meta}${
      e.cross_index_agreement ? " · found by 2+ search indexes" : ""
    }</div>
    ${
      e.quarantined
        ? `<p class="warn">Existence could not be verified — shown flagged, not hidden.</p>`
        : ""
    }
    ${e.one_liner ? `<p>${esc(e.one_liner)}</p>` : ""}
    ${e.confidence?.basis ? `<p class="muted">${esc(e.confidence.basis)}</p>` : ""}
    ${(e.features || []).map(htmlClaim).join("")}
    ${
      e.limitations
        ? `<p class="muted"><strong>Limitations:</strong> ${esc(e.limitations)}</p>`
        : ""
    }
    ${htmlSources(e.sources)}
  </section>`;
}

export function scanReportToHtml(report: ScanReport): string {
  const { overview, entities, long_tail, manifest, cost, coverage_notes } = report;
  const providers = Object.entries(manifest?.search_providers || {});
  const models = Object.entries(manifest?.models_by_task || {});
  const counts = overview?.confidence_counts || {};
  const confLine = (["high", "medium", "low"] as const)
    .filter((l) => counts[l])
    .map((l) => `${counts[l]} ${l}`)
    .join(" · ");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(report.run_config?.question || "Landscape scan")}</title>
<style>
  :root { --ink:#1d1a15; --muted:#6b6358; --line:#e4ddd0; --paper:#faf8f3; --terra:#c75b39; }
  * { box-sizing: border-box; }
  body { font: 16px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:var(--ink);
         background:var(--paper); margin:0; padding:40px 20px; }
  main { max-width: 820px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 32px 0 10px; border-bottom:1px solid var(--line); padding-bottom:6px; }
  h3 { font-size: 17px; margin: 0; }
  h4 { font-size: 13px; text-transform: uppercase; letter-spacing:.04em; color:var(--muted); margin:0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 8px; }
  .card, .entity { border:1px solid var(--line); border-radius:10px; padding:16px; margin:12px 0; background:#fff; }
  .entity-head { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .grid { display:flex; flex-wrap:wrap; gap:24px; }
  .col { flex:1; min-width:180px; }
  ul { margin:4px 0; padding-left:18px; }
  .muted { color: var(--muted); font-size: 14px; }
  .warn { color: var(--terra); font-weight:600; }
  .conf { font-size:12px; padding:2px 8px; border-radius:20px; border:1px solid var(--line); white-space:nowrap; }
  .conf.high { color:#2c6e49; } .conf.medium { color:#b07d2b; } .conf.low { color:var(--muted); }
  .quarantined { border-color: var(--terra); }
  .claim { margin:10px 0; }
  .claim-head { display:flex; gap:8px; align-items:baseline; }
  .mark { font-size:12px; font-weight:700; white-space:nowrap; }
  .mark.yes { color:#2c6e49; } .mark.no { color:var(--muted); }
  blockquote { margin:6px 0 0 8px; padding-left:12px; border-left:3px solid var(--line); color:var(--ink); font-style:italic; }
  .note { margin:4px 0 0 8px; color:var(--muted); font-size:14px; }
  a { color: var(--terra); }
  details { margin-top: 20px; }
  footer { margin-top:40px; color:var(--muted); font-size:13px; border-top:1px solid var(--line); padding-top:12px; }
</style></head>
<body><main>
  <h1>${esc(overview?.headline || report.run_config?.question || "Landscape scan")}</h1>
  <p class="sub">Landscape scan${
    report.created_at ? ` · ${esc(report.created_at)}` : ""
  }</p>
  ${
    manifest?.demo_mode
      ? `<p class="warn">Demo mode — produced on canned fixtures, not live data.</p>`
      : ""
  }

  <div class="card">
    ${
      overview?.segments?.length
        ? `<h4>Segments</h4>${overview.segments
            .map(
              (s) =>
                `<p><strong>${esc(s.label)}</strong>${
                  s.description ? ` — ${esc(s.description)}` : ""
                }${
                  s.entity_names?.length
                    ? `<br><span class="muted">${esc(s.entity_names.join(", "))}</span>`
                    : ""
                }</p>`,
            )
            .join("")}`
        : ""
    }
    <div class="grid">
      ${htmlList("Key players", overview?.key_players || [])}
      ${htmlList("Crowded areas", overview?.crowded_areas || [])}
      ${htmlList("Gaps", overview?.gaps || [])}
    </div>
    ${confLine ? `<p class="muted">Confidence: ${esc(confLine)}</p>` : ""}
  </div>

  <h2>Entities (${entities?.length || 0})</h2>
  ${
    entities?.length
      ? entities.map(htmlEntity).join("")
      : `<p class="muted">No entities were deep-profiled in this run.</p>`
  }

  ${
    long_tail?.length
      ? `<h2>Long tail (${long_tail.length})</h2><ul>${long_tail
          .map(
            (e) =>
              `<li><strong>${esc(e.name)}</strong>${
                e.one_liner ? ` — ${esc(e.one_liner)}` : ""
              }</li>`,
          )
          .join("")}</ul>`
      : ""
  }

  <footer>
    <p>Cost: $${(cost?.total_usd ?? 0).toFixed(2)} across ${cost?.llm_calls ?? 0} model calls.</p>
    ${
      providers.length
        ? `<p>Search: ${providers
            .map(([n, live]) => `${esc(n)} ${live ? "(live)" : "(absent)"}`)
            .join(", ")}</p>`
        : ""
    }
    ${
      models.length
        ? `<p>Models: ${models.map(([t, m]) => `${esc(t)}: ${esc(m)}`).join(", ")}</p>`
        : ""
    }
    ${(manifest?.notes || []).map((n) => `<p>Manifest: ${esc(n)}</p>`).join("")}
    ${(coverage_notes || []).map((n) => `<p>Coverage: ${esc(n)}</p>`).join("")}
  </footer>
</main></body></html>`;
}

// --------------------------------------------------------------------------- DOCX

const HEADING = HeadingLevel;

function docParagraph(text: string, opts: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({ text, ...opts });
}

function docClaim(c: ScanClaim): Paragraph[] {
  const verified = c.verdict === "verified";
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 80 },
      children: [
        new TextRun({
          text: verified ? "✓ verified  " : "unverified  ",
          bold: true,
          color: verified ? "2C6E49" : "6B6358",
        }),
        ...(c.label ? [new TextRun({ text: `${c.label}: `, bold: true })] : []),
        new TextRun({ text: c.text }),
      ],
    }),
  ];
  if (verified && c.supporting_span) {
    out.push(
      new Paragraph({
        indent: { left: 360 },
        children: [
          new TextRun({ text: `“${c.supporting_span}”`, italics: true }),
          ...(c.source_url
            ? [
                new TextRun({ text: "  " }),
                new ExternalHyperlink({
                  link: c.source_url,
                  children: [new TextRun({ text: "source", style: "Hyperlink" })],
                }),
              ]
            : []),
        ],
      }),
    );
  } else if (c.note) {
    out.push(
      new Paragraph({
        indent: { left: 360 },
        children: [new TextRun({ text: c.note, italics: true, color: "6B6358" })],
      }),
    );
  }
  return out;
}

function docEntity(e: ScanEntityCard): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      heading: HEADING.HEADING_2,
      children: [
        new TextRun({ text: e.name, bold: true }),
        new TextRun({
          text: `   (${e.confidence?.level || "?"} confidence)`,
          color: "6B6358",
        }),
      ],
    }),
  ];
  const meta = [e.form, e.segment].filter(Boolean).join(" · ");
  if (meta || e.cross_index_agreement) {
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              meta +
              (e.cross_index_agreement ? " · found by 2+ search indexes" : ""),
            color: "6B6358",
          }),
        ],
      }),
    );
  }
  if (e.quarantined) {
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Existence could not be verified — shown flagged, not hidden.",
            bold: true,
            color: "C75B39",
          }),
        ],
      }),
    );
  }
  if (e.one_liner) out.push(docParagraph(e.one_liner));
  if (e.confidence?.basis)
    out.push(
      new Paragraph({
        children: [new TextRun({ text: e.confidence.basis, color: "6B6358" })],
      }),
    );
  for (const c of e.features || []) out.push(...docClaim(c));
  if (e.limitations)
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Limitations: ", bold: true }),
          new TextRun({ text: e.limitations }),
        ],
      }),
    );
  for (const s of e.sources || []) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new ExternalHyperlink({
            link: s.url,
            children: [
              new TextRun({ text: s.title || s.url, style: "Hyperlink" }),
            ],
          }),
          ...(s.index ? [new TextRun({ text: ` · ${s.index}`, color: "6B6358" })] : []),
        ],
      }),
    );
  }
  return out;
}

function docBullets(title: string, items: string[]): Paragraph[] {
  if (!items?.length) return [];
  return [
    new Paragraph({ heading: HEADING.HEADING_3, text: title }),
    ...items.map(
      (i) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(i)] }),
    ),
  ];
}

export async function scanReportToDocx(report: ScanReport): Promise<Buffer> {
  const { overview, entities, long_tail, manifest, cost, coverage_notes } = report;
  const children: Paragraph[] = [
    new Paragraph({
      heading: HEADING.TITLE,
      text: overview?.headline || report.run_config?.question || "Landscape scan",
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Landscape scan${report.created_at ? ` · ${report.created_at}` : ""}`,
          italics: true,
          color: "6B6358",
        }),
      ],
    }),
  ];

  if (report.run_config?.question)
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Question: ", bold: true }),
          new TextRun({ text: report.run_config.question }),
        ],
      }),
    );

  if (manifest?.demo_mode)
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Demo mode — produced on canned fixtures, not live data.",
            bold: true,
            color: "C75B39",
          }),
        ],
      }),
    );

  // Overview
  children.push(new Paragraph({ heading: HEADING.HEADING_1, text: "Overview" }));
  if (overview?.segments?.length) {
    children.push(new Paragraph({ heading: HEADING.HEADING_3, text: "Segments" }));
    for (const s of overview.segments) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: s.label, bold: true }),
            ...(s.description ? [new TextRun({ text: ` — ${s.description}` })] : []),
          ],
        }),
      );
      if (s.entity_names?.length)
        children.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: s.entity_names.join(", "), color: "6B6358" }),
            ],
          }),
        );
    }
  }
  children.push(...docBullets("Key players", overview?.key_players || []));
  children.push(...docBullets("Crowded areas", overview?.crowded_areas || []));
  children.push(...docBullets("Gaps", overview?.gaps || []));
  const counts = overview?.confidence_counts || {};
  const confLine = (["high", "medium", "low"] as const)
    .filter((l) => counts[l])
    .map((l) => `${counts[l]} ${l}`)
    .join(" · ");
  if (confLine)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Confidence: ${confLine}`, color: "6B6358" })],
      }),
    );

  // Entities
  children.push(
    new Paragraph({
      heading: HEADING.HEADING_1,
      text: `Entities (${entities?.length || 0})`,
    }),
  );
  if (entities?.length) for (const e of entities) children.push(...docEntity(e));
  else children.push(docParagraph("No entities were deep-profiled in this run."));

  // Long tail
  if (long_tail?.length) {
    children.push(
      new Paragraph({
        heading: HEADING.HEADING_1,
        text: `Long tail (${long_tail.length})`,
      }),
    );
    for (const e of long_tail)
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: e.name, bold: true }),
            ...(e.one_liner ? [new TextRun({ text: ` — ${e.one_liner}` })] : []),
          ],
        }),
      );
  }

  // Audit
  children.push(new Paragraph({ heading: HEADING.HEADING_1, text: "Audit trail" }));
  children.push(
    docParagraph(
      `Cost: $${(cost?.total_usd ?? 0).toFixed(2)} across ${
        cost?.llm_calls ?? 0
      } model calls.`,
    ),
  );
  const providers = Object.entries(manifest?.search_providers || {});
  if (providers.length)
    children.push(
      docParagraph(
        `Search: ${providers
          .map(([n, live]) => `${n} ${live ? "(live)" : "(absent)"}`)
          .join(", ")}`,
      ),
    );
  const models = Object.entries(manifest?.models_by_task || {});
  if (models.length)
    children.push(
      docParagraph(`Models: ${models.map(([t, m]) => `${t}: ${m}`).join(", ")}`),
    );
  for (const n of manifest?.notes || []) children.push(docParagraph(`Manifest: ${n}`));
  for (const n of coverage_notes || []) children.push(docParagraph(`Coverage: ${n}`));

  const doc = new Document({
    creator: "Aligned Interviewer",
    title: report.run_config?.question || "Landscape scan",
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
