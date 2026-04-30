-- Upgrade user_daily_usage to page-based quota tracking.

alter table if exists public.user_daily_usage
  add column if not exists actor_key text;

alter table if exists public.user_daily_usage
  add column if not exists usage_date date;

alter table if exists public.user_daily_usage
  add column if not exists pages_uploaded integer not null default 0;

alter table if exists public.user_daily_usage
  add column if not exists tier text not null default 'free';

alter table if exists public.user_daily_usage
  add column if not exists admin_override boolean not null default false;

alter table if exists public.user_daily_usage
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.user_daily_usage
  add column if not exists updated_at timestamptz not null default now();

update public.user_daily_usage
set actor_key = coalesce(actor_key, user_id)
where actor_key is null;

update public.user_daily_usage
set usage_date = coalesce(usage_date, date)
where usage_date is null;

update public.user_daily_usage
set pages_uploaded = coalesce(pages_uploaded, count, 0)
where pages_uploaded = 0 and coalesce(count, 0) > 0;

create unique index if not exists user_daily_usage_unique_actor_date
  on public.user_daily_usage (actor_key, usage_date);

create index if not exists user_daily_usage_usage_date_idx
  on public.user_daily_usage (usage_date);

create index if not exists user_daily_usage_user_id_idx
  on public.user_daily_usage (user_id);
