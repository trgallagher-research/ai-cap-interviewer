# Seed data notes (src/seed.js)

16 fictional members of Systeeminterventies, written to look like real people in that network
rather than a demo. Verified against engine.js with `node tests/seed-check.js` (mean, band,
divergence via `Engine.divergenceFor`, domain keys, level labels, stances, rating steps, unique ids,
and the questionnaire fields: defined keys only, skipped questions absent, `selfReport` and
`productSignals` equal to what `assembleProfile` / `Engine.signalsFromAnswers` derive). Today is 2026-10-12;
`createdAt` runs 2026-09-14 to 2026-10-10.

## The members

| id | Name | Role (own words) | Org | Level | Stance | Mean | Band | Divergence | Freq (self) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| seed_01 | Anneke | team coach, mostly healthcare organisations | independent | 3 Integrated | pragmatic | 70 | moderate | aligned | daily | Claude/ChatGPT/Otter; 2 offers (prep, analysis) |
| seed_02 | Bram | independent mediator, labour disputes | independent | 1 Exploring | sceptical | 35 | low | aligned | tried | data question unanswered; wants a confidentiality checklist |
| seed_03 | Joris | interim manager in municipalities | independent | 2 Routine | pragmatic | 60 | moderate | aligned | daily | Copilot inside tenant; admin/writing/analysis |
| seed_04 | Marieke | trainer, leadership programmes for first-line managers | small bureau | 4 Shaping | enthusiast | 85 | high | aligned | daily | only level 4; 6 domains incl. building and client; 2 offers; wouldPayFor empty |
| seed_05 | Fatima | organisational adviser, co-operatives and housing associations | independent | 3 Integrated | cautious | 46 | moderate | cautious-practitioner | daily | describes level-3 practice, rates low; 1 offer |
| seed_06 | Dirk | mediator, family businesses and partner conflicts | independent | 0 Not yet | sceptical | 15 | low | aligned | never | principled non-user; endedEarly; no wants/offers |
| seed_07 | Sanne | team coach, in-house at a hospital | in-house at a hospital | 1 Exploring | enthusiast | 70 | moderate | confident-starter | monthly | talks more than uses; 3 wants, 0 offers |
| seed_08 | Pieter | organisational adviser, manufacturing and family-owned SMEs | small bureau | 2 Routine | sceptical | 55 | moderate | aligned | weekly | the sceptic who uses it anyway; would not pay for anything AI |
| seed_09 | Lotte | trainer, conflict skills and feedback for teams | small bureau | 2 Routine | cautious | 36 | low | cautious-practitioner | weekly | weekly routine, rates low after a colleague called her prompts naive |
| seed_10 | Tjeerd | interim director, schools and school boards | independent | 1 Exploring | worried | 30 | low | cautious-practitioner | tried | endedEarly; third item rating undefined (mean over 2 items) |
| seed_11 | Noor | executive coach and leadership team coach | independent | 3 Integrated | enthusiast | 75 | high | aligned | daily | thinking-partner routine; 2 offers; only admin helper |
| seed_12 | Harm | organisational adviser, water boards and provincial government | independent | 0 Not yet | worried | 20 | low | aligned | never | reads about it, never typed into one; one `learning` domain |
| seed_13 | Esther | mediator, team mediation in healthcare and welfare | small bureau | 2 Routine | pragmatic | 61 | moderate | aligned | weekly | asked IT what is allowed; NotebookLM |
| seed_14 | Kwame | organisational development adviser, in-house at a hogeschool | in-house at a university of applied sciences | 3 Integrated | pragmatic | 68 | moderate | aligned | weekly | Copilot/NotebookLM; client domain; 2 offers |
| seed_15 | Wouter | trainer, communication and feedback skills for teams | small bureau | 1 Exploring | pragmatic | 45 | moderate | aligned | tried | one concrete chore (retyping notes); wouldPayFor empty |
| seed_16 | Ilse | team coach and supervisor, education and childcare | independent | 0 Not yet | pragmatic | 72 | high | confident-starter | never | non-user who expects to pick it up easily |

Totals: byLevel [3, 4, 4, 4, 1]; byStance pragmatic 6, enthusiast 3, sceptical 3, cautious 2,
worried 2; byDivergence (divergenceFor) aligned 11, confident-starter 2, cautious-practitioner 3.

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
  (level 0, mean 72) expects to pick it up easily.
