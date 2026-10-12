# Sim 03 — Bram, interim manager, short-answerer

Member record: `{ name: "Bram", role: "interim manager" }`.

## Transcript

**Interviewer (1):** Hi Bram, good to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work as an interim manager, no right answers. To start: what does your work look like in a typical week?
<<PHASE: orient >>

**Bram:** Meetings. Fixing things.

**Interviewer (2):** Fixing things covers a lot. What kind of organisation are you in at the moment?
<<PHASE: orient >>

**Bram:** Care organisation. Restructuring.

**Interviewer (3):** And do AI tools, Copilot or ChatGPT say, show up anywhere in that week?
<<PHASE: orient >>

**Bram:** Sometimes.

**Interviewer (4):** Is that mostly for emails, for documents, or for something else?
<<PHASE: practice >>

**Bram:** Emails mostly.

**Interviewer (5):** Which tool: Copilot in Outlook, ChatGPT, or something else?
<<PHASE: practice >>

**Bram:** Copilot. It's in Outlook.

**Interviewer (6):** Can you remember the last email you used it on, this week or longer ago?
<<PHASE: practice >>

**Bram:** Last week. Mail to the works council.

**Interviewer (7):** What did you ask Copilot to do with that mail?
<<PHASE: practice >>

**Bram:** Make it less sharp. I'd written it angry.

**Interviewer (8):** And what came back: did you send it as it was, change it, or drop it?
<<PHASE: practice >>

**Bram:** Changed about half. Too soft. Sounded like HR.

**Interviewer (9):** "Sounded like HR", that's a precise judgement. Apart from emails, has it come up for anything else, meeting notes or a plan for instance, or not really?
<<PHASE: practice >>

**Bram:** Teams does the notes. I don't read them.

**Interviewer (10):** Is there anything in the restructuring work you'd want it to take off your hands, if it could?
<<PHASE: stretch >>

**Bram:** Don't know. The plan maybe. Writing is slow.

**Interviewer (11):** When you don't use it, for the plan say, what's the reason: time, trust, or it hasn't occurred to you?
<<PHASE: stretch >>

**Bram:** Hasn't occurred. And it's confidential, names of people losing jobs.

**Interviewer (12):** If the network offered something on this, what would make it worth your time, and would you pay for it?
<<PHASE: stretch >>

**Bram:** Something short. An hour. Pay? Depends.

**Interviewer (13):** Is there anything from your own way of working that you could show a colleague, if anything?
<<PHASE: stretch >>

**Bram:** No.

**Interviewer (14):** One more: when you changed half of that works-council mail, how did you decide what to keep?
<<PHASE: stretch >>

**Bram:** Gut.

*(Page: interviewerCount is now 14 → `NUDGES.forceRate` appended to Bram's last answer.)*

**Interviewer (15):** Thanks Bram. I'd like you to rate how confident you are that you could do a few tasks like the ones you described; no right answers.
<<RATE: [{"id":"r1","task":"Ask Copilot in Outlook to soften an email you have written to the works council, and decide which of its changes to keep.","level":1},{"id":"r2","task":"Give Copilot three bullet points and have it draft a short weekly update for the steering group, then edit it into your own tone.","level":2},{"id":"r3","task":"Open the Teams notes from a management team meeting and ask Copilot to list only the decisions and actions, then check them against what you remember.","level":2},{"id":"r4","task":"Describe a stuck situation between two department heads, with names and identifying details removed, to an AI tool and ask it for three possible readings, then judge which one fits.","level":3}] >>
<<PHASE: rate >>

**Bram (ratings turn):**
My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):
- Ask Copilot in Outlook to soften an email you have written to the works council, and decide which of its changes to keep. → 80
- Give Copilot three bullet points and have it draft a short weekly update for the steering group, then edit it into your own tone. → 55
- Open the Teams notes from a management team meeting and ask Copilot to list only the decisions and actions, then check them against what you remember. → 60
- Describe a stuck situation between two department heads, with names and identifying details removed, to an AI tool and ask it for three possible readings, then judge which one fits. → 25

**Interviewer (16):** You're at 80 for softening an email and 25 for the two department heads. What's the difference for you?
<<PHASE: close >>

**Bram:** One's an email. The other's my job.

