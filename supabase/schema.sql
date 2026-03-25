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
  id                 uuid        PRIMARY KEY DEFAULT session.user.id(),
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
-- 4. DOSSIERS  (unified — one row per user)
--    Combines agent governance metrics (trust, stability,
--    weaknesses, domain mastery) with pipeline run history.
--    Replaces both the old system_agent_dossiers and dossiers
--    tables.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossiers (
  id                  uuid        PRIMARY KEY DEFAULT session.user.id(),
  user_id             uuid        NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,

  -- Agent governance dossiers (JSONB objects)
  writer_dossier      jsonb       NOT NULL DEFAULT '{}',
  architect_dossier   jsonb       NOT NULL DEFAULT '{}',
  astronomer_dossier  jsonb       NOT NULL DEFAULT '{}',

  -- Pipeline run history (JSONB arrays)
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

-- Migration helper: drop the old system_agent_dossiers table if it exists.
-- Uncomment the next line when you are ready to drop it from a live database:
-- DROP TABLE IF EXISTS public.system_agent_dossiers;


-- ────────────────────────────────────────────────────────────
-- 5. TEACHER_GUARDRAILS
--    Per-(teacher, agentType, domain) behavioral guardrails.
--    SCRIBE writes one row per combination, versioned with
--    optimistic concurrency (version column).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_guardrails (
  id           uuid        PRIMARY KEY DEFAULT session.user.id(),
  teacher_id   uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  agent_type   text        NOT NULL,
  domain       text        NOT NULL DEFAULT 'General',
  guardrails   jsonb       NOT NULL DEFAULT '[]',
  run_count    integer     NOT NULL DEFAULT 0,
  version      integer     NOT NULL DEFAULT 1,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (teacher_id, agent_type, domain)
);

CREATE INDEX IF NOT EXISTS idx_tg_teacher_agent_domain
  ON public.teacher_guardrails (teacher_id, agent_type, domain);

ALTER TABLE public.teacher_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tg: own rows select"
  ON public.teacher_guardrails FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "tg: own rows insert"
  ON public.teacher_guardrails FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "tg: own rows update"
  ON public.teacher_guardrails FOR UPDATE
  USING (auth.uid() = teacher_id);


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

-- Only fire on INSERT (not UPDATE) — Supabase internally updates auth.users
-- rows frequently (last_sign_in, etc.) and we don't want those to cascade.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ────────────────────────────────────────────────────────────
-- 7. BACKFILL
--    Retroactively create teachers rows for any auth.users
--    that signed up before this schema was applied.
--    Safe to re-run (ON CONFLICT DO NOTHING).
-- ────────────────────────────────────────────────────────────
INSERT INTO public.teachers (id, email, name, school_name)
SELECT
  id,
  email,
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'schoolName'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 8. ASSESSMENT_RESULTS  (Phase 4)
--    One row per teacher-submitted result set, tied to a
--    specific assessment version.  Stores the raw per-question
--    performance data and the AI-generated analysis.
--
--    performance_json shape:
--      [{ "questionNumber": 1, "percentCorrect": 85 }, ...]
--
--    analysis_json shape (filled after AI analysis):
--      {
--        "overallAssessmentHealth": "Strong" | "Needs Adjustment",
--        "confusionHotspots": [...],
--        "pacingIssues": string | null,
--        "distractorIssues": [...],
--        "cognitiveLoadObservations": [...],
--        "recommendedAdjustments": [...]
--      }
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id uuid        NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  performance_json      jsonb       NOT NULL,
  analysis_json         jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_version_created
  ON public.assessment_results (assessment_version_id, created_at DESC);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- Teachers may only access results linked to versions they own.
-- The join goes: assessment_results → assessment_versions → assessment_templates → user_id
CREATE POLICY "ar: own rows select"
  ON public.assessment_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_versions av
      JOIN public.assessment_templates at ON at.id = av.template_id
      WHERE av.id = assessment_results.assessment_version_id
        AND at.user_id = auth.uid()
    )
  );

CREATE POLICY "ar: own rows insert"
  ON public.assessment_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assessment_versions av
      JOIN public.assessment_templates at ON at.id = av.template_id
      WHERE av.id = assessment_version_id
        AND at.user_id = auth.uid()
    )
  );

CREATE POLICY "ar: own rows update"
  ON public.assessment_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_versions av
      JOIN public.assessment_templates at ON at.id = av.template_id
      WHERE av.id = assessment_results.assessment_version_id
        AND at.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- 9. MIGRATIONS  (run after initial schema is applied)
-- ────────────────────────────────────────────────────────────

-- Phase 5 prep: decouple "active" from "latest generated".
--
-- latest_version_id  = most recently generated version
--                      (updated automatically by SCRIBE on every generation)
-- active_version_id  = teacher-assigned active / distributed version
--                      (updated only by explicit teacher action via UI)
--
-- This ensures that if a teacher generates V4 after distributing V3,
-- V3 remains the active version and analytics stay anchored to it.
ALTER TABLE public.assessment_templates
  ADD COLUMN IF NOT EXISTS active_version_id uuid
    REFERENCES public.assessment_versions(id) ON DELETE SET NULL;

-- Phase 4 note: assessment_results allows multiple rows per version.
-- The most recent row (ORDER BY created_at DESC LIMIT 1) is canonical.
-- performance_json shape (enforced in application layer):
--   { "itemStats": [ { "questionNumber": <int>, "percentCorrect": <0-100> }, ... ] }

