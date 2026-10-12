# Sim 04 — Marieke, team coach, daily user (level 3–4)

Member record: `{ name: "Marieke", role: "team coach" }`.

## Transcript

**Interviewer (1):** Hello Marieke, good to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work as a team coach, with no right answers. To start: what does a typical week look like for you?
<<PHASE: orient >>

**Marieke:** Three or four team sessions a week, mostly teams in healthcare and local government. Intake conversations before, design in between, write-ups after. I supervise two junior coaches. And a lot of design time, which is where Claude and NotebookLM live.

**Interviewer (2):** You said that's where Claude and NotebookLM live. Take the most recent session you designed: how did they come into it, step by step?
<<PHASE: practice >>

**Marieke:** Tuesday. A team of district nurses, conflict between two sub-teams after their routes were merged. I'd done five intake calls. I typed my intake notes, anonymised, into my session-design project in Claude, which has my template: purpose, hypotheses, three design options, risks. It gave me three options. I used the opening of the second one but rewrote the middle, because it proposed a "shared values" exercise, which is exactly what these teams are sick of. NotebookLM I used earlier that week to query my own notes from a book on merger integration against the case.

**Interviewer (3):** It proposed a shared-values exercise that you knew the team was sick of. How do you tell, in a design it gives you, which parts to trust and which to throw out?
<<PHASE: practice >>

**Marieke:** Mostly whether it fits the specific group. Concretely: I ask it to state what it assumes about the group, and if the assumptions are generic I know the design is generic. And I never use a model or framework it cites without checking. Last year it gave me a "Lencioni stage" that Lencioni never wrote.

**Interviewer (4):** That Lencioni stage that didn't exist: how did you catch it?
<<PHASE: practice >>

**Marieke:** I was about to put it on a slide and it looked wrong. Checked the book. It had merged two of his dysfunctions into a new one. Since then I keep a note "checked" next to anything with a name on it.

**Interviewer (5):** You said you anonymise intake notes. What exactly is your rule about client data?
<<PHASE: practice >>

**Marieke:** No names, no organisation name, no dates that identify, no quotes longer than a line. For NotebookLM only my own notes and public material, never a client's documents. It came from an incident: one of my juniors uploaded a team's survey results with names in them. We had to tell the client. Since then there's a one-page rule for my juniors.

**Interviewer (6):** Has it ever misled you in a way that reached a client?
<<PHASE: stretch >>

**Marieke:** Once. A design where I leaned on its "risks" section and under-prepared for a resignation that happened mid-session. It had listed generic risks and I had stopped thinking myself. That's the real danger for me, not wrong facts, lazy thinking.

**Interviewer (7):** What do you do with these tools that colleagues in the network could not yet do?
<<PHASE: stretch >>

**Marieke:** The template with the hypotheses step. And using it as a sparring partner on a case: I describe the system, ask what I'm not seeing, argue with it. Most colleagues use it as a text machine.

**Interviewer (8):** What can you still not get it to do, however you try?
<<PHASE: stretch >>

**Marieke:** Feel the room. And design for a group's history: it doesn't know what this team tried three years ago and failed at unless I tell it everything, which I won't. Also I cannot get it to be short.

**Interviewer (9):** The network is thinking about what to offer members on this. What would make that worth your time, and would you pay for it?
<<PHASE: stretch >>

**Marieke:** Peer exchange with the three or four people who use it at this level. I'd pay for that. Not a training.

**Interviewer (10):** What could you show a colleague, if they asked?
<<PHASE: stretch >>

**Marieke:** The template and the data rule. I already teach my two juniors; I'd do a lunch session.

**Interviewer (11):** And what would you want to learn next yourself?
<<PHASE: stretch >>

**Marieke:** Using it in the room with a team, carefully. I haven't dared yet.

