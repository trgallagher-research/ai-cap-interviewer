# Hybrid sim 03 — Bram, interim manager, short-answerer

Member: `{ name: "Bram", role: "interim manager" }`

## Questionnaire (in persona: two areas ticked, required answers only)

```json
{ "frequency": "monthly", "uses": ["writing", "admin"], "tools": [], "stance": "pragmatic", "offer": [] }
```
`pay` and `canShow` not skipped (offer does not contain "nothing"; frequency is not never/tried) but left blank. 4 taps.

Interviewer receives:
```
- How often…? Now and then, a few times a month
- What have you used it for…? Writing & communication; Admin & organising
- Which tools? (none ticked)
- …feel…? Practical: useful for some things, not others
- …worth your time? (none ticked)
- Would you pay…? (not answered)
- …show a colleague? (not answered)
```
Note the conflict: the prompt says the questionnaire "already covers… with which tools… Never ask those again", but tools are blank.

## Transcript

**Interviewer (1):** Hi Bram, good to meet you; I'd like to hear about a few real examples behind your answers. You ticked writing: what's the last thing you wrote with AI's help?
<<CHIPS: ["An email", "A report or plan", "Something else"] >>
<<PHASE: practice >>

**Bram:** Email. Works council. *(typed)*

**Interviewer (2):** Which tool did you use for that one?
<<CHIPS: ["Copilot in Outlook", "ChatGPT", "Something else"] >>
<<PHASE: practice >>

**Bram:** Copilot in Outlook *(tapped chip)*

**Interviewer (3):** What did you ask Copilot to do with the email?
<<CHIPS: ["Soften the tone", "Shorten it", "Rewrite it"] >>
<<PHASE: practice >>

**Bram:** Soften the tone *(tapped chip)*

**Interviewer (4):** And what came back: did you send it as it was, change some, or drop it?
<<CHIPS: ["Sent as it was", "Changed some", "Dropped it"] >>
<<PHASE: practice >>

**Bram:** Changed half. Too soft, sounded like HR. *(typed)*

**Interviewer (5):** "Sounded like HR" is a precise judgement. You also ticked admin; what's the most recent admin thing it helped with?
<<CHIPS: ["Meeting notes", "Planning", "Scheduling", "Something else"] >>
<<PHASE: practice >>

**Bram:** Meeting notes *(tapped chip)*

**Interviewer (6):** What did you do with those notes afterwards?
<<CHIPS: ["Read and used them", "Skimmed them", "Didn't read them"] >>
<<PHASE: stretch >>

**Bram:** Didn't read them *(tapped chip)*

**Interviewer (7):** Is there anything in your work you keep away from AI on purpose?
<<CHIPS: ["Personal data", "Confidential plans", "Nothing really"] >>
<<PHASE: rate >>

**Bram:** Names. People losing jobs. *(typed)*

**Interviewer (8):** Thanks Bram. I'd like you to rate how confident you are that you could do a few tasks today, drawn from what you described; rate what you can do now, no right answers.
<<RATE: [{"id":"r1","task":"Ask Copilot in Outlook to soften an email you wrote to the works council, and decide which of its changes to keep.","level":1},{"id":"r2","task":"Give Copilot three bullet points and have it draft a short update for your steering group, then edit it into your own tone.","level":2},{"id":"r3","task":"Ask Copilot to list only the decisions and actions from a meeting's notes, then check them against what you remember.","level":2},{"id":"r4","task":"Describe a stuck situation between two managers, with names and identifying details removed, to an AI tool and ask for three possible readings, then judge which fits.","level":3}] >>
<<PHASE: rate >>

**Bram (ratings turn):** r1 → 80 · r2 → 55 · r3 → 60 · r4 → 25

**Interviewer (9):** You're at 80 for softening an email and 25 for the two managers. What's the difference for you?
<<PHASE: close >>

**Bram:** One's an email. The other's my job. *(typed)*

