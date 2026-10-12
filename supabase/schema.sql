-- claude-interviewer schema (Phase 1)
-- Run in the Supabase SQL editor (or via the CLI). study_id is threaded through
-- everything so growing into multi-study/multi-creator later is additive.

-- Studies: a creator's interview project. owner_id is nullable for Phase 1 seeds;
-- Phase 2 (auth) sets it from auth.uid().
create table if not exists studies (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete cascade,
  title       text not null,
  topic       text not null,
  guide       jsonb not null,                         -- { strategy, objectives[] }
  intro       jsonb,                                  -- { purpose, whatToExpect, minutes } (respondent-facing)
  target_minutes int,                                 -- rough duration, drives the progress estimate
  analysis_framework text                             -- optional respondent-facing framework reflection (see migration 0004)
              check (analysis_framework in ('sdt', 'cyborg_centaur', 'samr', 'custom')),
  analysis_framework_custom jsonb,                    -- { name, definition } when analysis_framework = 'custom'
  visibility  text not null default 'controlled'
              check (visibility in ('public', 'controlled')),
  status      text not null default 'active'
              check (status in ('draft', 'active', 'closed')),
  created_at  timestamptz not null default now()
);

-- One interview = one respondent's session against a study.
create table if not exists interviews (
  id              uuid primary key default gen_random_uuid(),
  study_id        uuid not null references studies (id) on delete cascade,
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'completed', 'completed_early', 'abandoned')),
  exit_reason     text,                               -- set when a respondent exits early
  ref_code        text,                               -- short code respondents quote for deletion requests
  consent_version text,
  consent_at      timestamptz,
  email           text,                               -- optional, captured at the end
  wants_individual_report   boolean not null default false,  -- opt-in: email me my own summary
  wants_aggregate_report    boolean not null default false,  -- opt-in: email me the overall findings later
  email_consent_at          timestamptz,                     -- when the opt-in(s) were given
  individual_report_sent_at timestamptz,                     -- idempotency for the individual email
  aggregate_report_sent_at  timestamptz,                     -- idempotency for the aggregate email
  wants_analysis_report     boolean not null default false,  -- opt-in: email me a framework reflection (see migration 0004)
  analysis_report_sent_at   timestamptz,                     -- idempotency for the analysis email
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One turn = one message in an interview. Written live as the conversation streams,
-- so partial/abandoned interviews are captured for free.
create table if not exists turns (
  id            uuid primary key default gen_random_uuid(),
  interview_id  uuid not null references interviews (id) on delete cascade,
  role          text not null check (role in ('interviewer', 'respondent')),
  text          text not null,
  idx           int not null,
  created_at    timestamptz not null default now()
);

-- Synthesis: per-interview (interview_id set) or cross-interview (interview_id null).
-- `kind` distinguishes creator-facing analysis from respondent-facing reports:
-- cross | interview | respondent | aggregate_public (see migration 0002),
-- plus respondent_analysis (respondent-facing framework reflection, see migration 0004).
create table if not exists syntheses (
  id            uuid primary key default gen_random_uuid(),
  study_id      uuid not null references studies (id) on delete cascade,
  interview_id  uuid references interviews (id) on delete cascade,
  kind          text not null default 'cross'
                check (kind in ('cross', 'interview', 'respondent', 'aggregate_public', 'respondent_analysis')),
  content       jsonb not null,
  created_at    timestamptz not null default now()
);

-- Scans: one landscape-scanner run, owned by a creator (see migration 0003). The engine
-- runs on a separate service; this table holds ownership, polled/cached status, and the
-- finished report. study_id is an optional link to an interview project.
create table if not exists scans (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  study_id      uuid references studies (id) on delete set null,
  run_id        text not null,
  question      text not null,
  budget_usd    numeric not null,
  spent_usd     numeric not null default 0,
  state         text not null default 'starting'
                check (state in ('starting', 'running', 'done', 'halted', 'error')),
  stage         text,
  detail        text,
  error         text,
  report        jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_interviews_study on interviews (study_id);
create unique index if not exists idx_interviews_ref_code
  on interviews (ref_code) where ref_code is not null;
create index if not exists idx_turns_interview on turns (interview_id, idx);
create index if not exists idx_syntheses_study on syntheses (study_id);
create index if not exists idx_syntheses_interview_kind on syntheses (interview_id, kind);
create index if not exists idx_scans_owner on scans (owner_id, created_at desc);
create index if not exists idx_scans_study on scans (study_id);
create unique index if not exists idx_scans_run_id on scans (run_id);

-- Row-level security. Respondent writes happen server-side with the service_role
-- key (which bypasses RLS), so the only policies needed are owner-read for the
-- creator dashboard (Phase 2, via the authenticated client). The anon client
-- never touches these tables directly.
alter table studies   enable row level security;
alter table interviews enable row level security;
alter table turns     enable row level security;
alter table syntheses enable row level security;
alter table scans     enable row level security;

create policy "owners manage their studies" on studies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owners read their interviews" on interviews
  for select using (exists (
    select 1 from studies s where s.id = study_id and s.owner_id = auth.uid()
  ));

create policy "owners read their turns" on turns
  for select using (exists (
    select 1 from interviews i
    join studies s on s.id = i.study_id
    where i.id = interview_id and s.owner_id = auth.uid()
  ));

create policy "owners read their syntheses" on syntheses
  for select using (exists (
    select 1 from studies s where s.id = study_id and s.owner_id = auth.uid()
  ));

create policy "owners manage their scans" on scans
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
