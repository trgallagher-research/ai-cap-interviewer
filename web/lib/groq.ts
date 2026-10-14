// Thin, swappable speech-to-text seam (ported from aligned-interviewer). Defaults to Groq-hosted
// Whisper (`whisper-large-v3`) via its OpenAI-compatible transcription endpoint. SERVER-ONLY:
// only imported by /api/transcribe and /api/config; the key never reaches the browser. Audio is
// forwarded for transcription and never persisted.

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3";

/** Hide the mic when no key is configured. */
export function transcriptionEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/** Text plus the audio length Groq reports (seconds; 0 when it gives none), for cost tracking. */
export async function transcribe(file: Blob, filename: string): Promise<{ text: string; seconds: number }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", MODEL);
  form.append("response_format", "verbose_json"); // includes the audio duration
  // Members answer in English for the pilot, but Whisper auto-detects; leave language unset.

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const data = (await res.json()) as { text?: string; duration?: number };
  const seconds = typeof data.duration === "number" && Number.isFinite(data.duration) ? data.duration : 0;
  return { text: (data.text ?? "").trim(), seconds };
}
