# Sim 01 — Hanneke, independent mediator in labour disputes, 58, complete beginner (level 0)

Member record: `{ name: "Hanneke", role: "independent mediator in labour disputes" }`.
Interviewer executes `buildInterviewSystem(member)` literally. Markers shown verbatim (the page hides them).

## Transcript

**Interviewer (1):** Hello Hanneke, good to meet you. This is a relaxed conversation about how AI does or doesn't show up in your work as a mediator in labour disputes, with no right answers. To start: what does a typical working week look like for you?
<<PHASE: orient >>

**Hanneke:** Mostly cases. Two or three active mediations at a time, usually an employee against an employer, often with lawyers in the background. So intake calls, joint sessions, a lot of email, and writing the settlement agreement at the end. Some travel. And invoicing, which I hate.

**Interviewer (2):** That is a full week. Where, if anywhere, have AI tools like ChatGPT come into any of that so far, even at the edges?
<<PHASE: orient >>

**Hanneke:** Honestly, nowhere. I have never opened ChatGPT. I see it mentioned a lot and my daughter uses it for her studies. In my work it hasn't come up, except that I suspect one of the lawyers writes his letters with it, they have become very smooth.

**Interviewer (3):** What made you suspect that about the lawyer's letters?
<<PHASE: practice >>

**Hanneke:** The tone. Very polished, very long, and somehow empty. Bullet points everywhere. His letters used to be shorter and more personal. I didn't do anything with it, that's his business. But I noticed the employee on the other side felt steamrollered by it.

**Interviewer (4):** So the employee felt steamrollered by that polished letter. Has anyone, a client, a lawyer or a colleague, ever asked whether you use AI, or suggested you should?
<<PHASE: practice >>

**Hanneke:** A colleague in our intervisie group said she uses it to write her reports faster. I asked how; she said she puts in her notes and it makes a draft. I thought: and the names? She said she takes them out. I wasn't convinced.

**Interviewer (5):** What is it about taking the names out that didn't convince you?
<<PHASE: practice >>

**Hanneke:** In a labour dispute the story itself identifies people. A 54-year-old team leader at a regional hospital who clashed with the new director after the merger, you don't need the name. My whole profession rests on confidentiality, I signed up to the MfN rules. I wouldn't know where those notes go.

**Interviewer (6):** That is a very clear line. Setting confidentiality aside for a moment: is there a part of your week, the invoicing, the emails, the settlement texts, where you have thought "I wish something could do this for me"?
<<PHASE: practice >>

**Hanneke:** The settlement agreements, maybe. Not the content, that has to be exact, but the standard parts. I copy from old ones and change the details, and I always worry I've left in a sentence from the previous case. And the invoicing, but that's bookkeeping.

**Interviewer (7):** You said you have never opened ChatGPT. What has stopped you, so far, from trying it even once on something harmless?
<<PHASE: stretch >>

**Hanneke:** Partly time, partly that I wouldn't know what to type. And a little the feeling that I'm 58 and this is for my daughter's generation. Though I am curious. I'd like someone to sit next to me the first time.

**Interviewer (8):** What would you need to see, from a colleague or from the network, to feel it was worth trying?
<<PHASE: stretch >>

**Hanneke:** I'd want a mediator I respect to show me exactly what she does, on a real-looking example, and tell me honestly where it was wrong. Not a sales talk. And I'd want to know clearly what is safe to put in and what isn't.

**Interviewer (9):** If the network offered exactly that, a colleague showing their real way of working, would you pay for it, and what would make it worth the money?
<<PHASE: stretch >>

**Hanneke:** A half day with a small group, yes, I'd pay what I pay for a normal training day, a couple of hundred euros. Not for an online course.

**Interviewer (10):** Turning it around: is there anything in how you handle your notes or confidentiality that a colleague who is starting with these tools could learn from you?
<<PHASE: stretch >>

**Hanneke:** Perhaps the discipline about what you write down at all. I keep my notes very sparse on purpose. Younger colleagues record everything.

