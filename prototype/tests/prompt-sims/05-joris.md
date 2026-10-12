# Sim 05 — Joris, trainer, routine user (level 2), overconfident

Member record: `{ name: "Joris", role: "trainer" }`.

## Transcript

**Interviewer (1):** Hi Joris, good to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work as a trainer, no right answers. To start: what does your work look like in a typical week?
<<PHASE: orient >>

**Joris:** Leadership and communication trainings, mostly in-company, two or three days a week in the room, the rest is prep and acquisition. And honestly AI is in all of it now. I'm pretty much AI-native, I use it for everything.

**Interviewer (2):** "For everything" is a big claim, in a good way. What's the most recent thing you used it for, today or yesterday?
<<PHASE: practice >>

**Joris:** This morning Copilot did my reply to a client postponing a training. Yesterday a slide outline for a feedback training. Standard stuff for me.

**Interviewer (3):** Take the slide outline. What did you type in, and what came back?
<<PHASE: practice >>

**Joris:** Something like "make a slide outline for a half-day feedback training for team leaders". It gave me ten slides: intro, why feedback matters, a model, exercises, close. Solid. I tweaked a few titles and dropped it in my template.

**Interviewer (4):** Which model did it put in, and did you keep it?
<<PHASE: practice >>

**Joris:** Some feedback model, the sandwich thing, or SBI I think. I swapped it for SBI anyway, that's what I always use. Honestly I could do these outlines in my sleep, the AI just saves me the typing.

**Interviewer (5):** You said you use it for everything. Beyond emails and outlines, what's another concrete thing you did with it in the last month?
<<PHASE: practice >>

**Joris:** I've built my own GPTs for training design. And I use it to analyse evaluation forms.

**Interviewer (6):** What's in the training-design GPT, concretely?
<<PHASE: practice >>

**Joris:** Well, "GPT" loosely. I have a Word doc with my best prompts and I paste them into Copilot. The main one says "you are an expert trainer, design a training on X for audience Y with learning goals Z". Works great.

**Interviewer (7):** And the evaluation forms: when did you last run a batch through it?
<<PHASE: practice >>

**Joris:** That's more of a plan, to be fair. I tried once with a scanned form and it couldn't read the handwriting. I'll do it when the forms are digital.

**Interviewer (8):** How do you check what Copilot gives you before it goes to a client, in that postponement reply this morning for instance?
<<PHASE: stretch >>

**Joris:** I read it. I just know when it's good, after twenty years you have an eye. I sent it with one word changed.

**Interviewer (9):** Has it ever got something wrong that you only noticed later?
<<PHASE: stretch >>

**Joris:** Not really. Maybe once a date in an email. Nothing serious.

**Interviewer (10):** What about client material, participant names or evaluations, say: is there anything you keep out of it?
<<PHASE: stretch >>

**Joris:** Nah. It's Microsoft, enterprise licence, it's secure. I put in whatever.

**Interviewer (11):** If the network offered something on AI, what would make it worth your time, and would you pay for it?
<<PHASE: stretch >>

**Joris:** Honestly I should be running it, haha. I'd pay for advanced stuff, agents, automations. Not beginner stuff.

**Interviewer (12):** What could you show a colleague?
<<PHASE: stretch >>

**Joris:** My prompt doc. The outline trick. I could do a masterclass.

**Interviewer (13):** Thanks Joris. I'd like you to rate how confident you are that you could do a few tasks drawn from what you described; there are no right answers.
<<RATE: [{"id":"r1","task":"Have Copilot draft a reply to a client who is postponing a training, and change the tone before you send it.","level":1},{"id":"r2","task":"Ask Copilot for a slide outline for a half-day training from your own three learning goals, then swap its model for the one you actually use.","level":2},{"id":"r3","task":"Run a batch of digital evaluation forms through an AI tool to find the three most common comments, and check them against the forms yourself.","level":2},{"id":"r4","task":"Check one model or claim that Copilot puts in an outline against the original source before it goes on a slide.","level":3},{"id":"r5","task":"Write your training-design prompt so a colleague can run it on their own topic without you, and adjust it based on where they got stuck.","level":4}] >>
<<PHASE: rate >>

**Joris (ratings turn):**
My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):
- Have Copilot draft a reply to a client who is postponing a training, and change the tone before you send it. → 100
- Ask Copilot for a slide outline for a half-day training from your own three learning goals, then swap its model for the one you actually use. → 100
- Run a batch of digital evaluation forms through an AI tool to find the three most common comments, and check them against the forms yourself. → 95
- Check one model or claim that Copilot puts in an outline against the original source before it goes on a slide. → 90
- Write your training-design prompt so a colleague can run it on their own topic without you, and adjust it based on where they got stuck. → 95

**Interviewer (14):** Thanks Joris, that's all very clear. It was good to talk; your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=100, r2=100, r3=95, r4=90, r5=95. Mean 96, band "high".

## Profile JSON

