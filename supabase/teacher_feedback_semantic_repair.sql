BEGIN;

CREATE TABLE IF NOT EXISTS public.teacher_feedback (
  feedback_id uuid PRIMARY KEY,
  teacher_id text NOT NULL,
  document_id text NOT NULL,
  canonical_problem_id text NOT NULL,
  target text NOT NULL,
  ai_value jsonb,
  teacher_value jsonb,
  rationale text,
  evidence jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_feedback
  ADD COLUMN IF NOT EXISTS teacher_id text,
  ADD COLUMN IF NOT EXISTS document_id text,
  ADD COLUMN IF NOT EXISTS canonical_problem_id text,
  ADD COLUMN IF NOT EXISTS target text,
  ADD COLUMN IF NOT EXISTS ai_value jsonb,
  ADD COLUMN IF NOT EXISTS teacher_value jsonb,
  ADD COLUMN IF NOT EXISTS rationale text,
  ADD COLUMN IF NOT EXISTS evidence jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.teacher_feedback
SET ai_value = '{}'::jsonb
WHERE ai_value IS NULL;

ALTER TABLE public.teacher_feedback
  ALTER COLUMN ai_value SET DEFAULT '{}'::jsonb,
  ALTER COLUMN ai_value DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.cognitive_templates (
  id text PRIMARY KEY,
  teacher_id text NOT NULL,
  source_feedback_id text NOT NULL,
  evidence_text text NOT NULL,
  subject text,
  domain text,
  bloom jsonb,
  difficulty_boost double precision,
  misconception_risk_boost double precision,
  multi_step_boost double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cognitive_templates
  ADD COLUMN IF NOT EXISTS teacher_id text,
  ADD COLUMN IF NOT EXISTS source_feedback_id text,
  ADD COLUMN IF NOT EXISTS evidence_text text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS bloom jsonb,
  ADD COLUMN IF NOT EXISTS difficulty_boost double precision,
  ADD COLUMN IF NOT EXISTS misconception_risk_boost double precision,
  ADD COLUMN IF NOT EXISTS multi_step_boost double precision,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.problem_overrides (
  canonical_problem_id text PRIMARY KEY,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  problem_id text NOT NULL,
  action_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_action_events_problem_idx ON public.teacher_action_events(problem_id);
CREATE INDEX IF NOT EXISTS teacher_action_events_teacher_idx ON public.teacher_action_events(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_action_events_action_idx ON public.teacher_action_events(action_type);

CREATE TABLE IF NOT EXISTS public.template_learning_records (
  template_id text PRIMARY KEY,
  strong_matches int DEFAULT 0,
  weak_matches int DEFAULT 0,
  teacher_overrides int DEFAULT 0,
  expected_steps_corrections int DEFAULT 0,
  drift_score float DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

NOTIFY pgrst, 'reload schema';

COMMIT;
