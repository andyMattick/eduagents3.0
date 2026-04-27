create table if not exists teacher_feedback (
  feedback_id uuid primary key,
  teacher_id text not null,
  document_id text not null,
  canonical_problem_id text not null,
  target text not null,
  ai_value jsonb,
  teacher_value jsonb,
  rationale text,
  evidence jsonb,
  created_at timestamptz default now()
);

create table if not exists problem_overrides (
  canonical_problem_id text primary key,
  overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists cognitive_templates (
  id text primary key,
  teacher_id text not null,
  source_feedback_id text not null,
  evidence_text text not null,
  subject text,
  domain text,
  bloom jsonb,
  difficulty_boost double precision,
  misconception_risk_boost double precision,
  multi_step_boost double precision,
  created_at timestamptz default now()
);

create table if not exists teacher_action_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  problem_id text not null,
  action_type text not null,
  old_value jsonb,
  new_value jsonb,
  context jsonb,
  created_at timestamptz default now()
);

create index if not exists teacher_action_events_problem_idx on teacher_action_events(problem_id);
create index if not exists teacher_action_events_teacher_idx on teacher_action_events(teacher_id);
create index if not exists teacher_action_events_action_idx on teacher_action_events(action_type);

create table if not exists template_learning_records (
  template_id text primary key,
  strong_matches int default 0,
  weak_matches int default 0,
  teacher_overrides int default 0,
  expected_steps_corrections int default 0,
  drift_score float default 0,
  last_updated timestamptz default now()
);