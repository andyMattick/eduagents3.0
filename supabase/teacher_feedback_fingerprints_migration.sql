create table if not exists assessment_fingerprints (
  assessment_id text primary key,
  teacher_id text not null,
  unit_id text,
  concept_profiles jsonb not null default '[]'::jsonb,
  flow_profile jsonb not null default '{}'::jsonb,
  item_count integer not null default 0,
  source_type text not null,
  last_updated timestamptz default now(),
  version integer not null default 1
);

create index if not exists assessment_fingerprints_teacher_idx on assessment_fingerprints(teacher_id);
create index if not exists assessment_fingerprints_unit_idx on assessment_fingerprints(teacher_id, unit_id);

create table if not exists unit_fingerprints (
  teacher_id text not null,
  unit_id text not null,
  concept_profiles jsonb not null default '[]'::jsonb,
  flow_profile jsonb not null default '{}'::jsonb,
  derived_from_assessment_ids jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now(),
  version integer not null default 1,
  primary key (teacher_id, unit_id)
);
