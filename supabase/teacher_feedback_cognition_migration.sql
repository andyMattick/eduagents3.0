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
  created_at timestamptz default now()
);