**Interviewer (17):** That's a clear line, thanks Bram. Your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=80, r2=55, r3=60, r4=25. Mean 55, band "moderate".

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Bram, an interim manager in a care organisation going through restructuring, uses Copilot in Outlook occasionally, mostly to adjust the tone of emails. His one described episode was softening an angry mail to the works council, of which he kept about half because the result 'sounded like HR'. Teams records his meeting notes but he does not read them.",
    "domains": [
      { "key": "writing", "evidence": "Last week. Mail to the works council. Make it less sharp. I'd written it angry." }
    ],
    "tools": ["Copilot", "Teams"],
    "judgement": "Judges output by ear ('too soft, sounded like HR') and by gut. Keeps the restructuring plan out of AI tools because it names people losing their jobs.",
    "stance": "pragmatic"
  },
  "confidence": {
    "pattern": "Confident on softening an email, middling on drafting an update or extracting decisions from meeting notes, low on using a tool on a stuck situation between managers."
  },
  "wants": [
    "something short, an hour"
  ],
  "offers": [],
  "productSignals": {
    "wouldPayFor": "Something short, about an hour; paying depends.",
    "quote": "Something short. An hour. Pay? Depends."
  },
  "feedback": {
    "headline": "Thanks Bram: here is what stood out",
    "summary": "You use Copilot where it is already in front of you, in Outlook, and you have a sharp ear for when its version is not yours: half of the works-council mail went, because it sounded like HR. You keep the restructuring plan out of it for a good reason, the names in it.",
    "strengths": [
      "You rewrote half of what Copilot gave you on the works-council mail rather than sending its softer version, and could say why.",
      "You have a clear reason for not putting the restructuring plan into a tool: it names people losing their jobs."
    ],
    "nextSteps": [
      {
        "title": "Let Copilot do the first draft of one weekly update",
        "detail": "Next week, type three bullet points about the restructuring into Copilot and ask for a short update to the steering group, then edit it into your own tone. It worked if the edit took less time than writing from scratch and the update still sounds like you."
      },
      {
        "title": "Read one Teams meeting summary and check it",
        "detail": "After one management team meeting, open the Teams notes and ask Copilot to list only the decisions. Compare with what you remember. It worked if you catch at least one thing it got wrong, or find it got everything right and saved you writing the actions yourself."
      }
    ],
    "closing": "Short answers, clear judgement; thanks for your time."
  },
  "quotes": [
    "Changed about half. Too soft. Sounded like HR.",
    "It's confidential, names of people losing jobs.",
    "One's an email. The other's my job."
  ]
}
```

Engine would compute: level 1 → expected 40 ± 18; mean 55 → **divergence = "aligned"** (3 points from "confident-starter").

## Critique

**(a) Adaptation.** Workable. The short-answer rule ("narrow it or offer a small menu of two or three possibilities; after two very short answers in a row, move to easier, more concrete ground") did exactly what it should: questions 4, 5, 6, 8, 11 are menus or narrowings, and Bram gave his longest answers to them. The register was mirrored (short questions). Where it failed: the prompt's "cover the ground" list (would-pay, could-show-colleague, what-would-you-want) forced three low-yield questions (12, 13, 14) on a member who had nothing to say to them, and question 14 was padding to fill out "roughly 10 to 14". The prompt should let the interviewer go to ratings early when the member is this terse ("usually after 8 to 12 questions" is phrased as a norm, not a floor).

**(b) Concrete episodes.** One real episode (works-council mail), fully specified: tool, what he typed, what came back, what he did, how he judged. That is the prompt working. There was no second episode, because there wasn't one to get. Note that the engine's `minQuestionsBeforeRate: 6` exists but the prompt never tells the model it may rate after six if the material is in.

**(c) Rating items.** All in his work (works council, steering group, Teams notes, department heads), all "can do", graded from his one real episode up to a thinking-partner item he clearly hasn't tried. Every item requires using a tool. These are the best-formed items of the six sims, precisely because the interviewer had a single concrete episode to anchor on. No generic item. Minor: r3 assumes Copilot can act on Teams notes in his tenant, which the interviewer does not know.

**(d) Profile and divergence.** Practice coded 1; "sometimes", one episode, no habits of checking beyond gut. Could be argued as 2 ("regular use for a set of recurring tasks") but "if in doubt go one lower" settles it. Divergence "aligned" is sensible, but it is a near miss: with ratings of 85/60/65/30 (equally plausible for Bram) the mean is 60 and he would be labelled "confident-starter". At level 1 the ±18 band around 40 is tight for items that are deliberately easy.

**(e) Next steps.** Fit his work and tools, doable in two weeks, each with a check. The second next step is a mild stretch of the prompt's "without new tools" rule only if Copilot in Teams is not licensed for him.

**(f) Marker risks.** The forceRate nudge is appended to the member's own user turn ("Gut.\n\n(Instruction from the page: ...)"). A real model occasionally reads that as something the member said and replies "I see you'd like to move on to the ratings". Low impact but visible. Bram's one-word answers raise another risk: a model under pressure to "narrow it" may write two narrowing questions in one message ("Was that this week? And which tool?"), which the prompt forbids but models drift into after several one-word replies.

**(g) Length.** 17 interviewer turns. **The limit bit**: the rating request was forced at turn 15. With a short-answerer the interviewer spends turns narrowing, so the "10 to 14 questions" target and the page's hard stop at 14 collide. Also note architecture.md says 16 while engine.js says 14.
