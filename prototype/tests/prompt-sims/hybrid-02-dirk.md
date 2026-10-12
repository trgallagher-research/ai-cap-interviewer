# Hybrid sim 02 — Dirk, organisational adviser, sceptic

Member: `{ name: "Dirk", role: "organisational adviser" }`

## Questionnaire (in persona)

```json
{ "frequency": "tried", "uses": [], "tools": ["ChatGPT"], "stance": "sceptical", "offer": ["nothing"] }
```
`pay` skipped (offer includes nothing); `canShow` skipped (tried). He ticks no uses: his one try was not "in his work". 4 taps, 0 typed words.

Interviewer receives: "Never… / I have tried it a few times / What have you used it for? (none ticked) / Which tools? ChatGPT / Doubtful… / Nothing for now".

**Routing problem:** `nonUser` is only `frequency === "never"`, so Dirk gets the USER path: "ask for the most recent real instance in the area they ticked that looks most central to their work". He ticked none. The model has to improvise from the sceptic rule.

## Transcript

**Interviewer (1):** Hello Dirk, thanks for making time. I'd like to hear about a few real examples behind your answers. You said you've tried it a few times; what was the most recent time, and what did you try it on?
<<PHASE: practice >>

**Dirk:** "A few times" was your option, not mine; once. Early 2023, a colleague insisted. I asked about Argyris and Schön's double-loop learning. A tidy answer, with a 1992 reference that doesn't exist. That was enough. And before we go on: who reads this?

**Interviewer (2):** Fair question: the network organiser reads the interviews with first names only, and only anonymised, combined findings go to the network. You said that was enough; since then, have you seen it used on work you were close to?
<<PHASE: practice >>

**Dirk:** Last spring. A junior in a client's HR department pasted my interim diagnosis, forty pages with interview quotes, into ChatGPT to make a board summary. I found a sentence in it I never wrote. The HR director shrugged: "enterprise licence". What do you make of that?

**Interviewer (3):** I'll keep my view for the feedback at the end, if that's all right. What did you do after you found that sentence?
<<PHASE: stretch >>

**Dirk:** Went to the director, then changed my contracts: every proposal now says interview material and the diagnosis are not to be processed by AI tools without my written consent. One client's lawyer said it was unenforceable. I keep it in. I've sent the clause to three colleagues.

**Interviewer (4):** Is there anything that would make you look at these tools again, or is that settled for you?
<<CHIPS: ["Settled for now", "Maybe, under conditions", "Open to it"] >>
<<PHASE: stretch >>

**Dirk:** Maybe, under conditions. Something that runs on my own machine, nothing leaving the room, and a colleague I respect showing it sharpened a diagnosis rather than flattened it. I doubt it exists.

**Interviewer (5):** Thank you, Dirk. I'd like you to rate how confident you are that you could do a few tasks today, drawn from what you described; rate what you can do now, not what you'd want to, and low numbers are as useful as high ones.
<<RATE: [{"id":"r1","task":"Ask an AI chat tool about a theory you know well, such as double-loop learning, and identify which parts of its answer and references are wrong or invented.","level":1},{"id":"r2","task":"Have an AI tool tidy the wording of one paragraph of a proposal that contains no client material, and decide which changes to keep.","level":2},{"id":"r3","task":"Ask an AI tool to summarise a public report on culture after mergers, then check the summary against the report for sentences it invented.","level":2},{"id":"r4","task":"Give an AI tool an anonymised two-paragraph description of a diagnosis you have made, ask it to argue against your reading, and judge whether anything sharpens it.","level":3}] >>
<<PHASE: rate >>

**Dirk (ratings turn):** r1 → 85 · r2 → 60 · r3 → 70 · r4 → 20

