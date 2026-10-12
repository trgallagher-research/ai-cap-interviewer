# Prompt simulation report — six personas, `prompts.js` as of 2026-10-12

Method: six interviews executed in-head against `buildInterviewSystem`, `NUDGES`, `interviewMessages` (endNow) and `buildProfilePrompt`, played adversarially, then classified with the engine's divergence rule. Sims: `01-hanneke.md` … `06-noor.md`.

| Sim | Persona | Interviewer turns | Practice level | Mean rating | Engine divergence | Sensible? |
|---|---|---|---|---|---|---|
| 01 | Hanneke, never-user | 13 | 0 | 62.5 | confident-starter | **No** |
| 02 | Dirk, sceptic | 13 | 1 | 70 | confident-starter | **No** |
| 03 | Bram, short answers | 17 (forced at 15) | 1 | 55 | aligned | Yes, by 3 points |
| 04 | Marieke, daily user | 14 | 4 | 79 | aligned | Yes |
| 05 | Joris, overconfident | 14 | 2 | 96 | confident-starter | Yes |
| 06 | Noor, stopped early | 5 | 1 | none | "aligned" | **No** (should be "unrated") |

## Problems, ranked

**1. The divergence rule ignores item level, so honest beginners and sceptics are labelled "confident-starter".** (engine, but driven by the prompt's item design.) The prompt tells the interviewer to give non-users first-step items; a non-user who rates "open a chat tool and ask for a summary" at 60 is being accurate, yet level 0's expected mean is 20 ± 18. Hanneke (62.5) and Dirk (70) get the same label as Joris (96). Fix in engine: compute expected as the mean over the *items'* levels (`EXPECTED_ITEM = {1:65, 2:58, 3:50, 4:40}` relative to practice, or simpler: compare each rating to a per-item expectation `practiceLevel >= item.level ? 75 : 35`) and classify on the mean residual. Add a fourth kind `"unrated"` for Noor instead of `"aligned"`.

**2. Rating items that need no AI tool at all.** Dirk's r3 ("Explain to a client's HR director … get your consent clause accepted"), Hanneke's r4 ("Write down which parts of a case you would never put into an AI tool"). Both rated 85–90, both inflate the mean; Dirk called it out. Cause: the ladder's level-4 text ("sets boundaries on data and ethics") is read as a task family. Replace in the RATE rules:
> "- Each is a specific, doable task in ${name}'s OWN work, written as "can do" …"
with
> "- Each is a specific, doable task in ${name}'s OWN work that requires actually using an AI tool on their own material, written as "can do" (capability now), not "will do", not a trait, not a feeling. A task about rules, boundaries or explaining AI to others does not count unless the tool is used in it."

**3. The prompt itself stacks a question, and forces a sales question on sceptics.** "Ask, once, in plain words: what would make an offer about AI from the network worth their time, and would they pay for it?" produced a double question in all five full sims and landed on Dirk exactly as the funnel he predicted. Replace with:
> "Ask, once and only if it fits, what the network could offer on this that would be worth their time. If they name something, ask separately whether they would pay for it. If the member has expressed distrust of the exercise, ask only the first and accept a refusal."

**4. "What could you show a colleague" has no non-user exception.** Hanneke had to be asked an awkward question (sim 01, Q10); Bram answered "No". Replace "Also ask what they could show a colleague, if anything." with "If they described something they do with these tools, ask whether they could show it to a colleague. Skip for non-users."

**5. Ambiguous phase marker on the rating request.** The system block says the marker names the phase of the NEXT question; the forceRate nudge says "then the phase marker rate". A model following the system block writes `<<PHASE: close >>` on the rating request, and `engine.next()` only retries a missing RATE marker when `parsed.phase === "rate"`. Add to the markers section: "The rating request itself ends with `<<PHASE: rate >>`; the message after the ratings ends with `<<PHASE: close >>`."

**6. No JSON-safety guidance for the RATE marker.** Tasks are 25–40 words in the member's words; Joris and Marieke both quoted phrases in straight double quotes that a model would carry into task strings unescaped; a trailing comma kills `JSON.parse`. Add: "Inside task strings use no double quotes (use single quotes), no line breaks, no trailing comma after the last object."

**7. Turn budget collides with the page limit for terse and advanced members.** Bram was forced at turn 15; Marieke and Joris finished at 14 with nothing to spare. The prompt says "roughly 10 to 14 of your questions" and "usually after 8 to 12 questions"; the greeting and the rating request also count as turns in `interviewerCount`. Replace "Keep the whole interview to roughly 10 to 14 of your questions. Do not pad." with "Ask between 6 and 11 questions, then request the ratings. Go to the ratings as soon as you have two concrete episodes (or, for a non-user, two concrete moments) and their edges; with a member who answers in a few words, go earlier rather than later. Do not pad." Also fix architecture.md (says 16; engine says 14).

**8. Floor-heavy item sets for advanced users.** Marieke got three floor items (95/85/95) and one ceiling; Bandura wants spread across the difficulty range. Add to the grading rule: "At most two items may be things they have clearly already done; at least one must be one step beyond, and at least one two steps beyond."

**9. Profile prompt: `tools` and `domains` semantics.** "tool names mentioned" put ChatGPT on Dirk (never uses it) and nothing on Hanneke's blank heatmap row though she discussed settlement drafting. Change to `"tools": [ "tools they themselves use, or empty" ]` and allow `"domains"` entries with `"evidence"` prefixed "considered:" for non-users, or accept that non-users are blank and say so in the organiser view.

**10. Early stop skips ratings entirely.** Noor gave a full episode in four answers; the endNow path forbids a rating request. Consider letting endNow emit 2–3 items when the transcript already holds an episode ("If the member has described at least one concrete episode, append a RATE marker with two or three items drawn from it; the page will offer them on the stop screen").

**11. Rating-request framing.** Bandura: measure capability now, privately, not aspiration. The preface the prompt asks for ("no right answers") is fine but add "rate what you can do today, not what you would like to be able to do". Joris's 100s would not change, but they would mean more.

**12. Minor.** `stance` has no value for an enthusiast with no data boundaries (Joris's "I put in whatever" survives only in `judgement`). The forceRate nudge rides on the member's own user turn; a model can read it as their words.

## What worked

- The non-user and sceptic rules held: no persuasion, no asking non-users to imagine use; "feedback comes at the end" handled "what do YOU think" twice.
- "Episodes are the evidence; opinions are not" plus "ask for the most recent real instance … what they typed, what came back" did the heavy lifting: it converted Dirk's opinions into two episodes and deflated Joris's "GPTs" and "evaluation analysis" into a Word doc and a plan.
- The short-answer rule (narrow, menu of two or three) produced Bram's only real episode.
- The stretch list for daily users got the best material in the set (assumptions check, the Lencioni stage, "lazy thinking not wrong facts").
- The profile prompt's separation of practice from self-presentation worked on Joris: level 2, labelled plans as plans, feedback named the gap kindly without a score. Profiles differ meaningfully across all six.
- Next steps were specific to each member's material and doable in two weeks in all six sims.
- Items were in the member's own domain and words in all five rated sims; no generic item appeared.

## Verdict against the bar

- *Comfortable for a complete beginner and still stretching for a daily user:* **met**, with two blemishes (the pay question, the show-a-colleague question on a non-user).
- *Draws out concrete descriptions first:* **met**; this is the strongest part of the prompt.
- *Ends with self-efficacy ratings specific to the tasks that member described, following sound measurement practice:* **partly met**. Specific and "can do", yes; but items that require no tool slip in (2 of 6 sims), advanced sets are floor-heavy, and the request lacks the "now, not aspiration" framing.
- *Profiles use both practice and ratings, differ between people, end with fitting next steps:* **met at the profile-prompt level, not at the engine level**: the divergence classification mislabels two of the five rated members, which is what the organiser will see first.

Overall: the interview prompt is close; fixes 2–7 are wording changes. The divergence rule (1) must change before any organiser reads the aggregate.
