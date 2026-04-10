-- ============================================================
-- Token Usage + Admin Observability
-- ============================================================

-- Ensure admin flag exists on teachers for policy checks.
alter table public.teachers
  add column if not exists is_admin boolean not null default false;

-- Helper function for admin-gated read policies.
create or replace function public.is_admin_user(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers t
    where t.id = uid
      and coalesce(t.is_admin, false) = true
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated;

-- -----------------------------------------------------------------
-- 1) Daily token metering (replaces document-count-only gating)
-- -----------------------------------------------------------------
create table if not exists public.user_daily_tokens (
  actor_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  tokens_used integer not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_key, date)
);

create index if not exists idx_user_daily_tokens_user_date
  on public.user_daily_tokens(user_id, date desc)
  where user_id is not null;

create index if not exists idx_user_daily_tokens_date
  on public.user_daily_tokens(date desc);

alter table public.user_daily_tokens enable row level security;

create policy "udt: own rows select"
  on public.user_daily_tokens for select
  using (auth.uid() = user_id);

create policy "udt: own rows insert"
  on public.user_daily_tokens for insert
  with check (auth.uid() = user_id);

create policy "udt: own rows update"
  on public.user_daily_tokens for update
  using (auth.uid() = user_id);

create policy "udt: admin read"
  on public.user_daily_tokens for select
  using (public.is_admin_user());

create or replace function public.increment_token_usage(
  p_actor_key text,
  p_tokens integer,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tokens is null or p_tokens <= 0 then
    return;
  end if;

  insert into public.user_daily_tokens(actor_key, user_id, date, tokens_used)
  values (p_actor_key, p_user_id, current_date, p_tokens)
  on conflict (actor_key, date)
  do update
    set tokens_used = public.user_daily_tokens.tokens_used + excluded.tokens_used,
        user_id = coalesce(public.user_daily_tokens.user_id, excluded.user_id),
        updated_at = now();
end;
$$;

revoke all on function public.increment_token_usage(text, integer, uuid) from public;
grant execute on function public.increment_token_usage(text, integer, uuid) to authenticated;

-- -----------------------------------------------------------------
-- 2) Admin-visible pipeline error log
-- -----------------------------------------------------------------
create table if not exists public.pipeline_errors (
  id bigint generated always as identity primary key,
  actor_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  endpoint text not null,
  error_message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pipeline_errors_created_at
  on public.pipeline_errors(created_at desc);

create index if not exists idx_pipeline_errors_endpoint
  on public.pipeline_errors(endpoint, created_at desc);

create index if not exists idx_pipeline_errors_user
  on public.pipeline_errors(user_id, created_at desc)
  where user_id is not null;

alter table public.pipeline_errors enable row level security;

create policy "pe: own rows select"
  on public.pipeline_errors for select
  using (auth.uid() = user_id);

create policy "pe: own rows insert"
  on public.pipeline_errors for insert
  with check (auth.uid() = user_id);

create policy "pe: admin read"
  on public.pipeline_errors for select
  using (public.is_admin_user());

-- -----------------------------------------------------------------
-- 3) Rewrite event log
-- -----------------------------------------------------------------
create table if not exists public.rewrite_events (
  id bigint generated always as identity primary key,
  actor_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  section_id text,
  applied_suggestions jsonb,
  profile text,
  original text,
  rewritten text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rewrite_events_created_at
  on public.rewrite_events(created_at desc);

create index if not exists idx_rewrite_events_user
  on public.rewrite_events(user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_rewrite_events_section
  on public.rewrite_events(section_id, created_at desc);

alter table public.rewrite_events enable row level security;

create policy "re: own rows select"
  on public.rewrite_events for select
  using (auth.uid() = user_id);

create policy "re: own rows insert"
  on public.rewrite_events for insert
  with check (auth.uid() = user_id);

create policy "re: admin read"
  on public.rewrite_events for select
  using (public.is_admin_user());

-- -----------------------------------------------------------------
-- 4) Bad rewrite reports
-- -----------------------------------------------------------------
create table if not exists public.bad_rewrite_reports (
  id bigint generated always as identity primary key,
  actor_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  section_id text,
  original text,
  rewritten text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bad_rewrite_reports_created_at
  on public.bad_rewrite_reports(created_at desc);

create index if not exists idx_bad_rewrite_reports_user
  on public.bad_rewrite_reports(user_id, created_at desc)
  where user_id is not null;

alter table public.bad_rewrite_reports enable row level security;

create policy "brr: own rows select"
  on public.bad_rewrite_reports for select
  using (auth.uid() = user_id);

create policy "brr: own rows insert"
  on public.bad_rewrite_reports for insert
  with check (auth.uid() = user_id);

create policy "brr: admin read"
  on public.bad_rewrite_reports for select
  using (public.is_admin_user());

-- -----------------------------------------------------------------
-- 5) Optional admin summary views
-- -----------------------------------------------------------------
create or replace view public.admin_token_usage_today as
select
  date,
  actor_key,
  user_id,
  tokens_used,
  created_at,
  updated_at
from public.user_daily_tokens
where date = current_date;

create or replace view public.admin_pipeline_errors_recent as
select
  id,
  actor_key,
  user_id,
  endpoint,
  error_message,
  payload,
  created_at
from public.pipeline_errors
order by created_at desc;

create or replace view public.admin_rewrite_activity_recent as
select
  id,
  actor_key,
  user_id,
  section_id,
  applied_suggestions,
  profile,
  original,
  rewritten,
  created_at
from public.rewrite_events
order by created_at desc;

create or replace view public.admin_bad_rewrite_reports_recent as
select
  id,
  actor_key,
  user_id,
  section_id,
  original,
  rewritten,
  reason,
  created_at
from public.bad_rewrite_reports
order by created_at desc;
