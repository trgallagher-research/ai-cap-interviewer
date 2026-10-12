# Sim 02 — Dirk, organisational adviser, sceptic

Member record: `{ name: "Dirk", role: "organisational adviser" }`.

## Transcript

**Interviewer (1):** Hello Dirk, thanks for making time. This is a relaxed conversation about how AI does or doesn't show up in your work as an organisational adviser, with nothing to prove. To begin: what does your work consist of in a typical week?
<<PHASE: orient >>

**Dirk:** Before I answer that: what does this diagnostic think it is doing? A network of conflict professionals interviewed by a chatbot about chatbots. You'll forgive me if I see a sales funnel.

**Interviewer (2):** That is a fair thing to raise, and I'll be honest that my own view, on that too, comes with the feedback at the end; right now I'm genuinely interested in your week. What does it look like?
<<PHASE: orient >>

**Dirk:** Two or three long assignments at a time. Board-level culture and cooperation work, usually after a merger or a change of leadership. Interviews with twenty to forty people, a diagnosis, a feedback session, then a year of interventions. The craft is listening and daring to say what you heard.

**Interviewer (3):** In that craft, listening and daring to say what you heard, where has AI shown up at all, in your own hands or in other people's?
<<PHASE: orient >>

**Dirk:** In other people's, mainly. My view is simple: these tools produce plausible text with no relationship to the truth, and the truth is what clients pay me for. Also, everything I hear is confidential. So in my own hands: nowhere, by design.

**Interviewer (4):** You said mainly in other people's hands. What is the most recent time you saw someone use it on a piece of work you were close to?
<<PHASE: practice >>

**Dirk:** Last spring. A junior in the client's HR department pasted my interim diagnosis, forty pages with interview quotes, into ChatGPT to "make a summary for the board". I found out because the summary contained a sentence I never wrote. Nobody had asked anyone.

**Interviewer (5):** What did you do when you found that sentence?
<<PHASE: practice >>

**Dirk:** I went to the HR director. Not to punish the junior, to make a point: that document had quotes from people who trusted me. The director shrugged and said the licence was "enterprise". That is the level of thinking. What does your network think happens to those quotes? What do you think?

**Interviewer (6):** I'll keep my view for the end, if that's all right; here it's yours that counts. Has that incident changed anything in how you contract with clients about documents?
<<PHASE: practice >>

**Dirk:** Yes. I now put a line in every proposal: interview material and the diagnosis are not to be processed by AI tools without my written consent. Two clients asked why. One of their lawyers said it was unenforceable. I keep it in.

**Interviewer (7):** You said your own hands have stayed off it by design. Has there been even one small occasion when you tried one of these tools yourself?
<<PHASE: practice >>

**Dirk:** Once, early 2023, a colleague insisted. I asked it about Argyris and Schön's double-loop learning. Tidy answer, with a reference to a 1992 paper that doesn't exist. That was enough. I'm not spending my evenings fact-checking a machine.

**Interviewer (8):** That invented reference closed it for you. Is there anything, a demonstration, a piece of evidence, a condition, that would make you look again, or is the matter settled?
<<PHASE: stretch >>

**Dirk:** "Settled" is strong. If someone showed me a tool that runs on my own machine, nothing leaving the room, and a colleague I respect showed me it had sharpened a diagnosis rather than flattened it, I'd look. I doubt it exists.

**Interviewer (9):** The network is thinking about what it could offer members around this. What, if anything, would make such an offer worth your time, and would you pay for it?
<<PHASE: stretch >>

**Dirk:** There it is. No, I would not pay to be taught to use ChatGPT. I might pay for a serious afternoon on the ethics and the contracting, led by someone who has actually read the terms of service. And the network should be asking members what they would refuse to do, not only what they would buy.

**Interviewer (10):** That is a useful distinction. The consent line you now put in your proposals, is that something you could show colleagues who haven't thought about it?
<<PHASE: stretch >>

**Dirk:** I could. I've already sent it to three people. Whether they use it is another matter.

