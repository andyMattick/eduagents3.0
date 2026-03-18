-- ============================================================
-- Migration: synchronize the full RAG schema stack
--
-- Safe to run on Supabase projects that may already have some
-- or all of these objects. This migration ensures:
--   1. pgvector extension is enabled
--   2. public.documents has content_hash + dedup index
--   3. public.document_chunks exists with expected indexes/RLS
--   4. public.match_chunks RPC exists with the expected signature
--   5. PostgREST schema cache is reloaded
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title        text,
  content      text        NOT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_user
  ON public.documents (user_id, created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents: own rows select'
  ) THEN
    CREATE POLICY "documents: own rows select"
      ON public.documents FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents: own rows insert'
  ) THEN
    CREATE POLICY "documents: own rows insert"
      ON public.documents FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents: own rows update'
  ) THEN
    CREATE POLICY "documents: own rows update"
      ON public.documents FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents: own rows delete'
  ) THEN
    CREATE POLICY "documents: own rows delete"
      ON public.documents FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

COMMENT ON COLUMN public.documents.content_hash IS
  'SHA-256 hash of document content used for per-user deduplication.';

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  embedding    vector(768),
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document
  ON public.document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_chunks_user
  ON public.document_chunks (user_id);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'document_chunks' AND policyname = 'chunks: own rows select'
  ) THEN
    CREATE POLICY "chunks: own rows select"
      ON public.document_chunks FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'document_chunks' AND policyname = 'chunks: own rows insert'
  ) THEN
    CREATE POLICY "chunks: own rows insert"
      ON public.document_chunks FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'document_chunks' AND policyname = 'chunks: own rows delete'
  ) THEN
    CREATE POLICY "chunks: own rows delete"
      ON public.document_chunks FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

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

COMMENT ON FUNCTION public.match_chunks(vector, uuid, int, float) IS
  'Returns the most similar embedded document chunks for a single user.';

NOTIFY pgrst, 'reload schema';