-- Landscape Scanner migration: per-creator, multi-run scans.
-- Run in the Supabase SQL editor against an existing db. schema.sql is kept in sync so
-- a fresh setup gets this too. Idempotent; safe to run once.
--
-- A `scan` is one landscape-scanner run, owned by the creator who started it. The engine
-- runs on a separate service (the NUC, behind a Cloudflare Tunnel); this table is the
-- website's source of truth for ownership, live status (polled + cached), and the finished
-- report. Reports are private to the owning creator (RLS below); the platform owner also
-- has back-end access via the service_role key / Supabase dashboard.

create table if not exists scans (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  -- Optional link to a study. Standalone by default; the column exists so a scan can be
  -- associated with an interview project later without a schema change. set null on study
  -- delete so deleting a study never destroys its scans.
  study_id      uuid references studies (id) on delete set null,
  run_id        text not null,                    -- the engine's run id (opaque to us)
  question      text not null,                    -- the plain-English landscape question
  budget_usd    numeric not null,                 -- hard per-scan cap sent to the engine
  spent_usd     numeric not null default 0,       -- latest cost readout from the engine
  state         text not null default 'starting'
                check (state in ('starting', 'running', 'done', 'halted', 'error')),
  stage         text,                             -- current pipeline stage (frame…read)
  detail        text,                             -- human-readable progress line
  error         text,                             -- populated when state in (error, halted)
  report        jsonb,                            -- the finished Report, cached on `done`
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_scans_owner on scans (owner_id, created_at desc);
create index if not exists idx_scans_study on scans (study_id);
create unique index if not exists idx_scans_run_id on scans (run_id);

-- Row-level security: a creator only ever sees and manages their own scans. The website's
-- scan routes use the authed (cookie-bound) client, so these run as the logged-in creator.
alter table scans enable row level security;

-- drop-then-create so re-running this migration doesn't error (CREATE POLICY has no
-- IF NOT EXISTS), keeping it genuinely idempotent.
drop policy if exists "owners manage their scans" on scans;
create policy "owners manage their scans" on scans
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
