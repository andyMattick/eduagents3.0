-- Migration: Unified ingestion architecture
-- Adds: v4_sections, v4_analysis, doc_type column on prism_v4_documents

-- ---------------------------------------------------------------------------
-- 1. doc_type column on prism_v4_documents
-- ---------------------------------------------------------------------------

ALTER TABLE public.prism_v4_documents
  ADD COLUMN IF NOT EXISTS doc_type text CHECK (doc_type IN ('problem', 'notes', 'mixed'));

-- ---------------------------------------------------------------------------
-- 2. v4_sections — stores segmented note/mixed document sections
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_sections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       text        NOT NULL,
  section_id        text        NOT NULL,
  "order"           integer     NOT NULL,
  title             text        NULL,
  text              text        NOT NULL DEFAULT '',
  metadata          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v4_sections_document_id_idx
  ON v4_sections (document_id);

CREATE INDEX IF NOT EXISTS v4_sections_document_id_order_idx
  ON v4_sections (document_id, "order");

ALTER TABLE v4_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON v4_sections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. v4_analysis — structured analysis per document (replaces opaque JSONB blob)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_analysis (
  document_id       text        PRIMARY KEY,
  doc_type          text        CHECK (doc_type IN ('problem', 'notes', 'mixed')),
  summary           text        NULL,
  key_concepts      jsonb       NOT NULL DEFAULT '[]',
  misconceptions    jsonb       NOT NULL DEFAULT '[]',
  cognitive_load    jsonb       NOT NULL DEFAULT '{}',
  charts            jsonb       NOT NULL DEFAULT '{}',
  metadata          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE v4_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON v4_analysis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
