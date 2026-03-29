-- ============================================================
-- Student Performance Profiles + Raw Assessment Events
-- Run in Supabase SQL Editor after the main schema.sql
-- ============================================================

create table if not exists public.student_performance_profiles (
  student_id text not null,
  unit_id text,
  scope_key text generated always as (coalesce(unit_id, '__global__')) stored,
  last_updated timestamptz not null default now(),
  total_events integer not null default 0,
  total_assessments integer not null default 0,
  assessment_ids jsonb not null default '[]'::jsonb,
  overall_mastery double precision not null default 0,
  overall_confidence double precision not null default 0,
  average_response_time_seconds double precision not null default 0,
  concept_mastery jsonb not null default '{}'::jsonb,
  concept_exposure jsonb not null default '{}'::jsonb,
  bloom_mastery jsonb not null default '{}'::jsonb,
  mode_mastery jsonb not null default '{}'::jsonb,
  scenario_mastery jsonb not null default '{}'::jsonb,
  concept_bloom_mastery jsonb not null default '{}'::jsonb,
  concept_mode_mastery jsonb not null default '{}'::jsonb,
  concept_scenario_mastery jsonb not null default '{}'::jsonb,
  concept_average_response_time_seconds jsonb not null default '{}'::jsonb,
  concept_confidence jsonb not null default '{}'::jsonb,
  misconceptions jsonb not null default '{}'::jsonb,
  primary key (student_id, scope_key)
);

alter table public.student_performance_profiles
  add column if not exists student_id text,
  add column if not exists unit_id text,
  add column if not exists scope_key text generated always as (coalesce(unit_id, '__global__')) stored,
  add column if not exists last_updated timestamptz,
  add column if not exists total_events integer,
  add column if not exists total_assessments integer,
  add column if not exists assessment_ids jsonb,
  add column if not exists overall_mastery double precision,
  add column if not exists overall_confidence double precision,
  add column if not exists average_response_time_seconds double precision,
  add column if not exists concept_mastery jsonb,
  add column if not exists concept_exposure jsonb,
  add column if not exists bloom_mastery jsonb,
  add column if not exists mode_mastery jsonb,
  add column if not exists scenario_mastery jsonb,
  add column if not exists concept_bloom_mastery jsonb,
  add column if not exists concept_mode_mastery jsonb,
  add column if not exists concept_scenario_mastery jsonb,
  add column if not exists concept_average_response_time_seconds jsonb,
  add column if not exists concept_confidence jsonb,
  add column if not exists misconceptions jsonb;

update public.student_performance_profiles
set
  last_updated = coalesce(last_updated, now()),
  total_events = coalesce(total_events, 0),
  total_assessments = coalesce(total_assessments, 0),
  assessment_ids = coalesce(assessment_ids, '[]'::jsonb),
  overall_mastery = coalesce(overall_mastery, 0),
  overall_confidence = coalesce(overall_confidence, 0),
  average_response_time_seconds = coalesce(average_response_time_seconds, 0),
  concept_mastery = coalesce(concept_mastery, '{}'::jsonb),
  concept_exposure = coalesce(concept_exposure, '{}'::jsonb),
  bloom_mastery = coalesce(bloom_mastery, '{}'::jsonb),
  mode_mastery = coalesce(mode_mastery, '{}'::jsonb),
  scenario_mastery = coalesce(scenario_mastery, '{}'::jsonb),
  concept_bloom_mastery = coalesce(concept_bloom_mastery, '{}'::jsonb),
  concept_mode_mastery = coalesce(concept_mode_mastery, '{}'::jsonb),
  concept_scenario_mastery = coalesce(concept_scenario_mastery, '{}'::jsonb),
  concept_average_response_time_seconds = coalesce(concept_average_response_time_seconds, '{}'::jsonb),
  concept_confidence = coalesce(concept_confidence, '{}'::jsonb),
  misconceptions = coalesce(misconceptions, '{}'::jsonb)
where
  last_updated is null
  or total_events is null
  or total_assessments is null
  or assessment_ids is null
  or overall_mastery is null
  or overall_confidence is null
  or average_response_time_seconds is null
  or concept_mastery is null
  or concept_exposure is null
  or bloom_mastery is null
  or mode_mastery is null
  or scenario_mastery is null
  or concept_bloom_mastery is null
  or concept_mode_mastery is null
  or concept_scenario_mastery is null
  or concept_average_response_time_seconds is null
  or concept_confidence is null
  or misconceptions is null;

alter table public.student_performance_profiles
  alter column last_updated set default now(),
  alter column total_events set default 0,
  alter column total_assessments set default 0,
  alter column assessment_ids set default '[]'::jsonb,
  alter column overall_mastery set default 0,
  alter column overall_confidence set default 0,
  alter column average_response_time_seconds set default 0,
  alter column concept_mastery set default '{}'::jsonb,
  alter column concept_exposure set default '{}'::jsonb,
  alter column bloom_mastery set default '{}'::jsonb,
  alter column mode_mastery set default '{}'::jsonb,
  alter column scenario_mastery set default '{}'::jsonb,
  alter column concept_bloom_mastery set default '{}'::jsonb,
  alter column concept_mode_mastery set default '{}'::jsonb,
  alter column concept_scenario_mastery set default '{}'::jsonb,
  alter column concept_average_response_time_seconds set default '{}'::jsonb,
  alter column concept_confidence set default '{}'::jsonb,
  alter column misconceptions set default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_performance_profiles_pkey'
      and conrelid = 'public.student_performance_profiles'::regclass
  ) then
    alter table public.student_performance_profiles
      add constraint student_performance_profiles_pkey primary key (student_id, scope_key);
  end if;
end $$;

create index if not exists student_performance_profiles_unit_idx
  on public.student_performance_profiles(student_id, unit_id);

create index if not exists student_performance_profiles_updated_idx
  on public.student_performance_profiles(last_updated desc);

create table if not exists public.student_assessment_events (
  event_id text primary key,
  student_id text not null,
  assessment_id text not null,
  unit_id text,
  item_id text,
  concept_id text not null,
  concept_display_name text,
  bloom_level text not null,
  item_mode text,
  scenario_type text,
  difficulty text,
  correct boolean not null,
  response_time_seconds double precision,
  confidence double precision,
  misconception_key text,
  incorrect_response text,
  occurred_at timestamptz not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.student_assessment_events
  add column if not exists event_id text,
  add column if not exists student_id text,
  add column if not exists assessment_id text,
  add column if not exists unit_id text,
  add column if not exists item_id text,
  add column if not exists concept_id text,
  add column if not exists concept_display_name text,
  add column if not exists bloom_level text,
  add column if not exists item_mode text,
  add column if not exists scenario_type text,
  add column if not exists difficulty text,
  add column if not exists correct boolean,
  add column if not exists response_time_seconds double precision,
  add column if not exists confidence double precision,
  add column if not exists misconception_key text,
  add column if not exists incorrect_response text,
  add column if not exists occurred_at timestamptz,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz;

update public.student_assessment_events
set
  created_at = coalesce(created_at, now())
where created_at is null;

alter table public.student_assessment_events
  alter column created_at set default now();

create index if not exists student_assessment_events_student_idx
  on public.student_assessment_events(student_id, occurred_at asc);

create index if not exists student_assessment_events_student_unit_idx
  on public.student_assessment_events(student_id, unit_id, occurred_at asc);

create index if not exists student_assessment_events_assessment_idx
  on public.student_assessment_events(assessment_id);