**Interviewer (6):** Thank you, Dirk; your scepticism is part of the picture and it was good to talk. Your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Dirk tried an AI chat tool once, in early 2023, and stopped when it invented a reference. He keeps it out of his own work by design. His main contact came through a client's junior pasting his diagnosis into ChatGPT, after which he added an AI-consent clause to every proposal.",
    "domains": [
      { "key": "client", "evidence": "every proposal now says interview material and the diagnosis are not to be processed by AI tools without my written consent" }
    ],
    "tools": [],
    "judgement": "Distrusts the output (an invented 1992 reference) and the data handling (an 'enterprise licence' as the only answer). Has made this a written contract condition and shared it with colleagues.",
    "stance": "sceptical"
  },
  "confidence": { "pattern": "High on catching errors on a theory he knows, moderate on low-risk tidying and summarising, low on using a tool to argue against his own diagnosis." },
  "wants": ["a tool that keeps everything on his own machine", "evidence from a respected colleague that it sharpens rather than flattens a diagnosis"],
  "offers": ["his AI-consent clause for proposals"],
  "productSignals": { "quote": "" },
  "feedback": {
    "headline": "Thanks Dirk: here is what stood out",
    "summary": "You keep AI out of your own work and gave your reasons as events, not slogans: the invented reference, the pasted diagnosis, the shrugging director. You turned one of those into a clause your clients sign.",
    "strengths": [
      "You turned the pasted-diagnosis incident into a written consent clause and kept it when a lawyer objected.",
      "You named exact conditions for looking again: nothing leaving the room, and evidence it sharpens a diagnosis."
    ],
    "nextSteps": [
      {
        "title": "Offer your consent clause to the network",
        "detail": "Send the clause, with the lawyer's objection and your answer to it, to the network organiser as something members can adopt. It worked if one colleague tells you they put it in a proposal."
      }
    ],
    "closing": "Thank you for pushing back; the network needs that voice."
  },
  "quotes": [
    "That was enough.",
    "Something that runs on my own machine, nothing leaving the room.",
    "I doubt it exists."
  ]
}
```
Model returns `tools: []` as the new rule demands ("never tools they only mentioned"). **Engine overrides it**: `pr.tools.length` is 0, so `assembleProfile` falls back to `a.tools` → stored `tools: ["ChatGPT"]`. The fix in the prompt is undone by the engine.

`Engine.divergenceFor(1, items, ratings)` → **aligned** (expected 46, residual +13; tolerance 22).

## Critique

**(a) Adaptation.** Much less pushy than the old sim: the pay/offer question is gone from the interview and his "Nothing for now" is respected. Q4's chips gave him a dignified "Maybe, under conditions". Q2 handled the "who reads this?" challenge honestly using the new Purpose text, but it is two sentences of answer plus a question: on the edge of "three sentences at most".

**(b) Concrete episodes.** Two (the 2023 try; the pasted diagnosis) plus a concrete action (the clause). Good for a sceptic.

**(c) Rating items.** All four now require a tool (the old "explain to the HR director" item is gone). r3 is a sensible bridge item. Graded L1→L3. Fine.

**(d) Profile/divergence.** Level 1 defensible (one try, outside client work; "if in doubt go one lower" could give 0). Divergence now aligned instead of confident-starter: fixed. Tools: engine fallback bug, above. `productSignals.quote` is empty because value/pay is no longer asked in the interview, so his best line ("the network should ask what members would refuse") was never elicited. `client` domain is coded from a non-use action; the organiser heatmap will count Dirk as AI-practice evidence in "With or for clients".

**(e) Next steps.** One fitting step. Fine.

**(f) Markers.** Q1's opening asks "what was the most recent time, and what did you try it on?" — a stacked question, produced by the user path's wording ("what task, which tool, what they typed, what came back") being applied to a near-non-user. Rating request without chips: correct.

**(g) Length.** 6 interviewer turns. Skipped the post-rating follow-up (allowed).

**(h) Questionnaire use.** No re-asking. But the routing is wrong for him: "tried" + nothing ticked + "Doubtful" goes down the user path, whose first instruction refers to a ticked area that does not exist. The frequency option "I have tried it a few times" also misfits a one-time try; Dirk objected to it.

**(i) Chips.** One well-placed set (Q4). Correctly absent elsewhere.

**(j) Typing load.** 168 typed member words vs 449; 6 interviewer turns vs 13. He still types long answers because he pushes back; that is persona, not design.

**(k) Cost.** Lost the "what would you refuse" product signal and his would-pay nuance ("a serious afternoon on ethics and contracting"): the questionnaire's fixed options cannot capture a conditional yes from a sceptic who ticked "Nothing for now".
