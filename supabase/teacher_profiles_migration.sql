-- ============================================================
-- Teacher Profiles — Stable Defaults for Constraint Injection
-- Run in Supabase SQL Editor after the main schema.sql
-- ============================================================

create table if not exists public.teacher_profiles (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  profile    jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;

-- Teacher can read/update only their own row
create policy "tp: own row select"
  on public.teacher_profiles for select
  using (auth.uid() = user_id);

create policy "tp: own row insert"
  on public.teacher_profiles for insert
  with check (auth.uid() = user_id);

create policy "tp: own row update"
  on public.teacher_profiles for update
  using (auth.uid() = user_id);

-- Service role has unrestricted access (server-side operations)
-- No explicit policy needed — service role bypasses RLS by default.
