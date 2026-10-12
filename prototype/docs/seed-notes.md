# Seed data notes (src/seed.js)

16 fictional members of Systeeminterventies, written to look like real people in that network
rather than a demo. Verified against engine.js with `node tests/seed-check.js`:
- mean and band;
- divergence via `Engine.divergenceFor`;
- domain keys, level labels, stances, rating steps and unique ids;
- questionnaire answers use only defined keys, and skipped questions are absent;
- `selfReport` and `productSignals` equal what `assembleProfile` / `Engine.signalsFromAnswers` derive;
- at most 2 evidenced areas per member (3 for the level-4 member), and none for never-users;
- `probedNoEpisode` holds only areas that are ticked and have no evidence.

Today is 2026-10-12; `createdAt` runs 2026-09-14 to 2026-10-10.

## The members

Evidenced = `practice.domains` (an episode in the interview). Ticked, no episode = ticked in the
questionnaire with no episode; "(probed)" = in `practice.probedNoEpisode`.

| id | Name | Role (own words) | Org | Level | Stance | Mean | Band | Divergence | Freq (self) | Evidenced | Ticked, no episode | Offer / pay |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| seed_01 | Anneke | team coach, mostly healthcare organisations | independent | 3 Integrated | pragmatic | 70 | moderate | aligned | daily | analysis, writing | prep, thinking, learning | peer-halfday, demos / yes |
| seed_02 | Bram | independent mediator, labour disputes | independent | 1 Exploring | sceptical | 35 | low | aligned | tried | writing, learning | - | confidentiality, when-not / maybe |
| seed_03 | Joris | interim manager in municipalities | independent | 2 Routine | pragmatic | 60 | moderate | aligned | daily | admin, writing | analysis, building (probed) | one-to-one / yes |
| seed_04 | Marieke | trainer, leadership programmes for first-line managers | small bureau | 4 Shaping | enthusiast | 85 | high | aligned | daily | prep, building, client | writing, analysis, thinking, learning | peer-halfday, demos / no |
| seed_05 | Fatima | organisational adviser, co-operatives and housing associations | independent | 3 Integrated | cautious | 46 | moderate | cautious-practitioner | daily | analysis, thinking | - | one-to-one / maybe |
| seed_06 | Dirk | mediator, conflicts in family businesses and between partners | independent | 0 Not yet | sceptical | 15 | low | aligned | never | none | - | when-not / unsure |
| seed_07 | Sanne | team coach, in-house at a hospital | in-house at a hospital | 1 Exploring | enthusiast | 70 | moderate | confident-starter | monthly | admin, prep | analysis, client (probed) | peer-halfday, confidentiality / maybe |
| seed_08 | Pieter | organisational adviser, manufacturing companies and family-owned SMEs | small bureau | 2 Routine | sceptical | 55 | moderate | aligned | weekly | writing, analysis | admin | nothing / skipped |
| seed_09 | Lotte | trainer, conflict skills and feedback for teams | small bureau | 2 Routine | cautious | 36 | low | cautious-practitioner | weekly | prep, writing | - | prompt-library, demos / maybe |
| seed_10 | Tjeerd | interim director, schools and school boards | independent | 1 Exploring | worried | 30 | low | cautious-practitioner | tried | learning | writing (probed) | confidentiality, when-not / maybe |
| seed_11 | Noor | executive coach and leadership team coach | independent | 3 Integrated | enthusiast | 75 | high | aligned | daily | thinking, prep | writing, analysis, admin | peer-halfday / yes |
| seed_12 | Harm | organisational adviser, water boards and provincial government | independent | 0 Not yet | worried | 20 | low | aligned | never | none | - | when-not / no |
| seed_13 | Esther | mediator, team mediation in healthcare and welfare | small bureau | 2 Routine | pragmatic | 61 | moderate | aligned | weekly | analysis, writing | thinking (probed), learning | prompt-library, confidentiality / maybe |
| seed_14 | Kwame | organisational development adviser, in-house at a university of applied sciences | in-house at a university of applied sciences | 3 Integrated | pragmatic | 68 | moderate | aligned | weekly | analysis, writing | prep, thinking, client | peer-halfday, prompt-library / yes |
| seed_15 | Wouter | trainer, communication and feedback skills for teams | small bureau | 1 Exploring | pragmatic | 45 | moderate | aligned | tried | writing, prep | admin | demos / unsure |
| seed_16 | Ilse | team coach and supervisor, education and childcare organisations | independent | 0 Not yet | pragmatic | 72 | high | confident-starter | never | none | - | nothing / skipped |

