-- ============================================================
-- Migration: add content_hash support to public.documents
-- Run this against any Supabase project created before the
-- deduplication update landed in lib/rag.ts.
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN public.documents.content_hash IS
  'SHA-256 hash of document content used for per-user deduplication.';