-- Migration: v4_rewrite_runs
-- Stores rewrite results produced by /api/v4/rewrite for a given document.
-- One row per rewrite session; multiple rewrites for the same document are
-- kept as separate rows ordered by created_at.

CREATE TABLE IF NOT EXISTS v4_rewrite_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid        NOT NULL,
  rewritten_items jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup of all rewrites for a document (latest first)
CREATE INDEX IF NOT EXISTS v4_rewrite_runs_document_id_idx
  ON v4_rewrite_runs (document_id, created_at DESC);

-- RLS: service role only (no direct client access)
ALTER TABLE v4_rewrite_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON v4_rewrite_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