**Interviewer (11):** Thank you, Hanneke, that gives me a clear picture. I'd like you to rate how confident you are that you could do a few small tasks drawn from what you described; there are no right answers, and "not at all" is a perfectly fine answer.
<<RATE: [{"id":"r1","task":"Open a free AI chat tool such as ChatGPT and ask it to summarise a one-page article about mediation, then check the summary against the original.","level":1},{"id":"r2","task":"Ask an AI chat tool to explain a term from employment law you meet in a case, such as 'transitievergoeding', and judge whether the explanation matches what you know.","level":1},{"id":"r3","task":"Paste the standard clauses of one of your settlement agreement templates, with every case detail removed, into an AI tool and ask it to point out any sentence that does not belong, then decide what to change.","level":2},{"id":"r4","task":"Write down for yourself which parts of a case you would never put into an AI tool, and explain that rule to your intervisie colleague who uses it for her reports.","level":2}] >>
<<PHASE: rate >>

**Hanneke (ratings turn, formatted by the page):**
My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):
- Open a free AI chat tool such as ChatGPT and ask it to summarise a one-page article about mediation, then check the summary against the original. → 60
- Ask an AI chat tool to explain a term from employment law you meet in a case, such as 'transitievergoeding', and judge whether the explanation matches what you know. → 65
- Paste the standard clauses of one of your settlement agreement templates, with every case detail removed, into an AI tool and ask it to point out any sentence that does not belong, then decide what to change. → 35
- Write down for yourself which parts of a case you would never put into an AI tool, and explain that rule to your intervisie colleague who uses it for her reports. → 90

**Interviewer (12):** You put the rule about what never goes in at 90 and the settlement template at 35. What makes the template one feel so much harder?
<<PHASE: close >>

**Hanneke:** Because I wouldn't know whether what it says is sensible, and there'd be no one to ask. The rule I could write today.

**Interviewer (13):** That makes sense, and thank you, Hanneke; this was a pleasure. Your personal feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Ratings
r1=60, r2=65, r3=35, r4=90. Mean 62.5, band "moderate".

## Profile JSON (output of buildProfilePrompt, as the model would write it)

```json
{
  "practice": {
    "level": 0,
    "summary": "Hanneke has never opened an AI tool. She has seen it indirectly: a lawyer whose letters became polished and empty, and an intervisie colleague who drafts reports from anonymised notes, which did not convince her. She is curious but wants someone beside her the first time.",
    "domains": [],
    "tools": [],
    "judgement": "Clear confidentiality reasoning: in a labour dispute the story identifies people even without names, and she keeps her own notes sparse by design. She would want to know what is safe to put in before trying anything.",
    "stance": "cautious"
  },
  "confidence": {
    "pattern": "Moderate on first steps such as asking a chat tool for a summary or an explanation, high on writing her own data rule, low on using it on a settlement template."
  },
  "wants": [
    "see a respected mediator show her real use on a real-looking example, including where it went wrong",
    "know clearly what is safe to put in and what is not",
    "someone to sit next to her the first time"
  ],
  "offers": [
    "the discipline of writing very little down in the first place"
  ],
  "productSignals": {
    "wouldPayFor": "A half day in a small group with a respected mediator showing real use; a couple of hundred euros; not an online course.",
    "quote": "I'd want a mediator I respect to show me exactly what she does, on a real-looking example, and tell me honestly where it was wrong."
  },
  "feedback": {
    "headline": "Thanks Hanneke: here is what stood out",
    "summary": "You haven't used AI tools, and you were clear and specific about why: in your cases the story itself identifies people, and you would not know where notes go. That precision is a strength, not a gap. You are also curious, and you named exactly what would help: a colleague showing real work, beside you.",
    "strengths": [
      "You spotted from tone alone that a lawyer's letters had changed, and noticed what that did to the employee on the other side.",
      "Your line on confidentiality is more precise than 'take the names out': you know the story identifies people."
    ],
    "nextSteps": [
      {
        "title": "Try one harmless summary with your daughter beside you",
        "detail": "Pick a public article about mediation, open a free chat tool with your daughter, and ask it to summarise the article. Compare the summary with the original and note one thing it got right and one thing it missed or flattened. You will know it worked if you can say, in your own words, what the tool is and isn't good at."
      },
      {
        "title": "Write your 'never goes in' rule and bring it to intervisie",
        "detail": "You rated yourself highly on this and you can do it today. Write five lines on what from a case never goes into an AI tool and why. Share it with the colleague who drafts reports from her notes. It worked if the conversation moves beyond 'I take the names out'."
      }
    ],
    "closing": "Thank you for being so open about what stops you; that is exactly what the network needs to hear."
  },
  "quotes": [
    "I have never opened ChatGPT.",
    "In a labour dispute the story itself identifies people.",
    "I'd like someone to sit next to me the first time.",
    "I keep my notes very sparse on purpose."
  ]
}
```

