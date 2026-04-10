-- ============================================================
-- Rewrite Event Inspector + Token Event Correlation
-- ============================================================

-- 1) Extend rewrite events with prompt + validator diagnostics + suggestion tracking
alter table public.rewrite_events
  add column if not exists prompt text;

alter table public.rewrite_events
  add column if not exists validator_report jsonb;

alter table public.rewrite_events
  add column if not exists model text;

alter table public.rewrite_events
  add column if not exists suggestions_all jsonb;

alter table public.rewrite_events
  add column if not exists suggestions_selected jsonb;

alter table public.rewrite_events
  add column if not exists suggestions_actionable_selected jsonb;

alter table public.rewrite_events
  add column if not exists suggestions_non_actionable_selected jsonb;

-- 2) Event-level token ledger for cross-stage observability
create table if not exists public.token_usage_events (
  id bigint generated always as identity primary key,
  actor_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  rewrite_event_id bigint references public.rewrite_events(id) on delete set null,
  session_id text,
  document_id text,
  stage text not null,
  endpoint text,
  model text,
  tokens integer not null default 0 check (tokens >= 0),
  billed boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_token_usage_events_created_at
  on public.token_usage_events(created_at desc);

create index if not exists idx_token_usage_events_rewrite_event
  on public.token_usage_events(rewrite_event_id, created_at desc)
  where rewrite_event_id is not null;

create index if not exists idx_token_usage_events_actor
  on public.token_usage_events(actor_key, created_at desc);

create index if not exists idx_token_usage_events_user
  on public.token_usage_events(user_id, created_at desc)
  where user_id is not null;

alter table public.token_usage_events enable row level security;

drop policy if exists "tue: own rows select" on public.token_usage_events;
drop policy if exists "tue: own rows insert" on public.token_usage_events;
drop policy if exists "tue: admin read" on public.token_usage_events;

create policy "tue: own rows select"
  on public.token_usage_events for select
  using (auth.uid() = user_id);

create policy "tue: own rows insert"
  on public.token_usage_events for insert
  with check (auth.uid() = user_id);

create policy "tue: admin read"
  on public.token_usage_events for select
  using (public.is_admin_user());

-- 3) Admin view: per rewrite-event token totals + stage breakdown + suggestion tracking
drop view if exists public.admin_rewrite_event_token_totals;
create view public.admin_rewrite_event_token_totals as
select
  re.id as rewrite_event_id,
  re.created_at as rewrite_created_at,
  re.actor_key,
  re.user_id,
  re.section_id,
  re.profile,
  re.applied_suggestions,
  re.original,
  re.rewritten,
  re.prompt,
  re.validator_report,
  re.model,
  re.suggestions_all,
  re.suggestions_selected,
  re.suggestions_actionable_selected,
  re.suggestions_non_actionable_selected,
  coalesce(sum(tue.tokens), 0)::integer as total_tokens,
  coalesce(sum(case when tue.billed then tue.tokens else 0 end), 0)::integer as billed_tokens,
  coalesce(sum(case when not tue.billed then tue.tokens else 0 end), 0)::integer as non_billed_tokens,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', tue.id,
        'stage', tue.stage,
        'endpoint', tue.endpoint,
        'model', tue.model,
        'tokens', tue.tokens,
        'billed', tue.billed,
        'created_at', tue.created_at,
        'metadata', tue.metadata
      ) order by tue.created_at
    ) filter (where tue.id is not null),
    '[]'::jsonb
  ) as token_events
from public.rewrite_events re
left join public.token_usage_events tue
  on tue.rewrite_event_id = re.id
group by
  re.id,
  re.created_at,
  re.actor_key,
  re.user_id,
  re.section_id,
  re.profile,
  re.applied_suggestions,
  re.original,
  re.rewritten,
  re.prompt,
  re.validator_report,
  re.model,
  re.suggestions_all,
  re.suggestions_selected,
  re.suggestions_actionable_selected,
  re.suggestions_non_actionable_selected
order by re.created_at desc;

-- Keep existing lightweight activity view aligned with new columns.
drop view if exists public.admin_rewrite_activity_recent;
create view public.admin_rewrite_activity_recent as
select
  id,
  actor_key,
  user_id,
  section_id,
  applied_suggestions,
  profile,
  original,
  rewritten,
  prompt,
  validator_report,
  model,
  created_at
from public.rewrite_events
order by created_at desc;
