# GDPR compliance — operational checklist

The app ships the *product* side of compliance (layered consent, a privacy notice,
self-serve deletion by reference code, audio discarded after transcription). The items
below are **operational / legal** and are the study owner's to complete before sharing
any interview link with real respondents. None of this is legal advice — have the final
consent + privacy wording reviewed.

A matching GitHub issue tracks these as assignable tasks.

## Fill in the placeholders

The consent text (`lib/consent.ts`) and privacy notice (`/privacy`) contain placeholders:

- [x] **`[CONTROLLER]`** — **Timothy Gallagher** (an individual; this is a personal
      project, not an organisation).
- [x] **`[CONTACT]`** — **aligned.benchmark@gmail.com**, a dedicated reachable inbox
      (not a send-only GitHub noreply address). Make sure this inbox is actually
      monitored so data-rights requests don't go unanswered.
- [x] **`[RETENTION]`** — "until the research is complete (at most 12 months after your
      interview)". Data-minimising; tighten further if analysis finishes sooner.
- [x] **`[PRODUCT/RESEARCH]`** — "research into the socio-technical dimensions of how AI
      is deployed across industries".
- [x] Bump `CONSENT_VERSION` — now `2026-06-29` (all placeholders filled). A final
      wording review is still advisable before sharing any link; bump again if it
      changes.

## Lawful basis

- [ ] Confirm **consent** (Art. 6(1)(a)) is the basis, and **explicit consent**
      (Art. 9(2)(a)) covers any special-category content interviews may surface.

## Processors & international transfers

Sign / file the Data Processing Agreement with each processor, and confirm a transfer
mechanism (Standard Contractual Clauses or EU–US Data Privacy Framework) for US-based ones:

- [ ] **Anthropic** — runs and analyses the interview.
- [ ] **Groq** — voice-to-text. Enable **Zero Data Retention** on the production key.
- [ ] **Resend** — transactional email (only used when a respondent opts in to receive a
      report). US-based → confirm transfer mechanism. Skippable until email is enabled
      (`RESEND_API_KEY` set).
- [ ] **Supabase** — storage.
- [ ] **Vercel** — hosting.

> New processing purpose (added with the reports feature): sending respondents, on
> explicit opt-in, a summary of their own interview and/or the study's overall findings.
> The opt-ins are stored per interview (`wants_individual_report` /
> `wants_aggregate_report`, with `email_consent_at`); the aggregate opt-in is unticked by
> default; deleting by ref code erases the email + opt-ins via cascade. `CONSENT_VERSION`
> bumped to `2026-06-29`.

## Records & assessments

- [ ] Keep a short **Record of Processing Activities (ROPA)**.
- [ ] Complete a light **DPIA** (AI processing of potentially sensitive qualitative data).
- [ ] Decide and document the **retention period**, and ensure data is deleted on schedule.

## Verify the product mechanisms

- [ ] Privacy notice reachable at `/privacy` and linked from the consent step.
- [ ] Deletion works end-to-end at `/delete` using a session's reference code.
- [ ] Confirm **no audio** is stored (only transcribed text) — review the `turns` table
      after a voice answer.

## Known gaps (not blockers, tracked separately)

- No per-respondent rate limiting on the public/cost-surface routes (incl. `/api/transcribe`,
  which is gated to a valid in-progress interview but not throttled). Bot protection for
  public studies is a separate task.
