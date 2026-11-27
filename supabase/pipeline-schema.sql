-- AIData pipeline v1 — time-series schema
-- Applied via Supabase Management API. Service-role only; no anon access.

-- ============ series ============
-- One row per ingestible time series (e.g. hkma_hibor_1m).
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references public.datasets(id) on delete cascade,
  code text not null unique,
  name_en text,
  name_zh text,
  unit text,
  frequency text not null check (frequency in ('daily','weekly','monthly','quarterly','annual','irregular')),
  source_url text,
  last_run_at timestamptz,
  last_status text not null default 'never',
  last_error text,
  next_run_at timestamptz,
  enabled boolean not null default true
);

-- ============ observations =========---
-- One row per (series, period). Period is ISO-ish: YYYY-MM-DD / YYYY-MM / YYYY-Qn.
create table if not exists public.observations (
  series_id uuid not null references public.series(id) on delete cascade,
  period text not null,
  value numeric,
  raw jsonb,
  primary key (series_id, period)
);

create index if not exists observations_series_id_idx on public.observations(series_id);

-- ============ pipeline_runs ============
-- Audit log: one row per adapter execution attempt.
create table if not exists public.pipeline_runs (
  id bigint generated always as identity primary key,
  series_code text,
  status text,
  rows_upserted int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists pipeline_runs_series_code_idx on public.pipeline_runs(series_code);
create index if not exists pipeline_runs_started_at_idx on public.pipeline_runs(started_at desc);

-- ============ RLS: no anon access ============
-- RLS enabled with zero policies; only service_role bypasses.
alter table public.series enable row level security;
alter table public.observations enable row level security;
alter table public.pipeline_runs enable row level security;

-- revoke in case any grant leaked in from defaults
revoke all on public.series from anon;
revoke all on public.observations from anon;
revoke all on public.pipeline_runs from anon;