**Interviewer (12):** Thank you, Marieke, that's rich material. I'd like you to rate how confident you are that you could do a few tasks drawn from what you described; there are no right answers.
<<RATE: [{"id":"r1","task":"Turn your anonymised intake notes from a team into a first design using your Claude template, and judge which of its three options to keep.","level":2},{"id":"r2","task":"Catch a generic assumption in a design Claude proposes by asking it to state what it assumes about the group, and change the design because of it.","level":3},{"id":"r3","task":"Check a model or framework Claude cites in a design against the original source before it goes on a slide.","level":3},{"id":"r4","task":"Hand your template and your client-data rule to a colleague so they can run it on their own case without you, and learn from where they got stuck.","level":4},{"id":"r5","task":"Run a short exercise in a live team session in which the team uses an AI tool on their own material, within your data rule, and handle what comes up.","level":4}] >>
<<PHASE: rate >>

**Marieke (ratings turn):**
My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):
- Turn your anonymised intake notes from a team into a first design using your Claude template, and judge which of its three options to keep. → 95
- Catch a generic assumption in a design Claude proposes by asking it to state what it assumes about the group, and change the design because of it. → 85
- Check a model or framework Claude cites in a design against the original source before it goes on a slide. → 95
- Hand your template and your client-data rule to a colleague so they can run it on their own case without you, and learn from where they got stuck. → 80
- Run a short exercise in a live team session in which the team uses an AI tool on their own material, within your data rule, and handle what comes up. → 40

**Interviewer (13):** You're at 95 on your own designs and 40 on doing it live in the room. What makes the room feel so different?
<<PHASE: close >>

**Marieke:** The team sees everything. If it says something stupid about them, I'm accountable in that moment. And the data rule gets much harder when it's their material, live.

**Interviewer (14):** That's a real edge, and a thoughtful one. Thank you, Marieke; your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=95, r2=85, r3=95, r4=80, r5=40. Mean 79, band "high".

## Profile JSON

```json
{
  "practice": {
    "level": 4,
    "summary": "Marieke designs team sessions daily with Claude, using her own template (purpose, hypotheses, three options, risks) on anonymised intake notes, and queries her own reading notes in NotebookLM. She uses it as a sparring partner on cases and rewrites what does not fit the group. She has a one-page client-data rule, written after a junior uploaded named survey results, and teaches two junior coaches.",
    "domains": [
      { "key": "prep", "evidence": "I typed my intake notes, anonymised, into my session-design project in Claude, which has my template: purpose, hypotheses, three design options, risks." },
      { "key": "thinking", "evidence": "I describe the system, ask what I'm not seeing, argue with it." },
      { "key": "learning", "evidence": "NotebookLM I used earlier that week to query my own notes from a book on merger integration against the case." },
      { "key": "building", "evidence": "my session-design project in Claude, which has my template" }
    ],
    "tools": ["Claude", "NotebookLM"],
    "judgement": "Asks the tool to state its assumptions and discards generic designs; checks every cited model against the source and marks it 'checked'. Rule: no names, organisations, identifying dates or long quotes; NotebookLM only for own notes and public material. Names lazy thinking, not wrong facts, as the real danger.",
    "stance": "pragmatic"
  },
  "confidence": {
    "pattern": "High across design, checking and teaching, dropping sharply on using an AI tool live in the room with a team."
  },
  "wants": [
    "use AI in the room with a team, carefully",
    "get it to design for a group's history without telling it everything",
    "get it to be short"
  ],
  "offers": [
    "her session-design template with the hypotheses step",
    "her one-page client-data rule"
  ],
  "productSignals": {
    "wouldPayFor": "Peer exchange with the three or four members who use it at her level; not a training.",
    "quote": "Peer exchange with the three or four people who use it at this level. I'd pay for that. Not a training."
  },
  "feedback": {
    "headline": "Thanks Marieke: here is what stood out",
    "summary": "AI is woven into how you design: your template with the hypotheses step, the assumptions check, the 'checked' note next to every named model. You also named the risk most people miss, lazy thinking rather than wrong facts, from a session where it cost you. Your one edge is the room, and you were honest about it.",
    "strengths": [
      "After the invented Lencioni stage you built a habit, a 'checked' mark on anything with a name, rather than just being more careful.",
      "Your data rule came from a real incident with a junior and is written down for others, which is what makes it a rule rather than a preference."
    ],
    "nextSteps": [
      {
        "title": "Run your template through a colleague's hands",
        "detail": "Give the template and the data rule to one colleague in the network, not a junior, and ask them to run it on their own anonymised case without you. Note where they got stuck. It worked if you have to change at least one line of the template or the rule afterwards."
      },
      {
        "title": "Rehearse one in-the-room exercise with your juniors first",
        "detail": "Before trying AI live with a client team, design a ten-minute exercise where a team puts their own anonymised material into a tool, and run it once with your two juniors playing the team. Write down what happened when it said something off. It worked if you can say what your data rule needs to add for live use."
      }
    ],
    "closing": "Thank you for the detail; the network has a lot to learn from how you work."
  },
  "quotes": [
    "That's the real danger for me, not wrong facts, lazy thinking.",
    "Most colleagues use it as a text machine.",
    "It doesn't know what this team tried three years ago and failed at unless I tell it everything, which I won't.",
    "I cannot get it to be short."
  ]
}
```

