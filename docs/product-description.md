# Aligned Interviewer — product description

## What it is

Aligned Interviewer is a web application that runs qualitative-research
interviews with an AI interviewer instead of a human moderator, then analyses
the results for the researcher. A creator describes what they want to learn;
the product turns that into an interview guide, conducts the interview
itself — live, adaptively, one question at a time — and synthesizes the
transcript into themes, verbatim quotes, and objective coverage. It also
gives respondents a short, plain-language summary of their own conversation.

It is aimed at anyone who would otherwise run a semi-structured interview
study by hand — UX researchers, academic and market researchers, product
teams doing discovery — and want to scale past what a human interviewer's
calendar allows, while keeping the depth (follow-up probing, "tell me more",
concrete examples) that a static survey can't get.

A second, loosely-coupled feature lives in the same app: **Landscape
scans**, a desk-research tool that surveys a competitive/market landscape for
a given question and produces a sourced, claim-verified report. It shares
the creator's login and studio, but runs on separate infrastructure (see
below) — a landscape scan is not part of the interview loop.

## The core loop: three stages, three models

The product name for the model doing the work — Claude — matters to how each
stage is designed, because each stage plays to a different model's strengths:

1. **Plan (Studio → New study).** The creator writes a single freeform
   description of what they're trying to learn (not a rigid Title/Topic/Goals
   form). One Claude Opus call drafts the whole study in one pass: a title,
   topic, and goals; an interviewing *strategy* and 4–7 ordered *objectives*
   (each an id, a "what to learn" statement, and a one-line intent — never
   the literal question to ask); and a respondent-facing *intro* (purpose,
   what-to-expect, an honest minutes estimate). Everything is editable
   afterward, and a **Refine** loop lets the creator iterate in natural
   language ("make it less corporate", "add a question about pricing") —
   each refinement re-runs the same generation with the current draft as
   context, preserving anything the request doesn't touch.

2. **Interview (respondent-facing, at `/s/[studyId]`).** A respondent opens a
   shared link, sees a landing page built from the auto-generated intro (not
   the internal objectives — the research agenda must never leak to the
   person answering, since naming what's being probed for biases the
   answers), gives layered consent, and then talks to the interviewer.
   Claude Sonnet conducts the conversation: one open question at a time,
   grounded in the guide's strategy and objectives, probing vague answers,
   mirroring the respondent's language, staying neutral, following emergent
   threads rather than marching through a checklist. The respondent can type
   or speak (voice is transcribed server-side, see below), watches an
   abstract monotonic progress bar with an "~N min left" estimate, and can
   hit "Wrap up now" at any point for a graceful early exit. On completion,
   Claude writes them a short second-person recap of *their own* answers
   (their "report"), with an option to email it to themselves and/or opt in
   to receive the study's aggregate findings later.

3. **Synthesize (Studio → study page).** Per interview and across a whole
   study, Claude Opus reads the transcript(s) against the guide and produces
   a structured analysis: emergent themes with qualitative prevalence
   ("central concern", "raised by most respondents"), illustrative quotes
   that are verified to be exact substrings of what respondents actually
   said, and a coverage assessment against each objective. The creator can
   also trigger a lay-audience rewrite of the aggregate findings and send it
   to opted-in respondents, and export a study's raw responses as CSV or
   JSON.

Everything the respondent sees is generated from a schema that structurally
excludes the research agenda (no objectives, no coverage, no methodology
fields) — the separation between "researcher-facing" and "respondent-facing"
content is enforced by having two different output schemas, not by a prompt
instruction alone.

## How the interview itself works

The live interview is a single server route
(`app/api/interview/turn/route.ts`) that:

