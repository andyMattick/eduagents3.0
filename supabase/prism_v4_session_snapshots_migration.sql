CREATE TABLE IF NOT EXISTS public.prism_v4_session_snapshots (
  session_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_session_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

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