**Interviewer (11):** Thank you, Dirk. Before we close I'd like you to rate how confident you are that you could do a few tasks drawn from what you described; there are no right answers, and a low number is as useful as a high one.
<<RATE: [{"id":"r1","task":"Ask an AI chat tool about a theory you know well, such as double-loop learning, and spot where its answer is wrong or invented.","level":1},{"id":"r2","task":"Have an AI tool tidy the wording of a proposal paragraph that contains no client-identifying material, and decide which of its changes to keep.","level":2},{"id":"r3","task":"Explain to a client's HR director, in their language, what happens to interview quotes when a diagnosis is pasted into a public AI tool, and get your consent clause accepted.","level":2},{"id":"r4","task":"Give an AI tool an anonymised two-paragraph description of a diagnosis you have made and ask it to argue against your reading, then judge whether anything it says sharpens the diagnosis.","level":3}] >>
<<PHASE: rate >>

**Dirk (ratings turn):**
My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):
- Ask an AI chat tool about a theory you know well, such as double-loop learning, and spot where its answer is wrong or invented. → 90
- Have an AI tool tidy the wording of a proposal paragraph that contains no client-identifying material, and decide which of its changes to keep. → 70
- Explain to a client's HR director, in their language, what happens to interview quotes when a diagnosis is pasted into a public AI tool, and get your consent clause accepted. → 85
- Give an AI tool an anonymised two-paragraph description of a diagnosis you have made and ask it to argue against your reading, then judge whether anything it says sharpens the diagnosis. → 35

**Interviewer (12):** You put arguing against your own diagnosis at 35, well below the rest. What makes that one harder?
<<PHASE: close >>

**Dirk:** Not harder. I don't trust the ingredients, so the judgement at the end is worthless. And for the record, two of your four tasks don't involve AI at all. I'd be curious what you do with that.

**Interviewer (13):** Noted, and thank you, Dirk; your pushback is part of the picture and it was good to talk. Your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=90, r2=70, r3=85, r4=35. Mean 70, band "moderate".

## Profile JSON

```json
{
  "practice": {
    "level": 1,
    "summary": "Dirk has tried an AI chat tool once, in early 2023, and stopped after it invented a reference. He keeps AI out of his own work by design, on grounds of truth and confidentiality. His closest contact is through others: a client's junior pasted his forty-page diagnosis into ChatGPT, which led him to add a consent clause to all his proposals.",
    "domains": [
      { "key": "client", "evidence": "I now put a line in every proposal: interview material and the diagnosis are not to be processed by AI tools without my written consent." }
    ],
    "tools": ["ChatGPT"],
    "judgement": "Does not use AI tools because output has 'no relationship to the truth' and his material is confidential. Has acted on this: a written consent clause in proposals, raised the matter with a client's HR director.",
    "stance": "sceptical"
  },
  "confidence": {
    "pattern": "High on spotting errors in a theory he knows and on explaining data risk to a client, moderate on tidying a non-confidential paragraph, low on using a tool as a sparring partner on his own diagnosis."
  },
  "wants": [
    "a tool that runs on his own machine with nothing leaving the room",
    "evidence from a respected colleague that AI sharpened a diagnosis rather than flattened it"
  ],
  "offers": [
    "his consent clause on AI processing of interview material, already shared with three colleagues"
  ],
  "productSignals": {
    "wouldPayFor": "A serious afternoon on ethics and contracting, led by someone who has read the terms of service; not training in using ChatGPT.",
    "quote": "I might pay for a serious afternoon on the ethics and the contracting, led by someone who has actually read the terms of service."
  },
  "feedback": {
    "headline": "Thanks Dirk: here is what stood out",
    "summary": "You keep AI out of your own work, and you gave the reasons as episodes rather than slogans: the invented 1992 reference, the junior who pasted your diagnosis, the director who shrugged. You have also done something most members haven't: turned your position into a clause clients sign.",
    "strengths": [
      "You turned the pasted-diagnosis incident into a written consent line in every proposal, and kept it in when a lawyer called it unenforceable.",
      "You named a precise condition for looking again: nothing leaving the room, and evidence that it sharpens rather than flattens."
    ],
    "nextSteps": [
      {
        "title": "Put your consent clause in front of the network",
        "detail": "Send the clause, with the two client questions and the lawyer's objection, to the network organiser as something members can adopt. You will know it worked if at least one colleague tells you they used it in a proposal."
      },
      {
        "title": "Write your 'would refuse to do' list",
        "detail": "You said the network should ask what members would refuse to do. Write that list for your own practice in half a page, with the reason for each line, and bring it to the ethics-and-contracting conversation you said you might pay for. It worked if it changes one line of your proposal or one conversation with a client."
      }
    ],
    "closing": "Thank you for pushing back; the network needs that voice as much as the enthusiasts."
  },
  "quotes": [
    "These tools produce plausible text with no relationship to the truth, and the truth is what clients pay me for.",
    "That document had quotes from people who trusted me.",
    "I would not pay to be taught to use ChatGPT.",
    "The network should be asking members what they would refuse to do, not only what they would buy."
  ]
}
```