-- ────────────────────────────────────────────────────────────
-- 10. PIPELINE REPORTS
--     Structured records of pipeline issues, sent voluntarily
--     by teachers via the "Send Report" banner. Stores the full
--     diagnostic context for triage without exposing raw traces
--     to teachers.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pipeline_reports (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  assessment_version_id uuid        REFERENCES public.assessment_versions(id) ON DELETE SET NULL,

  -- Classification output from classifyTrace()
  severity              text        NOT NULL CHECK (severity IN ('none','warning','error')),
  category              text        NOT NULL CHECK (category IN ('writer','architect','inputJudge','gatekeeper','orchestrator','unknown')),
  faulting_agent        text,
  summary               text        NOT NULL,
  probable_cause        text,
  suggested_fix         text,
  signals               jsonb       NOT NULL DEFAULT '[]',

  -- Context snapshots (copied at report time — versions may be deleted later)
  blueprint_json        jsonb,
  token_usage           jsonb,
  quality_score         integer,
  uar_json              jsonb,

  -- Optional teacher note (one-click send, note is optional)
  teacher_note          text,

  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_user_created
  ON public.pipeline_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pr_severity_category
  ON public.pipeline_reports (severity, category, created_at DESC);

ALTER TABLE public.pipeline_reports ENABLE ROW LEVEL SECURITY;

-- Teachers can only insert their own reports
CREATE POLICY "pr: own rows insert"
  ON public.pipeline_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers can read their own reports (optional — for a "my reports" view later)
CREATE POLICY "pr: own rows select"
  ON public.pipeline_reports FOR SELECT
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 11. TEACHER TEMPLATES
--     Stores teacher-authored derived templates keyed by
--     (path, teacher_id) and loaded by the template registry.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teacher_templates (
  path        text        NOT NULL,
  teacher_id  uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  data        jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_templates_pkey PRIMARY KEY (path, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_templates_teacher_id
  ON public.teacher_templates (teacher_id);

ALTER TABLE public.teacher_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_templates: own rows select"
  ON public.teacher_templates FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "teacher_templates: own rows insert"
  ON public.teacher_templates FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "teacher_templates: own rows update"
  ON public.teacher_templates FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "teacher_templates: own rows delete"
  ON public.teacher_templates FOR DELETE
  USING (auth.uid() = teacher_id);


-- ────────────────────────────────────────────────────────────
-- 11B. TEACHER ACTION EVENTS
--      Append-only teacher corrections used to aggregate
--      template learning signals.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_action_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  problem_id  text        NOT NULL,
  action_type text        NOT NULL,
  old_value   jsonb,
  new_value   jsonb,
  context     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_action_events_problem
  ON public.teacher_action_events (problem_id);

CREATE INDEX IF NOT EXISTS idx_teacher_action_events_teacher
  ON public.teacher_action_events (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_action_events_action
  ON public.teacher_action_events (action_type);


-- ────────────────────────────────────────────────────────────
-- 11C. TEMPLATE LEARNING RECORDS
--      Aggregated weekly drift-aware learning signals keyed by
--      template id.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.template_learning_records (
  template_id                   text        PRIMARY KEY,
  strong_matches                integer     NOT NULL DEFAULT 0,
  weak_matches                  integer     NOT NULL DEFAULT 0,
  teacher_overrides             integer     NOT NULL DEFAULT 0,
  expected_steps_corrections    integer     NOT NULL DEFAULT 0,
  drift_score                   double precision NOT NULL DEFAULT 0,
  last_updated                  timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 12. JOBS
--     Async job queue for long-running pipeline operations.
--     Status lifecycle: pending → running → succeeded | failed
--     The UI creates a job, polls for status, and reads output
--     once succeeded.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','running','succeeded','failed')),
  input       jsonb       NOT NULL DEFAULT '{}',
  output      jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_status
  ON public.jobs (user_id, status, created_at DESC);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs: own rows select"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "jobs: own rows insert"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs: own rows update"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 13. DOCUMENTS
--     Stores extracted document text for reuse across pipeline
--     runs (document memory).  Linked to the owning teacher.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title       text,
  content     text        NOT NULL,
  content_hash text,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_user
  ON public.documents (user_id, created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents: own rows select"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "documents: own rows insert"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents: own rows update"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "documents: own rows delete"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 14. DOCUMENT_CHUNKS
--     Chunked + embedded text for vector search (RAG).
--     embedding column stored as a vector(768) for pgvector
--     compatibility — enable the extension first:
--       CREATE EXTENSION IF NOT EXISTS vector;
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  content       text        NOT NULL,
  embedding     vector(768),
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document
  ON public.document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_chunks_user
  ON public.document_chunks (user_id);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunks: own rows select"
  ON public.document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chunks: own rows insert"
  ON public.document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chunks: own rows delete"
  ON public.document_chunks FOR DELETE
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 15. MATCH_CHUNKS — pgvector cosine similarity search
--     Called via Supabase RPC: supabase.rpc('match_chunks', { ... })
--     Returns the top N most similar chunks for a given user.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(768),
  p_user_id uuid,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.user_id = p_user_id
    AND dc.embedding IS NOT NULL
    AND (dc.embedding <=> query_embedding) < (1 - similarity_threshold)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
