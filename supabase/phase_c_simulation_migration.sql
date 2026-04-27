-- Migration: Phase C classes + synthetic students + simulation runs/results

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id text null,
  name text not null,
  level text not null check (level in ('AP', 'Honors', 'Standard', 'Remedial')),
  grade_band text null check (grade_band in ('9-10', '11-12', 'Mixed')),
  overlays jsonb not null default '{}'::jsonb,
  school_year text not null,
  created_at timestamptz not null default now()
);

create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists classes_created_at_idx on public.classes(created_at desc);

create table if not exists public.synthetic_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null,
  reading_level double precision not null,
  vocabulary_level double precision not null,
  background_knowledge double precision not null,
  processing_speed double precision not null,
  bloom_mastery double precision not null,
  math_level double precision not null,
  writing_level double precision not null,
  profiles jsonb not null default '[]'::jsonb,
  positive_traits jsonb not null default '[]'::jsonb,
  profile_summary_label text not null default '',
  biases jsonb not null default '{"confusionBias":0,"timeBias":0}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists synthetic_students_class_id_idx on public.synthetic_students(class_id);

create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  document_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists simulation_runs_class_id_idx on public.simulation_runs(class_id);
create index if not exists simulation_runs_document_id_idx on public.simulation_runs(document_id);

create table if not exists public.simulation_results (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulation_runs(id) on delete cascade,
  synthetic_student_id uuid not null references public.synthetic_students(id) on delete cascade,
  item_id text not null,
  item_label text not null,
  linguistic_load double precision not null,
  confusion_score double precision not null,
  time_seconds double precision not null,
  bloom_gap double precision not null,
  difficulty_score double precision not null default 0,
  ability_score double precision not null default 0,
  p_correct double precision not null default 0,
  traits_snapshot jsonb null,
  created_at timestamptz not null default now()
);

alter table public.simulation_results
  add column if not exists difficulty_score double precision not null default 0;

alter table public.simulation_results
  add column if not exists ability_score double precision not null default 0;

alter table public.simulation_results
  add column if not exists p_correct double precision not null default 0;

create index if not exists simulation_results_simulation_id_idx on public.simulation_results(simulation_id);
create index if not exists simulation_results_student_id_idx on public.simulation_results(synthetic_student_id);

alter table public.classes enable row level security;
alter table public.synthetic_students enable row level security;
alter table public.simulation_runs enable row level security;
alter table public.simulation_results enable row level security;

drop policy if exists "service_role_all_classes" on public.classes;
create policy "service_role_all_classes" on public.classes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_all_synthetic_students" on public.synthetic_students;
create policy "service_role_all_synthetic_students" on public.synthetic_students
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_all_simulation_runs" on public.simulation_runs;
create policy "service_role_all_simulation_runs" on public.simulation_runs
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_all_simulation_results" on public.simulation_results;
create policy "service_role_all_simulation_results" on public.simulation_results
  for all
  to service_role
  using (true)
  with check (true);
