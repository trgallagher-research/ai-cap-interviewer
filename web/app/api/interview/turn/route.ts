import type { NextRequest } from "next/server";
import { Interview } from "@/lib/aiwd/engine";
import { errorResponse, isInterviewId, jsonError, readJson } from "@/lib/http";
import { getLlm, toLlmError } from "@/lib/llm";
import { memberRateItems } from "@/lib/member";
import { acquireLock, getInterview, releaseLock, saveInterview } from "@/lib/store";
import { cleanText, LIMITS_INPUT, validateRatings } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Spend guard on top of the engine's own limits: model-calling turn requests per interview
 *  (failed and retried turns included). A normal interview needs about 12. */
const MAX_TURN_REQUESTS = 40;

/**
 * POST {interviewId, answer?, tapped?, ratings?, endNow?} → SSE.
 *   event: delta {text}   new visible text to append (never contains "<<")
 *   event: done  {phase, rateItems|null, chips|null, complete, text}   text = the final visible message
 *   event: error {message, code?}
 * The answer (or ratings) is recorded before the model call and kept if the call fails; retry by
 * sending {interviewId} alone. The browser never sends a prompt: only these fields are read.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await readJson(req); } catch (err) { return errorResponse(err); }
  const id = body.interviewId;
  if (!isInterviewId(id)) return jsonError(404, "Interview not found", "not_found");

  const token = await acquireLock(id).catch(() => null);
  if (!token) return jsonError(409, "Still working on the previous answer.", "busy");

  let handedOff = false;
  try {
    const rec = await getInterview(id);
    if (!rec) return jsonError(404, "Interview not found", "not_found");
    const st = rec.state;
    if (st.status === "complete" || st.status === "ended_early") {
      return jsonError(409, "This interview has finished.", "finished");
    }
    const endNow = body.endNow === true;
    const iv = Interview.fromJSON(st, getLlm());

    // 1. Record what the member sent (before the model call).
    let changed = false;
    if (body.ratings !== undefined && body.ratings !== null) {
      if (iv.status !== "rating" || !iv.rateItems) return jsonError(409, "Ratings are not expected now.", "not_rating");
      const ratings = validateRatings(body.ratings, iv.rateItems.map((it) => it.id));
      iv.submitRatings(ratings);
      changed = true;
    } else if (iv.status === "rating" && !endNow) {
      return jsonError(409, "Please submit your ratings first.", "awaiting_ratings");
    }
    const answer = body.answer === undefined || body.answer === null ? "" : cleanText(body.answer, "answer", LIMITS_INPUT.answer, false);
    if (answer && body.ratings === undefined) {
      if (iv.status === "rating") return jsonError(409, "Please submit your ratings first.", "awaiting_ratings");
      const last = iv.turns[iv.turns.length - 1];
      // A client that re-sends the same answer on retry must not duplicate it.
      if (!(last && last.role === "member" && last.text === answer)) {
        iv.answer(answer, { tapped: body.tapped === true });
        changed = true;
      }
    }
    if (!changed && !endNow) {
      const last = iv.turns[iv.turns.length - 1];
      if (last && last.role !== "member") return jsonError(409, "There is nothing to answer yet.", "nothing_to_answer");
    }
    const calls = (rec.turnRequests || 0) + 1;
    // endNow keeps a few extra calls so a member at the limit can still close and get feedback.
    if (calls > MAX_TURN_REQUESTS + (endNow ? 3 : 0)) {
      if (changed) { rec.state = iv.toJSON(); await saveInterview(rec); }
      return jsonError(429, "This interview has reached its limit. Please use 'I'd like to stop' to finish.", "limit");
    }
    rec.turnRequests = calls;
    rec.state = iv.toJSON();
    await saveInterview(rec);

    // 2. Stream the interviewer's reply.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (event: string, data: unknown) => {
          if (!open) return;
          try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { open = false; }
        };
        let sent = "";
        let diverged = false;
        try {
          const res = await iv.next((visible) => {
            // Append-only: the engine's RATE retry restarts the text; stop deltas then and let
            // `done.text` carry the final message.
            if (diverged) return;
            if (!visible.startsWith(sent)) { diverged = true; return; }
            if (visible.length > sent.length) {
              send("delta", { text: visible.slice(sent.length) });
              sent = visible;
            }
          }, { endNow });
          rec.state = iv.toJSON();
          await saveInterview(rec);
          send("done", {
            phase: res.phase,
            rateItems: memberRateItems(res.rateItems),
            chips: res.chips,
            complete: res.complete,
            text: res.visible,
          });
        } catch (err) {
          const e = toLlmError(err);
          send("error", { message: e.message, code: e.code });
        } finally {
          await releaseLock(id, token);
          if (open) { try { controller.close(); } catch { /* already closed */ } }
        }
      },
    });
    handedOff = true;
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return errorResponse(err);
  } finally {
    if (!handedOff) await releaseLock(id, token);
  }
}