- Loads the study's guide and the interview's transcript-so-far from
  Postgres (the server, not the browser, is the source of truth — a
  respondent can't forge history).
- Builds a system prompt from the guide (`lib/prompts.ts:buildInterviewSystem`)
  that lays out the interviewing strategy, the objectives with their ids, and
  a fairly detailed interviewing style (ask one question, probe for concrete
  examples, don't lead or advise, keep questions short).
- Calls Claude with the transcript as message history and streams the
  response back over Server-Sent Events, so the respondent sees the
  interviewer's message appear token-by-token.
- Asks the model to emit machine-only **control markers** after its visible
  message — a `<<COVERAGE: obj1, obj3>>` line listing which objectives have
  been touched so far, and a `<<COMPLETE>>` marker on the final turn. The
  server strips these before anything reaches the client; the browser never
  sees the raw marker text. The progress bar is driven by counting covered
  objectives, is monotonic (a high-water mark, since the underlying signal
  can regress turn to turn), and snaps to 100% on completion.
- Uses Anthropic **prompt caching** on the system prompt and the growing
  conversation prefix, so a full multi-turn interview stays cheap even
  though each turn resends the whole transcript (the README puts a typical
  full demo interview at $0.20–0.40 on Sonnet).
- Every respondent turn is written to Postgres immediately (`appendTurn`),
  so an abandoned or early-exited interview is still captured — nothing is
  buffered client-side and lost on a closed tab.
- A "Wrap up now" quick-exit injects a one-shot, non-cached closing
  instruction telling the model to thank the respondent and close without
  another substantive question, and marks the interview `completed_early` —
  which keeps it in per-interview reporting but excludes it from
  cross-study synthesis, so a few thin partial transcripts can't skew the
  aggregate themes.

## Structured generation

The Plan, Synthesize, and report-writing stages all go through one helper
(`lib/anthropic.ts:generateStructured`), which calls Claude with a JSON
Schema `output_config.format`, so the response is guaranteed valid JSON
matching the app's TypeScript types (`Guide`, `StudyDraft`, `Synthesis`,
`RespondentReport`, `PublicAggregateReport`). These calls default to Opus
with adaptive extended thinking; latency-sensitive generations (e.g. the
respondent's own-interview report, which the respondent is actively waiting
on) pass `thinking: false` and a lighter model to keep the wait short.

## Voice input

Respondents can answer by voice instead of typing. A shared `VoiceButton`
component records short clips (capped around 150s, compressed as Opus/webm
or mp4 on Safari to stay under Vercel's request-body limit), which are sent
to `/api/transcribe` and transcribed server-side by Groq-hosted Whisper
(`lib/groq.ts`). The design deliberately uses server-side STT rather than the
browser's Web Speech API for consistent accuracy across devices/accents, and
deliberately **discards the audio after transcription** — only the text is
ever stored, which keeps the GDPR data-at-rest surface small. The
transcribed text always lands in an editable box before sending, so a
mis-transcription can be corrected before it's treated as a verbatim quote
feeding synthesis. The mic is hidden entirely (server-checked) when no
`GROQ_API_KEY` is configured, so a respondent never records into a dead
endpoint.

## Data model & persistence

Supabase (Postgres) holds everything:

- `studies` — a creator's interview project: title, topic, the `guide` JSON
  (strategy + objectives), the respondent-facing `intro` JSON, a target
  duration, visibility, and status.
- `interviews` — one row per respondent session: status (`in_progress` /
  `completed` / `completed_early` / `abandoned`), a human-quotable `ref_code`
  for GDPR deletion requests, consent version/timestamp, optional email and
  report opt-ins with idempotency timestamps for each send.
- `turns` — one row per message, written live as the conversation streams,
  so partial interviews are captured for free.
- `syntheses` — both creator-facing analyses (`cross`, `interview`) and
  respondent-facing reports (`respondent`, `aggregate_public`) live in the
  same table, distinguished by `kind`; each is cached so re-opening a study
  doesn't re-run the model.
- `scans` — one row per landscape-scan run (see below).

Row-level security scopes every table to `owner_id = auth.uid()` for the
creator dashboard; respondent-facing writes happen server-side with the
Supabase service-role key (which bypasses RLS), since respondents are
anonymous and never touch these tables directly.

## Auth, access control, and cost controls

- **Creator auth** is Supabase magic-link email auth, gated by a hard-coded
  allowlist of creator emails (`lib/creators.ts`) checked both in
  `middleware.ts` (session presence, protects `/studio`, `/api/studio/*`,
  `/scans/*`) and again in each protected route/page (`lib/auth.ts`) —
  middleware alone is not trusted for authorization.
- **Respondent routes** (`/s/*`, `/api/interview/*`) are intentionally public
  and unauthenticated — anyone with a study's share link can take the
  interview — but sit behind an optional shared-passcode gate
  (`APP_PASSCODE`, enforced in middleware) for controlled demos, and behind a
  per-study interview cap (`MAX_INTERVIEWS`, default 300) that shows a
  graceful "study full" state instead of placing another model call once a
  study is saturated.
- **Email** (Resend) and **transcription** (Groq) are both optional,
  fail-closed integrations: unset the API key and the feature quietly
  disables itself (on-screen report still renders; sending/recording just
  don't appear) rather than erroring.

## Landscape scans (adjacent feature)

Studio also exposes **Landscape scans** — a plain-English "who else is doing
X" market/competitor question that produces a sourced report (entities,
segments, key players, gaps, claim-by-claim verification with supporting
quotes and confidence levels). This is a *different system*: a Python
desk-research engine (`landscape-scanner`, a separate repository) that
performs real web search, triage, and profiling over several minutes — too
long to fit inside a 60-second Vercel function. It runs as an always-on
service on a separate host, reachable only through a Cloudflare Tunnel with
Access, and this app is a thin, creator-authenticated proxy in front of it
(`lib/scanner.ts`, `app/api/studio/scan/*`): it starts a run, polls status,
and once the engine reports `done`, fetches and caches the report JSON into
Supabase so it's served from Postgres thereafter. Reports render natively
(the TypeScript types in `lib/types.ts` mirror the engine's Pydantic models
field-for-field) with HTML and Word (.docx) export. Budgets and concurrency
are capped on both sides (`SCAN_BUDGET_MAX`, `SCAN_MAX_ACTIVE` on the website;
matching hard caps on the engine) since scans are bring-your-own-key against
the creator's own search/LLM provider accounts.

## Privacy and consent

Because respondents may disclose sensitive information, the product treats
GDPR-style compliance as a first-class concern rather than an afterthought:
layered consent (a short in-flow notice plus a full `/privacy` page) naming
every processor (Anthropic, Groq, Resend, Supabase, Vercel) and the legal
basis (explicit consent, including for special-category data); a
self-serve deletion flow at `/delete` keyed off the respondent's ref code;
retention capped at 12 months; and audio discarded immediately after
transcription. Consent wording is versioned (`CONSENT_VERSION`) and the
version + timestamp are stamped on every interview row.

## Stack

- **Next.js (App Router) + TypeScript + React 19**, deployed on **Vercel**.
- **`@anthropic-ai/sdk`**, used only in server-side route handlers (API keys
  never reach the browser). Models are environment-configurable server-side:
  Claude Sonnet for live interview turns (latency-sensitive, a person is
  waiting), Claude Opus for planning and synthesis (quality over latency),
  swappable to Haiku for cheap end-to-end plumbing tests.
- **Supabase** (Postgres + Auth) for persistence, magic-link creator login,
  and row-level security.
- **Groq** (hosted Whisper) for optional voice transcription; **Resend** for
  optional transactional email.
- **`docx`** for report/export generation.
- A separate Python service (**landscape-scanner**, FastAPI + uvicorn) behind
  a **Cloudflare Tunnel + Access**, for the desk-research feature.

## Repository layout

```
app/
  page.tsx                 # entry
  studio/                  # creator area: study list, new-study builder, per-study
                            # results (responses, synthesis, share link, export),
                            # per-interview transcript view
  s/[studyId]/              # public respondent flow: landing → consent → interview
                            # → completion/report
  scans/                   # landscape-scan UI (new scan, running status, report view)
  api/
    studio/plan/            # Opus → StudyDraft (title/topic/goals/guide/intro)
    studio/studies/         # create/list studies
    studio/[studyId]/synthesis/  # per-study + cross-study synthesis
    studio/[studyId]/report/send/ # aggregate report email trigger
    studio/[studyId]/export/      # CSV/JSON export
    studio/scan/*            # scanner proxy (start/status/report/export)
    interview/start/         # create an interview row, enforce the study cap
    interview/turn/          # the live SSE interview loop (see above)
    interview/report/        # respondent's own-interview report
    interview/email/         # opt-in email capture + send
    interview/delete/        # GDPR self-serve deletion by ref code
    transcribe/               # Groq Whisper proxy
  auth/                     # Supabase auth callback/signout
  privacy/, delete/          # GDPR pages
lib/
  anthropic.ts              # SDK client, model constants, generateStructured()
  prompts.ts                # every system prompt + JSON schema, per stage
  db.ts                     # all Supabase reads/writes, one function per operation
  auth.ts, creators.ts       # creator session + allowlist
  consent.ts                # consent copy + version
  groq.ts, email.ts, scanner.ts  # thin, fail-closed third-party integrations
  types.ts                  # shared types across client/server for every stage
middleware.ts               # session refresh + auth gate for /studio, /api/studio, /scans
supabase/
  schema.sql, migrations/    # studies, interviews, turns, syntheses, scans
```
