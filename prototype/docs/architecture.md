# AI at Work Diagnostic — architecture and data contract

Prototype for Systeeminterventies (Dutch network of managers, advisers, trainers and
coaches working on collaboration and conflict in organisations). A Claude artifact:
one `index.html` plus supporting script files published alongside it. All member- and
organiser-facing text is English.

## Three views, one page, hash-routed

| Hash          | Who       | What                                                            |
|---------------|-----------|-----------------------------------------------------------------|
| `#member`     | a member  | landing → AI-led interview → self-efficacy ratings → profile    |
| `#organiser`  | organiser | network map, gaps, who-can-help-whom, product signals, imports  |
| `#network`    | organiser | share-back page she can send to the whole network               |

Default (no hash) = `#member`. Only bare tokens reach `location.hash` in the viewer.

## Files (all plain scripts; no bundler; each defines ONE global)

| File            | Global      | Owns                                                                 |
|-----------------|-------------|----------------------------------------------------------------------|
| `index.html`    | `App`       | title, tokens/CSS, nav, router, shared UI helpers (`App.ui`)         |
| `prompts.js`    | `Prompts`   | every prompt builder + JSON shape descriptions (LIFT-OUT TARGET)     |
| `engine.js`     | `Engine`    | LLM adapter, interview state machine, marker parsing, scoring (pure) |
| `store.js`      | `Store`     | profile persistence: db capability → localStorage → paste/import     |
| `member.js`     | `MemberView`| member screens                                                       |
| `organiser.js`  | `OrganiserView` | organiser screens + inline SVG charts                            |
| `network.js`    | `NetworkView`   | share-back page generation + editing                             |
| `seed.js`       | `SEED`      | ~15 fictional member profiles (array of Profile)                     |

Load order in index.html: prompts → engine → store → seed → member → organiser → network → App boot.
`engine.js` and `prompts.js` must not touch the DOM: they are what gets ported to Next.js API routes.

## Calling Claude (Engine.llm)

