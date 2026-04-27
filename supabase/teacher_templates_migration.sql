-- ============================================================
-- teacher_templates migration
-- Stores teacher-authored templates keyed by (path, teacher_id)
-- ============================================================

create table if not exists public.teacher_templates (
  path text not null,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_templates_pkey primary key (path, teacher_id)
);

create index if not exists idx_teacher_templates_teacher_id
  on public.teacher_templates (teacher_id);

alter table public.teacher_templates enable row level security;

create policy "teacher_templates: own rows select"
  on public.teacher_templates for select
  using (auth.uid() = teacher_id);

create policy "teacher_templates: own rows insert"
  on public.teacher_templates for insert
  with check (auth.uid() = teacher_id);

create policy "teacher_templates: own rows update"
  on public.teacher_templates for update
  using (auth.uid() = teacher_id);

create policy "teacher_templates: own rows delete"
  on public.teacher_templates for delete
  using (auth.uid() = teacher_id);