create table if not exists assessment_fingerprints (
  assessment_id text primary key,
  teacher_id text not null,
  unit_id text,
  concept_profiles jsonb not null default '[]'::jsonb,
  flow_profile jsonb not null default '{}'::jsonb,
  item_count integer not null default 0,
  source_type text not null,
  last_updated timestamptz default now(),
  version integer not null default 1
);

create index if not exists assessment_fingerprints_teacher_idx on assessment_fingerprints(teacher_id);
create index if not exists assessment_fingerprints_unit_idx on assessment_fingerprints(teacher_id, unit_id);

create table if not exists unit_fingerprints (
  teacher_id text not null,
  unit_id text not null,
  concept_profiles jsonb not null default '[]'::jsonb,
  flow_profile jsonb not null default '{}'::jsonb,
  derived_from_assessment_ids jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now(),
  version integer not null default 1,
  primary key (teacher_id, unit_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Catch-up: ensure every column the store SELECTs exists on tables that were
-- created from an earlier version of this migration.  All ADD COLUMN calls are
-- idempotent (IF NOT EXISTS) so this block is safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.assessment_fingerprints
  add column if not exists unit_id          text,
  add column if not exists concept_profiles jsonb    not null default '[]'::jsonb,
  add column if not exists flow_profile     jsonb    not null default '{}'::jsonb,
  add column if not exists item_count       integer  not null default 0,
  add column if not exists source_type      text     not null default 'uploaded',
  add column if not exists last_updated     timestamptz       default now(),
  add column if not exists version          integer  not null default 1;

alter table public.unit_fingerprints
  add column if not exists concept_profiles             jsonb not null default '[]'::jsonb,
  add column if not exists flow_profile                 jsonb not null default '{}'::jsonb,
  add column if not exists derived_from_assessment_ids  jsonb not null default '[]'::jsonb,
  add column if not exists last_updated                 timestamptz    default now(),
  add column if not exists version                      integer not null default 1;
