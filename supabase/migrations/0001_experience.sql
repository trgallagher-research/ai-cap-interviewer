-- Experience migration: landing copy + time estimate on studies, and a graceful
-- early-exit status + deletion reference code on interviews.
-- Run in the Supabase SQL editor (or via the CLI) against an existing Phase 1 db.
-- schema.sql is kept in sync so a fresh setup gets these columns too.

-- Studies: respondent-facing intro (purpose / what-to-expect / minutes) and the
-- target duration used by the progress estimate.
alter table studies add column if not exists intro          jsonb;
alter table studies add column if not exists target_minutes int;

-- Interviews: allow a graceful early exit distinct from a silent abandon, record
-- why, and give each respondent a short code they can quote for a deletion request.
alter table interviews drop constraint if exists interviews_status_check;
alter table interviews add constraint interviews_status_check
  check (status in ('in_progress', 'completed', 'completed_early', 'abandoned'));

alter table interviews add column if not exists exit_reason text;
alter table interviews add column if not exists ref_code    text;

-- Short, human-quotable reference code (e.g. "INT-7Q2K9"). Generated for new rows;
-- existing rows stay null (they predate the deletion-by-code flow).
create unique index if not exists idx_interviews_ref_code
  on interviews (ref_code) where ref_code is not null;
