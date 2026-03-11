-- Supabase Schema for Scribe Journal Tables
-- This enables ledger-driven learning: every Writer run and every slot is recorded,
-- auditable, and feeds teacher/course profile updates safely.

-- ============================================================
-- TABLE 1: writer_runs
-- ============================================================
-- One row per Writer execution.
-- Aggregate stats across all slots in that run.

create table if not exists writer_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Foreign keys
  assessment_id uuid,
  teacher_id uuid,
  course_id uuid,

  -- Metadata
  run_label text,  -- optional: "draft-1", "iteration-2", etc.

  -- Generation method usage
  total_slots int not null,
  template_slots_used int not null default 0,
  diagram_slots_used int not null default 0,
  image_slots_used int not null default 0,
  llm_slots_used int not null default 0,

  -- Structure
  section_count int not null default 0,

  -- Difficulty distribution
  difficulty_easy int not null default 0,
  difficulty_medium int not null default 0,
  difficulty_hard int not null default 0,

  -- Bloom distribution
  bloom_recall int not null default 0,
  bloom_understand int not null default 0,
  bloom_apply int not null default 0,
  bloom_analyze int not null default 0,
  bloom_evaluate int not null default 0,
  bloom_create int not null default 0,

  -- Gatekeeper pass/fail
  gatekeeper_passed int not null default 0,
  gatekeeper_failed int not null default 0,
  gatekeeper_needs_rewrite int not null default 0,

  -- Metadata for future analysis
  metadata jsonb not null default '{}'::jsonb,

  unique(assessment_id, created_at)
);

create index if not exists idx_writer_runs_teacher_id on writer_runs(teacher_id);
create index if not exists idx_writer_runs_course_id on writer_runs(course_id);
create index if not exists idx_writer_runs_assessment_id on writer_runs(assessment_id);

-- ============================================================
-- TABLE 2: writer_run_slots
-- ============================================================
-- One row per slot inside a run.
-- Full audit trail of Writer output + Gatekeeper validation.

create table if not exists writer_run_slots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references writer_runs(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Slot identity
  slot_id text not null,
  question_type text not null,

  -- Generation routing
  generation_method text not null,
  template_id text,
  diagram_type text,
  image_reference_id text,

  -- Cognitive + difficulty
  difficulty text not null,
  cognitive_demand text,

  -- Style + structure
  topic_angle text,
  pacing_seconds int,

  -- Gatekeeper validation
  gatekeeper_status text not null,
  gatekeeper_issues jsonb not null default '[]'::jsonb,

  -- Raw Writer output for audit + future re-generation
  prompt text not null,
  answer text,
  options jsonb,
  passage text,
  questions jsonb,

  -- Metadata
  metadata jsonb not null default '{}'::jsonb,

  unique(run_id, slot_id)
);

create index if not exists idx_writer_run_slots_run_id on writer_run_slots(run_id);
create index if not exists idx_writer_run_slots_generation_method on writer_run_slots(generation_method);
create index if not exists idx_writer_run_slots_gatekeeper_status on writer_run_slots(gatekeeper_status);

-- ============================================================
-- TABLE 3: teacher_style_patterns
-- ============================================================
-- Learned patterns from all Writer runs for a teacher.
-- Feeds profile updates in a safe, aggregated way.

create table if not exists teacher_style_patterns (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Pattern type
  pattern_name text not null,
  pattern_value text not null,

  -- Confidence (0.0-1.0)
  confidence numeric(3,2) not null default 0.5,

  -- Count of observations
  observation_count int not null default 1,

  -- Metadata
  metadata jsonb not null default '{}'::jsonb,

  unique(teacher_id, pattern_name, pattern_value)
);

create index if not exists idx_teacher_style_patterns_teacher_id on teacher_style_patterns(teacher_id);

-- ============================================================
-- TABLE 4: course_concept_clusters
-- ============================================================
-- Learned concept clusters from all assessments in a course.
-- Feeds concept graph + course defaults.

create table if not exists course_concept_clusters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Concept identity
  concept_name text not null,
  concept_standards jsonb not null default '[]'::jsonb,
  concept_skills jsonb not null default '[]'::jsonb,

  -- Frequency + confidence
  frequency int not null default 1,
  confidence numeric(3,2) not null default 0.5,

  -- Bloom distribution for this concept
  bloom_distribution jsonb not null default '{}'::jsonb,

  -- Metadata
  metadata jsonb not null default '{}'::jsonb,

  unique(course_id, concept_name)
);

create index if not exists idx_course_concept_clusters_course_id on course_concept_clusters(course_id);

-- ============================================================
-- GRANTS (if using row-level security)
-- ============================================================
-- Uncomment if you want RLS:

-- alter table writer_runs enable row level security;
-- alter table writer_run_slots enable row level security;
-- alter table teacher_style_patterns enable row level security;
-- alter table course_concept_clusters enable row level security;

-- create policy "teachers_can_read_own_runs"
--   on writer_runs
--   for select
--   using (auth.uid()::uuid = teacher_id);

-- ============================================================
-- END SCHEMA
-- ============================================================