Engine would compute: level 0 → expected 20, tolerance ±18, mean 62.5 → **divergence = "confident-starter"**.

## Critique

**(a) Adaptation.** Comfortable, yes. The prompt's non-user rule ("treat that as the subject... never try to convince them... do not ask a non-user to describe things they have not done") held: nothing was pushed, and the interviewer never asked her to imagine using a tool. Two awkward spots the prompt causes: question 9 is a double question ("would you pay for it, and what would make it worth the money?") because the instruction itself is written as a stacked question; and question 10 ("what could you show a colleague") is an odd thing to ask someone who has never used a tool — the interviewer had to bend it to "notes and confidentiality" to make it work. The prompt says "Also ask what they could show a colleague, if anything" without a non-user exception.

**(b) Concrete episodes.** Yes, within the limits of a non-user: the lawyer's letters, the intervisie colleague's drafting, the settlement-template copy-paste worry are all specific. The interviewer followed "ask for the most recent real instance" on each. One generality accepted: "partly time, partly I wouldn't know what to type" was not probed further (fine at this length).

**(c) Rating items.** All four are "can do", in her domain, use her words (settlement clauses, intervisie colleague, transitievergoeding). r1 is a near-copy of the prompt's own example and borders on generic ("a one-page article about mediation"); a real model will reproduce the example verbatim for most non-users, so every beginner in the network will get the same floor item. Grading: r1/r2 are a floor, r3 is a plausible ceiling for her. **r4 is not an AI task at all** — writing a data rule and explaining it is something she can do without any tool, and she rated it 90 for that reason. The prompt's ladder puts "sets boundaries on data" at level 4, so the model labelled a no-tool task "level 2"; nothing in the prompt says "every item must require using an AI tool". Bandura: items should be graded within the same activity domain so the scale measures one capability; r4 measures a different thing and lifts the mean.

**(d) Profile and divergence.** Practice coded 0 from episodes, correctly; `domains` is empty because the profile prompt only allows domains with evidence of use, so the organiser heatmap shows a blank row for her even though she talked at length about writing (settlement agreements) — the prompt could allow a "considered" domain or the organiser loses that signal. **The divergence rule misfires:** a never-user who honestly says she could probably open a tool and ask for a summary (60) and could definitely write her own data rule (90) gets labelled "confident-starter", the same label as Joris. Level-0 expected mean 20 ± 18 means any non-user rating above 38 on *first-step* items is flagged as overconfident, which contradicts the prompt's own instruction to give non-users easy first-step items. The rule ignores item level entirely.

**(e) Next steps.** Fit her work (public article; her own rule; her intervisie group), no tools or budget, two weeks, each has a "how you'll know". Good. The "with your daughter" detail comes from the transcript, not invented.

**(f) Marker risks.** The RATE JSON contains `'transitievergoeding'` in single quotes, safe. A real model is likely to write `"…"`-style curly quotes inside tasks (safe) but may also produce a trailing comma after the last object (JSON.parse fails → `parseRate` returns null → one retry). The rating request ends with `<<PHASE: rate >>` per the forceRate nudge, but the system block says the phase marker names the phase of the *next* question — a model following the system block literally would write `<<PHASE: close >>` on the rating request, and then the engine's retry (which only triggers when `phase === "rate"`) would not fire if the JSON were invalid. Ambiguity to fix.

**(g) Length.** 13 interviewer turns (10 questions + rating request + 1 follow-up + close). The limit of 14 did not bite but was two turns away; a slightly chattier beginner would have pushed the rating request onto the forced turn.
