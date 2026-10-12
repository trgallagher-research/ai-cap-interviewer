# Seed data notes (src/seed.js)

16 fictional members of Systeeminterventies, written to look like real people in that network
rather than a demo. Verified against engine.js with `node tests/seed-check.js` (mean, band,
divergence, domain keys, level labels, stances, rating steps, unique ids). Today is 2026-10-12;
`createdAt` runs 2026-09-14 to 2026-10-10.

## The members

| id | Name | Role (own words) | Org | Level | Stance | Mean | Band | Divergence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| seed_01 | Anneke | team coach, mostly healthcare organisations | independent | 3 Integrated | pragmatic | 70 | moderate | aligned | Claude/ChatGPT/Otter; 2 offers (prep, analysis) |
| seed_02 | Bram | independent mediator, labour disputes | independent | 1 Exploring | sceptical | 35 | low | aligned | data question unanswered; wants a confidentiality checklist |
| seed_03 | Joris | interim manager in municipalities | independent | 2 Routine | pragmatic | 60 | moderate | aligned | Copilot inside tenant; admin/writing/analysis |
| seed_04 | Marieke | trainer, leadership programmes for first-line managers | small bureau | 4 Shaping | enthusiast | 85 | high | aligned | only level 4; 6 domains incl. building and client; 2 offers; wouldPayFor empty |
| seed_05 | Fatima | organisational adviser, co-operatives and housing associations | independent | 3 Integrated | cautious | 46 | moderate | cautious-practitioner | describes level-3 practice, rates low; 1 offer |
| seed_06 | Dirk | mediator, family businesses and partner conflicts | independent | 0 Not yet | sceptical | 15 | low | aligned | principled non-user; endedEarly; no wants/offers |
| seed_07 | Sanne | team coach, in-house at a hospital | in-house at a hospital | 1 Exploring | enthusiast | 70 | moderate | confident-starter | talks more than uses; 3 wants, 0 offers |
| seed_08 | Pieter | organisational adviser, manufacturing and family-owned SMEs | small bureau | 2 Routine | sceptical | 55 | moderate | aligned | the sceptic who uses it anyway; would not pay for anything AI |
| seed_09 | Lotte | trainer, conflict skills and feedback for teams | small bureau | 2 Routine | cautious | 36 | low | cautious-practitioner | weekly routine, rates low after a colleague called her prompts naive |
| seed_10 | Tjeerd | interim director, schools and school boards | independent | 1 Exploring | worried | 30 | low | aligned | endedEarly; third item rating undefined (mean over 2 items) |
| seed_11 | Noor | executive coach and leadership team coach | independent | 3 Integrated | enthusiast | 75 | high | aligned | thinking-partner routine; 2 offers; only admin helper |
| seed_12 | Harm | organisational adviser, water boards and provincial government | independent | 0 Not yet | worried | 20 | low | aligned | reads about it, never typed into one; one `learning` domain |
| seed_13 | Esther | mediator, team mediation in healthcare and welfare | small bureau | 2 Routine | pragmatic | 61 | moderate | aligned | asked IT what is allowed; NotebookLM |
| seed_14 | Kwame | organisational development adviser, in-house at a hogeschool | in-house at a university of applied sciences | 3 Integrated | pragmatic | 68 | moderate | aligned | Copilot/NotebookLM; client domain; 2 offers |
| seed_15 | Wouter | trainer, communication and feedback skills for teams | small bureau | 1 Exploring | pragmatic | 45 | moderate | aligned | one concrete chore (retyping notes); wouldPayFor empty |
| seed_16 | Ilse | team coach and supervisor, education and childcare | independent | 0 Not yet | pragmatic | 45 | moderate | confident-starter | non-user who expects to pick it up easily |

Totals: byLevel [3, 4, 4, 4, 1]; byStance pragmatic 6, enthusiast 3, sceptical 3, cautious 2,
worried 2; byDivergence aligned 12, confident-starter 2, cautious-practitioner 2; network mean
confidence 51.

## Patterns built in on purpose (what the organiser view should surface)

**Practice spread.** The mass of the network is at levels 1 to 3 (12 of 16). One Shaping member
(Marieke), three non-users with three different reasons (Dirk: principle; Harm: accountability
first; Ilse: no need yet).

**Domain gaps (Engine.stats.gaps).** `building` is the only computed gap (one member at level
>= 2 with evidence: Marieke). `client` is nearly a gap (Marieke, Kwame only); `admin` is thin
among strong users (Joris, Noor, Kwame). `writing` and `analysis` are where the knowledge sits
(9 and 8 strong members). `thinking` has five Integrated+ members, all of whom could help.

