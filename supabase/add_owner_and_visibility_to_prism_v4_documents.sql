-- Migration: Add owner_id and is_public to prism_v4_documents
-- Conventions match v4_document_registry_migration.sql

-- 1. Add columns (idempotent)
ALTER TABLE public.prism_v4_documents
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2. Indexes for ownership + public listing queries
CREATE INDEX IF NOT EXISTS idx_prism_v4_documents_owner_id
  ON public.prism_v4_documents(owner_id);

CREATE INDEX IF NOT EXISTS idx_prism_v4_documents_is_public
  ON public.prism_v4_documents(is_public)
  WHERE is_public = true;

-- 3. RLS: ensure enabled
ALTER TABLE public.prism_v4_documents ENABLE ROW LEVEL SECURITY;

-- 4. Drop legacy permissive policies if they exist
DO $$
BEGIN
  -- remove any existing broad allow-all policies added during dev
  DROP POLICY IF EXISTS "allow_all_prism_v4_documents" ON public.prism_v4_documents;
  DROP POLICY IF EXISTS "prism_v4_documents_allow_all" ON public.prism_v4_documents;
END;
$$;

-- 5. SELECT: owner can see own docs; anyone can see public docs (metadata-level access enforced at API layer)
CREATE POLICY "prism_v4_documents_select"
  ON public.prism_v4_documents
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_public = true
  );

-- 6. INSERT: authenticated users only, and owner_id must match caller
CREATE POLICY "prism_v4_documents_insert"
  ON public.prism_v4_documents
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 7. UPDATE: owner only
CREATE POLICY "prism_v4_documents_update"
  ON public.prism_v4_documents
  FOR UPDATE
  USING (owner_id = auth.uid());

-- 8. DELETE: owner only
CREATE POLICY "prism_v4_documents_delete"
  ON public.prism_v4_documents
  FOR DELETE
  USING (owner_id = auth.uid());

-- 9. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
