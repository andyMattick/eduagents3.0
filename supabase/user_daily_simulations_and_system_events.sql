-- Migration: simulation daily quota + admin observability tables

create table if not exists public.user_daily_simulations (
  actor_key text not null,
  user_id uuid null,
  usage_date date not null,
  simulations_run integer not null default 0,
  tier text not null default 'free',
  admin_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_daily_simulations_actor_date_unique unique (actor_key, usage_date)
);

create index if not exists user_daily_simulations_user_id_idx
  on public.user_daily_simulations (user_id);

create index if not exists user_daily_simulations_usage_date_idx
  on public.user_daily_simulations (usage_date);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  actor_key text null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_events_type_created_idx
  on public.system_events (event_type, created_at desc);

create index if not exists system_events_user_created_idx
  on public.system_events (user_id, created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values
  ('limits.upload', '{"free":20,"teacher":100,"school":500}'::jsonb),
  ('limits.simulation', '{"free":10,"teacher":50,"school":100}'::jsonb)
on conflict (key) do nothing;
