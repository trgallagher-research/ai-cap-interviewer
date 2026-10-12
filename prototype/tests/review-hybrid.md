# Independent review: hybrid flow (2026-10-12)

Method: specs pass (member 108, organiser 102, seed OK). Drove the page with a message-capturing mock as a never-user, a tried-once sceptic who ticked nothing, a daily user, and a daily user who chose Uneasy. Viewed `#organiser` and `#network` with the seed at 1200px and 400px. `src/` was not changed.

## Blocker (unless verified on the published page)

**B1. Skipped questions and empty chips may never hide.** `fieldset.q` (`index.html:176`) and `.chips` (`:200`) set `display:flex`, and `src/` has no `[hidden]{display:none}` rule. The test harness injects one itself (`member.spec.js:24`). Without it, a "Never" member still sees "What have you used it for?", "Which tools?" and the "show a colleague" question (measured: `hidden=true`, `display=flex`, 431px tall). "Would you pay?" stays visible after "Nothing for now". The local-server fallback breaks for certain. **Fix:** add `[hidden]{display:none!important}` to `index.html` and drop it from the harness.

## Should fix before showing her

**S1. The "Something else" chip sends those two words as an answer.** The prompt requires that chip (`prompts.js:294`), and `member.js:394` sends every chip. In all four runs, tapping it wasted a turn and logged `[tapped quick reply] Something else`. **Fix:** that chip should focus `#answer` and send nothing.

**S2. Routing for sceptics is left to one sentence, and it mis-routes uneasy daily users.** Only `frequency === "never"` gets the non-user path (`prompts.js:183`); NOTES says the tried-once sceptic does too. The captured prompt sends that sceptic to dig for an episode "in the area they ticked" (they ticked none), then the least-supported ticked area, then STRETCH, with the opening "a few real examples behind their answers" (`:300`). The one hedge (`:237`) also catches anyone who chose Doubtful or Uneasy. So my Uneasy daily user was told "start… as for a non-user", and those are exactly the confidentiality-minded users who should be stretched. **Fix:** branch in code. `never || (tried && no uses)` gets the non-user plan and opening line. Doubtful or Uneasy members who use AI keep the practice path, with their doubts explored in STRETCH.

**S3. The rating retry drops `beyond`.** `NUDGES.missingRate` (`prompts.js:347-350`) asks only for id, task and level, so `divergenceFor` falls back to item level minus practice level (`engine.js:335`). At level 4 every item is then expected at 82. Proved in Node: level 4, ratings 70/60/55 gives cautious-practitioner (−20) without `beyond` and aligned (+2) with it. **Fix:** require `beyond` in `missingRate` and `forceRate`.

**S4. The seed teaches a heatmap shape that live data will not have.** 39 of 46 ticked areas have an episode: Anneke, Noor and Kwame 5 of 5, Marieke 6 of 7. A 4 to 7 question interview yields one or two episodes, so real daily users will show mostly light hatch (NOTES §4 says so). **Fix:** give the level 3 and 4 seeds 2 or 3 evidenced domains and light-hatch the rest.

**S5. The scatter contradicts its caption.** The caption says "a short or absent line means… in step" (`organiser.js:501-502`). Yet Harm (−27) and Dirk (−33), the two longest lines on the chart, are "In step" circles (non-users are never labelled cautious, `engine.js:340`). **Fix:** draw no line below the crossbar for level 0 members, or say in the caption why low ratings count as in step for non-users.

**S6. The pay tally implies a per-offer answer.** "Would you pay?" is asked once for all ticks (`prompts.js:114`), and the bars repeat it under each offer: 18 segments from 12 members. "Checklist: 4 Maybe" reads as offer-specific. "No or not answered" merges a refusal with a skip. **Fix:** set the subtitle (`organiser.js:785`) to "each member answered once, for everything they ticked". Split No from not answered. Skip `pay` when `offer` is empty (`prompts.js:113`).

**S7. Seed Harm is "never" and level 0, but has a filled Learning cell** (`seed.js:674`), unlike Dirk and Ilse, and against the prompt's "empty array for a non-user". **Fix:** move his evidence to `judgement`, or make him "tried" and level 1.

## Questionnaire, read as a Dutch coach

- **Offer and pay pitch to a sceptic.** Every offer option means using AI more, and the only way out, "Nothing for now", presumes they will come round. **Fix:** add "A conversation about whether and when not to use it (risks, clients, ethics)" and rename the way out "Nothing on AI".
- **Pay:** "Yes, if it fits my work" and "Maybe, depending on price" are both conditional and hard to tell apart. **Fix:** Yes / Possibly / No / Don't know yet.
- **Stance:** "Uneasy: I worry about what it does" is vague, and practical and worried are not opposites. **Fix:** "Uneasy: I have concerns (clients, data, quality of thinking)".
- Frequency, uses and canShow are neutral and do not presume use.

## Nice to have

- `formatQuestionnaire` writes "(none ticked); other: Otter" (`prompts.js:159-162`), which invites the model to re-ask tools. Treat Other as ticked.
- A typed draft survives a chip tap. There is no `isComposing` guard on Enter (`member.js:337`).
- The frequency bar and the practice bar share a ramp. Label the first "self-report".

Verified correct: validation, exclusive options, skip cleanup, draft resume (both stages, chips), `tapped` in both prompts, forced-rate counting, questionnaire stance, no `<<` leaks or double-send, no 400px overflow. The heatmap legend is understandable with its caption, and the network page is clear.

## Verdict

Typing is clearly lower, the daily user's prompt is stretching, ratings stay task-specific, and profiles combine practice and ratings while keeping claims apart from evidence. The organiser view mostly reads cold. It falls short of the bar in three places. Adaptation for sceptics and uneasy users rests on one ambiguous sentence that sends the tried-once sceptic after areas they never ticked and treats uneasy daily users as non-users (S2). The skip logic may be visibly broken on the real page (B1). The seed teaches her a heatmap that live data will contradict (S4). Fix B1 and S1–S3 (about an hour), rework the seed, soften the offer and pay wording, then run one live interview as a sceptic before the meeting.
