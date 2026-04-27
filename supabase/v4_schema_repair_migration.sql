-- Repair migration for v4 ingestion tables
-- Use this when Supabase schema cache reports missing columns like `document_id`
-- on v4_items / v4_sections / v4_analysis.

BEGIN;

-- ---------------------------------------------------------------------------
-- v4_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v4_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  item_number integer NOT NULL,
  type text NOT NULL DEFAULT 'question',
  stem text NOT NULL DEFAULT '',
  choices jsonb NULL,
  answer_key jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_page_numbers integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_items' AND column_name = 'doc_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_items' AND column_name = 'document_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.v4_items RENAME COLUMN doc_id TO document_id';
  END IF;
END $$;

ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS item_number integer;
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS type text DEFAULT 'question';
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS stem text DEFAULT '';
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS choices jsonb;
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS answer_key jsonb;
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS source_page_numbers integer[] DEFAULT '{}';
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.v4_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.v4_items
  ALTER COLUMN document_id TYPE text USING document_id::text;

ALTER TABLE public.v4_items
  ALTER COLUMN document_id SET NOT NULL,
  ALTER COLUMN item_number SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN stem SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN source_page_numbers SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS v4_items_document_id_idx
  ON public.v4_items (document_id);

CREATE INDEX IF NOT EXISTS v4_items_document_id_item_number_idx
  ON public.v4_items (document_id, item_number);

-- ---------------------------------------------------------------------------
-- v4_sections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v4_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  section_id text NOT NULL,
  "order" integer NOT NULL,
  title text NULL,
  text text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_sections' AND column_name = 'doc_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_sections' AND column_name = 'document_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.v4_sections RENAME COLUMN doc_id TO document_id';
  END IF;
END $$;

ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS section_id text;
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS "order" integer;
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS text text DEFAULT '';
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.v4_sections ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.v4_sections
  ALTER COLUMN document_id TYPE text USING document_id::text;

ALTER TABLE public.v4_sections
  ALTER COLUMN document_id SET NOT NULL,
  ALTER COLUMN section_id SET NOT NULL,
  ALTER COLUMN "order" SET NOT NULL,
  ALTER COLUMN text SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS v4_sections_document_id_idx
  ON public.v4_sections (document_id);

CREATE INDEX IF NOT EXISTS v4_sections_document_id_order_idx
  ON public.v4_sections (document_id, "order");

-- ---------------------------------------------------------------------------
-- v4_analysis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v4_analysis (
  document_id text PRIMARY KEY,
  doc_type text CHECK (doc_type IN ('problem', 'notes', 'mixed')),
  summary text NULL,
  key_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  cognitive_load jsonb NOT NULL DEFAULT '{}'::jsonb,
  charts jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_analysis' AND column_name = 'doc_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v4_analysis' AND column_name = 'document_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.v4_analysis RENAME COLUMN doc_id TO document_id';
  END IF;
END $$;

ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS doc_type text;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS key_concepts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS misconceptions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS cognitive_load jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS charts jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.v4_analysis ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.v4_analysis
  ALTER COLUMN document_id TYPE text USING document_id::text;

UPDATE public.v4_analysis
SET document_id = COALESCE(document_id, gen_random_uuid()::text)
WHERE document_id IS NULL;

ALTER TABLE public.v4_analysis
  ALTER COLUMN document_id SET NOT NULL,
  ALTER COLUMN key_concepts SET NOT NULL,
  ALTER COLUMN misconceptions SET NOT NULL,
  ALTER COLUMN cognitive_load SET NOT NULL,
  ALTER COLUMN charts SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v4_analysis_pkey'
      AND conrelid = 'public.v4_analysis'::regclass
  ) THEN
    ALTER TABLE public.v4_analysis ADD CONSTRAINT v4_analysis_pkey PRIMARY KEY (document_id);
  END IF;
END $$;

COMMIT;