- Cautious practitioners: Tjeerd (level 1, two ratings only, residual -25 against expected 55)
  is one by the item-level rule; read him as worried rather than modest.
- Fatima (level 3, mean 46) and Lotte (level 2, mean 36) both describe
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

**Product signals (now derived from the questionnaire by `Engine.signalsFromAnswers`).**
`wouldPayFor` is the joined option labels when pay is yes/maybe, else empty; the round-one
free-text versions were replaced. Each member keeps their verbatim `quote`.
- offer ticks: peer-halfday 5 (Anneke, Marieke, Sanne, Noor, Kwame), confidentiality 4 (Bram,
  Sanne, Tjeerd, Esther), demos 4 (Anneke, Marieke, Lotte, Wouter), prompt-library 3 (Lotte,
  Esther, Kwame), one-to-one 2 (Joris, Fatima), nothing 4 (Dirk, Pieter, Harm, Ilse).
- pay as answered: yes 4 (Anneke, Joris, Noor, Kwame), maybe 6 (Bram, Fatima, Sanne, Lotte,
  Tjeerd, Esther), no 2 (Marieke: "what I would pay for does not exist yet"; Wouter).
  The four "nothing for now" members never see the pay question; their pay is blank and they are
  counted under `stats.questionnaire.offer.nothing`, so `stats.questionnaire.pay` is yes 4 / maybe 6 / no 2.
- Marieke uses `offerOther` ("a small group of people who are as far along as I am"); it does
  not reach `wouldPayFor` because she answered pay "no".
- The "nothing" four are the principled sceptic (Dirk), the worried non-user (Harm), the
  sceptical routine user (Pieter) and the matter-of-fact non-user (Ilse). The read should land on
  peer-led, network-specific formats, not generic training.

**Questionnaire vs evidence (self-report gaps).** `practice.domains` stay evidence-gated, so
ticked areas without an episode show in `stats.questionnaire.claimedNoEpisode`:
- Claimed without an episode (6 members, 7 ticks): Joris building, Marieke learning, Sanne
  analysis + client, Tjeerd writing, Esther thinking, Wouter admin. Result: claimedNoEpisode is
  1 in every domain except prep (0).
- Ticked fewer areas than they evidenced (modest): Fatima ticks writing, analysis only (evidence
  in 5 areas); Lotte ticks prep only (evidence in 3); Pieter leaves analysis unticked.
- Frequency tracks level loosely: never = the three level-0 members; tried = Bram, Tjeerd,
  Wouter (level 1); Sanne (level 1) says monthly, an overclaim matching her confident-starter
  profile; Joris (level 2) says daily; Kwame (level 3) says weekly. Totals: never 3, tried 3,
  monthly 1, weekly 4, daily 5.
- canShow: yes for every level 3 to 4 member with offers (Anneke, Marieke, Fatima, Noor, Kwame);
  maybe for Joris, Sanne, Esther; no for Pieter and Lotte (Lotte: "I have not shown anyone
  since"); skipped for never/tried.
- Questionnaire tools use the fixed keys ("Transcription tool" for Otter/Teams), so
  `selfReport.tools` and `practice.tools` differ slightly in wording by design.

**Tools.** Copilot (Joris, Marieke, Sanne, Kwame; "the tool the municipality/hospital allows"),
ChatGPT (most), Claude (Anneke, Marieke, Noor), NotebookLM (Marieke, Esther, Kwame), Perplexity
(Fatima), Gemini (Lotte), Otter/Teams transcription (Anneke, Noor, Wouter). Level 0: none.

**Edge cases for the UI.** Tjeerd's third item has `rating: undefined` (mean over two items);
Tjeerd and Dirk have `endedEarly: true`; Dirk has no domains, wants or offers; Marieke has an
empty `wouldPayFor` with a non-empty quote; Anneke's mean is exactly 70 (band `moderate`, since
`high` is > 70).

## Schema points found ambiguous

- Stats `pay.no` counts "nothing for now" members as no (see above); if the organiser view
  shows the pay split it may want to separate "no" from "nothing".
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
- File size: 77 KB after the questionnaire fields (target was ~60 KB).
