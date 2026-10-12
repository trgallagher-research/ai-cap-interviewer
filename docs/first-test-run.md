# First test run — 2026-06-17

The first full, live end-to-end run of **Aligned Interviewer**, conducted as a real
interview (not a scripted test). Respondent details are anonymized; the raw
transcript is kept locally and gitignored.

## Setup

| | |
| --- | --- |
| **Topic** | How educators and staff experience AI in their work |
| **Respondent** | A senior specialist in a long-horizon (10–20 year) educational innovation role (anonymized) |
| **Stages** | Plan → Interview → Synthesize, all live in production on Vercel |
| **Models** | Sonnet 4.6 (interview turns), Opus 4.8 (plan + synthesis) |
| **Length** | 41 turns (~20 question/answer exchanges) |

## What it demonstrated

It conducted a genuine semi-structured interview rather than walking a script:

- **Adaptive probing** — picked up the respondent's own phrases ("thinking
  partner", "no ego, shame, or risk", "jagged frontier") and pushed on them.
- **Followed emergent threads** rather than marching through the guide, while
  still covering every objective.
- **Drew out reflection** — when the respondent made a strong claim, it gently
  asked them to examine it, prompting an unguarded "*do i really do that?*"
  moment.
- **Stayed neutral and warm** — no leading, no advice, mirrored the respondent's
  register.
- **Live coverage tracking** — all seven guide objectives were addressed and shown
  ticking off during the conversation.
- **Structured synthesis** at the end — emergent themes, verbatim quotes, and
  objective-by-objective coverage.

## Sample exchanges (anonymized)

> **Interviewer:** So there's something about that availability and patience that's
> valuable — it's always there, never bored. When you compare that to talking
> through ideas with a colleague, what's different about the two experiences for
> you?
>
> **Respondent:** they are very different. they do not do the same thing… with
> chatting to an ai, there is no ego or shame or concern or even risk with
> chatting… it is really about testing my ideas in a more open setting

> **Interviewer:** That's a striking thing to say — living on the frontier as an
> advantage. I want to make sure I understand that. Can you say more about what
> you mean by that?
>
> **Respondent:** i am more than happy to push the abilities of the models. if they
> fail, fine. i retreat a bit. but i find new things to do often… but just writing
> it out make me reflect. do i really do that? perhaps that is what i want to
> htink i can do

---

## Synthesis output

### Emergent themes

1. **AI as a pervasive, integrated tool across the work** *(central, raised
   throughout)* — AI touches every part of the role: literature search, thinking
   partnership, drafting. Not a discrete occasional tool; editing AI output is
   simply "baked into" the process.
2. **AI as a low-risk thinking partner offering psychological safety** *(central,
   richly elaborated)* — an always-available, patient interlocutor with no ego,
   shame, concern, or risk. This frees the respondent to test fleeting, half-formed
   ideas — often via voice mode while driving — in a way that differs fundamentally
   from talking with colleagues, who serve a different purpose around political
   nuance and how ideas land.
3. **Intellectual ownership and social/political risk as reasons to stay
   hands-on** *(raised across two exchanges)* — deliberate editing of AI writing
   for two reasons: needing to truly know and defend what they produce, and the
   reputational risk of being seen to send fully AI-generated text.
4. **Living on the "jagged frontier" of capability as competitive advantage**
   *(prominent, with notable self-reflection)* — trusts AI directionally but not on
   hard data; frames comfort with shifting, blurry limits as an advantage, while
   candidly questioning whether that self-image is fully accurate.
5. **Deep existential worry about AI's trajectory** *(central to the future-facing
   portion)* — a wide "p=doom" band makes long-horizon hope hard. Worries centre on
   fast-takeoff scenarios, mass unemployment, and family's future; hopes were
   excellent tutors and improved educational science.
6. **Dismay at the field's and society's lack of awareness** *(raised at the close,
   escalating)* — frustration that awareness of the pace and risks of AI lags,
   ultimately reframing the stakes from the profession to society as a whole.

### Illustrative quotes (identifiers redacted)

- "i use ai a lot to help me find literature, as a tinking partner and also to
  help me write drafts. i always edit ai writing as i am not quite comfrotable yet
  letting it write things entirely on my behalf" — *theme 1*
- "but it is really touching each part of my role" — *theme 1*
- "i often using voice mode where i just chat to it to see what i can learn about a
  new topic, often when driving to work. and then i bounce my own ideas off it" —
  *theme 2*
- "with chatting to an ai, there is no ego or shame or concern or even risk with
  chatting" — *theme 2*
- "with a colleague, i am trying to gauge how it might land politically… it is
  really for a different purpose." — *theme 2*
- "i need to be able to understand what i have written, back it up, argue for it,
  know it. and if ai writes it all that is less likely that i am able to do that" —
  *theme 3*
- "the other part is ego and risk gets in the way o fme sending off 100% ai text
  because of what the reader will assume if they spot it" — *theme 3*
- "i trust it a lot from the directional sense but the hard data less so. the
  limits are blurry… i dont know where that jaggard frontier sits and it is always
  chaning" — *theme 4*
- "ive found a way to work with it. that is what gives me an advantage over others.
  i live on the frontier with regards to knoweldge work" — *theme 4*
- "just writing it out make me reflect. do i really do that? perhaps that is what i
  want to htink i can do" — *theme 4*
- "i have a p=doom sitting between 10% and 90% so it is tough to think about hope
  for ai in the future for education." — *theme 5*
- "really good tutors, and i mean really good! and then studnets have way more time
  for things they enjoy." — *theme 5*
- "fast-takeoff scenarios. and mass unemployment and what the future holds for [my
  family]" — *theme 5*
- "forget the proefssion. socieity" — *theme 6*

### Objective coverage

| | Objective | Covered |
| --- | --- | --- |
| ✓ | Understand the respondent's role and the texture of their typical work day | A senior role in a long-horizon (10–20 year) educational innovation team still being stood up; day spans writing proposals, desk research, project discussions, partner meetings. |
| ✓ | Where and how AI shows up day-to-day | AI shows up "all through" the work — literature, thinking partner, drafting; "touching each part of my role". |
| ✓ | A specific recent instance and how it played out | Two concrete examples: voice mode in the car to explore/bounce ideas; sharing papers for synthesis and discussing evidence rigour. |
| ✓ | What they trust AI with vs keep hands-on | Edits AI writing and won't send fully AI-generated text — needs to know/defend their work, plus social/political risk; differential trust (directional vs hard data). |
| ✓ | Moments where AI fell short / felt risky | Friction "many times" but no specific damaging instance recalled; review is "baked into" the process; flagged sycophancy and accuracy risks. |
| ✓ | Hopes for AI going forward | Near-term: better style matching and accuracy. Longer-term: "really good tutors" freeing students' time, and improved educational science — tempered by pessimism. |
| ✓ | Worries about where AI in education is heading | A wide p=doom band, fast-takeoff scenarios, mass unemployment, family's future, and dismay at the field's lack of awareness. |

---

## Notes

- Captured manually before the app had a save/export feature (state was
  browser-only). Adding a one-click results download is the immediate next step.
- This run is strong evidence the interviewer probes, follows emergent threads,
  and draws out genuine reflection — the core of what makes it demo-worthy.