**Who could help whom (Engine.helpMap).**
- prep: five helpers (Anneke, Marieke, Fatima, Noor, Kwame) vs six seekers (Bram, Joris, Sanne,
  Lotte, Wouter, Ilse). The clearest pairing: Anneke or Noor (team-day prep from intake notes)
  with Sanne and Ilse (both team coaches). Marieke or Lotte's peers for scenario prompts.
- client: Marieke and Kwame are the only helpers; six seekers, two of them Integrated (Anneke,
  Fatima) whose wants are about explaining their use to clients and client-material rules.
  This is the "nobody knows the data rules" cluster: Bram, Sanne, Tjeerd, Harm all want to know
  what is safe; Marieke has negotiated rules with clients; Esther and Joris asked IT.
- building: Marieke alone; Lotte (prompt library) and Kwame (institutional rules) seek.
- admin: Noor is the only Integrated member with admin evidence; Bram, Sanne, Esther, Wouter
  want to stop retyping notes. Joris (level 2, Copilot summaries) is the real expert here but
  helpMap only counts level >= 3, so he does not appear as a helper. Worth noticing in the UI.
- thinking: Esther (stalled cases) and Harm as seekers; Anneke, Noor, Kwame as natural helpers.

**Confidence vs practice.**
- Confident starters: Sanne (level 1, mean 70) rates herself on tasks she has not done; Ilse
  (level 0, mean 45) expects to pick it up easily.
- Cautious practitioners: Fatima (level 3, mean 46) and Lotte (level 2, mean 36) both describe
  routine or integrated practice and rate themselves low, for different reasons (Fatima: cannot
  explain what she cannot verify; Lotte: a colleague's remark).
- Within each profile the ratings also tell a shape: high on drafting/digesting own notes,
  dropping on client-facing use, case thinking and making a method reusable (Anneke r4, Joris
  r4, Noor r4, Kwame r5, Esther r4).

**Scepticism and worry (5 of 16).** Two non/light users who are sceptical or worried for
professional reasons (Dirk, Harm), one worried light user who ended early (Tjeerd), one
sceptical light user with a concrete data question (Bram), and one sceptical *routine* user
(Pieter: "a fast typist with no judgement, and that is useful"). The share-back prompt asks
for a finding on scepticism; these five give it material without caricature.

**Product signals (productSignals.wouldPayFor).**
- "a half-day with peers from this network, not a generic course": Anneke, Sanne, Noor, Kwame (4)
- "someone to look at how I work for an hour": Joris, Fatima (2)
- "a checklist for client confidentiality": Bram, Tjeerd (2)
- "a shared library of prompts from colleagues": Lotte, Esther (2)
- "nothing": Dirk, Ilse (with a free demo caveat) (2)
- empty: Marieke (would give, not pay), Pieter (would pay for a conversation about family
  businesses, not AI), Harm (serious session on public organisations, not a prompt workshop),
  Wouter (two hours, one thing for Monday) (4)
The product read should land on peer-led, network-specific formats and say generic training is
not supported.

**Tools.** Copilot (Joris, Marieke, Sanne, Kwame; "the tool the municipality/hospital allows"),
ChatGPT (most), Claude (Anneke, Marieke, Noor), NotebookLM (Marieke, Esther, Kwame), Perplexity
(Fatima), Gemini (Lotte), Otter/Teams transcription (Anneke, Noor, Wouter). Level 0: none.

**Edge cases for the UI.** Tjeerd's third item has `rating: undefined` (mean over two items);
Tjeerd and Dirk have `endedEarly: true`; Dirk has no domains, wants or offers; Marieke has an
empty `wouldPayFor` with a non-empty quote; Anneke's mean is exactly 70 (band `moderate`, since
`high` is > 70).

## Schema points found ambiguous

- `transcript` is documented as "live/imported only; seed may omit"; the seed includes
  `transcript: []` as instructed. `endedEarly` is set by assembleProfile but not listed in the
  Profile block of architecture.md; included on every seed profile.
- `member.org` values are free text; the seed uses "independent", "small bureau",
  "in-house at a hospital", "in-house at a university of applied sciences". If the organiser
  view groups by org, these may want normalising.
- helpMap matches wants by substring, so "learn", "notes", "team", "read", "organis" pull
  people into domains unintentionally. The seed's wants were reworded to avoid most of this
  (e.g. "find out" instead of "learn"), which live profiles will not do. A level-2 member with
  strong evidence (Joris on admin) never appears as a helper because helpers need level >= 3.
- The practice-level tasks in `confidence.items` carry a `level`; the engine does not use it
  for scoring (mean only), so the per-item slope is visible only if the UI plots it.
- File size: 71 KB against the "~60 KB" target. The JSON content alone is 66 KB; reaching 60 KB
  would mean cutting feedback below the 2 to 3 sentence spec.
