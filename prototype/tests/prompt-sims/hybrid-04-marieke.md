# Hybrid sim 04 — Marieke, team coach, daily user

Member: `{ name: "Marieke", role: "team coach" }`

## Questionnaire

```json
{ "frequency": "daily", "uses": ["writing", "prep", "analysis", "thinking", "learning", "building"], "tools": ["Claude", "NotebookLM"], "stance": "pragmatic", "offer": ["peer-halfday", "prompt-library", "demos"], "pay": "yes", "canShow": "yes" }
```
14 taps. Because `canShow` is yes, the prompt adds: "They said they could show a colleague something: ask once what it is, if it has not come up."

## Transcript

**Interviewer (1):** Hello Marieke, good to meet you; I'd like to hear about a few real examples behind your answers. Preparing sessions looks central for you: take the most recent session you designed with AI, what did you put in and what came back?
<<PHASE: practice >>

**Marieke:** Tuesday. District nurses, conflict between two sub-teams after their routes were merged. Five intake calls; I put my anonymised intake notes into my session-design project in Claude, which has my template: purpose, hypotheses, three design options, risks. It gave three options. I used the opening of the second and rewrote the middle, because it proposed a shared-values exercise, exactly what this team is sick of. Earlier that week I'd queried my own notes on a merger-integration book in NotebookLM against the case.

**Interviewer (2):** How do you tell, in a design it gives you, which parts to trust and which to throw out?
<<PHASE: practice >>

**Marieke:** I ask it to state what it assumes about the group. If the assumptions are generic, the design is generic. And I never use a named model it cites without checking: last year it gave me a 'Lencioni stage' Lencioni never wrote. Since then anything with a name gets a 'checked' mark.

**Interviewer (3):** Tell me about a time it went wrong in a way that reached a client.
<<PHASE: stretch >>

**Marieke:** Once. I leaned on its risks section and under-prepared for a resignation that happened mid-session. Generic risks, and I had stopped thinking. That's my real worry: lazy thinking, not wrong facts.

**Interviewer (4):** How do you handle client material with these tools?
<<PHASE: stretch >>

**Marieke:** No names, no organisation, no identifying dates, no quotes longer than a line. NotebookLM only for my own notes and public material. One of my juniors once uploaded named survey results and we had to tell the client; since then there's a one-page rule for my juniors.

**Interviewer (5):** What can you still not get it to do, however you try?
<<PHASE: rate >>

**Marieke:** Feel the room. Design for a group's history without me telling it everything, which I won't. Be short. And I haven't dared to use it in the room with a team yet.

**Interviewer (6):** Thank you, Marieke. I'd like you to rate how confident you are that you could do a few tasks today, drawn from what you described; rate what you can do now, not what you would like to.
<<RATE: [{"id":"r1","task":"Turn your anonymised intake notes into a first session design with your Claude template, and judge which of its options to keep.","level":2},{"id":"r2","task":"Ask Claude to state its assumptions about a group in a design it proposes, and change the design where they are generic.","level":3},{"id":"r3","task":"Give your template and data rule to a colleague so they can run it on their own case without you, and revise both from where they got stuck.","level":4},{"id":"r4","task":"Build a NotebookLM notebook from a team's own anonymised documents with the team's consent, and use it to prepare a session on their history.","level":4},{"id":"r5","task":"Run a short exercise in a live team session where the team uses an AI tool on their own material, within your data rule, and handle what comes up.","level":4}] >>
<<PHASE: rate >>

**Marieke (ratings turn):** r1 → 95 · r2 → 85 · r3 → 70 · r4 → 45 · r5 → 35

**Interviewer (7):** You're at 95 on your own designs and 35 on using it live with a team. What makes the room so different?
<<PHASE: close >>

**Marieke:** The team sees everything. If it says something stupid about them, I'm accountable in that moment, and the data rule gets much harder when it's their material, live.

**Interviewer (8):** That's a real edge. Thank you, Marieke; your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Profile JSON