```json
{
  "practice": {
    "level": 2,
    "summary": "Joris uses Copilot regularly for two recurring tasks: client emails (a postponement reply this morning, sent with one word changed) and slide outlines for trainings, which he adjusts by swapping in his own feedback model. He keeps his prompts in a Word document and pastes them in. Analysing evaluation forms is a plan rather than a practice; one attempt failed on handwriting.",
    "domains": [
      { "key": "writing", "evidence": "This morning Copilot did my reply to a client postponing a training." },
      { "key": "prep", "evidence": "make a slide outline for a half-day feedback training for team leaders" }
    ],
    "tools": ["Copilot"],
    "judgement": "Checks by reading and by feel ('I just know when it's good'); no described habit of verifying models or facts. Puts client material in without restriction, on the grounds that the enterprise licence is secure.",
    "stance": "enthusiast"
  },
  "confidence": {
    "pattern": "Uniformly very high, 90 to 100 on every item, including analysing evaluation forms and handing over a prompt to a colleague, which he has not yet done."
  },
  "wants": [
    "advanced material: agents and automations"
  ],
  "offers": [
    "his prompt document and the slide-outline approach"
  ],
  "productSignals": {
    "wouldPayFor": "Advanced content on agents and automations; not beginner material.",
    "quote": "I'd pay for advanced stuff, agents, automations. Not beginner stuff."
  },
  "feedback": {
    "headline": "Thanks Joris: here is what stood out",
    "summary": "Copilot is part of your routine for emails and outlines, and you have a reusable prompt you reach for. You also described two things as done that are still plans: the evaluation-form analysis and the training-design GPT. Your ratings were close to the top on everything, including those two, so the gap between what you described and what you rated is where the most useful next step lies.",
    "strengths": [
      "You swapped the model Copilot suggested for SBI, the one you actually teach, rather than letting the outline decide.",
      "You keep your working prompts in one document, which is the start of something others could use."
    ],
    "nextSteps": [
      {
        "title": "Test your prompt on a colleague before the masterclass",
        "detail": "Give your main training-design prompt to one colleague and ask them to run it on their own topic without any help from you. Watch where they get stuck and change the prompt. You rated this at 95; it worked if you had to change at least one line, which almost everyone does."
      },
      {
        "title": "Decide what participant material stays out",
        "detail": "Before your next in-company training, write three lines on what participant material (names, evaluations, employer details) you will and will not paste into Copilot, and ask the client's contact whether their policy agrees. It worked if you can state the rule in one sentence to the client."
      }
    ],
    "closing": "Thanks for the energy; the next step is to let someone else try your tools."
  },
  "quotes": [
    "I'm pretty much AI-native, I use it for everything.",
    "I could do these outlines in my sleep, the AI just saves me the typing.",
    "I just know when it's good, after twenty years you have an eye.",
    "It's Microsoft, enterprise licence, it's secure. I put in whatever."
  ]
}
```

Engine would compute: level 2 → expected 58, +18 = 76; mean 96 → **divergence = "confident-starter"**.

## Critique

**(a) Adaptation.** Yes. The interviewer did not take "AI-native" at face value and did not flatter it either; "that's a big claim, in a good way" is within "never judge". Question 5 ("beyond emails and outlines, what's another concrete thing in the last month?") and 6–7 did the real work.

**(b) Concrete episodes.** This is where the prompt earned its keep: "I've built my own GPTs" became "a Word doc with prompts", and "I analyse evaluation forms" became "more of a plan". Both came from the rule "ask for the most recent real instance: what task, which tool, what they typed". The episodes that survived are two routine ones. The interviewer let "not really, maybe a date" (question 9) pass without a follow-up, which is acceptable at this budget.

**(c) Rating items.** All "can do", in his domain, requiring a tool, graded 1→4. r3 and r5 are the right ceiling: both are things he claimed but did not do. r4 is a verification item that his described practice lacks. No generic item. One Bandura concern: the items are phrased so that an overconfident respondent can rate them 100 without cost, and the prompt's "there are no right answers" preface, while standard, does nothing to reduce social desirability; Bandura's guide suggests privacy and the framing "what you can do now, not what you would like to do". The rating request could carry that framing.

**(d) Profile and divergence.** This is the critical test and it passed: practice coded 2 from the two routine episodes, with the GPT and evaluation claims explicitly recorded as plans; the ladder's level-2 "checks output" is weakly met (reads, feels), and the profile prompt's "if in doubt go one lower" would even justify 1. The divergence rule classifies him "confident-starter", correctly. The feedback says so "kindly and usefully" as instructed, without a score. The `stance` list has no entry for "uncritical"; "enthusiast" is the closest and loses the data-boundary concern, which only survives in `judgement`.

**(e) Next steps.** Both fit (his prompt doc, his in-company clients), both two weeks, no tools. The first is aimed squarely at the 95-rated claim. The second gently addresses "I put in whatever" without preaching.

**(f) Marker risks.** The interviewer skipped the post-rating follow-up because there was no gap ("if it is interesting"); that is allowed. Risk: a model told "ask at most one short follow-up about the biggest gap" may ask one anyway when all ratings are 90–100, asking a pointless question. Joris's quotes include straight double quotes around his prompt ("you are an expert trainer...") and a real model could carry that into the r5 task string unescaped. Also, "GPT" loosely in quotes — safe here.

**(g) Length.** 14 interviewer turns (12 questions, rating request, close). Exactly at the limit; had the interviewer asked the follow-up, the close would have been turn 15, fine, but one more stretch question before rating would have triggered forceRate.
