# AI at Work Diagnostic — prototype notes

Prototype of an AI-literacy diagnostic for Systeeminterventies, built as a Claude artifact.
Three views in one page: a member interview with feedback, an organiser map of the network,
and a share-back page for the whole network. Everything member- and organiser-facing is English.

- Published artifact: see the closing message of the build session (also recorded in `docs/publish.md`).
- Source: `prototype/src/` (`index.html` plus seven plain script files, no build step).
- The original app in the repo root is untouched and remains the reference for the Vercel rebuild.

## 1. What was reused from aligned-interviewer, and what changed

Reused (adapted, not copied verbatim, because the artifact has no server and no system-prompt slot):

| From the repo | Where it went | What changed |
|---|---|---|
| `lib/prompts.ts` → `buildInterviewSystem`: persona, one-question-at-a-time rules, "probe for concrete instances", neutrality, `<<MARKER>>` control channel, `<<COMPLETE>>` | `src/prompts.js` → `buildInterviewSystem` | Objectives replaced by a five-step ground plan (orient → practice → stretch → rate → close) with explicit branching for non-users, sceptics, short answerers and daily users. `COVERAGE` marker replaced by `PHASE` and a new `RATE` marker carrying the self-efficacy items as JSON. The system block is sent as the first user message because the `sample` capability has no system prompt. |
| `app/api/interview/turn/route.ts`: `safeVisible` streaming rule, marker parsing, quick-exit (`endNow`) with a closing instruction appended outside the cached prefix | `src/engine.js` → `safeVisible`, `parseTurn`, `Interview.next({endNow})` | Same logic, in the browser. The page, not the model, guarantees termination (forced rating after 14 turns, forced close 2 turns after ratings, one retry if the model announces the rating phase without a valid marker). |
| `RESPONDENT_REPORT_SYSTEM` and the framework-reflection guardrails ("ground everything in the transcript, no invented views, no scores in the text") | `src/prompts.js` → `buildProfilePrompt` | Merged into one profile call that produces both the organiser-facing coding and the member-facing feedback, with the practice/confidence separation rule added. |
| `lib/respondent.ts` streaming client and `Respondent.tsx` phases (landing → interviewing → complete), draft/resume idea, "I'd like to stop" flow | `src/member.js`, `src/store.js` | Rebuilt in vanilla JS; SSE replaced by `sample()`'s `onText`. |
| `AGGREGATE_PUBLIC_SYSTEM` (lay-audience rewrite, "many people / a few", no percentages) | `buildSharebackPrompt` | Extended with a help map and "three things to try". |

Not reused: Supabase persistence, auth, email, the studio, the scanner, voice. The artifact's `db`
capability and localStorage stand in for the database (see decision 3).

## 2. Design decisions

Each with the reason and the alternatives rejected. **Check before showing her** is marked ★.

### 2.1 What the interview measures: described practice and rated confidence, kept apart ★
The interview draws out concrete episodes first and only then asks for confidence ratings, and the
profile codes **practice** from the episodes and **confidence** from the ratings, with an explicit
instruction not to smooth one towards the other. The organiser view plots the two against each other.
*Reason:* her question is "who knows what", and self-report of skill is unreliable in both directions
(overclaiming and modesty). Two independent readings make the divergence visible, which is itself
useful information (who to encourage, who to be wary of as a peer teacher).
*Rejected:* a single "AI literacy score" (hides the divergence, invites comparison, feels like a test);
a fixed questionnaire (cannot be specific to each person's work, which is what makes the ratings sound).

### 2.2 Self-efficacy items are generated per member, graded, 0–100 ★
Following Bandura's guide for constructing self-efficacy scales: items are "can do" statements about
specific tasks in the member's own work (not traits, not "will do"), graded in difficulty from something
they clearly already do to one step beyond, rated 0–100 on a scale anchored "cannot do at all /
moderately certain / highly certain", rated privately with "no right answers" framing. Each item carries
a difficulty level on the same 0–4 ladder as practice so that members can be compared despite having
different items.
*Reason:* generic items ("I can use AI effectively") are exactly what the guide says not to do, and
member-specific items are what make the feedback worth the member's time.
*Rejected:* a shared fixed item bank (comparable but generic; the beginner and the daily user would get
the same items); a 1–5 Likert scale (the guide recommends 0–100 or 0–10 for sensitivity).
*Caveat to tell her:* means across members are only roughly comparable; the level tag on each item is
what makes the comparison defensible, and the organiser view says so.

### 2.3 How results reach the organiser inside an artifact ★
Three routes, used together, in this order: the artifact's shared database (`db` capability,
collection `profiles`, rule: contributors write, only editors and the owner read), localStorage on the
member's device, and a copyable "result code" the member can send to the organiser, who pastes it into
the organiser view. The organiser view merges all three.
*Reason:* the shared database only works for signed-in viewers of Tim's Claude organisation; members of
the network opening a public link are signed out or outside the organisation, so for a real pilot the
result code is the only route that works for everyone. In the test session with her, both views run on
one device, so localStorage already makes the loop visible.
*Rejected:* email sending (not possible from an artifact); asking members to paste results into a chat
(worse than a code). The Vercel rebuild replaces all three with a server and a database (section 5).