**Interviewer (10):** That's a clear line, thanks Bram. Your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Bram uses Copilot in Outlook now and then. His one described episode was softening an email to the works council, of which he changed about half because it sounded like HR. Meeting notes are produced for him but he does not read them.",
    "domains": [
      { "key": "writing", "evidence": "Email. Works council. … Changed half. Too soft, sounded like HR." }
    ],
    "tools": ["Copilot"],
    "judgement": "Judges output by ear and rewrites what does not sound like him. Keeps names and job losses out of AI tools.",
    "stance": "pragmatic"
  },
  "confidence": { "pattern": "Confident on softening an email, middling on drafting updates or extracting decisions, low on using a tool on a stuck situation between managers." },
  "wants": [],
  "offers": [],
  "productSignals": { "quote": "" },
  "feedback": {
    "headline": "Thanks Bram: here is what stood out",
    "summary": "You use Copilot where it already sits, in Outlook, and you have a good ear for when its version is not yours. You keep people's names and job losses out of it.",
    "strengths": [
      "You rewrote half of Copilot's softer works-council email rather than sending it, and could say why.",
      "You keep names and job losses out of AI tools."
    ],
    "nextSteps": [
      {
        "title": "Let Copilot draft one steering-group update",
        "detail": "Next week, type three bullet points into Copilot and ask for a short update, then edit it into your own tone. It worked if editing took less time than writing from scratch and it still sounds like you."
      },
      {
        "title": "Ask for the decisions from one set of meeting notes",
        "detail": "After one meeting, ask Copilot to list only the decisions and actions from the notes and compare with what you remember. It worked if you catch one error, or find nothing to correct."
      }
    ],
    "closing": "Short answers, clear judgement; thanks for your time."
  },
  "quotes": ["Changed half. Too soft, sounded like HR.", "One's an email. The other's my job."]
}
```
`admin` correctly not a domain (no real episode: notes he does not read). `productSignals.wouldPayFor` = "" (offer blank).

`Engine.divergenceFor(1, items, ratings)` → **aligned** (expected 46, residual +9).

## Critique

**(a) Adaptation.** Clearly better for Bram than the old version: no pay/offer/show-a-colleague questions to grind through, and the chips let him answer at his own register.

**(b) Episodes.** One full episode (works-council email: tool, request, result, judgement) and one deflated claim (admin = notes he never reads). Same evidence as the old sim in 7 questions instead of 14.

**(c) Rating items.** All tool-based, his words, graded L1→L3. Same strong set as before.

**(d) Profile/divergence.** Level 1, aligned: sensible. **Evidence risk:** three of his seven answers were chip taps. "Soften the tone" and "Didn't read them" are the interviewer's words; the transcript the profile prompt sees records them as plain member text, so the profile model can quote "Soften the tone" as Bram's verbatim evidence. Nothing in the profile prompt distinguishes a tap from typed text.

**(e) Next steps.** Fit his work and tool, two weeks, each with a check.

**(f) Markers.** All chips valid JSON, under 40 characters, absent on rate and close. Q7 ends with `<<PHASE: rate >>` (next phase), then the rating request also ends with `rate`: consistent with the new marker rule.

**(g) Length.** 10 interviewer turns (7 questions + rate + follow-up + close). The forced-rate check fires only when `interviewerCount >= 9` before rating; the rating request was turn 8, so the limit did not bite (old sim: forced at turn 15).

**(h) Questionnaire use.** Dug into both ticked areas, one each; caught that "admin" was a tool producing notes he never uses. Did not ask offer/pay even though he left them blank (so no product signal at all from him). Asked the tool inside the episode despite "never ask those again", correctly in spirit; the prompt should say so explicitly for blank answers.

**(i) Chips.** Where they help most. One leading set: Q3 ["Soften the tone", "Shorten it", "Rewrite it"] supplied the content of his answer. Q6 ["…", "Didn't read them"] also supplied content but it is a choice he could not have made unless true. The prompt's chip guidance ("narrowing a short answer, 'this week or longer ago', choosing between areas they ticked") does not cover content menus like Q3, yet a model will produce them because "offer a small menu of two or three possibilities to react to" invites it.

**(j) Typing load.** 15 typed words in the interview (old: ~50). Interviewer turns 17 → 10.

**(k) Cost.** None for the level code. Lost: the "plan maybe, writing is slow" want, and any product signal.