Adapter resolves, in order:
1. `await window.claude.use("sample")` (published artifact; viewer's own account; consent on first call).
2. `window.claude.complete(prompt)` (legacy in-chat artifact API; prompt string only).
3. `window.__mockSample` (tests) — a function `(input, opts) => Promise<{text}>`.
4. none → UI shows "Claude is not available in this view" and the organiser views still work on stored data.

`Engine.llm.chat(messages, {onText, tier})` → `{text}`; `Engine.llm.json(messages, {tier})` → parsed object
(strips code fences; one retry with a "return only JSON" nudge on parse failure).
`messages` = `[{role:"user"|"assistant", content}]`, must end on a user turn. There is no system
prompt in `sample`: the instruction block is the FIRST user message (see prompts.js).
Tiers: interview turns `default` with `cache:false`; profile + share-back `complex`.

## Interview protocol (Engine.Interview)

State: `{ member:{name, role}, turns:[{role:"interviewer"|"member", text}], phase, ratingItems, ratings, status }`.
Each interviewer reply may end with control markers on their own lines (never shown):

```
<<PHASE: orient|practice|stretch|rate|close>>      always — the phase the NEXT question belongs to
<<RATE: [ {"id":"r1","task":"…","level":1}, … ]>>  once — proposes 3–5 self-efficacy items; UI renders sliders
<<COMPLETE>>                                        once — final closing message
```
Visible text = everything before the first `<<`. Streaming shows only the safe prefix (same rule as
aligned-interviewer's `safeVisible`). When `<<RATE>>` arrives the page shows the rating widget; the member's
ratings go back as a user turn formatted by `Prompts.formatRatingsTurn(items, ratings)`.
Hard stops the page enforces regardless of the model: max 16 interviewer turns before forcing the rate phase;
max 2 turns after ratings before forcing completion; "I'd like to stop" button → closing turn (`endNow`).

## Profile (the one record everything else reads) — `Profile`

```jsonc
{
  "id": "p_…",                 // random id
  "createdAt": "2026-10-12T…",
  "source": "seed" | "live" | "imported",
  "member": { "name": "Anneke", "role": "team coach", "org": "independent" },   // first name only
  "practice": {
    "level": 0..4,             // see ladder below; coded from DESCRIBED practice, not from ratings
    "levelLabel": "Routine",
    "summary": "2–3 sentences, third person, grounded in what they said",
    "domains": [ { "key": "writing", "evidence": "quote or close paraphrase" }, … ],   // only domains with evidence
    "tools": ["ChatGPT", "Copilot"],
    "judgement": "1–2 sentences: how they check output, data/confidentiality judgement, when they choose NOT to use AI",
    "stance": "enthusiast" | "pragmatic" | "cautious" | "sceptical" | "worried"
  },
  "confidence": {
    "items": [ { "id":"r1", "task":"…", "level":1..4, "rating":0..100 }, … ],
    "mean": 0..100,
    "band": "low" | "moderate" | "high",     // <40, 40–70, >70
    "pattern": "one sentence, e.g. confident on routine drafting, drops sharply on client-facing use"
  },
  "divergence": {
    "kind": "aligned" | "confident-starter" | "cautious-practitioner",   // see rule below
    "note": "one sentence"
  },
  "wants": ["learn to use AI with client material safely"],        // what they want to get better at
  "offers": ["can show how I use it to prepare workshop designs"],  // what they could show others
  "productSignals": { "wouldPayFor": "…or empty", "quote": "…" },
  "feedback": {                                                     // what the MEMBER sees
    "headline": "…", "summary": "2–3 sentences, second person",
    "strengths": ["…"], "nextSteps": [ {"title":"…","detail":"…"} ],   // 1–2, fitted to their work
    "closing": "…"
  },
  "quotes": ["short verbatim lines usable anonymously in the share-back"],
  "transcript": [ {"role":"interviewer"|"member","text":"…"} ]      // live/imported only; seed may omit
}
```

### Practice ladder (coded from described practice)
0 **Not yet** — has not used AI tools in their work.
1 **Exploring** — tried a few times; occasional, generic use (a quick summary, a search).
2 **Routine** — regular use for a set of recurring tasks; checks output; has habits.
3 **Integrated** — woven into their own professional method: thinking partner on cases, iterates with own material and context, has clear judgement about when not to use it.
4 **Shaping** — designs ways of working with AI for others or clients, builds reusable prompts/tools, teaches, sets boundaries on data and ethics.

### Domains (fixed keys; the organiser heatmap columns)
`writing` Writing & communication · `prep` Preparing sessions & interventions · `analysis` Analysis & sensemaking ·
`thinking` Thinking partner on a case · `client` With or for clients directly · `learning` Research & own learning ·
`admin` Admin & organising · `building` Building tools, prompts or automations

### Divergence rule (computed in engine.js, not by the model)
expected confidence by level: 0→20, 1→40, 2→58, 3→72, 4→82 (±18 tolerance).
mean > expected+18 → `confident-starter`; mean < expected−18 → `cautious-practitioner`; else `aligned`.

## Storage (Store)
- `Store.save(profile)`: writes `profiles/{id}` via db when `claude.use("db")` resolves and the write is
  permitted; always also writes localStorage key `aiwd.profiles` (array). Returns `{where:["db","local"]}`.
- `Store.loadAll()`: merges db (if readable) + local + imported; dedups by id.
- `Store.exportCode(profile)` / `Store.importCode(text)`: compact JSON (transcript included) for the
  "copy your result code → organiser pastes it" bridge when db is unavailable.
- db rules: `{path:"profiles", read:"admin", write:"interact"}` — contributors write, only editors/owner read.
- Seed profiles never enter storage; the organiser view merges `SEED` in when "Show sample members" is on (default on, clearly labelled).
