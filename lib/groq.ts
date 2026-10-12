// Thin, swappable speech-to-text seam. Defaults to Groq-hosted Whisper
// (`whisper-large-v3`) via its OpenAI-compatible transcription endpoint. Only ever
// imported by the server-side /api/transcribe route — the key never reaches the
// browser. Audio is forwarded for transcription and never persisted.
//
// Groq does not train on inputs and supports Zero Data Retention (enable ZDR in the
// Groq console for the production key). Swap providers by reimplementing transcribe().

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3";

// Server-only check used to hide the mic when no key is configured, so a respondent
// never records into a dead transcription endpoint. Import only from server components
// / route handlers — it reads a server env var and the boolean is all that crosses to
// the client.
export function transcriptionEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export async function transcribe(file: Blob, filename: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", MODEL);
  form.append("response_format", "json");
  // English-first today, but Whisper auto-detects, so we leave language unset to
  // keep multilingual headroom.

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Transcription failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
