"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { draftStudy, createStudy } from "@/lib/studio-client";
import { CURATED_FRAMEWORKS } from "@/lib/frameworks";
import { VoiceButton } from "@/app/components/VoiceButton";
import type { AnalysisFramework, StudyDraft } from "@/lib/types";

export function NewStudy({ voiceEnabled }: { voiceEnabled: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [refine, setRefine] = useState("");
  const [visibility, setVisibility] = useState<"controlled" | "public">("controlled");
  // Optional respondent-facing framework reflection ("" = none). 'custom' pairs with the two
  // free-text fields below.
  const [framework, setFramework] = useState<AnalysisFramework | "">("");
  const [customName, setCustomName] = useState("");
  const [customDef, setCustomDef] = useState("");
  const [draft, setDraft] = useState<StudyDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<StudyDraft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  async function generate(refinement?: string) {
    if (!prompt.trim() && !refinement) {
      setError("Describe what you want to learn first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const text = refinement ?? prompt;
      const next = await draftStudy(text, refinement ? draft ?? undefined : undefined);
      setDraft(next);
      if (refinement) setRefine("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function editObj(id: string, text: string) {
    if (!draft) return;
    patch({
      objectives: draft.objectives.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  }

  async function publish() {
    if (!draft || !draft.title.trim()) {
      setError("Add a title and draft a study first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createStudy({
        title: draft.title.trim(),
        topic: draft.topic.trim(),
        guide: { strategy: draft.strategy, objectives: draft.objectives },
        intro: draft.intro,
        targetMinutes: draft.intro.minutes,
        visibility,
        analysisFramework: framework || null,
        analysisFrameworkCustom:
          framework === "custom"
            ? { name: customName.trim(), definition: customDef.trim() }
            : null,
      });
      router.push("/studio");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="shell wide">
      <header className="masthead">
        <div className="brand">New study</div>
        <Link href="/studio">
          <button className="secondary">← Studio</button>
        </Link>
      </header>

      <div className="plan-grid" style={{ marginTop: 24 }}>
        <div>
          <label>
            What are you trying to learn?
            <span className="hint">
              Describe it in plain language — the AI drafts the whole study.
            </span>
            <textarea
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I want to understand how secondary-school teachers actually use AI tools day to day — what they try, what frustrates them, and what would make them trust these tools more."
            />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => generate()} disabled={busy || !prompt.trim()}>
              {busy ? "Working…" : draft ? "Redraft from scratch" : "Draft it"}
            </button>
            <VoiceButton
              enabled={voiceEnabled}
              disabled={busy}
              onText={(t) => setPrompt((p) => (p.trim() ? `${p.trim()} ${t}` : t))}
            />
          </div>

          {draft && (
            <label style={{ marginTop: 28 }}>
              Refine
              <span className="hint">
                Ask for a change — e.g. “make it shorter”, “focus more on trust”.
              </span>
              <textarea
                rows={3}
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="What should change?"
              />
              <button
                className="secondary"
                onClick={() => generate(refine)}
                disabled={busy || !refine.trim()}
                style={{ marginTop: 8, alignSelf: "flex-start" }}
              >
                {busy ? "Working…" : "Apply refinement"}
              </button>
            </label>
          )}

          <label>
            Who can take it
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "controlled" | "public")
              }
              style={{
                font: "inherit",
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "var(--card)",
              }}
            >
              <option value="controlled">
                Controlled — only people I send the link to
              </option>
              <option value="public">
                Public — anyone with the link (bot protection added later)
              </option>
            </select>
          </label>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="card guide">
          {!draft && (
            <p className="lede">
              Your study draft — title, goals, interview guide and the respondent
              welcome — will appear here, all editable.
            </p>
          )}
          {draft && (
            <>
              <label style={{ marginTop: 0 }}>
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
              <label>
                Topic
                <input
                  type="text"
                  value={draft.topic}
                  onChange={(e) => patch({ topic: e.target.value })}
                />
              </label>
              <label>
                Goals <span className="hint">one per line</span>
                <textarea
                  rows={4}
                  value={draft.goals.join("\n")}
                  onChange={(e) =>
                    patch({
                      goals: e.target.value.split("\n").map((g) => g.replace(/^\s+/, "")),
                    })
                  }
                />
              </label>

              <h3 style={{ marginTop: 18 }}>Interview guide</h3>
              <p className="strategy">{draft.strategy}</p>
              <ol>
                {draft.objectives.map((o) => (
                  <li key={o.id}>
                    <input
                      className="obj-text"
                      value={o.text}
                      onChange={(e) => editObj(o.id, e.target.value)}
                    />
                    <div className="intent">{o.intent}</div>
                  </li>
                ))}
              </ol>

              <h3 style={{ marginTop: 18 }}>Respondent welcome</h3>
              <p className="hint" style={{ margin: "0 0 8px" }}>
                What respondents see before they begin (the objectives above stay
                private).
              </p>
              <label style={{ margin: "8px 0" }}>
                Purpose
                <textarea
                  rows={2}
                  value={draft.intro.purpose}
                  onChange={(e) =>
                    patch({ intro: { ...draft.intro, purpose: e.target.value } })
                  }
                />
              </label>
              <label style={{ margin: "8px 0" }}>
                What to expect
                <textarea
                  rows={2}
                  value={draft.intro.whatToExpect}
                  onChange={(e) =>
                    patch({ intro: { ...draft.intro, whatToExpect: e.target.value } })
                  }
                />
              </label>
              <label style={{ margin: "8px 0" }}>
                Estimated minutes
                <input
                  type="number"
                  min={1}
                  value={draft.intro.minutes}
                  onChange={(e) =>
                    patch({
                      intro: {
                        ...draft.intro,
                        minutes: Number(e.target.value) || draft.intro.minutes,
                      },
                    })
                  }
                  style={{
                    font: "inherit",
                    padding: "11px 13px",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    background: "var(--card)",
                    width: 120,
                  }}
                />
              </label>

              <h3 style={{ marginTop: 18 }}>Reflection for respondents (optional)</h3>
              <p className="hint" style={{ margin: "0 0 8px" }}>
                If set, respondents can opt in to be emailed an interpretive reflection on
                their own answers, read through this framework. Grounded in what they said —
                never a score or advice.
              </p>
              <label style={{ margin: "8px 0" }}>
                Framework
                <select
                  value={framework}
                  onChange={(e) =>
                    setFramework(e.target.value as AnalysisFramework | "")
                  }
                  style={{
                    font: "inherit",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    background: "var(--card)",
                  }}
                >
                  <option value="">None — no reflection</option>
                  {CURATED_FRAMEWORKS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                  <option value="custom">Custom — define your own…</option>
                </select>
              </label>
              {(() => {
                const info = CURATED_FRAMEWORKS.find((f) => f.key === framework);
                if (!info) return null;
                return (
                  <div
                    style={{
                      margin: "8px 0",
                      padding: "12px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      background: "var(--card)",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{info.blurb}</div>
                    <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>{info.about}</p>
                    <p className="hint" style={{ margin: "8px 0 0" }}>
                      <strong>Good for:</strong> {info.goodFor}
                    </p>
                  </div>
                );
              })()}
              {framework === "custom" && (
                <>
                  <label style={{ margin: "8px 0" }}>
                    Framework name
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Job Crafting"
                    />
                  </label>
                  <label style={{ margin: "8px 0" }}>
                    Definition
                    <span className="hint">
                      A sentence or two the model reads as the lens.
                    </span>
                    <textarea
                      rows={3}
                      value={customDef}
                      onChange={(e) => setCustomDef(e.target.value)}
                      placeholder="e.g. Job crafting is how people reshape their own roles — the tasks they take on, the relationships they build, and how they frame the meaning of their work."
                    />
                  </label>
                </>
              )}

              <div className="center-actions">
                <button
                  onClick={publish}
                  disabled={
                    busy ||
                    !draft.title.trim() ||
                    (framework === "custom" &&
                      (!customName.trim() || !customDef.trim()))
                  }
                >
                  Publish study →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
