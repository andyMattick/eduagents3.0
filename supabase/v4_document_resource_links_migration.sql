-- v4_document_resource_links_migration.sql
-- Stores explicit links for companion uploads such as answer keys and worked solutions.

create table if not exists public.v4_document_resource_links (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  document_id text not null,
  resource_document_id text not null,
  resource_type text not null check (resource_type in ('answer-key', 'worked-solution', 'rubric', 'prep-doc')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.v4_document_resource_links
  add column if not exists session_id text;

alter table public.v4_document_resource_links
  add column if not exists document_id text;

alter table public.v4_document_resource_links
  add column if not exists resource_document_id text;

alter table public.v4_document_resource_links
  add column if not exists resource_type text;

alter table public.v4_document_resource_links
  add column if not exists content_text text;

alter table public.v4_document_resource_links
  add column if not exists created_at timestamptz not null default now();

alter table public.v4_document_resource_links
  add column if not exists updated_at timestamptz not null default now();

alter table public.v4_document_resource_links
  drop constraint if exists v4_document_resource_links_resource_type_check;

alter table public.v4_document_resource_links
  add constraint v4_document_resource_links_resource_type_check
  check (resource_type in ('answer-key', 'worked-solution', 'rubric', 'prep-doc'));

create unique index if not exists v4_document_resource_links_unique
  on public.v4_document_resource_links (session_id, document_id, resource_document_id, resource_type);

create index if not exists v4_document_resource_links_session_idx
  on public.v4_document_resource_links (session_id, document_id);

create index if not exists v4_document_resource_links_resource_idx
  on public.v4_document_resource_links (resource_document_id);