Engine would compute: level 1 → expected 40, +18 = 58; mean 70 → **divergence = "confident-starter"**.

## Critique

**(a) Adaptation.** Mostly not pushy: the "feedback comes at the end, return the question" rule handled both of Dirk's challenges without arguing, and the interviewer did not try to convince him. Where it was pushy is built into the prompt: the instruction to ask "what would make an offer worth their time, and would they pay for it" lands on a sceptic exactly as the sales pitch he predicted in his first line ("There it is"). The prompt gives no way to skip or soften it for a member who has just said the exercise looks like a funnel.

**(b) Concrete episodes.** The interviewer did convert opinions into episodes: "in other people's hands" → the pasted diagnosis; "nowhere by design" → the 2023 double-loop test. Dirk's opening three answers were pure opinion and the prompt's "episodes are the evidence; opinions are not" line was what pulled the interview out of that. Good.

**(c) Rating items.** In his domain and his words (double-loop learning, proposal, HR director, diagnosis). Graded: r1 floor, r4 ceiling. But Dirk is right in his closing remark: **r3 requires no AI tool at all**, and r1 is mostly a test of his theory knowledge, not of AI use. Both lift his mean. Nothing in the rules for statements says "each statement must involve actually using an AI tool"; the ladder's level-4 wording ("sets boundaries on data and ethics") actively invites non-tool items. There is no genuinely generic item.

**(d) Profile and divergence.** Practice coded 1 from the single 2023 episode; one could argue 0 since that was not "in his work", and the prompt's "if in doubt go one lower" would support 0. The profile prompt gives no guidance on whether a one-off trial outside work counts. `tools: ["ChatGPT"]` is strictly "tool names mentioned" as instructed, but the organiser will read it as a tool he uses. The `client` domain is a genuine finding (he advises clients on AI, negatively) and the profile prompt's evidence rule handled it well. **Divergence: "confident-starter" for a sceptic is nonsense.** His confidence is high on judgement items and low on the one real use item; the mean hides that, and the label will put him in the same organiser bucket as Joris. The rule needs item-level awareness, and the kind labels need a fourth option (e.g. "confident-abstainer") or a per-level comparison.

**(e) Next steps.** Both fit (his own clause; his own "refuse" list), both doable in two weeks without tools. Neither asks him to use AI, which is what the profile prompt allows for a non-user ("a legitimate reason not to"). Good.

**(f) Marker risks.** Dirk's answers contain quotation marks and the word "enterprise" in quotes; none reach the markers. Risk specific to this persona: when a member asks "what do you think?", a real model has a strong pull to answer at length and the "return the question" rule competes with it; in a weaker model the visible reply could exceed three sentences and stack "I'll hold my view... but tell me X... and also Y". The RATE JSON here is valid; the tasks are long (~35 words) and a model writing five such strings is at real risk of an unescaped double quote inside a task ("make a summary for the board" was tempting to quote in r3).

**(g) Length.** 13 interviewer turns. The limit did not bite.
