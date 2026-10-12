# Hybrid sim 05 — Joris, trainer, routine user, overconfident

Member: `{ name: "Joris", role: "trainer" }`

## Questionnaire (overclaims)

```json
{ "frequency": "daily", "uses": ["writing", "prep", "analysis", "building", "client", "learning"], "tools": ["Microsoft Copilot", "ChatGPT"], "stance": "enthusiast", "offer": ["demos", "prompt-library"], "offerOther": "advanced: agents and automations", "pay": "yes", "canShow": "yes" }
```
~13 taps, 4 typed words.

## Transcript

**Interviewer (1):** Hi Joris, good to meet you; I'd like to hear about a few real examples behind your answers. Preparing trainings looks central for you: what's the most recent thing you prepared with AI?
<<PHASE: practice >>

**Joris:** Yesterday, a slide outline for a half-day feedback training for team leaders. Honestly AI is in everything I do, I'm pretty much AI-native. This morning Copilot also did my reply to a client postponing a training.

**Interviewer (2):** Take the slide outline: what did you type in, and what came back?
<<PHASE: practice >>

**Joris:** Something like "make a slide outline for a half-day feedback training for team leaders". Ten slides: intro, why feedback matters, a model, exercises, close. It put in some model, the sandwich I think; I swapped it for SBI, which is what I always use. I could do these in my sleep, it just saves typing.

**Interviewer (3):** You ticked building tools or prompts. What's the most recent thing you built?
<<PHASE: practice >>

**Joris:** My own GPTs for training design.

**Interviewer (4):** What's in one of them, concretely?
<<PHASE: stretch >>

**Joris:** Well, "GPT" loosely. A Word doc with my best prompts that I paste into Copilot. The main one is "you are an expert trainer, design a training on X for audience Y with learning goals Z". Works great.

**Interviewer (5):** How do you check what Copilot gives you before it goes to a client, that postponement reply this morning for instance?
<<PHASE: stretch >>

**Joris:** I read it. After twenty years you have an eye. I sent it with one word changed.

**Interviewer (6):** And client material, participant names or evaluations: is there anything you keep out of it?
<<CHIPS: ["Names and personal data", "Evaluations", "Nothing, it's secure"] >>
<<PHASE: rate >>

**Joris:** Nothing, it's secure *(tapped chip)*

**Interviewer (7):** Thanks Joris. I'd like you to rate how confident you are that you could do a few tasks today, drawn from what you described; rate what you can do now, not what you'd like to.
<<RATE: [{"id":"r1","task":"Have Copilot draft a reply to a client postponing a training, and adjust the tone before you send it.","level":1},{"id":"r2","task":"Ask Copilot for a slide outline from your own three learning goals, then replace its model with the one you actually teach.","level":2},{"id":"r3","task":"Check a model or claim that Copilot puts into an outline against the original source before it goes on a slide.","level":3},{"id":"r4","task":"Rewrite your training-design prompt so a colleague can run it on their own topic without you, and revise it from where they got stuck.","level":4}] >>
<<PHASE: rate >>

**Joris (ratings turn):** r1 → 100 · r2 → 100 · r3 → 90 · r4 → 95

**Interviewer (8):** Thanks Joris, that's clear. Your feedback is being prepared now.
<<PHASE: close >>
<<COMPLETE>>

## Profile JSON

```json
{
  "practice": {
    "level": 2,
    "summary": "Joris uses Copilot regularly for client emails and training outlines, adjusting outlines by swapping in the model he teaches. What he calls his own GPTs is a Word document of prompts he pastes into Copilot.",
    "domains": [
      { "key": "prep", "evidence": "a slide outline for a half-day feedback training for team leaders" },
      { "key": "writing", "evidence": "This morning Copilot also did my reply to a client postponing a training." }
    ],
    "tools": ["Copilot"],
    "judgement": "Checks by reading and experience ('after twenty years you have an eye'); no habit of verifying sources. Puts client material in without restriction because he regards the licence as secure.",
    "stance": "enthusiast"
  },
  "confidence": { "pattern": "Uniformly very high, 90 to 100, including verifying sources and handing a prompt to a colleague, neither of which he described doing." },
  "wants": [],
  "offers": ["his document of training-design prompts"],
  "productSignals": { "quote": "" },
  "feedback": {
    "headline": "Thanks Joris: here is what stood out",
    "summary": "Copilot is part of your routine for emails and outlines, and you keep a reusable prompt. Your ratings were near the top on everything, including checking sources and handing your prompt to a colleague, which you haven't described doing yet; that gap is where your most useful next step lies.",
    "strengths": [
      "You replaced the model Copilot suggested with SBI, the one you actually teach.",
      "You keep your working prompts in one document, the start of something others could use."
    ],
    "nextSteps": [
      {
        "title": "Test your prompt on a colleague",
        "detail": "Give your main training-design prompt to one colleague to run on their own topic without your help, and note where they get stuck. It worked if you change at least one line."
      },
      {
        "title": "Decide what participant material stays out",
        "detail": "Before your next in-company training, write three lines on which participant material you will not paste into Copilot, and check them with the client's contact. It worked if you can state the rule in one sentence."
      }
    ],
    "closing": "Thanks for the energy; next, let someone else try your tools."
  },
  "quotes": ["I'm pretty much AI-native.", "I could do these in my sleep, it just saves typing.", "After twenty years you have an eye."]
}
```
`analysis`, `client`, `learning` ticked, never probed → counted in `claimedNoEpisode`. `building` was probed and deflated (Word doc of prompts) → also counted. The stat cannot tell the two cases apart. Stored `stance` = "enthusiast" (his answer).

`Engine.divergenceFor(2, items, ratings)` → **confident-starter** (expected 60, residual +36).

## Critique

**(a) Adaptation.** Good: did not challenge "AI-native", went to episodes.

**(b) Episodes.** Two concrete (outline; postponement email) plus one deflated claim (GPTs → Word doc). Enough for level 2.

**(c) Rating items.** Tool-based, his material, graded 1→4. Good. The old r3 (evaluation forms) is gone because analysis was never probed: the item set no longer tests his biggest overclaim.

**(d) Profile/divergence.** Level 2 from episodes, not from the six ticks or "AI-native": the critical test passes. Confident-starter: correct.

**(e) Next steps.** Fit, doable, checked.

**(f) Markers.** Q6 chips include "Nothing, it's secure": a chip that puts words in his mouth (he did tap it, in persona, but it supplied the justification). Rating and close: no chips. Q2 asks "what did you type in, and what came back?" — technically stacked, inherited from the prompt's own episode wording; models do this consistently.

**(g) Length.** 8 interviewer turns.

**(h) Questionnaire use.** Caught one overclaim (building). **Missed two** (analysis, client): the prompt says "ask for one more episode, ideally in a different area they ticked", so with six ticks the model probes one; nothing tells it to aim the second episode at the claim that looks least supported. In the old sim, the evaluation-forms "plan" was the clearest overclaim found; here it never surfaces.

**(i) Chips.** One set, on a sensitive question, slightly leading. Acceptable but see report.

**(j) Typing load.** 152 typed member words plus 1 tap vs 298; 8 interviewer turns vs 14.

**(k) Cost.** Level and divergence still right; but the profile cannot say that his analysis claim is a plan, and the organiser stat lumps his unverified ticks with Marieke's unprobed ones.
