import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/groq";
import { getInterview } from "@/lib/db";
import { getCreator } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel serverless request bodies are capped ~4.5 MB. Compressed audio (Opus/webm
// or mp4) plus the client-side ~150s recording cap keeps real answers well under it;
// we reject anything larger rather than fail opaquely.
const MAX_BYTES = 4_000_000;

// Speech-to-text for the respondent composer and the builder prompt box. Audio is
// forwarded to the provider and NOT stored. Gated so it isn't an open paid endpoint:
// a respondent must present a valid in-progress interview; otherwise the caller must
// be an authenticated creator (the builder surface).
export async function POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: "Recording too long — please keep it under ~2 minutes." },
      { status: 413 },
    );
  }

  // Authorize.
  if (typeof interviewId === "string" && interviewId) {
    const interview = await getInterview(interviewId);
    if (!interview || interview.status !== "in_progress") {
      return NextResponse.json({ error: "Interview not active" }, { status: 403 });
    }
  } else if (!(await getCreator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename =
    file instanceof File && file.name
      ? file.name
      : `audio.${file.type.includes("mp4") ? "mp4" : "webm"}`;

  try {
    const text = await transcribe(file, filename);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
