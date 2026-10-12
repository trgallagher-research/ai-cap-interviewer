# Hybrid flow: prompt simulation report (2026-10-12)

Six personas re-run on the hybrid prompts; divergence from `Engine.divergenceFor` in node. Words = member's typed interview words. Files: `hybrid-01…06-*.md`.

## Before / after

| Member | Interviewer turns | Member words | Episodes before rating | Level | divergenceFor |
|---|---|---|---|---|---|
| Hanneke | 13 → 7 | 431 → 180 | 3 → 2 (moments) | 0 → 0 | aligned (+18) → aligned (+4) |
| Dirk | 13 → 6 | 449 → 168 | 2 → 2 | 1 → 1 | confident-starter (+24) → aligned (+13) |
| Bram | 17 (forced) → 10 | 77 → 21 + 4 taps | 1 → 1 | 1 → 1 | aligned (+9) → aligned (+9) |
| Marieke | 14 → 8 | 486 → 272 | 3 → 3 | 4 → 4 | aligned (−3) → aligned (**−16**) |
| Joris | 14 → 8 | 298 → 152 + 1 tap | 2 + 2 deflated → 2 + 1 deflated | 2 → 2 | confident-starter (+33 → +36) |
| Noor | 5 → 5 | 104 → 73 | 1 → 1 | 1 → 1 | unrated |

Typing roughly halves; none neared the limit of 9.

## Problems, ranked

**1. The second episode is not aimed at the weakest claim, and `claimedNoEpisode` mixes "unprobed" with "deflated".** Joris's "GPTs" were deflated but analysis (his evaluation-forms "plan") was never reached; Marieke's unprobed `thinking` counts like Joris's deflated `building`. Replace "Then ask for one more episode, ideally in a different area they ticked, or one where it went wrong." with:
> "Then ask for one more episode in the ticked area that looks least supported by what you have heard so far (often building tools, analysis, or work with clients). If it turns out to be a plan or a one-off, that is a finding; do not push."

Add to the profile shape `"probedNoEpisode": [ "ticked domain keys you were asked about where no real episode emerged" ]` and count `claimedNoEpisode` from it.

**2. Chip taps enter the evidence as the member's words; some chips lead.** "Soften the tone" (Bram) and "Nothing, it's secure" (Joris) were the interviewer's words. Replace the chip guidance with:
> "Chips are only for time ('This week'), frequency, or choosing between things they have already mentioned or ticked; always include 'Something else'. Never offer chips that supply what they did, why, or how they judged it."

Store taps as `[tapped] …`; add to the profile prompt: "A line starting [tapped] is a quick reply the interviewer offered: a choice, never a quote or evidence on its own."

**3. Sceptics who "tried" go down the user path.** `nonUser` is only `frequency === "never"`; Dirk (once, nothing ticked, Doubtful) was told to dig into "the area they ticked". Add at the start of the user path:
> "If they ticked no areas, or chose Doubtful or Uneasy, start from the most recent time they tried it, then a time they saw others use it, as for a non-user."

Relabel `tried` "I have tried it once or a few times".

**4. Grading rule impossible at level 3–4, and divergence punishes it.** "at least one two steps beyond" cannot exceed 4, so Marieke got three items all labelled 4; `ITEM_TABLE[4]` expects 82 on each, so her honest 45/35 give −16, and 65/40/30 flips her to cautious-practitioner (−19). Replace with:
> "…at least one two steps beyond. For someone already at level 3 or 4, 'beyond' means a harder version of their practice (for others, with a client's own material, live in the room): label it 4, and put at most two items at 4."

Engine: add an optional `"stretch": true` item flag mapped to delta 2, or `TOL_BY_LEVEL[4] = 24`.

**5. Engine undoes the tools rule.** For Dirk the model returns `tools: []`; `assembleProfile` refills it from the questionnaire (`["ChatGPT"]`). Fall back only when `pr.tools` is not an array.

**6. Stance options presume use.** Hanneke (never) had to pick "Careful: I use it, with reservations", which overrides the model. Use "Keen: I want to do (more) with it" and "Careful: open to it, with reservations".

**7. "Never ask those again" vs blank answers** (Bram left tools blank). Replace with:
> "Never ask again anything they answered. If an answer shows (not answered) or (none ticked), you may ask it once inside an episode ('Which tool was that?')."

**8. Episode wording breeds stacked questions** (four sims). Add: "Ask for one detail per message: what they typed, then what came back, then what they did with it."

**9. Early stop still skips ratings.** Noor stopped after four answers, one turn before rating. Append to endNow: "If at least one concrete episode was described, also append a RATE marker with 3 items drawn from it; the page may offer them on the stop screen."

**10. Minor.** "omit domains entirely" contradicts "all fields required": say "use an empty array". Allow `offerOther` alongside "Nothing for now" so sceptics' conditional interest survives.

## What worked

- No re-asking; Dirk was not pitched to; the stacked pay question is gone.
- Non-user path is comfortable; Hanneke's best item came from her own episode.
- Every rating item now uses a tool.
- Chips suited Bram: same episode, 21 typed words, no forced rating.
- Rate-phase marker unambiguous; chips suppressed on rate/close.
- `divergenceFor` fixes Hanneke, Dirk, Noor; Joris still flagged and still coded 2 despite six ticks.

## Verdict

**Mostly meets the bar, with two regressions.** Comfortable for beginners, still stretching for Marieke, half the typing; episodes come first (two or more per user, Bram has one); items are task-specific and tool-based apart from #4; profiles differ and next steps fit. Regressions: shortening misses an overclaimer's later claims and the organiser stat conflates them with unprobed experts (#1); chip taps can become quoted evidence (#2). Fix 1–3 and 5 before trusting the organiser view.
