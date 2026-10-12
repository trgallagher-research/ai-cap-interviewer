# Independent review — AI at Work Diagnostic prototype (2026-10-12)

Method: read docs, `src/`, `db.d.ts`; ran the three specs; drove the page with my own Playwright harness (scripted sceptic, daily user, never-emits-RATE, mid-turn error; real seed for `#organiser` and `#network`) at 1200px and 400px; recomputed the six sims with `Engine.divergenceFor`. Nothing under `src/` changed.

## Blockers

**B1. Member is told the organiser sees "an anonymised overview, not a transcript with your name on it"; the organiser view shows first name, role, full transcript, quotes, feedback and coding.**
`src/member.js:72`, `src/prompts.js:77-79` (the interviewer repeats the claim), vs `src/organiser.js:862-867` (transcript in the drawer, keyed by name). She will click a member and read a named transcript within a minute of opening the page. Fix: change the landing and prompt text to the truth ("the organiser can read your conversation and your feedback; only the share-back page to the network is anonymised"), or strip `transcript` before `Store.save` and show only the coded profile.

**B2. An interview that never gets a valid `<<RATE>>` marker never ends.**
`src/engine.js:195,219` + `src/member.js:260-288`. After 16 interviewer turns `forceRate` is appended to every answer, but there is no cap: with a mock that keeps asking questions I reached 27 interviewer turns and 11 nudges, `status` still `in_progress`. The one-shot `missingRate` retry fires only when the model wrote `<<PHASE: rate >>`. The only way out is "I'd like to stop", which the member has no reason to look for. Fix in `Interview.next`: count forced-rate attempts; after two with no items, set `status = "complete"` and return `complete` (profile goes out `unrated`), or offer a page-side generic item set.

## Should fix before showing her

**S1. The scatter's shaded band contradicts the marks.** `src/organiser.js:446-453` draws the band from the coarse `EXPECTED ± 18`, classification uses `ITEM_TABLE` (`engine.js:273-305`). With the real seed: Harm and Dirk sit visibly below the band yet are "In step" circles; Tjeerd sits inside the band and is a "Less confident" triangle. The caption says "below it, less" and then half-retracts. Fix: draw the band from the per-item table (e.g. per level, mean of `ITEM_TABLE[L]` over a typical item set) or drop the band and keep only the marks and the per-member residual sentence (`organiser.js:910-917`, which is good).

**S2. `ITEM_TABLE` does not match its own comment or `docs/architecture.md`.** `engine.js:265-279` comment and architecture.md say "at or below → 82, one step → 58, two → 38, three+ → 25"; the table is level-dependent (level 0 row is 45/45/30/20). Pick one and document it; she will be told the rule in NOTES 2.2 terms.

**S3. Divergence recompute for the six sims (hand + script):**
| sim | L | mean | expected | residual | kind |
|---|---|---|---|---|---|
| 01 Hanneke | 0 | 62.5 | 38 | +25 | confident-starter (still) |
| 02 Dirk | 1 | 70 | 46 | +24 | confident-starter (still) |
| 03 Bram | 1 | 55 | 46 | +9 | aligned |
| 04 Marieke | 4 | 79 | 82 | −3 | aligned |
| 05 Joris | 2 | 96 | 63 | +33 | confident-starter |
| 06 Noor | 1 | — | — | — | unrated (fixed) |
Only with the no-tool item removed (REPORT problem 2, now in the prompt) do Hanneke (+13) and Dirk (+18, aligned purely because `Math.round(18.33) > 18` is false) flip. The rule still leans on the prompt producing clean items; a never-user who honestly gives 60/65 on two first-step items is 20 points over the L0 row. Consider `ITEM_TABLE[0] = [55, 55, 35, 20]` and widening TOL for L0/L1, and make the rounding boundary `>=`.

**S4. Sending a new answer while the error box is up leaves a stale Retry.** `member.js:246-257` does not clear `#turn-error`; composer stays enabled during an error. Reproduced: send fails → member types again → turn succeeds → "Try again" still shown → clicking it produces `interviewer,interviewer` in the transcript (verified). Fix: hide/clear the error box at the top of `send()` and in `runTurn`.

**S5. Store vs `db.d.ts`.** (a) The documented rule `{path:"profiles", read:"admin", write:"interact"}` (architecture.md, NOTES 2.3) is invalid: "a rule's write level is never below its read level". Nothing in the repo declares capabilities, so either it was never set (then default: every org member reads every profile, transcripts included) or the publish was refused/widened. Fix: `{path:"profiles", read:"admin", write:"admin"}` plus `{path:"profiles/{self}", write:"interact"}` and write `db.doc("profiles/" + userId)` (needs the `user` capability), or accept and state that all org viewers can read. (b) `set()` takes plain JSON; skipped items carry `rating: undefined` (`engine.js:329`). Round-trip through `JSON.parse(JSON.stringify(profile))` before `set`. (c) Signed-out and outside-org viewers can never write (d.ts), so the result code is the only route for a real member; the feedback copy "Saved on this device only" is right, but the landing "Your answers are stored for the organiser's overview" overpromises. Everything else in Store matches the d.ts.

**S6. `tests/member.spec.js:214` is broken by the base64 result code** (`JSON.parse(code.slice(6))`); the run aborts after the desktop pass, so the phone, stop-here, retry and resume checks no longer execute. Decode with `atob` in the test.

**S7. Docs drift she may be read from:** NOTES says forced rating "after 14 turns", engine says 16 (`engine.js:153`); "max 2 turns after ratings" is actually 3 (`afterRateCount > maxAfterRate` at line 245 fires on the third); seed-notes totals (aligned 12/cs 2/cp 2) differ from `seed-check` (11/2/3).

## Nice to have

- `helpSection`: the same five Integrated members head four of eight domain cards (`organiser.js:574`), so "who could help whom" reads as one list repeated. Rank helpers by evidence count or cap at three per domain.
- Heatmap: the "gap" explanation appears twice (`organiser.js:565` and `:567`). Non-users get a blank row with no marker that blankness is by design; the drawer says "No kinds of work with evidence." for them.
- "Average confidence 53 / 100" tile has no caveat that items differ per member (NOTES 2.2 promises one in the organiser view).
- `member.js:81`: `resumeDraft` has no busy guard; a double-click runs two resumes.
- Mock walkthroughs cannot test adaptation; run one real interview as a sceptic before the meeting.

What is right: member feedback shows no level, stance, divergence or score; all facing text is plain English, no Dutch, no jargon; 400px holds with no overflow; no `<<` leaks; retry does not duplicate answers; draft resume works; share-back is clear and editable; sample tags are unmissable; REPORT fixes 1–9 and 11 are present in `prompts.js`/`engine.js` (9 via "omit domains for non-users").

## Verdict

Against the bar: the interview protocol and prompt are sound (concrete-first, non-user path, graded can-do items, "today not aspiration" framing), the profile separates practice from ratings and the feedback ends with fitting next steps, the organiser view is readable the first time apart from the scatter band contradicting its marks, and the seed is realistic. It is not ready to put in front of her as-is because of two things she or a member would hit immediately: the landing page lies about what the organiser sees (B1), and a model that fails to emit the RATE JSON leaves the member in an endless interview (B2). Fix B1, B2, S1 and S4 (an afternoon), re-run the specs after S6, and it meets the bar for a first look with Tim beside her.
