# Hybrid sim 01 — Hanneke, independent mediator in labour disputes, never-user

Member: `{ name: "Hanneke", role: "independent mediator in labour disputes" }`

## Questionnaire (in persona)

```json
{ "frequency": "never", "stance": "cautious", "offer": ["peer-halfday", "confidentiality"], "pay": "yes" }
```
`uses`, `tools`, `canShow` skipped by `questionSkipped`. Stance: none of the five labels fits a curious never-user ("Keen: I want to do more with it" presumes use; "Careful: I use it, with reservations" also presumes use); she picks "Careful" as the least wrong. 5 taps, 0 typed words.

`formatQuestionnaire` sends the interviewer:
```
- How often does an AI tool (...) show up in your work? Never
- Which comes closest to how you feel about AI in your work? Careful: I use it, with reservations
- If the network offered something on AI, what would be worth your time? Tick any. A half-day with peers from this network; A checklist for using it safely with client material
- Would you pay for something like that? Yes, if it fits my work
```
The interviewer is told she has never used AI and, two lines later, that she "uses it, with reservations".

## Transcript (non-user path)

**Interviewer (1):** Hello Hanneke, good to meet you. I'd like to hear how AI has or hasn't come up around your work as a mediator. Can you think of a recent moment when it came up, through a colleague, a client, a lawyer or something you read?
<<CHIPS: ["A colleague", "A lawyer or client", "Something I read"] >>
<<PHASE: practice >>

**Hanneke:** A lawyer, I think. One of the lawyers in a current case writes his letters with it, I'm fairly sure. They have become very smooth, very long, bullet points everywhere, and somehow empty.

**Interviewer (2):** What happened in the case when those letters arrived?
<<PHASE: practice >>

**Hanneke:** The employee on the other side felt steamrollered. She said to me "I can't answer this, it's three pages". I had to slow everything down in the next joint session. I didn't say anything about AI; it's his business.

**Interviewer (3):** That's a clear moment. Has there been another time, perhaps with a colleague, when it came closer to your own work?
<<CHIPS: ["Yes, a colleague", "Not really"] >>
<<PHASE: practice >>

**Hanneke:** Yes, a colleague in my intervisie group uses it to write her reports. She puts in her notes and it makes a draft. She takes the names out. I wasn't convinced: in a labour dispute the story identifies people, you don't need a name.

**Interviewer (4):** What would you need to see, or know, before you tried it on anything in your own work?
<<PHASE: stretch >>

**Hanneke:** A mediator I respect showing me exactly what she does on a realistic example, and saying honestly where it went wrong. And a clear line on what's safe to put in. I'm curious, I just wouldn't know what to type. I'd want someone next to me the first time.

**Interviewer (5):** Thank you, Hanneke. I'd like you to rate how confident you are that you could do a few small tasks today, drawn from what you described; rate what you can do now, not what you'd like to be able to do, and there are no right answers.
<<RATE: [{"id":"r1","task":"Open a free AI chat tool and ask it to summarise a public one-page article about mediation, then check the summary against the original.","level":1},{"id":"r2","task":"Ask an AI chat tool to explain an employment-law term you meet in a case, such as 'transitievergoeding', and judge whether the explanation matches what you know.","level":1},{"id":"r3","task":"Paste a lawyer's long letter, with all names and identifying details removed, into an AI tool and ask for a plain one-paragraph version you could use to help the other party respond.","level":2},{"id":"r4","task":"Paste the standard clauses of your settlement agreement template, with every case detail removed, into an AI tool and ask it to flag any sentence that does not belong, then decide what to change.","level":2}] >>
<<PHASE: rate >>

**Hanneke (ratings turn):**
- r1 → 60 · r2 → 65 · r3 → 40 · r4 → 30

**Interviewer (6):** You put explaining a legal term at 65 and checking your settlement template at 30. What makes the template feel so much harder?
<<PHASE: close >>

**Hanneke:** I wouldn't know whether what it says is sensible, and there'd be nobody to ask.

**Interviewer (7):** That makes sense. Thank you, Hanneke, it was a pleasure; your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=60 (L1), r2=65 (L1), r3=40 (L2), r4=30 (L2). Mean 49.

## Profile JSON

