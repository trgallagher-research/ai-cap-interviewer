# Handoff — interview experience redesign

A continuation document for picking this work up in a new Claude Code session (e.g.
on another account). The **code** transfers via git; this captures the **context** —
what was built, why, and what's left. Pairs with the GitHub issue
[#1 (GDPR operational tasks)](https://github.com/trgallagher-research/claude-interviewer/issues/1).

- **Repo:** `trgallagher-research/claude-interviewer`
- **Branch:** `claude/interview-experience-design-qfucb7` (all work pushed here; no PR opened)
- **State:** `tsc --noEmit` clean, `next build` green (all routes). Not yet exercised
  live (voice/mic needs a real browser + a `GROQ_API_KEY`).

## What this project is

Aligned Interviewer — AI-led interviews for qualitative research (built on Anthropic's
Claude models). Three stages: a creator drafts an interview **guide** (topic + goals → strategy + objectives),
a respondent has an adaptive one-question-at-a-time **interview**, and the model
**synthesises** transcripts
(per-interview and cross-study). Next.js (App Router) + TypeScript + React 19, Anthropic
SDK in server routes, Supabase for persistence/auth, deployed on Vercel.

## Why this work happened

User testing surfaced gaps: respondents landed cold on a bare consent card with no sense
of purpose or progress and no graceful way to stop; the creator filled rigid
Title/Topic/Goals fields; no voice input; desktop-first UI. This redesign addresses six
connected improvements plus the GDPR obligations they trigger.

## The six workstreams (all implemented)

1. **Prompt-driven builder** — `/studio/new` leads with a freeform "what are you trying
   to learn?" box. Opus drafts title/topic/goals + guide + a respondent-facing intro in
   one pass (`BUILDER_SYSTEM` + `STUDY_DRAFT_SCHEMA` in `lib/prompts.ts`, via
   `generateStructured` in `lib/anthropic.ts`), with a **Refine** loop to iterate. All
   fields stay editable.
2. **Landing page** — a new `phase: "landing"` before consent in
   `app/s/[studyId]/Respondent.tsx`, rendered from the auto-generated `intro`. Older
   studies (no intro) get a topic-based fallback built in `app/s/[studyId]/page.tsx`.
3. **Progress + estimate** — replaced the objective-text pills with an **abstract,
   monotonic progress bar** driven by the existing `<<COVERAGE:...>>` signal, plus an
   "~N min left (estimated)" hint from `target_minutes`. Snaps to 100% on completion.
4. **Quick-exit** — a "Wrap up now" control → `endNow` flag → the turn route injects a
   one-shot closing instruction and marks the interview `completed_early`. Data was
   already saved live per-turn.
5. **Voice-to-text** — Groq-hosted Whisper behind a swappable `transcribe()` seam
   (`lib/groq.ts`); gated `/api/transcribe`; shared `app/components/VoiceButton.tsx`.
6. **Mobile / responsive pass** — `100dvh`, safe-area insets, `viewportFit:cover`,
   tap-target sizing, composer wrapping, masthead truncation.

Plus **GDPR**: layered consent, `/privacy` notice, self-serve deletion at `/delete`.

## Key design decisions (and the reasoning)

| Decision | Why |
| --- | --- |
| Progress shown **abstractly**, objectives hidden from respondents | The objectives are the research agenda; naming what you probe for biases answers. (They were previously leaked via the coverage pills.) |
| Progress bar is **monotonic** (high-water mark) | The coverage signal is lumpy and could regress; a bar that goes backwards reads as broken. |
| Early-exit interviews **excluded from cross-study synthesis**, kept per-interview | A few thin partial transcripts could skew aggregate themes. |
| **Audio discarded** after transcription (text only stored) | Massively smaller GDPR surface; no audio at rest. |
| Voice = **server-side STT (Groq Whisper)**, not Web Speech API | Better + consistent accuracy across browsers/accents/devices (respondents are varied); and the "record → ✓ keep / ✗ discard → text" UX is the record-then-transcribe shape, which fits server STT cleanly. |
| **Groq** specifically, with **Zero Data Retention** | Cheapest + fastest Whisper host, 99-language headroom, no training on inputs, ZDR available. (Note: Groq the inference host ≠ xAI's "Grok".) |
| **Edit-before-send** always | STT errors mustn't silently become "verbatim" quotes feeding synthesis; user can fix transcription first. |
| ~150s recording cap + compressed audio (Opus/webm, mp4 on Safari) | Keeps payload under **Vercel's ~4.5 MB request-body limit** and the 60s route budget. |
| Three **synthesized Web Audio earcons** (no asset files) | Warm, low-mid, short (~100ms): start = soft pop, ✓ = rising two-note, ✗ = lower single. Per UX earcon guidance (short/warm/few). |
| Final consent **wording stays the owner's** | Legal; placeholders shipped, not finalized copy. |
| TTS / full voice conversation **out of scope** | Voice-to-text is an additive input layer; interviewer-talks-back is a different, much larger project. |

## File map

- **Schema/data:** `supabase/migrations/0001_experience.sql`, `supabase/schema.sql`,
  `lib/types.ts` (`Intro`, `StudyDraft`), `lib/db.ts` (ref code on create,
  `markCompletedEarly`, `deleteInterviewByRefCode`).
- **Builder:** `lib/prompts.ts`, `app/api/studio/plan/route.ts`, `lib/studio-client.ts`,
  `app/api/studio/studies/route.ts`, `app/studio/new/page.tsx`.
- **Respondent:** `app/s/[studyId]/Respondent.tsx`, `app/s/[studyId]/page.tsx`,
  `lib/respondent.ts`, `app/api/interview/turn/route.ts`,
  `app/api/interview/start/route.ts`, `app/api/studio/[studyId]/synthesis/route.ts`,
  `app/studio/[studyId]/page.tsx`.
- **Voice:** `lib/groq.ts`, `app/api/transcribe/route.ts`,
  `app/components/VoiceButton.tsx`, `.env.local.example`.
- **Styling/mobile:** `app/globals.css`, `app/layout.tsx`.
- **GDPR:** `lib/consent.ts`, `app/privacy/page.tsx`, `app/delete/page.tsx`,
  `app/api/interview/delete/route.ts`, `docs/gdpr-compliance.md`.

## Must-dos before going live (order matters)

1. **Run the migration** `supabase/migrations/0001_experience.sql` (Supabase → SQL
   Editor → paste → Run). **Required** — the new code reads `studies.intro/target_minutes`
   and writes `interviews.ref_code`, so the app errors without it. Idempotent; safe once.
2. **Set `GROQ_API_KEY`** (with **ZDR enabled**) in `.env.local` and Vercel env, then
   redeploy. Optional `GROQ_WHISPER_MODEL` override (default `whisper-large-v3`).
3. **GDPR:** fill `[CONTROLLER]`/`[CONTACT]`/`[RETENTION]`/`[PRODUCT/RESEARCH]` in
   `lib/consent.ts`, bump `CONSENT_VERSION`, sign processor DPAs, set retention, get the
   wording reviewed. Full checklist in `docs/gdpr-compliance.md` + issue #1.

## Known gaps / open items

- **Mic shows even without a key** (rough edge): `VoiceButton` renders whenever the
  browser supports recording; without `GROQ_API_KEY` a respondent can record but
  transcription returns an inline error. Proposed follow-up: gate the mic on the key
  being configured (server-side for the respondent page so it cleanly hides). **Not yet
  done** — was offered to the user.
- **No per-respondent rate limiting** on public/cost-surface routes (incl.
  `/api/transcribe`, which is gated to a valid in-progress interview but not throttled).
  Pre-existing; bot protection for public studies is a separate task.
- Live verification (mic permission prompt, earcons, ✓/✗, Chrome webm + Safari mp4,
  no-audio-stored check, mobile at ~375px) still **needs a real browser run** — use the
  `/run` + `/verify` skills once the migration + key are in place.

## Pointers

- Approved implementation plan (home dir, NOT in repo): `~/.claude/plans/swirling-riding-barto.md`.
- GDPR operational tracking: `docs/gdpr-compliance.md` + GitHub issue #1.
