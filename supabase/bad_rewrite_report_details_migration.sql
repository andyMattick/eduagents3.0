-- ============================================================
-- Migration: extend bad_rewrite_reports with structured triage fields
-- ============================================================

alter table public.bad_rewrite_reports
  add column if not exists teacher_input text,
  add column if not exists expected_output text,
  add column if not exists what_was_wrong text,
  add column if not exists additional_context text;

create index if not exists idx_bad_rewrite_reports_triage
  on public.bad_rewrite_reports(created_at desc, section_id);

drop view if exists public.admin_bad_rewrite_reports_recent;

create or replace view public.admin_bad_rewrite_reports_recent as
select
  id,
  actor_key,
  user_id,
  section_id,
  original,
  rewritten,
  reason,
  teacher_input,
  expected_output,
  what_was_wrong,
  additional_context,
  created_at
from public.bad_rewrite_reports
order by created_at desc;
