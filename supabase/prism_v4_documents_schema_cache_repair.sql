-- Repair migration for missing public.prism_v4_documents and stale PostgREST schema cache
-- Fixes PGRST205 errors like:
--   Could not find the table 'public.prism_v4_documents' in the schema cache

BEGIN;

CREATE TABLE IF NOT EXISTS public.prism_v4_sessions (
  session_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_sessions
  ADD COLUMN IF NOT EXISTS document_ids jsonb,
  ADD COLUMN IF NOT EXISTS document_roles jsonb,
  ADD COLUMN IF NOT EXISTS session_roles jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.prism_v4_sessions
SET
  document_ids = COALESCE(document_ids, '[]'::jsonb),
  document_roles = COALESCE(document_roles, '{}'::jsonb),
  session_roles = COALESCE(session_roles, '{}'::jsonb),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE
  document_ids IS NULL
  OR document_roles IS NULL
  OR session_roles IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.prism_v4_sessions
  ALTER COLUMN document_ids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN document_roles SET DEFAULT '{}'::jsonb,
  ALTER COLUMN session_roles SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN document_ids SET NOT NULL,
  ALTER COLUMN document_roles SET NOT NULL,
  ALTER COLUMN session_roles SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.prism_v4_documents (
  document_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_documents
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_mime_type text,
  ADD COLUMN IF NOT EXISTS raw_binary_base64 text,
  ADD COLUMN IF NOT EXISTS canonical_document jsonb,
  ADD COLUMN IF NOT EXISTS azure_extract jsonb,
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.prism_v4_documents
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

ALTER TABLE public.prism_v4_documents
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_documents_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_documents
      ADD CONSTRAINT prism_v4_documents_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_documents_session_id
  ON public.prism_v4_documents(session_id);

CREATE INDEX IF NOT EXISTS idx_prism_v4_documents_created_at
  ON public.prism_v4_documents(created_at DESC);

CREATE TABLE IF NOT EXISTS public.prism_v4_analyzed_documents (
  document_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_analyzed_documents
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS analyzed_document jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.prism_v4_analyzed_documents
SET
  analyzed_document = COALESCE(analyzed_document, '{}'::jsonb),
  updated_at = COALESCE(updated_at, now())
WHERE analyzed_document IS NULL OR updated_at IS NULL;

ALTER TABLE public.prism_v4_analyzed_documents
  ALTER COLUMN analyzed_document SET DEFAULT '{}'::jsonb,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN analyzed_document SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_analyzed_documents_document_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_analyzed_documents
      ADD CONSTRAINT prism_v4_analyzed_documents_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.prism_v4_documents(document_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_analyzed_documents_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_analyzed_documents
      ADD CONSTRAINT prism_v4_analyzed_documents_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_analyzed_documents_session_id
  ON public.prism_v4_analyzed_documents(session_id);

CREATE TABLE IF NOT EXISTS public.prism_v4_collection_analyses (
  session_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_collection_analyses
  ADD COLUMN IF NOT EXISTS analysis jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.prism_v4_collection_analyses
SET
  analysis = COALESCE(analysis, '{}'::jsonb),
  updated_at = COALESCE(updated_at, now())
WHERE analysis IS NULL OR updated_at IS NULL;

ALTER TABLE public.prism_v4_collection_analyses
  ALTER COLUMN analysis SET DEFAULT '{}'::jsonb,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN analysis SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_collection_analyses_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_collection_analyses
      ADD CONSTRAINT prism_v4_collection_analyses_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.prism_v4_intent_products (
  product_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_intent_products
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS intent_type text,
  ADD COLUMN IF NOT EXISTS document_ids jsonb,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS schema_version text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.prism_v4_intent_products
SET
  document_ids = COALESCE(document_ids, '[]'::jsonb),
  payload = COALESCE(payload, '{}'::jsonb),
  created_at = COALESCE(created_at, now())
WHERE document_ids IS NULL OR payload IS NULL OR created_at IS NULL;

ALTER TABLE public.prism_v4_intent_products
  ALTER COLUMN document_ids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN document_ids SET NOT NULL,
  ALTER COLUMN payload SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_intent_products_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_intent_products
      ADD CONSTRAINT prism_v4_intent_products_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_intent_products_session_id
  ON public.prism_v4_intent_products(session_id, created_at DESC);

COMMIT;

-- Force PostgREST to refresh schema cache so REST endpoints can see newly created tables/columns.
NOTIFY pgrst, 'reload schema';
