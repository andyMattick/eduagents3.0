-- Migration: Phase C actual results and predicted-vs-actual deltas

create table if not exists public.class_actual_results (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  assessment_id text not null,
  synthetic_student_id uuid null references public.synthetic_students(id) on delete set null,
  profiles jsonb not null default '[]'::jsonb,
  positive_traits jsonb not null default '[]'::jsonb,
  score double precision not null default 0,
  time_seconds double precision not null default 0,
  item_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists class_actual_results_class_id_idx on public.class_actual_results(class_id);
create index if not exists class_actual_results_assessment_id_idx on public.class_actual_results(assessment_id);
create index if not exists class_actual_results_student_id_idx on public.class_actual_results(synthetic_student_id);

create table if not exists public.class_assessment_deltas (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  assessment_id text not null,
  timing_delta double precision not null default 0,
  confusion_delta double precision not null default 0,
  accuracy_delta double precision not null default 0,
  profile_deltas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (class_id, assessment_id)
);

create index if not exists class_assessment_deltas_class_id_idx on public.class_assessment_deltas(class_id);
create index if not exists class_assessment_deltas_assessment_id_idx on public.class_assessment_deltas(assessment_id);

alter table public.class_actual_results enable row level security;
alter table public.class_assessment_deltas enable row level security;

drop policy if exists "service_role_all_class_actual_results" on public.class_actual_results;
create policy "service_role_all_class_actual_results" on public.class_actual_results
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_all_class_assessment_deltas" on public.class_assessment_deltas;
create policy "service_role_all_class_assessment_deltas" on public.class_assessment_deltas
  for all
  to service_role
  using (true)
  with check (true);
