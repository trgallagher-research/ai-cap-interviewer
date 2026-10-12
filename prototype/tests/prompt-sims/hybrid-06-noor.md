# Hybrid sim 06 — Noor, HR adviser, stops early after four answers

Member: `{ name: "Noor", role: "HR adviser" }`

## Questionnaire

```json
{ "frequency": "monthly", "uses": ["writing"], "tools": ["ChatGPT"], "stance": "pragmatic", "offer": ["confidentiality", "one-to-one"], "pay": "maybe", "canShow": "maybe" }
```
8 taps.

## Transcript

**Interviewer (1):** Hello Noor, good to meet you; I'd like to hear about a few real examples behind your answers. You ticked writing: what's the most recent thing you wrote with ChatGPT's help?
<<CHIPS: ["A policy text", "A job profile", "Something else"] >>
<<PHASE: practice >>

**Noor:** Our new hybrid-working guideline, last month, at the housing corporation where I'm the internal HR adviser.

**Interviewer (2):** What did you give it, and what came back?
<<PHASE: practice >>

**Noor:** The old guideline and the three changes the MT wanted, and I asked for a new version. Fine as a start: too long, very American in tone. I rewrote most of it but kept the structure.

**Interviewer (3):** Was there a time it went wrong, or a kind of work where you decided not to use it?
<<CHIPS: ["It went wrong once", "I keep it out of some work", "Neither really"] >>
<<PHASE: stretch >>

**Noor:** I keep it out of some work *(tapped chip)*

**Interviewer (4):** Which work, and why?
<<PHASE: rate >>

**Noor:** Cases. Personal data of colleagues, I'm not putting that in a free tool. Sorry, something's come up, I have to go.

*(Noor presses "I'd like to stop"; page sends the endNow instruction.)*

**Interviewer (5):** Of course, Noor, thank you for the time you had. Your feedback will be based on what you shared so far.
<<PHASE: close >>
<<COMPLETE>>

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Noor, internal HR adviser at a housing corporation, uses the free ChatGPT now and then for policy texts. She redrafted a hybrid-working guideline from the old text and the MT's three changes, kept the structure and rewrote most of the wording. She keeps colleagues' case data out of it. The interview ended early.",
    "domains": [
      { "key": "writing", "evidence": "The old guideline and the three changes the MT wanted, and I asked for a new version." }
    ],
    "tools": ["ChatGPT"],
    "judgement": "Found the draft too long and American and rewrote most of it. Does not put colleagues' personal data into a free tool.",
    "stance": "pragmatic"
  },
  "confidence": { "pattern": "no ratings" },
  "wants": [],
  "offers": [],
  "productSignals": { "quote": "" },
  "feedback": {
    "headline": "Thanks Noor: here is what stood out",
    "summary": "We only had a few minutes, so this is a partial picture. You gave ChatGPT a sharp brief for the hybrid-working guideline and judged the result precisely, and you keep colleagues' personal data out of it.",
    "strengths": [
      "You briefed the tool with the old text plus the MT's three changes, then kept only what worked.",
      "You have a clear rule on personal data in a free tool."
    ],
    "nextSteps": [
      {
        "title": "Brief for length and tone next time",
        "detail": "On your next policy text, add a line asking for half the length in a plain Dutch register, and compare with the last draft. It worked if you rewrite noticeably less."
      }
    ],
    "closing": "Thanks for what you shared; the rest of the conversation is still open if you have time later."
  },
  "quotes": ["Fine as a start: too long, very American in tone.", "Personal data of colleagues, I'm not putting that in a free tool."]
}
```
Engine adds from the questionnaire: `productSignals.wouldPayFor` = "A checklist for using it safely with client material; An hour with someone looking at how I work", `pay: "maybe"`, `selfReport`. `Engine.divergenceFor(1, null, null)` → **unrated** (was "aligned").

## Critique

**(a)/(b)** Four questions produced one full episode and one boundary, as before. **(c)** No ratings: with four answers she had reached the point where the prompt says ratings may come ("usually after 4 to 6 questions") and the engine minimum (3), yet the endNow path still skips them. In the hybrid, stopping at question 4 is stopping one turn before ratings, so the loss is larger relative to the interview. **(d)** Level 1, unrated: correct now. The questionnaire rescues the product signal (would-pay "maybe" for a checklist and a one-to-one) that the old early stop lost. **(e)** One fitting step. **(f)** Q3 chips are a choice menu, fine; Q3 itself is an either/or question. endNow: no chips, both markers. **(g)** 5 interviewer turns. **(h)** Dug straight into her one ticked area; no re-asking. **(i)** Chips on Q1 and Q3 helpful. **(j)** ~90 member words vs ~140. **(k)** For an early stopper the hybrid is strictly better: same episode, plus product signals from the questionnaire.
