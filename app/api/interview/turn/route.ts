import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "@/lib/anthropic";
import {
  buildInterviewSystem,
  COVERAGE_OPEN,
  COVERAGE_CLOSE,
  COMPLETE_MARKER,
} from "@/lib/prompts";
import {
  getInterview,
  getStudy,
  getTranscript,
  appendTurn,
  markCompleted,
  markCompletedEarly,
} from "@/lib/db";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function toMessages(transcript: Turn[]): Anthropic.MessageParam[] {
  const base: Anthropic.MessageParam[] = transcript.length
    ? transcript.map((t) => ({
        role: t.role === "interviewer" ? ("assistant" as const) : ("user" as const),
        content: t.text,
      }))
    : [{ role: "user", content: "Please begin the interview." }];
  // Cache the conversation prefix (the last message carries the breakpoint).
  const last = base[base.length - 1];
  base[base.length - 1] = {
    role: last.role,
    content: [
      {
        type: "text",
        text: typeof last.content === "string" ? last.content : "",
        cache_control: { type: "ephemeral" },
      },
    ],
  };
  return base;
}

function safeVisible(full: string): string {
  const idx = full.indexOf("<<");
  if (idx !== -1) return full.slice(0, idx);
  return full.endsWith("<") ? full.slice(0, -1) : full;
}

function parseCoverage(full: string): string[] {
  const start = full.indexOf(COVERAGE_OPEN);
  if (start === -1) return [];
  const end = full.indexOf(COVERAGE_CLOSE, start + COVERAGE_OPEN.length);
  if (end === -1) return [];
  return full
    .slice(start + COVERAGE_OPEN.length, end)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const { interviewId, answer, endNow } = (await req.json()) as {
    interviewId: string;
    answer?: string;
    endNow?: boolean;
  };

  const interview = await getInterview(interviewId);
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (interview.status !== "in_progress") {
    return NextResponse.json(
      { error: "Interview already finished" },
      { status: 409 },
    );
  }
  const study = await getStudy(interview.study_id);
  if (!study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  // Persist the respondent's answer first, then assemble the full transcript from
  // the DB (the server is the source of truth — the browser can't forge history).
  let transcript = await getTranscript(interviewId);
  if (answer && answer.trim()) {
    await appendTurn(interviewId, "respondent", answer.trim(), transcript.length);
    transcript = [...transcript, { role: "respondent", text: answer.trim() }];
  }
  const interviewerIdx = transcript.length;

  // Quick-exit: the respondent asked to stop. Add a synthetic (non-persisted) user
  // turn so the model has something to respond to, and a closing instruction below.
  const modelTranscript: Turn[] = endNow
    ? [
        ...transcript,
        { role: "respondent", text: "[I need to stop here — please wrap up.]" },
      ]
    : transcript;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      try {
        const model = MODELS.interview;
        const supportsEffort = !/haiku|sonnet-4-5/i.test(model);
        const params = {
          model,
          max_tokens: 1024,
          thinking: { type: "disabled" as const },
          system: [
            {
              type: "text" as const,
              text: buildInterviewSystem(study.guide),
              cache_control: { type: "ephemeral" as const },
            },
            // Non-cached closing instruction, appended only on a quick-exit so the
            // cached system prefix above stays stable across normal turns.
            ...(endNow
              ? [
                  {
                    type: "text" as const,
                    text: "# Respondent is ending early\nThe respondent has chosen to stop now. Do not ask any further substantive question. In one short, warm message, thank them sincerely for their time and close. Then output the coverage marker as usual and <<COMPLETE>> on its own line.",
                  },
                ]
              : []),
          ],
          messages: toMessages(modelTranscript),
          ...(supportsEffort
            ? { output_config: { effort: "low" as const } }
            : {}),
        };
        const ms = anthropic.messages.stream(params);

        let full = "";
        let sent = 0;
        for await (const event of ms) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            const visible = safeVisible(full);
            if (visible.length > sent) {
              send("delta", { text: visible.slice(sent) });
              sent = visible.length;
            }
          }
        }

        // A quick-exit always ends the interview, even if the model omits the marker.
        const completed = full.includes(COMPLETE_MARKER) || !!endNow;
        const cleaned = full.split("<<")[0].trim();
        await appendTurn(interviewId, "interviewer", cleaned, interviewerIdx);
        if (endNow) await markCompletedEarly(interviewId);
        else if (completed) await markCompleted(interviewId);

        send("done", { completed, coverage: parseCoverage(full) });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Interview stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
