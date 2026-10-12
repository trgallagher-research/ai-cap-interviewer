// Server-side generation of the respondent-facing framework reflection. Shared by the
// /api/interview/analysis route (which the respondent flow triggers on completion) and the
// /api/interview/email route (which sends it), so the generate-and-cache logic lives once.
//
// Like the plain recap it is built from the transcript ONLY (never the guide), so the
// research agenda cannot leak. Unlike the recap it is interpretive — read through the study's
// chosen lens (lib/frameworks.ts). Generated with Opus, thinking OFF (matches the validated
// prototype and keeps it well under the 60s function limit).

import { generateStructured, MODELS } from "./anthropic";
import {
  getInterview,
  getStudy,
  getTranscript,
  getRespondentAnalysis,
  saveRespondentAnalysis,
} from "./db";
import { resolveFramework } from "./frameworks";
import { buildFrameworkUserPrompt, FRAMEWORK_REFLECTION_SCHEMA } from "./prompts";
import type { FrameworkReflection } from "./types";

// Below this much respondent text there's nothing to reflect on — same threshold as the recap.
const MIN_RESPONDENT_CHARS = 200;

export type AnalysisReason =
  | "not_found"
  | "not_complete"
  | "no_framework"
  | "too_short";

/** Return the cached framework reflection for an interview, generating and caching it first
 *  if needed. Returns `{ analysis: null, reason }` when there's nothing to produce (no such
 *  interview, not finished, the study has no framework, or too little was said). */
export async function getOrBuildAnalysis(
  interviewId: string,
): Promise<{ analysis: FrameworkReflection | null; reason?: AnalysisReason }> {
  const interview = await getInterview(interviewId);
  if (!interview) return { analysis: null, reason: "not_found" };
  if (!["completed", "completed_early"].includes(interview.status)) {
    return { analysis: null, reason: "not_complete" };
  }

  const study = await getStudy(interview.study_id);
  const framework = study ? resolveFramework(study) : null;
  if (!framework) return { analysis: null, reason: "no_framework" };

  // Serve the cached reflection if we already made one (guards repeat calls / cost).
  const cached = await getRespondentAnalysis(interviewId);
  if (cached) return { analysis: cached };

  const turns = await getTranscript(interviewId);
  const respondentTurns = turns.filter((t) => t.role === "respondent");
  const respondentChars = respondentTurns.reduce((n, t) => n + t.text.length, 0);
  if (respondentTurns.length < 2 || respondentChars < MIN_RESPONDENT_CHARS) {
    return { analysis: null, reason: "too_short" };
  }

  const transcriptText = turns
    .map((t) => `${t.role === "interviewer" ? "Interviewer" : "You"}: ${t.text}`)
    .join("\n");

  const analysis = await generateStructured<FrameworkReflection>({
    system: framework.system,
    user: buildFrameworkUserPrompt(transcriptText),
    schema: FRAMEWORK_REFLECTION_SCHEMA,
    model: MODELS.reasoning, // Opus — the interpretive read wants the stronger model
    thinking: false, // matches the prototype; keeps generation under the 60s limit
    maxTokens: 3000,
  });

  await saveRespondentAnalysis(interviewId, interview.study_id, analysis);
  return { analysis };
}
