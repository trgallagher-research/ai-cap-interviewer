# AI at Work Diagnostic — Vercel build: architecture and API contract

The web version of `prototype/` (the Claude artifact). Same product, same prompts, same scoring;
what changes is who holds the key and the data. In the artifact each viewer's own Claude account
paid for calls and the browser built prompts. Here the **server owns the API key, the prompts, the
interview state and the stored profiles**. The browser never sends a prompt, so the site cannot be
used as a free Claude proxy.

Lives in `web/` (Vercel project Root Directory = `web`). The repo root stays the untouched copy of
aligned-interviewer; `prototype/` stays the artifact.

## Stack
- Next.js 15 (App Router, TypeScript, React 19), Node runtime for API routes, `maxDuration = 60`.
- `@anthropic-ai/sdk` server-side only (`lib/llm.ts`). Models via env: `MODEL_INTERVIEW`, `MODEL_REASONING`,
  both default `claude-opus-5-5`; interview turns at effort `low`, profile/product read/share-back at
  `medium`. Every call uses `client.beta.messages.stream(...)` with `betas: ["server-side-fallback-2026-07-01"]`,
  `fallbacks: "default"`, and checks `stop_reason === "refusal"` before reading text.
  The interviewer instruction block goes in `system` with `cache_control: {type:"ephemeral"}` (it is
  identical for every turn of one interview), the transcript in `messages`.
- Storage: Upstash Redis via `@upstash/redis` (Vercel Marketplace integration; reads `KV_REST_API_URL`/
  `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). When neither is set, an
  in-memory store is used (local dev and tests only; `/api/config` reports `storage: "memory"` and the
  organiser page shows a warning banner).
- Voice (new, was impossible in the artifact): `VoiceButton` + `/api/transcribe` ported from
  aligned-interviewer (Groq Whisper, `GROQ_API_KEY`; mic hidden when unset).
- Tests: Playwright against `next start` with `AIWD_MOCK_LLM=1`, which swaps `lib/llm.ts` for a scripted
  mock on the server (same scenarios as `prototype/tests/member.spec.js`).

## Shared logic (`lib/aiwd/`, typed ports of the prototype, behaviour unchanged)
- `prompts.ts` ← `prototype/src/prompts.js` (QUESTIONNAIRE, DOMAINS, LADDER, STANCES, MARK, NUDGES,
  all builders). One change: `buildInterviewSystem` is used as the `system` parameter instead of the first
  user message, and `interviewMessages` therefore starts with a short kick-off user turn
  ("[The interview begins now.]").
- `engine.ts` ← `prototype/src/engine.js` minus the browser LLM adapter. `Interview` takes an injected
  `llm` ({ chat(system, messages, {onText, tier}) → {text} }) and is (de)serialisable with toJSON/fromJSON.
  Pure functions (`assembleProfile`, `divergenceFor`, `stats`, `helpMap`, `signalsFromAnswers`, parse*) are
  importable from client code too (no server imports in this file).
- `types.ts`: Profile, Answers, InterviewState etc. from `prototype/docs/architecture.md`.
- `seed.ts` ← `prototype/src/seed.js` (16 fictional members), exported `SEED: Profile[]`.

## Access
- **Organiser area** (`/organiser`, `/network`, `/api/organiser/*`) requires `ORGANISER_PASSCODE`.
  `/organiser/login` posts it; the server sets an httpOnly, secure, SameSite=Lax cookie `aiwd_org` holding an
  HMAC of the passcode (key `AUTH_SECRET`, falls back to the passcode). Checked in `middleware.ts` and again
  in each organiser route. If `ORGANISER_PASSCODE` is unset in production, the organiser area is closed
  (503 with a setup message), never open.
- **Members** use `/` (no login). Optional `MEMBER_ACCESS_CODE`: when set, `/api/interview/start` requires it;
  the invite link `/?code=XYZ` pre-fills it (stored in sessionStorage, not shown in the URL after load).
- **Spend caps**: `MAX_INTERVIEWS` (default 150) total; start is rate-limited to 5 per IP per hour; the
  engine's own turn limits bound each interview; one turn at a time per interview (Redis lock, 90 s).

## Member API
All JSON unless noted. Errors: `{error: string, code?: string}` with a fitting status.

| Route | Body / query | Returns |
|---|---|---|
| `GET /api/config` | — | `{voice: bool, memberCodeRequired: bool, storage: "redis"\|"memory"}` |
| `POST /api/interview/start` | `{name, role, answers, accessCode?}` | `{interviewId}`; 403 `code:"access_code"`; 429 `code:"rate_limited"`; 503 `code:"full"` |
| `GET /api/interview/state?id=` | — | `{member, answers, turns:[{role,text,tapped?}], phase, status, rateItems\|null, chips\|null, ratingsSubmitted, finished: bool}` (no coding, no profile) |
| `POST /api/interview/turn` | `{interviewId, answer?, tapped?, ratings?, endNow?}` | **SSE** stream: `event: delta` `{text}` (new visible text to append), `event: done` `{phase, rateItems\|null, chips\|null, complete}`, `event: error` `{message, code?}` |
| `POST /api/interview/finish` | `{interviewId}` | `{feedback, ratings:[{task, rating\|null}], endedEarly}` — member-safe only; idempotent (second call returns the stored result) |
| `POST /api/transcribe` | multipart `audio`, `interviewId` | `{text}`; only for an interview with status in_progress |

Turn semantics:
- `answer` is recorded (with `tapped`) **before** the model call and kept if the call fails. To retry a failed
  turn the client sends `{interviewId}` with no answer; the server runs the next interviewer turn only if the
  last recorded turn is the member's (else 409 `code:"nothing_to_answer"`).
- `ratings` (`{id: number}`) is accepted only when status is `rating`; it records ratings then runs the turn.
- `endNow: true` closes the interview with one closing turn.
- Concurrent turn on the same interview → 409 `code:"busy"`.
- After `complete`, the client calls `/finish`. The server stores the full Profile (organiser-only) and returns
  the member-safe subset. Members never receive practice level, divergence, stance or quotes.

## Organiser API (cookie required)

| Route | Body | Returns |
|---|---|---|
| `POST /api/organiser/login` | `{passcode}` | 204 + cookie; 401 |
| `POST /api/organiser/logout` | — | 204, cookie cleared |
| `GET /api/organiser/profiles` | — | `{profiles: Profile[]}` (stored live profiles, newest first) |
| `DELETE /api/organiser/profiles/[id]` | — | 204 |
| `POST /api/organiser/import` | `{text}` | `{imported: n, skipped: n}` — accepts result codes from the artifact (`AIWD1:` + base64 or JSON) |
| `GET /api/organiser/generate?kind=product-read\|shareback` | — | cached `{n, samples, at, result}` or `{result:null}` |
| `POST /api/organiser/generate` | `{kind, includeSamples: bool}` | builds the prompt server-side from stored profiles (+ `SEED` if includeSamples), returns and caches `{n, samples, at, result}` |
| `PUT /api/organiser/generate` | `{kind:"shareback", result}` | saves the organiser's edits to the share-back |

## Pages
- `/` member flow (React): landing (+ access code when required) → questionnaire → interview with chips,
  voice, stop-early → ratings → feedback. Copy as in `prototype/src/member.js`. Draft resume via
  `localStorage` key `aiwd.interviewId` + `GET /state`.
- `/organiser/login`, `/organiser`, `/network`: the prototype's organiser and share-back views, fed from the
  organiser API. Samples toggle merges `SEED` client-side as before.
