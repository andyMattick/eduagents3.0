-- ============================================================
-- eduagents3.0 — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TEACHERS
--    One row per signed-up user.  id mirrors auth.users(id).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teachers (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text,
  name         text,
  school_name  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may upsert / read their own row
CREATE POLICY "teachers: own row select"
  ON public.teachers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "teachers: own row insert"
  ON public.teachers FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "teachers: own row update"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- 2. TEACHER_ASSESSMENT_HISTORY
--    One row per generated assessment.  Used by SCRIBE and
--    by getDailyUsage() to count free-tier usage.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_assessment_history (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id         uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  domain             text,
  grade              text,
  assessment_type    text,
  question_count     integer,
  question_types     text,
  difficulty_profile text,
  guardrails         jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tah_teacher_created
  ON public.teacher_assessment_history (teacher_id, created_at DESC);

ALTER TABLE public.teacher_assessment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tah: own rows select"
  ON public.teacher_assessment_history FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "tah: own rows insert"
  ON public.teacher_assessment_history FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);


-- ────────────────────────────────────────────────────────────
-- 3. TEACHER_DEFAULTS
--    Predictive defaults computed from assessment history.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_defaults (
  teacher_id               uuid        PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  preferred_assessment_type text,
  avg_question_count        integer,
  preferred_difficulty      text,
  sample_size               integer     NOT NULL DEFAULT 0,
  last_updated              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "td: own row select"
  ON public.teacher_defaults FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "td: own row insert"
  ON public.teacher_defaults FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "td: own row update"
  ON public.teacher_defaults FOR UPDATE
  USING (auth.uid() = teacher_id);


-- ────────────────────────────────────────────────────────────
-- 4. SYSTEM_AGENT_DOSSIERS
--    Per-user, per-agent-type learning dossier.
--    One row per agent instance.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_agent_dossiers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  agent_type  text        NOT NULL,
  instance_id text        NOT NULL,
  dossier     jsonb       NOT NULL DEFAULT '{}',
  version     integer     NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_type, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_sad_user_agent
  ON public.system_agent_dossiers (user_id, agent_type);

ALTER TABLE public.system_agent_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sad: own rows select"
  ON public.system_agent_dossiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sad: own rows insert"
  ON public.system_agent_dossiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sad: own rows update"
  ON public.system_agent_dossiers FOR UPDATE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 5. DOSSIERS  (UserDossierManager)
--    One row per user — stores full pipeline run history
--    as JSONB arrays per agent type.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossiers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,
  writer_history      jsonb       NOT NULL DEFAULT '[]',
  architect_history   jsonb       NOT NULL DEFAULT '[]',
  astronomer_history  jsonb       NOT NULL DEFAULT '[]',
  philosopher_history jsonb       NOT NULL DEFAULT '[]',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dossiers: own row select"
  ON public.dossiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "dossiers: own row insert"
  ON public.dossiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dossiers: own row update"
  ON public.dossiers FOR UPDATE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTION
--    Auto-creates the teachers row from auth metadata whenever
--    a new user confirms their email or signs up without
--    confirmation.  Fires as a Postgres trigger on auth.users.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.teachers (id, email, name, school_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'schoolName'
  )
  ON CONFLICT (id) DO UPDATE
    SET email       = EXCLUDED.email,
        name        = COALESCE(EXCLUDED.name, public.teachers.name),
        school_name = COALESCE(EXCLUDED.school_name, public.teachers.school_name);
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