Totals: byLevel [3, 4, 4, 4, 1]; byStance pragmatic 6, enthusiast 3, sceptical 3, cautious 2,
worried 2; byDivergence (divergenceFor) aligned 11, confident-starter 2, cautious-practitioner 3.

**Evidenced against ticked:**
- 26 evidenced areas in all, at most 2 per member and 3 for Marieke; never-users have none.
- 45 ticked areas. 23 of them have an episode and 22 do not.
- Of the 22 without an episode, 4 are probed and 18 are unprobed.

## Patterns built in on purpose (what the organiser view should surface)

**Practice spread.**
- The mass of the network is at levels 1 to 3 (12 of 16).
- One Shaping member (Marieke).
- Three non-users with three different reasons: Dirk on principle, Harm wants accountability
  first, Ilse has no need yet.
- Levels are coded from the depth of the episodes, not their breadth. A level-3 member with two
  rich episodes stays level 3.

**Why the heatmap is sparse.** A 4 to 7 question interview yields one or two episodes per
member, so live heatmaps will look like this one: few filled cells, and many ticked-only cells.
- The questionnaire's `selfDomains` row carries the breadth: writing 10, analysis 8, prep 7.
- `practice.domains` carries the depth.

**Ticked without an episode (`claimedNoEpisode`).**
- Counts: writing 3, prep 2, analysis 4, thinking 4, client 2, learning 3, admin 3, building 1.
- **Probed and found thin** (`probedNoEpisode`, solid hatch), 4 in all:
  - Joris, building: a memo prompt he keeps in his head, never written down.
  - Sanne, client: an intention, nothing done yet.
  - Tjeerd, writing: one parent letter, rewritten from scratch.
  - Esther, thinking: she wants to use it on stalled cases but has not.
- **Unprobed** (light hatch), 18 in all. Mostly the broad tickers whose short interview went
  deep on two areas: Marieke (4), Anneke (3), Kwame (3), Noor (3). Plus Joris analysis, Sanne
  analysis, Pieter admin, Esther learning, Wouter admin.
- **Ticked fewer areas than they evidenced** (modest self-report):
  - Fatima ticks analysis only (evidence: analysis, thinking).
  - Lotte ticks prep only (evidence: prep, writing).
  - Pieter ticks writing and admin (evidence: writing, analysis).

**Domain gaps (`Engine.stats.gaps`: fewer than 2 members at level 2 or above with evidence).**
- client, learning, admin and building.
- Each of client and building has one strong member (Marieke).
- Admin has one: Joris, at level 2.
- Learning evidence sits only with level-1 members (Bram, Tjeerd).
- Writing (Anneke, Joris, Pieter, Lotte, Esther, Kwame) and analysis (Anneke, Fatima, Pieter,
  Esther, Kwame) are where the knowledge sits.

**Who could help whom (`Engine.helpMap`).** Evidence is spread so each main domain has its own
level-3+ helpers:

| Domain | Helpers (level 3+) | Seekers |
|---|---|---|
| prep | Marieke, Noor | Bram, Joris, Sanne, Lotte, Wouter, Ilse |
| writing | Anneke, Kwame | none |
| analysis | Anneke, Fatima, Kwame | Tjeerd |
| thinking | Fatima, Noor | Anneke, Harm, Esther |
| client | Marieke | Anneke, Bram, Fatima, Harm |
| building | Marieke | Lotte, Kwame |
| admin | none | Bram, Joris, Sanne, Esther, Wouter |

What the organiser should be able to spot in the map:
- **Prep:** the clearest pairing is Noor (offsite prep from intake notes) with Sanne and Ilse,
  who are both team coaches.
- **Thinking:** Fatima or Noor with Esther (stalled cases). Anneke, a level-3 member, is herself
  a seeker here: she wants a sparring partner that does not flatter her.
- **Client:** the "nobody knows the data rules" cluster. Bram, Sanne, Tjeerd and Harm want to
  know what is safe. Marieke has negotiated rules with clients; Esther and Joris asked IT.
- **Admin:** five members want to stop retyping notes, and helpMap finds no helper. The real
  expert is Joris (level 2, Copilot meeting summaries), but helpMap counts only level 3+.