```json
{
  "practice": {
    "level": 4,
    "summary": "Marieke designs team sessions with Claude using her own template (purpose, hypotheses, three options, risks) on anonymised intake notes, and queries her own reading notes in NotebookLM. She tests designs by asking the tool to state its assumptions and checks every named model at source. She wrote a one-page client-data rule for her juniors after an incident.",
    "domains": [
      { "key": "prep", "evidence": "I put my anonymised intake notes into my session-design project in Claude, which has my template" },
      { "key": "learning", "evidence": "queried my own notes on a merger-integration book in NotebookLM against the case" },
      { "key": "building", "evidence": "my session-design project in Claude, which has my template: purpose, hypotheses, three design options, risks" }
    ],
    "tools": ["Claude", "NotebookLM"],
    "judgement": "Asks the tool to expose its assumptions, marks named models 'checked', and names lazy thinking as the main risk. Clear written data rule: no names, organisations, identifying dates or long quotes.",
    "stance": "pragmatic"
  },
  "confidence": { "pattern": "High on her own design work and checking, lower on handing her method to a colleague, and low on using AI with a team's own material or live in the room." },
  "wants": ["use AI in the room with a team", "design for a group's history without telling it everything", "get it to be short"],
  "offers": ["her session-design template with the hypotheses step", "her one-page client-data rule"],
  "productSignals": { "quote": "" },
  "feedback": {
    "headline": "Thanks Marieke: here is what stood out",
    "summary": "AI is woven into how you design, and you have built checks around it: the assumptions question, the 'checked' mark, a written data rule. You named the risk most people miss, lazy thinking, from a session where it cost you.",
    "strengths": [
      "After the invented Lencioni stage you built a habit, not just a resolution.",
      "Your data rule came from a real incident and is written down for others."
    ],
    "nextSteps": [
      {
        "title": "Run your template through a colleague's hands",
        "detail": "Give the template and the data rule to one network colleague and ask them to use it on their own anonymised case without you. It worked if you have to change at least one line of either."
      },
      {
        "title": "Rehearse a live exercise with your juniors",
        "detail": "Design a ten-minute exercise where a team puts its own anonymised material into a tool, and run it once with your two juniors as the team. It worked if you can say what your data rule needs to add for live use."
      }
    ],
    "closing": "Thank you; the network has a lot to learn from how you work."
  },
  "quotes": ["That's my real worry: lazy thinking, not wrong facts.", "Feel the room.", "Since then anything with a name gets a 'checked' mark."]
}
```
`thinking`, `analysis`, `writing` were ticked but not probed and so are not domains → `stats().questionnaire.claimedNoEpisode` counts all three for Marieke, the same counter that flags Joris's overclaims.

`Engine.divergenceFor(4, items, ratings)` → **cautious-practitioner** (expected 82, residual −20).

## Critique

**(a) Adaptation.** Still stretching: Q2–Q5 are the four best stretch questions from the old version. She would feel taken seriously.

**(b) Episodes.** Three (Tuesday's design; Lencioni; mid-session resignation) before rating. Enough for level 4.

**(c) Rating items.** All tool-based, her words. The new grading rule ("at least one must be one step beyond… and at least one two steps beyond") **cannot be satisfied at level 4**: the ladder stops at 4, so r3–r5 are all labelled 4 although r5 is clearly harder than r3. The model wrote three ceiling items to honour "beyond".

**(d) Divergence: misfires.** `ITEM_TABLE[4]` expects 82 for every item at or below level 4, because no item can be "beyond" a level-4 member. Her honest 45 and 35 on genuine stretch items pull her to residual −20 → "cautious-practitioner". The better the interviewer follows the new "two steps beyond" rule, the more likely a level-4 member is mislabelled. (Old sim: aligned, because it had only two stretch items.)

**(e) Next steps.** Fit, two weeks, checks. Good.

**(f) Markers.** Five long tasks; JSON valid; single quotes used as instructed ('checked' appears only in her text, not in tasks).

**(g) Length.** 8 interviewer turns (5 questions). Limit far away.

**(h) Questionnaire use.** No re-asking; went straight to the central ticked area. The canShow prompt line was satisfied implicitly (template and rule came up) so not asked: correct. But six areas ticked and only one probed in depth: `thinking`, which she named as her distinctive practice in the old sim, was never asked about.

**(i) Chips.** None, correctly: open questions to a fluent user don't need menus.

**(j) Typing load.** About 260 member words vs ~560 in the old sim.

**(k) Cost.** Level code and next steps intact. Lost: the thinking-partner practice (her "what colleagues can't do" answer), so the organiser map undercounts `thinking` for the one member who leads it, and the peer-exchange quote.
