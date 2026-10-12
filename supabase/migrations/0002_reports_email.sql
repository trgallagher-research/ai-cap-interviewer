-- Reports + email migration: respondent-facing reports and opt-in email delivery.
-- Run in the Supabase SQL editor against an existing db. schema.sql is kept in sync so
-- a fresh setup gets these too. Idempotent; safe to run once.

-- Interviews: granular email opt-ins + send timestamps. The existing `email` column
-- stays; these record what the respondent agreed to receive and what we've sent (the
-- send stamps make the aggregate send idempotent — re-running only mails new opt-ins).
alter table interviews add column if not exists wants_individual_report   boolean not null default false;
alter table interviews add column if not exists wants_aggregate_report    boolean not null default false;
alter table interviews add column if not exists email_consent_at          timestamptz;
alter table interviews add column if not exists individual_report_sent_at timestamptz;
alter table interviews add column if not exists aggregate_report_sent_at  timestamptz;

-- Syntheses: one table now holds several kinds of generated content. `kind`
-- distinguishes them; existing rows backfill to 'cross' (today's only use).
--   cross            = creator-facing cross-study synthesis        (interview_id null)
--   interview        = creator-facing per-interview synthesis      (interview_id set)
--   respondent       = respondent-facing individual report         (interview_id set)
--   aggregate_public = respondent-facing lay aggregate report      (interview_id null)
alter table syntheses add column if not exists kind text not null default 'cross'
  check (kind in ('cross', 'interview', 'respondent', 'aggregate_public'));

create index if not exists idx_syntheses_interview_kind on syntheses (interview_id, kind);
