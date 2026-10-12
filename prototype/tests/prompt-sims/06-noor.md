# Sim 06 — Noor, HR adviser, stops early after four answers

Member record: `{ name: "Noor", role: "HR adviser" }`.

## Transcript

**Interviewer (1):** Hello Noor, good to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work as an HR adviser, no right answers. To start: what does your work look like in a typical week?
<<PHASE: orient >>

**Noor:** I'm an internal HR adviser at a housing corporation. Advising managers on difficult cases, absence, conflicts between employees, and writing policy.

**Interviewer (2):** Where does AI show up in any of that, if at all?
<<PHASE: orient >>

**Noor:** A bit. I use ChatGPT, the free one, for policy texts and job profiles. Not for cases, obviously.

**Interviewer (3):** What was the last policy text you used it for?
<<PHASE: practice >>

**Noor:** Our new hybrid-working guideline, last month. I gave it our old guideline and the three changes the MT wanted and asked for a new version. Fine as a start: too long, very American in tone. I rewrote most of it but the structure stayed.

**Interviewer (4):** You said "not for cases, obviously". What makes that obvious for you?
<<PHASE: practice >>

**Noor:** It's personal data of colleagues, I'm not putting that in a free tool. Sorry, something's come up, I have to go.

*(Noor presses "I'd like to stop". Page sends the `endNow` instruction as the next user turn: "[I need to stop here.] (Instruction: the member is ending early. Do not ask another question. Thank them warmly ... then output <<PHASE: close >> and <<COMPLETE>>.)")*

**Interviewer (5):** No problem at all, Noor, thank you for the time you had. Your feedback will be based on what you shared so far.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
None (interview ended before the rate phase). Engine: `confidence.mean = null`, band "none".

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Noor, an internal HR adviser at a housing corporation, uses the free ChatGPT occasionally for policy texts and job profiles. Her one described episode was redrafting a hybrid-working guideline from the old text plus three MT changes; she rewrote most of it but kept the structure. She keeps personal case data out of it. The interview ended early, so the picture is partial.",
    "domains": [
      { "key": "writing", "evidence": "I use ChatGPT, the free one, for policy texts and job profiles." }
    ],
    "tools": ["ChatGPT"],
    "judgement": "Judged the draft as too long and American in tone and rewrote most of it. Does not put colleagues' personal case data into a free tool.",
    "stance": "pragmatic"
  },
  "confidence": {
    "pattern": "no ratings"
  },
  "wants": [],
  "offers": [],
  "productSignals": {
    "wouldPayFor": "",
    "quote": ""
  },
  "feedback": {
    "headline": "Thanks Noor: here is what stood out",
    "summary": "We only had a few minutes, so this is a partial picture. You use ChatGPT for policy texts and job profiles and you judged the hybrid-working draft precisely: too long, too American, structure worth keeping. You also drew a clear line at colleagues' personal data.",
    "strengths": [
      "You gave the tool your old guideline and the MT's three changes, which is a sharper brief than most people write, and then kept only the structure.",
      "You have a clear and well-founded rule: no personal data of colleagues in a free tool."
    ],
    "nextSteps": [
      {
        "title": "Ask for a shorter, Dutch-sounding version next time",
        "detail": "On your next policy text or job profile, add to your brief a line about length and tone, for instance 'half the length, plain Dutch register, no corporate phrases', and compare the draft with the last one. It worked if you rewrite noticeably less than 'most of it'."
      }
    ],
    "closing": "If you have time later, the rest of the conversation is still open; thanks for what you shared."
  },
  "quotes": [
    "Not for cases, obviously.",
    "Fine as a start: too long, very American in tone."
  ]
}
```

Engine would compute: `divergence = { kind: "aligned", note: "No ratings were given, so confidence could not be compared with practice." }`.

## Critique

**(a) Adaptation.** Fine for four turns: the orient question, a locate-AI question, then straight to the most recent episode, then a follow-up on her boundary. The endNow instruction worked literally: no question, two sentences, both markers.

**(b) Concrete episodes.** One good one in four questions, with the brief she gave, what came back, how she judged it and what she kept. The prompt's episode drill is efficient when the member is articulate.

**(c) Rating items.** None; not applicable. Note the prompt has no "mini-rating" path for an early stop: the endNow instruction forbids asking another question and skips the ratings entirely. For a member who has given one full episode, two or three rating items could still be offered on the stop screen; the prompt and the engine both assume ratings are all-or-nothing.

**(d) Profile and divergence.** Practice coded 1 ("occasional"), though the brief she wrote and her data rule would support 2 if there were a second episode; "if in doubt go one lower" applied. The profile prompt handled "little signal, say so" well: the summary and feedback both say the picture is partial. Problems in the engine, not the prompt: `divergence.kind = "aligned"` for a member with no ratings is wrong and will be counted as "aligned" in the organiser's statistics; it needs a fourth kind ("unrated"). The profile prompt also still asks for `productSignals` and `wants` with no instruction that empty is the correct answer when nothing was asked; a weaker model will invent a want ("would like to learn more about AI for HR") to fill the slot.

**(e) Next steps.** One step, fits her work (policy texts), doable in two weeks, has a check. The profile prompt says "one or two", so one is permitted; with this little signal, one is right.

**(f) Marker risks.** The endNow instruction is a user turn beginning "[I need to stop here.]" followed by a bracketed instruction containing the literal markers. A model that echoes instructions could output the markers inside its visible text (e.g. "I'll now output <<PHASE: close >>"), but since visible text is cut at the first "<<", the damage is only a truncated thank-you. Low risk.

**(g) Length.** 5 interviewer turns. No limit issue. The page's `minQuestionsBeforeRate: 6` is irrelevant for endNow (it bypasses the rate phase entirely).
