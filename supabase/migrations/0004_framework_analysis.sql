-- Framework-based respondent analysis: an interpretive, framework-read reflection of a
-- respondent's own answers, emailed to those who opt in. Unlike the plain individual
-- report (kind 'respondent'), this one is deliberately allowed to interpret — through a
-- study-chosen lens (SDT, Cyborg/Centaur, SAMR, or a creator's own framework).
-- Run in the Supabase SQL editor against an existing db. Depends on 0002 (syntheses.kind
-- and the email opt-in columns). schema.sql is kept in sync. Idempotent; safe to run once.

-- Interviews: opt-in + idempotent send stamp for the analysis email (mirrors the
-- existing individual/aggregate opt-in + send-stamp pattern from 0002).
alter table interviews add column if not exists wants_analysis_report   boolean not null default false;
alter table interviews add column if not exists analysis_report_sent_at timestamptz;

-- Studies: per-study framework selection (bring-your-own). null = feature off for the
-- study (no analysis is offered or sent). 'custom' pairs with analysis_framework_custom.
alter table studies add column if not exists analysis_framework text
  check (analysis_framework in ('sdt', 'cyborg_centaur', 'samr', 'custom'));
alter table studies add column if not exists analysis_framework_custom jsonb;  -- { name, definition } when 'custom'

-- Syntheses: add the respondent-facing framework analysis to the kind set. The 0002
-- inline CHECK is unnamed, so Postgres named it syntheses_kind_check — drop + recreate it.
--   respondent_analysis = respondent-facing framework reflection (interview_id set)
alter table syntheses drop constraint if exists syntheses_kind_check;
alter table syntheses add constraint syntheses_kind_check
  check (kind in ('cross', 'interview', 'respondent', 'aggregate_public', 'respondent_analysis'));
