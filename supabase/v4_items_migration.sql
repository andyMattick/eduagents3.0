-- Migration: v4_items
-- Stores structured assessment items extracted from uploaded documents.
-- PII must NEVER appear in this table (no student/teacher names, no school names).

CREATE TABLE IF NOT EXISTS v4_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid        NOT NULL,
  item_number         integer     NOT NULL,
  type                text        NOT NULL DEFAULT 'question',
  stem                text        NOT NULL DEFAULT '',
  choices             jsonb       NULL,
  answer_key          jsonb       NULL,
  metadata            jsonb       NOT NULL DEFAULT '{}',
  source_page_numbers integer[]   NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient lookups by document
CREATE INDEX IF NOT EXISTS v4_items_document_id_idx
  ON v4_items (document_id);

CREATE INDEX IF NOT EXISTS v4_items_document_id_item_number_idx
  ON v4_items (document_id, item_number);

-- RLS: service role only (no direct client access)
ALTER TABLE v4_items ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON v4_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
