CREATE TABLE IF NOT EXISTS public.prism_v4_session_snapshots (
  session_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_session_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- If the table was created with an old `snapshot` column (possibly NOT NULL),
-- migrate its data into snapshot_json then drop it so inserts using snapshot_json succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'prism_v4_session_snapshots'
      AND column_name  = 'snapshot'
  ) THEN
    UPDATE public.prism_v4_session_snapshots
    SET snapshot_json = snapshot
    WHERE snapshot_json IS NULL AND snapshot IS NOT NULL;

    ALTER TABLE public.prism_v4_session_snapshots DROP COLUMN snapshot;
  END IF;
END $$;

UPDATE public.prism_v4_session_snapshots
SET
  snapshot_json = COALESCE(snapshot_json, '{}'::jsonb),
  created_at = COALESCE(created_at, now())
WHERE snapshot_json IS NULL OR created_at IS NULL;

ALTER TABLE public.prism_v4_session_snapshots
  ALTER COLUMN snapshot_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN snapshot_json SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_session_snapshots_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_session_snapshots
      ADD CONSTRAINT prism_v4_session_snapshots_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE CASCADE;
  END IF;
END $$;