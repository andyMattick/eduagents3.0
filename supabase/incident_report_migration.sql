-- ============================================================
-- Migration: add incident_json to pipeline_reports
-- Run this once against your Supabase project via the SQL editor
-- or CLI: supabase db push / psql
-- ============================================================

-- 1. Add the column (safe to run multiple times — IF NOT EXISTS guard)
ALTER TABLE public.pipeline_reports
  ADD COLUMN IF NOT EXISTS incident_json JSONB;

-- 2. GIN index for fast filtering/searching inside the JSON blob
--    (e.g. querying teacher intent topics or prescription rules)
CREATE INDEX IF NOT EXISTS idx_pipeline_reports_incident_json
  ON public.pipeline_reports USING gin(incident_json)
  WHERE incident_json IS NOT NULL;

-- 3. Comment for documentation
COMMENT ON COLUMN public.pipeline_reports.incident_json IS
  'Deterministic 7-section governance report built by buildIncidentReport(). '
  'Sections: teacher_intent, defaults_used, prescriptions_added, pipeline_status, '
  'rewrite_history, system_analysis, final_output.';
