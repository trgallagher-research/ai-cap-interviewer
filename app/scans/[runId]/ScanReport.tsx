import type {
  ScanClaim,
  ScanEntityCard,
  ScanReport,
  ScanSourceRef,
} from "@/lib/types";

// Full native render of the engine's report: executive overview, entity cards, and the
// complete audit trail where every verified claim links to its verbatim source quote.
// Field-for-field with landscape-scanner's models (Report/Overview/EntityCard/Claim).

export function ScanReportView({ report }: { report: ScanReport }) {
  const { overview, entities, long_tail, manifest, cost, coverage_notes } = report;

  return (
    <div className="scan-report">
      {manifest.demo_mode && (
        <p className="error">
          Demo mode — this report was produced on canned fixtures, not live data.
        </p>
      )}

      {overview.headline && <h2 style={{ marginTop: 0 }}>{overview.headline}</h2>}

      <Overview report={report} />

      <h2 className="scan-section">Entities ({entities.length})</h2>
      {entities.length === 0 && (
        <p className="lede">No entities were deep-profiled in this run.</p>
      )}
      {entities.map((e, i) => (
        <EntityCardView key={`${e.name}-${i}`} entity={e} />
      ))}

      {long_tail.length > 0 && (
        <>
          <h2 className="scan-section">
            Long tail ({long_tail.length})
            <span className="hint"> — found but not deep-profiled</span>
          </h2>
          <ul className="scan-longtail">
            {long_tail.map((e, i) => (
              <li key={`${e.name}-${i}`}>
                <strong>{e.name}</strong>
                {e.one_liner ? ` — ${e.one_liner}` : ""}
                <SourceLinks sources={e.sources} compact />
              </li>
            ))}
          </ul>
        </>
      )}

      <Audit
        manifest={report.manifest}
        cost={cost}
        coverageNotes={coverage_notes}
      />
    </div>
  );
}

function Overview({ report }: { report: ScanReport }) {
  const { overview } = report;
  const counts = overview.confidence_counts ?? {};
  return (
    <div className="card">
      {overview.segments.length > 0 && (
        <>
          <h3 style={{ marginTop: 0 }}>Segments</h3>
          {overview.segments.map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong>{s.label}</strong>
              {s.description ? <span> — {s.description}</span> : null}
              {s.entity_names.length > 0 && (
                <div className="hint">{s.entity_names.join(", ")}</div>
              )}
            </div>
          ))}
        </>
      )}
      <div className="scan-overview-grid">
        <NamedList title="Key players" items={overview.key_players} />
        <NamedList title="Crowded areas" items={overview.crowded_areas} />
        <NamedList title="Gaps" items={overview.gaps} />
      </div>
      {Object.keys(counts).length > 0 && (
        <p className="hint" style={{ marginTop: 10 }}>
          Confidence:{" "}
          {(["high", "medium", "low"] as const)
            .filter((l) => counts[l])
            .map((l) => `${counts[l]} ${l}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function NamedList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="scan-h4">{title}</h4>
      <ul className="scan-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function EntityCardView({ entity }: { entity: ScanEntityCard }) {
  const conf = entity.confidence;
  return (
    <div className={`card scan-entity${entity.quarantined ? " quarantined" : ""}`}>
      <div className="scan-entity-head">
        <h3 style={{ margin: 0 }}>{entity.name}</h3>
        <span className={`scan-conf ${conf.level}`} title={conf.basis || ""}>
          {conf.level} confidence
        </span>
      </div>
      <div className="hint">
        {[entity.form, entity.segment].filter(Boolean).join(" · ")}
        {entity.cross_index_agreement ? " · found by 2+ search indexes" : ""}
      </div>

      {entity.quarantined && (
        <p className="error" style={{ margin: "8px 0" }}>
          Existence could not be verified — shown flagged, not hidden.
        </p>
      )}

      {entity.one_liner && <p style={{ marginBottom: 6 }}>{entity.one_liner}</p>}
      {conf.basis && <p className="hint" style={{ marginTop: 0 }}>{conf.basis}</p>}

      {entity.features.length > 0 && (
        <div className="scan-claims">
          {entity.features.map((c, i) => (
            <ClaimView key={i} claim={c} />
          ))}
        </div>
      )}

      {entity.limitations && (
        <p className="hint" style={{ marginTop: 10 }}>
          <strong>Limitations:</strong> {entity.limitations}
        </p>
      )}

      <SourceLinks sources={entity.sources} />
    </div>
  );
}

function ClaimView({ claim }: { claim: ScanClaim }) {
  const verified = claim.verdict === "verified";
  return (
    <div className="scan-claim">
      <div className="scan-claim-head">
        <span className={`scan-mark ${verified ? "yes" : "no"}`}>
          {verified ? "✓ verified" : "unverified"}
        </span>
        <span>
          {claim.label ? <strong>{claim.label}: </strong> : null}
          {claim.text}
        </span>
      </div>
      {verified && claim.supporting_span ? (
        <blockquote className="quote scan-span">
          “{claim.supporting_span}”
          {claim.source_url && (
            <a
              href={claim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="scan-source-link"
            >
              source ↗
            </a>
          )}
        </blockquote>
      ) : (
        claim.note && <p className="hint scan-claim-note">{claim.note}</p>
      )}
    </div>
  );
}

function SourceLinks({
  sources,
  compact = false,
}: {
  sources: ScanSourceRef[];
  compact?: boolean;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className={compact ? "scan-sources compact" : "scan-sources"}>
      {!compact && <h4 className="scan-h4">Sources</h4>}
      <ul className="scan-list">
        {sources.map((s, i) => (
          <li key={i}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title || s.url}
            </a>
            {s.index ? <span className="hint"> · {s.index}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Audit({
  manifest,
  cost,
  coverageNotes,
}: {
  manifest: ScanReport["manifest"];
  cost: ScanReport["cost"];
  coverageNotes: string[];
}) {
  const providers = Object.entries(manifest.search_providers || {});
  return (
    <details className="scan-audit">
      <summary>Audit trail — providers, cost &amp; coverage notes</summary>
      <p className="hint" style={{ marginTop: 10 }}>
        Cost: ${cost.total_usd.toFixed(2)} across {cost.llm_calls} model calls.
      </p>
      {providers.length > 0 && (
        <p className="hint">
          Search:{" "}
          {providers
            .map(([name, live]) => `${name} ${live ? "(live)" : "(absent)"}`)
            .join(", ")}
        </p>
      )}
      {Object.keys(manifest.models_by_task || {}).length > 0 && (
        <p className="hint">
          Models:{" "}
          {Object.entries(manifest.models_by_task)
            .map(([task, model]) => `${task}: ${model}`)
            .join(", ")}
        </p>
      )}
      {(manifest.notes ?? []).map((n, i) => (
        <p key={i} className="hint">
          Manifest: {n}
        </p>
      ))}
      {(coverageNotes ?? []).map((n, i) => (
        <p key={i} className="hint">
          Coverage: {n}
        </p>
      ))}
    </details>
  );
}
