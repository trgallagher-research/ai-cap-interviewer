import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { generateStructured } from "@/lib/anthropic";
import {
  BUILDER_SYSTEM,
  buildBuilderUserPrompt,
  STUDY_DRAFT_SCHEMA,
} from "@/lib/prompts";
import type { StudyDraft } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Creator-only: draft a whole study from a freeform description, or refine an
// existing draft. Returns title/topic/goals + guide + respondent-facing intro.
export async function POST(req: Request) {
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { prompt, current } = (await req.json()) as {
      prompt: string;
      current?: StudyDraft;
    };
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Describe what you want to learn first." },
        { status: 400 },
      );
    }
    const draft = await generateStructured<StudyDraft>({
      system: BUILDER_SYSTEM,
      user: buildBuilderUserPrompt(prompt.trim(), current),
      schema: STUDY_DRAFT_SCHEMA,
    });
    return NextResponse.json(draft);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to draft" },
      { status: 500 },
    );
  }
}
