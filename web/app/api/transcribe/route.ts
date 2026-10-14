import { NextResponse, type NextRequest } from "next/server";
import { transcribe, transcriptionEnabled } from "@/lib/groq";
import { clientIp, isInterviewId } from "@/lib/http";
import { getInterview, withinLimit } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel serverless request bodies are capped ~4.5 MB. Compressed audio plus the client-side
// recording cap keeps real answers well under it; reject anything larger rather than fail opaquely.
const MAX_BYTES = 4_000_000;

// Speech-to-text for the member composer (ported from aligned-interviewer). Audio is forwarded
// to the provider and NOT stored. Gated so it is not an open paid endpoint: the caller must
// present an interview that is in progress.
export async function POST(req: NextRequest) {
  if (!transcriptionEnabled()) {
    return NextResponse.json({ error: "Voice answers are not enabled on this site.", code: "voice_off" }, { status: 404 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("audio");
  const interviewId = form.get("interviewId");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording too long. Please keep it under about 2 minutes." }, { status: 413 });
  }

  // Authorise: an interview that is still in progress.
  const rec = isInterviewId(interviewId) ? await getInterview(interviewId) : null;
  if (!rec || rec.state.status !== "in_progress") {
    return NextResponse.json({ error: "Interview not active", code: "not_active" }, { status: 403 });
  }

  // Caps so one interview id cannot become a paid transcription loop.
  if (!(await withinLimit("tx:iv:" + interviewId, 30, 60 * 24 * 60 * 60)) || !(await withinLimit("tx:ip:" + clientIp(req), 60, 60 * 60))) {
    return NextResponse.json({ error: "Voice limit reached for this interview. Please type your answer.", code: "limit" }, { status: 429 });
  }

  const filename = file instanceof File && file.name ? file.name : `audio.${file.type.includes("mp4") ? "mp4" : "webm"}`;
  try {
    const text = await transcribe(file, filename);
    return NextResponse.json({ text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Transcription failed. Please type your answer instead.", code: "failed" }, { status: 502 });
  }
}
