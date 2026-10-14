"use client";

/* Ported from aligned-interviewer/app/components/VoiceButton.tsx.
 * Records a spoken answer, posts it to /api/transcribe and hands the text back to the caller,
 * which drops it into the answer box for the member to edit and send. */

import { useEffect, useRef, useState } from "react";

interface Props {
  interviewId?: string;
  disabled?: boolean;
  /** Hidden entirely when transcription is not configured (/api/config.voice). */
  enabled?: boolean;
  /** Called with the transcribed text — the caller drops it into an editable field. */
  onText: (text: string) => void;
  maxSeconds?: number;
}

type State = "idle" | "recording" | "transcribing";

// Three short, warm earcons synthesized with the Web Audio API (no asset files):
// start = soft low pop, keep = rising two-note, cancel = single lower tone.
function earcon(kind: "start" | "keep" | "cancel") {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes: [number, number, number][] =
      kind === "start"
        ? [[440, 0, 0.12]]
        : kind === "keep"
          ? [
              [523.25, 0, 0.1],
              [659.25, 0.09, 0.13],
            ]
          : [[392, 0, 0.15]];
    for (const [freq, t, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.14, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.03);
    }
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* audio is a nicety — never block recording on it */
  }
}

function pickMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function VoiceButton({ interviewId, disabled, enabled = true, onText, maxSeconds = 150 }: Props) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<State>("idle");
  stateRef.current = state;

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
    );
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopTracks() {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function start() {
    if (disabled || state !== "idle") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      discardRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTracks();
        if (discardRef.current) {
          setState("idle");
          setSeconds(0);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        void upload(blob);
      };
      recorderRef.current = rec;
      rec.start();
      earcon("start");
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= maxSeconds) keep(); // auto-stop, keep what we have
          return next;
        });
      }, 1000);
    } catch {
      setError("Microphone unavailable");
      setState("idle");
    }
  }

  function keep() {
    if (stateRef.current !== "recording") return;
    earcon("keep");
    stateRef.current = "transcribing";
    setState("transcribing");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    discardRef.current = false;
    recorderRef.current?.stop();
  }

  function cancel() {
    if (stateRef.current !== "recording") return;
    earcon("cancel");
    discardRef.current = true;
    recorderRef.current?.stop();
  }

  async function upload(blob: Blob) {
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.append("audio", blob, `answer.${ext}`);
      if (interviewId) form.append("interviewId", interviewId);
      const r = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Transcription failed");
      }
      const { text } = (await r.json()) as { text: string };
      if (text) onText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setState("idle");
      setSeconds(0);
    }
  }

  if (!enabled || !supported) return null;

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (state === "recording") {
    return (
      <span className="voice recording" role="group" aria-label="Recording">
        <span className="voice-dot" aria-hidden />
        <span className="voice-time">{mmss}</span>
        <button type="button" className="voice-btn keep" onClick={keep} title="Stop and use this recording" aria-label="Stop and use this recording">
          ✓
        </button>
        <button type="button" className="voice-btn cancel" onClick={cancel} title="Discard recording" aria-label="Discard recording">
          ✕
        </button>
      </span>
    );
  }

  return (
    <span className="voice">
      <button
        type="button"
        className="voice-btn mic"
        id="btn-voice"
        onClick={start}
        disabled={disabled || state === "transcribing"}
        title={state === "transcribing" ? "Transcribing…" : "Speak your answer"}
        aria-label={state === "transcribing" ? "Transcribing" : "Speak your answer"}
      >
        {state === "transcribing" ? <span className="spinner" aria-hidden="true" /> : <MicIcon />}
      </button>
      {error && <span className="voice-error" role="alert">{error}</span>}
    </span>
  );
}
