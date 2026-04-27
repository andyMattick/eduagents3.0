-- ============================================================
-- Migration: admin read access for teacher roster
-- ============================================================

drop policy if exists "teachers: admin row select" on public.teachers;

create policy "teachers: admin row select"
  on public.teachers for select
  using (public.is_admin_user());