```json
{
  "practice": {
    "level": 0,
    "summary": "Hanneke has not used AI tools in her work. She has met it twice at one remove: a lawyer whose letters became long and empty, which left the employee in the case feeling steamrollered, and an intervisie colleague who drafts reports from notes with the names removed.",
    "judgement": "Holds that in a labour dispute the story identifies people even without names, so removing names is not enough. Would want a clear line on what is safe to put in before trying.",
    "tools": [],
    "stance": "cautious"
  },
  "confidence": {
    "pattern": "Moderate on first steps such as a summary or explaining a legal term, dropping on using a tool with case-related texts like a lawyer's letter or her settlement template."
  },
  "wants": ["see a respected mediator show real use on a realistic example, including where it went wrong", "know what is safe to put in", "have someone next to her the first time"],
  "offers": [],
  "productSignals": { "quote": "A mediator I respect showing me exactly what she does on a realistic example, and saying honestly where it went wrong." },
  "feedback": {
    "headline": "Thanks Hanneke: here is what stood out",
    "summary": "You haven't used AI tools, and your reasons are specific: in your cases the story identifies people, not just the names. You also noticed something many people miss, what a smooth AI-written letter does to the weaker party in the room.",
    "strengths": [
      "You saw the effect of the lawyer's letters on the employee and slowed the next joint session down to repair it.",
      "Your line on confidentiality is sharper than 'take the names out'."
    ],
    "nextSteps": [
      {
        "title": "Try one harmless summary with someone beside you",
        "detail": "Take a public article about mediation, open a free chat tool with someone you trust next to you, and ask for a summary. Compare it with the original and note one thing it got right and one it flattened. It worked if you can say in your own words what the tool is and isn't good at."
      }
    ],
    "closing": "Thank you for being so clear about what stops you; the network needs to hear that."
  },
  "quotes": [
    "In a labour dispute the story identifies people, you don't need a name.",
    "I'd want someone next to me the first time.",
    "I'm curious, I just wouldn't know what to type."
  ]
}
```
`domains` omitted as instructed ("for a non-user, omit domains entirely"), although the output shape also says "all fields required". Engine: `Array.isArray(pr.domains)` false → `[]`, no crash. Stance overridden to the questionnaire's "cautious" (matches here by luck). `productSignals.wouldPayFor` from questionnaire: "A half-day with peers from this network; A checklist for using it safely with client material".

`Engine.divergenceFor(0, items, ratings)` → **aligned** (expected 45, residual +4).

## Critique

**(a) Adaptation.** Comfortable and shorter. The non-user path is well judged: two moments, one "what would you need", ratings. Chips on Q1 and Q3 gave her an easy way in without forcing her.

**(b) Concrete episodes.** Two concrete moments (lawyer's letters with an effect in the room; intervisie colleague). The Q2 follow-up ("what happened in the case") got the best detail of the interview. Nothing accepted as a generality.

**(c) Rating items.** Much better than the old sim: every item now uses a tool (the old "write your data rule" item is gone thanks to the new rule). r3 is new and drawn directly from her lawyer episode, the best item in either version. Floor (r1, r2) and ceiling (r3, r4) present. "At least one two steps beyond" means level 2 for a non-user: met.

**(d) Profile and divergence.** Level 0 from episodes. `divergenceFor` now says aligned (old rule said confident-starter): fixed. Stance labels presume use (see h).

**(e) Next steps.** One step, fits, doable, has a check. The old second step (write your rule) is no longer prompted by an item; fine.

**(f) Markers.** Valid. Chips present on two questions, absent on rate and close. The chip set ["Yes, a colleague", "Not really"] on Q3 invites "Not really", which would end the thread; harmless here.

**(g) Length.** 7 interviewer turns (4 questions). Force limit (9) never near.

**(h) Questionnaire use.** No re-asking; the offer/pay question is gone from the interview. Problem: the stance options presume use, so a curious never-user is forced into "I use it, with reservations", which the interviewer then receives alongside "Never" — a contradiction the prompt does not resolve.

**(i) Chips.** Used where they help (opening a hard question for a beginner), not on rate/close.

**(j) Typing load.** 180 typed member words vs 431; interviewer turns 13 → 7; plus 5 questionnaire taps.

**(k) Cost of shortening.** None material for a non-user: still two moments and a clear "what would you need". Lost: the settlement-template wish (now only in the ratings) and the "keep notes sparse" strength.