Engine would compute: level 4 → expected 82 ± 18; mean 79 → **divergence = "aligned"**.

## Critique

**(a) Adaptation.** Yes, stretched. The "daily users should feel stretched" list in the prompt (verify, misled, confidentiality, what colleagues can't do, what you still can't do) produced questions 3–8 and they got the best material in the whole set. What did *not* happen: no question about how the template is built or iterated (the `building` domain was coded from one phrase), nothing on the supervision/teaching practice beyond "I'd do a lunch session", and NotebookLM was never followed up. The prompt's "follow the thread they open" plus the 10–14 budget means an advanced user's second and third tools go unexplored.

**(b) Concrete episodes.** Three real episodes (Tuesday's district-nurse design, the Lencioni stage, the mid-session resignation), each pulled out by a "how did you catch it / take the most recent" follow-up. The interviewer did not accept "mostly my gut" at question 3 and got the assumptions check. Good.

**(c) Rating items.** Five items, all "can do", all in her words, all requiring a tool, graded 2→4 with a real ceiling (r5, which she has said she hasn't dared). r1–r3 are things she has clearly done, so three of five items are floor; Bandura would want more spread in the middle. r4 is partly a social task (handing over, learning from a colleague) but is a fair level-4 item. No generic item. One gap: nothing on `thinking` (sparring on a case) even though she named it as her distinctive practice; the model drew items from the episodes it had drilled, which skews the set towards checking and design.

**(d) Profile and divergence.** Level 4 is supported by teaching juniors, the written rule, and the reusable template. A stricter reader could say 3, since "designs ways of working with AI for others" is thin (two juniors), but the written data rule tips it. Divergence "aligned" is sensible. Note that the ±18 band at level 4 means a daily user who rates honestly low on the stretch items (say r4=50, r5=20, mean 69) becomes "cautious-practitioner" purely because the ceiling items were good ceiling items; the rule penalises well-graded scales.

**(e) Next steps.** Both fit (her template, her juniors, her stated want), both doable in two weeks with no new tools, both have a test. The second is well targeted at the 40 rating without being a push to do it with a client.

**(f) Marker risks.** The RATE marker is the longest in the set (five ~30-word tasks); the risk of a model emitting a stray newline inside a string or a curly double quote is highest here. Also: r1's task string mentions "your Claude template" — a model might write `"Claude"` in straight double quotes inside the task string, which would break JSON unless escaped. The prompt does not warn about quoting inside task strings.

**(g) Length.** 14 interviewer turns (11 questions, rating request, 1 follow-up, close). The limit did not bite but there was no room left: one more stretch question and the rating request would have been forced. For a daily user the prompt's stretch list has six sub-topics plus the pay question and the show-a-colleague question; that is more than fits in the budget.