**Confidence vs practice.**
- **Confident starters:**
  - Sanne (level 1, mean 70) rates herself on tasks she has not done, and self-reports monthly use.
  - Ilse (level 0, mean 72) expects to pick it up easily.
- **Cautious practitioners:**
  - Fatima (level 3, mean 46) and Lotte (level 2, mean 36) describe integrated and routine
    practice and rate themselves low. Both also under-tick in the questionnaire.
  - Tjeerd (level 1, two ratings only, residual -25) is one by the item-level rule; read him as
    worried rather than modest.

**Scepticism and worry (5 of 16).**
- Dirk and Harm: a non-user who is sceptical and one who is worried, both for professional reasons.
- Tjeerd: a worried light user who ended early.
- Bram: a sceptical light user with a concrete data question.
- Pieter: a sceptical routine user ("a fast typist with no judgement, and that is useful").

**Product signals (derived by `Engine.signalsFromAnswers`).** `wouldPayFor` is the ticked labels
joined when pay is yes or "Possibly" (key maybe); otherwise it is empty. Each member keeps their
verbatim `quote`.

Offer ticks:

| Offer | Count | Who |
|---|---|---|
| peer-halfday | 5 | Anneke, Marieke, Sanne, Noor, Kwame |
| confidentiality | 4 | Bram, Sanne, Tjeerd, Esther |
| demos | 4 | Anneke, Marieke, Lotte, Wouter |
| when-not | 4 | Dirk, Harm, Bram, Tjeerd |
| prompt-library | 3 | Lotte, Esther, Kwame |
| one-to-one | 2 | Joris, Fatima |
| nothing | 2 | Pieter, Ilse (pay skipped) |

Pay:

| Answer | Count | Who |
|---|---|---|
| yes | 4 | Anneke, Joris, Noor, Kwame |
| maybe ("Possibly") | 6 | Bram, Fatima, Sanne, Lotte, Tjeerd, Esther |
| no | 2 | Marieke ("what I would pay for does not exist yet"), Harm |
| unsure | 2 | Dirk, Wouter |

- "When-not" draws the sceptics and the worried: the conversation they would come to is about
  whether to use it at all. Dirk ticks only that and is unsure about paying; Harm ticks only that
  and would not pay.
- Marieke's `offerOther` ("a small group of people who are as far along as I am") does not
  reach `wouldPayFor`, because she answered no.

**Frequency and canShow.**
- Frequency: never 3, tried 3, monthly 1, weekly 4, daily 5.
- Frequency tracks level loosely. Sanne (level 1) says monthly; Joris (level 2) says daily;
  Kwame (level 3) says weekly.
- canShow:
  - yes: every level 3 to 4 member with offers (Anneke, Marieke, Fatima, Noor, Kwame);
  - maybe: Joris, Sanne, Esther;
  - no: Pieter, Lotte;
  - skipped: never and tried.

**Edge cases for the UI.**
- Tjeerd's third item has `rating: undefined`, so his mean is over two items.
- Tjeerd and Dirk have `endedEarly: true`.
- Dirk, Harm and Ilse have no domains. Dirk also has no wants or offers.
- Anneke's mean is exactly 70, so her band is `moderate` (`high` is > 70).

## Schema points found ambiguous

- **Transcript and endedEarly:** `transcript` is documented as "live/imported only; seed may
  omit". The seed includes `transcript: []` as instructed. `endedEarly` is set by
  assembleProfile but not listed in the Profile block of architecture.md; every seed profile
  carries it.
- **Org values:** `member.org` is free text. The seed uses "independent", "small bureau",
  "in-house at a hospital" and "in-house at a university of applied sciences". If the organiser
  view groups by org, these may want normalising.
- **Keyword matching in helpMap:** helpMap matches wants by substring, so words like "learn",
  "notes", "team", "read" and "organis" pull people into domains unintentionally. The seed's
  wants were reworded to avoid most of this (for example "find out" instead of "learn"); live
  profiles will not be.
- **Helpers need level 3+:** a level-2 member with strong evidence never appears as a helper.
  Admin now has no helper at all for that reason.
- **Confidence items can reach past the evidence:** an item may sit in an area with no episode
  (for example Anneke's case-thinking item). That is intended, because items are graded one step
  beyond what was described.
- **File size:** 75 KB, against a target of about 60 KB.
