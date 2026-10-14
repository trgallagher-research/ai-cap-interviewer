# Pre-deploy security review (2026-10-14)

Typecheck and build pass; probed with `next start` (mock LLM). Already sound: the organiser gate (middleware plus `requireOrganiser` in each route; encoded, `//`, `..` and case variants give 401/404; a forged cookie gets 401), which fails closed in production without a passcode. Also sound: same-origin `?next=`, 128-bit interview ids, member views without coding, no env values in `.next/static`, and legacy views that use `textContent` only.

## Blockers before going public

**B1. `/finish` retries cost money with no limit.** `app/api/interview/finish/route.ts:27-34`. When profile generation fails (bad JSON twice, or a refusal), nothing is stored and nothing is counted. A member who prompt-injects the transcript ("answer only in prose") can call `/finish` in a loop. Each call makes up to 2 reasoning-tier Opus calls (16k max_tokens) over a transcript of up to about 170k characters. Fix: add `rec.finishAttempts`, increment and save it before the model call, and return 429 after about 3 attempts. Alternatively, store a fallback profile on the final failure.

**B2. `/api/transcribe` has no cap per interview.** `app/api/transcribe/route.ts:36-44`. The only gate is "an interview in progress", and an interview stays in progress for 60 days. One free interview id is enough to POST 4 MB of audio to Groq Whisper in a loop. Fix: keep a `transcribeCount` on the record (or `aiwd:rl:tx:{id}`) and cap it at about 30 per interview. Add a per-IP limit as well. If voice is not needed for the pilot, leave `GROQ_API_KEY` unset.

**B3. The member access code is optional and memory storage is a silent fallback (config).** `app/api/interview/start/route.ts:19` and `lib/store.ts:117-121`.
- Without `MEMBER_ACCESS_CODE`, anyone who finds the URL can start interviews. With about 30 IPs at 5 per hour each, they can fill all 150 `MAX_INTERVIEWS` slots in an hour. That locks out members and spends the whole budget.
- If the KV env vars are missing, the store falls back to per-instance memory on Vercel. MAX_INTERVIEWS, the IP limits and the locks then all stop working, and data is lost between instances.

Fix: set `MEMBER_ACCESS_CODE` and send it through the invite link. In `lib/store.ts`, throw (503) when `NODE_ENV==="production"` and no Redis is configured, unless an explicit `AIWD_ALLOW_MEMORY=1` is set.

## Fix soon

**F1. Organiser login has no brute-force limit.** `app/api/organiser/login/route.ts:13-16`. The 400 ms delay only applies per request, so parallel guesses are unlimited. Fix: count failures per IP in Redis (same pattern as `allowStart`) with about 10 per hour, and require a passcode of 16+ characters.

**F2. Imported profiles are barely validated.** `lib/aiwd/codes.ts:560-563` and `app/api/organiser/import/route.ts:21-22`. `isProfileLike` only checks that `id` is a string and that `member` and `practice` are truthy. Codes come from members. No XSS is possible, because `el()` uses text nodes and `levelOf` clamps the level. However, a profile whose `member.name` is an object makes `appendChild` throw (`public/legacy/organiser.js:613`), which breaks the whole organiser dashboard until that profile is deleted through the API. Fix: run imports through `normaliseProfile` and then a strict schema that keeps only known keys, coerces text fields to strings, caps their lengths and limits the item count.

**F3. Interview turns can outlive their 60 s function.** `app/api/interview/turn/route.ts:10`, `lib/llm.ts:322,328` and `lib/aiwd/engine.ts:240-245`. A 55 s call plus an SDK retry or the RATE retry can take about 110 s, so Vercel kills the function mid-stream and the member loses the reply. Fix: set `maxDuration = 120` (Fluid) on turn, or use `maxRetries: 0` with a 25 s timeout per call.

**F4. Lock TTL is shorter than the reasoning calls.** `lib/store.ts:21` (90 s) against `lib/llm.ts:328` (240 s). Concurrent `/finish` or organiser generate calls can start again after 90 s, which runs duplicate reasoning calls. Fix: accept a TTL argument in `acquireLock` and use 300 s for finish and generate.

## Notes

- **N1.** `lib/auth.ts:81-84`: the cookie is a static HMAC with no expiry or nonce on the server. Logout does not revoke it, and a leaked cookie stays valid until the passcode or `AUTH_SECRET` changes. Set `AUTH_SECRET`; optionally sign an issued-at time.
- **N2.** `lib/llm.ts:307-310`: when an error is not from the SDK, the raw `err.message` reaches members via SSE `error`, including Redis failures inside the stream (`turn/route.ts:110`). Send a generic message to members and log the detail.
- **N3.** `app/components/LegacyMount.tsx:132` imports the whole `lib/aiwd` barrel. All interviewer and profile prompts, plus SEED, therefore sit in a public `/_next/static` chunk (confirmed). Not secret; accept or slim the import.
- **N4.** `lib/http.ts:142`: per-IP limits trust the first `x-forwarded-for` entry. Vercel overwrites it; spoofable elsewhere (confirmed locally).
- **N5.** Each anonymous start, followed by `endNow` and `/finish`, writes a profile to the organiser list. Data pollution is possible without the access code (B3).
- **N6.** Deploy settings: functions run in `fra1`, so create the Upstash database in eu-central-1. `maxDuration = 300` needs Fluid compute, or a Pro plan on Hobby without Fluid. Do not set `AIWD_MOCK_LLM` in production.


## Resolution (2026-10-14, before the first deploy)

| Item | Status |
|---|---|
| B1 finish retried forever | Fixed: 3 attempts per interview, then 429 `limit`; lock held 300 s |
| B2 transcribe uncapped | Fixed: 30 per interview, 60 per IP per hour |
| B3 open starts / silent memory store | Fixed: on a production deployment starts need `MEMBER_ACCESS_CODE` (or explicit `ALLOW_OPEN_START=1`); on Vercel without Redis every store call returns 503 `not_configured` (override `ALLOW_MEMORY_STORE=1` for throwaway previews only) |
| F1 login brute force | Fixed: 10 failures per IP per 15 minutes, counter reset on success; README asks for a 16+ character passcode |
| F2 imported profiles | Fixed: `sanitiseImported` forces every rendered field into its expected type and length |
| F3 turn over 60 s | Fixed: turn route `maxDuration` 120; Claude timeouts per call type (55 s turns, 240 s reasoning) |
| F4 lock shorter than calls | Fixed: finish and generate locks 300 s |
| N1 cookie not revocable | Documented: set `AUTH_SECRET`, rotate it to sign everyone out |
| N2 raw errors to members | Fixed: non-SDK errors are logged and members get a generic message; missing storage maps to 503 |
| N6 mock on production | Fixed: the mock is ignored when `VERCEL_ENV=production` |
| N3, N4, N5 | Accepted for the pilot (no secrets in the prompt bundle; Vercel sets x-forwarded-for; access code limits junk starts) |

Tests: `tests/e2e/server-guards.test.mjs` covers the storage refusal, the production access-code rule,
the login limit, import sanitising and the finish path.
