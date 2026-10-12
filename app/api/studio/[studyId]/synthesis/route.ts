import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateStructured } from "@/lib/anthropic";
import {
  CROSS_SYNTHESIS_SYSTEM,
  buildCrossSynthesisUserPrompt,
  SYNTHESIS_SCHEMA,
} from "@/lib/prompts";
import type { Guide, Synthesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TRANSCRIPTS = 40; // cap respondents per run (cost / latency)
const MAX_CHARS = 120_000; // cap total transcript characters

// Authorize: the caller must own the study. Returns its guide, or null.
async function ownStudyGuide(studyId: string): Promise<Guide | null> {
  const creator = await getCreator();
  if (!creator) return null;
  const { data } = await creator.supabase
    .from("studies")
    .select("id,guide")
    .eq("id", studyId)
    .single();
  return data ? (data.guide as Guide) : null;
}

// Fetch the cached cross-interview synthesis, if any.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const { studyId } = await params;
  if (!(await ownStudyGuide(studyId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("syntheses")
    .select("content,created_at")
    .eq("study_id", studyId)
    .is("interview_id", null)
    .eq("kind", "cross")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    synthesis: data?.content ?? null,
    generated_at: data?.created_at ?? null,
  });
}

// Generate (or regenerate) the cross-interview synthesis and cache it.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const { studyId } = await params;
  const guide = await ownStudyGuide(studyId);
  if (!guide) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();

  // Only fully-completed interviews feed the cross-study synthesis. Early exits
  // (completed_early), abandoned, and in-progress interviews are excluded so a few
  // thin partial transcripts can't skew the aggregate themes.
  const { data: ivs } = await sb
    .from("interviews")
    .select("id")
    .eq("study_id", studyId)
    .eq("status", "completed");
  const ids = (ivs ?? []).map((i) => i.id as string);
  if (!ids.length) {
    return NextResponse.json(
      { error: "No completed interviews yet" },
      { status: 400 },
    );
  }

  const { data: allTurns } = await sb
    .from("turns")
    .select("interview_id,role,text,idx")
    .in("interview_id", ids)
    .order("idx", { ascending: true });

  const byInterview = new Map<string, { role: string; text: string }[]>();
  for (const t of allTurns ?? []) {
    const arr = byInterview.get(t.interview_id) ?? [];
    arr.push({ role: t.role, text: t.text });
    byInterview.set(t.interview_id, arr);
  }

  let transcripts: string[] = [];
  for (const id of ids) {
    const turns = byInterview.get(id) ?? [];
    if (!turns.some((t) => t.role === "respondent")) continue; // skip empty
    transcripts.push(
      turns
        .map(
          (t) =>
            `${t.role === "interviewer" ? "Interviewer" : "Respondent"}: ${t.text}`,
        )
        .join("\n"),
    );
    if (transcripts.length >= MAX_TRANSCRIPTS) break;
  }
  if (!transcripts.length) {
    return NextResponse.json(
      { error: "No answered interviews yet" },
      { status: 400 },
    );
  }
  // Cap total size for cost/latency.
  let total = 0;
  transcripts = transcripts.filter((t) => {
    total += t.length;
    return total <= MAX_CHARS;
  });

  let synthesis: Synthesis;
  try {
    synthesis = await generateStructured<Synthesis>({
      system: CROSS_SYNTHESIS_SYSTEM,
      user: buildCrossSynthesisUserPrompt(guide, transcripts),
      schema: SYNTHESIS_SCHEMA,
      maxTokens: 8000,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Synthesis failed" },
      { status: 500 },
    );
  }

  // Replace any cached cross-interview synthesis for this study.
  await sb
    .from("syntheses")
    .delete()
    .eq("study_id", studyId)
    .is("interview_id", null)
    .eq("kind", "cross");
  await sb
    .from("syntheses")
    .insert({
      study_id: studyId,
      interview_id: null,
      kind: "cross",
      content: synthesis,
    });

  return NextResponse.json({
    synthesis,
    generated_at: new Date().toISOString(),
    based_on: transcripts.length,
  });
}
