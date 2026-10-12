import type {
  AnalysisFramework,
  CustomFramework,
  Guide,
  Intro,
  StudyDraft,
} from "./types";

/** Draft a whole study from a freeform description, or refine an existing draft. */
export async function draftStudy(
  prompt: string,
  current?: StudyDraft,
): Promise<StudyDraft> {
  const r = await fetch("/api/studio/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, current }),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to draft study"));
  return r.json();
}

export async function createStudy(input: {
  title: string;
  topic: string;
  guide: Guide;
  intro: Intro;
  targetMinutes: number;
  visibility: "public" | "controlled";
  analysisFramework?: AnalysisFramework | null;
  analysisFrameworkCustom?: CustomFramework | null;
}): Promise<{ id: string }> {
  const r = await fetch("/api/studio/studies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await errText(r, "Failed to create study"));
  return r.json();
}

async function errText(r: Response, fallback: string): Promise<string> {
  try {
    return (await r.json()).error || fallback;
  } catch {
    return `${fallback} (${r.status})`;
  }
}