### 2.4 Who can see what
Members see only their own feedback and never their practice level, divergence or any score. The
organiser sees everything, including transcripts. In the prototype the organiser view is reachable by
link without a login; a note on the page says so.
*Reason:* the member-facing text is designed to be actionable and respectful; the coding is a tool for
the organiser and would read as a grade. A real login is a server concern (Vercel).
*Rejected:* a passphrase in the page (security theatre in client-side code; worse than being honest).

### 2.5 Describing skill: a five-step practice ladder with plain names
Not yet · Exploring · Routine · Integrated · Shaping (definitions in `docs/architecture.md`). Coded from
what the member described, always the lower level when in doubt. Eight domains of use
(writing, preparing sessions, analysis, thinking partner on a case, with or for clients directly,
research and learning, admin, building tools) each need a quoted piece of evidence to count.
*Reason:* she needs words she can use in conversation with members ("most of you are at routine use; a
few are shaping how others work"). Evidence-gated domains keep the heatmap honest.
*Rejected:* existing AI-literacy frameworks with many dimensions (too heavy for a 12-minute interview and
not specific to consulting work); numeric scores.

### 2.6 Sceptics and non-users are a path, not a failure
The interviewer is told to treat non-use and distrust as the subject, never to convince, and never to ask
a non-user to describe things they have not done. Their rating items are first steps. Their next steps may
be a legitimate reason not to use AI.
*Reason:* her network includes people who will never have tried it; an interview that treats them as
deficient would cost her goodwill.

### 2.7 Seed data: 16 fictional members embedded in the page, clearly marked
The organiser view shows fictional members by default with a banner and a toggle.
*Reason:* she must see patterns on first open; real results will be one or two at most on the day.
*Rejected:* seeding the shared database (invisible to signed-out viewers; the guidance for shared stores is
to seed only real data).

### 2.8 The share-back is a page written by Claude from anonymised profiles, edited by her
Findings in everyday words, verbatim anonymous quotes, a "who can help with what" map described as roles
not names, three things to try this week, and an invitation to respond. Editable in place, copy as text.
*Reason:* what members would engage with is their colleagues' actual practices and words, not statistics.
*Rejected:* a PDF (artifacts cannot generate downloads for all viewers); a dashboard for members (exposes
individuals).

### 2.9 Product judgement: evidence first, then a sober read
The interview asks once what would make an offer worth their time or money. The organiser view tallies
those answers verbatim with names, and a button asks Claude for a "product read" (verdict, demand, two or
three options with evidence and risk, what the data does not support, the cheapest next test).
*Reason:* her question is whether there is a product; the honest answer comes from what members said,
and the read is framed to say what is *not* supported.

### 2.10 Calling Claude: the `sample` capability, with fallbacks
Interview turns use the default model tier with caching off; profile, share-back and product read use the
"complex" tier. If `sample` is unavailable the page falls back to the legacy in-chat `window.claude.complete`
(for a pasted HTML file) and otherwise says plainly that Claude is not available in this view. Each call
spends the *viewer's* Claude usage and asks consent on first use.

## 3. How it was tested and what was fixed

(filled in below after the test passes)

## 4. Known limits before showing her

(filled in below)

## 5. Porting to Vercel

The prototype was laid out so the port is mostly moving files, not rewriting logic.

1. **Prompts and engine lift as they are.** `src/prompts.js` and `src/engine.js` have no DOM or capability
   calls. In the Next.js app they become `lib/aiwd/prompts.ts` and `lib/aiwd/engine.ts` (add types from
   `docs/architecture.md`). The marker parsing, the interview state machine and the scoring are the same
   code the artifact runs.
2. **Replace `Engine.llm` with API routes**, following the existing ones in the repo root:
   `app/api/interview/turn/route.ts` already streams a turn with `safeVisible` and a cached system prefix.
   Differences: the system block goes back into the `system` parameter (with `cache_control`) instead of the
   first user message; the `RATE` marker is parsed server-side and returned in the `done` event alongside
   `completed` and `phase`; the profile, share-back and product read become three JSON routes using
   `output_config.format` with schemas derived from the shapes in `prompts.js` (as `SYNTHESIS_SCHEMA` does).
   Models: Sonnet for turns, Opus for the three JSON calls, as in the existing `MODELS`.
3. **Persistence**: a `profiles` table (jsonb profile, interview id, study/network id, created_at) plus the
   existing `interviews`/`turns` tables; `Store.save` becomes the end of the profile route. Result codes go
   away. Row-level security as in `supabase/schema.sql`: members write their own interview, only the
   organiser's account reads profiles.
4. **Auth**: the organiser view sits behind the existing Supabase auth (`lib/auth.ts`); members get a study
   link like `/s/[studyId]` today, with a "network" entity in place of a study.
5. **UI**: `member.js`, `organiser.js` and `network.js` are vanilla DOM code. Either mount them as-is in a
   client component for a first deploy (they only need a container and the `App.ui` helpers) or rebuild them
   as React components reusing `Respondent.tsx` for the chat, which already has the phases and the
   stop-early flow. The inline SVG charts port directly.
6. **Seed**: `seed.js` becomes a `supabase/seed.sql` fixture for a demo network, or is dropped once real
   members exist.
7. **What the artifact could not do that Vercel can**: email the feedback to the member (the repo already has
   `lib/email.ts` and templates), a real organiser login, members outside Tim's Claude organisation,
   Dutch-language option, and cost control via the server's own API key instead of each viewer's usage.
