ALTER TABLE public.prism_v4_sessions
  ADD COLUMN IF NOT EXISTS active_blueprint_id text,
  ADD COLUMN IF NOT EXISTS active_target jsonb,
  ADD COLUMN IF NOT EXISTS output_ids jsonb,
  ADD COLUMN IF NOT EXISTS studio_state_version integer;

UPDATE public.prism_v4_sessions
SET
  active_target = COALESCE(active_target, '{}'::jsonb),
  output_ids = COALESCE(output_ids, '[]'::jsonb),
  studio_state_version = COALESCE(studio_state_version, 1)
WHERE active_target IS NULL
  OR output_ids IS NULL
  OR studio_state_version IS NULL;

ALTER TABLE public.prism_v4_sessions
  ALTER COLUMN active_target SET DEFAULT '{}'::jsonb,
  ALTER COLUMN output_ids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN studio_state_version SET DEFAULT 1,
  ALTER COLUMN active_target SET NOT NULL,
  ALTER COLUMN output_ids SET NOT NULL,
  ALTER COLUMN studio_state_version SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.prism_v4_blueprints (
  blueprint_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_blueprints
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS analysis_session_id text,
  ADD COLUMN IF NOT EXISTS teacher_id text,
  ADD COLUMN IF NOT EXISTS unit_id text,
  ADD COLUMN IF NOT EXISTS active_version integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.prism_v4_blueprints
SET
  active_version = COALESCE(active_version, 1),
  status = COALESCE(status, 'active'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE active_version IS NULL
  OR status IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.prism_v4_blueprints
  ALTER COLUMN session_id SET NOT NULL,
  ALTER COLUMN analysis_session_id SET NOT NULL,
  ALTER COLUMN active_version SET DEFAULT 1,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN active_version SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_blueprints_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_blueprints
      ADD CONSTRAINT prism_v4_blueprints_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_blueprints_analysis_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_blueprints
      ADD CONSTRAINT prism_v4_blueprints_analysis_session_id_fkey
      FOREIGN KEY (analysis_session_id) REFERENCES public.prism_v4_collection_analyses(session_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_blueprints_session_id
  ON public.prism_v4_blueprints(session_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_prism_v4_blueprints_teacher_unit
  ON public.prism_v4_blueprints(teacher_id, unit_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.prism_v4_blueprint_versions (
  blueprint_id text NOT NULL,
  version integer NOT NULL,
  analysis_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  blueprint_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  editor_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  lineage jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blueprint_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_blueprint_versions_blueprint_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_blueprint_versions
      ADD CONSTRAINT prism_v4_blueprint_versions_blueprint_id_fkey
      FOREIGN KEY (blueprint_id) REFERENCES public.prism_v4_blueprints(blueprint_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_blueprint_versions_created_at
  ON public.prism_v4_blueprint_versions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.prism_v4_outputs (
  output_id text PRIMARY KEY
);

ALTER TABLE public.prism_v4_outputs
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS blueprint_id text,
  ADD COLUMN IF NOT EXISTS blueprint_version integer,
  ADD COLUMN IF NOT EXISTS output_type text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text,
  ADD COLUMN IF NOT EXISTS teacher_id text,
  ADD COLUMN IF NOT EXISTS unit_id text,
  ADD COLUMN IF NOT EXISTS options jsonb,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS render_model jsonb,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.prism_v4_outputs
SET
  options = COALESCE(options, '{}'::jsonb),
  payload = COALESCE(payload, '{}'::jsonb),
  render_model = COALESCE(render_model, '{}'::jsonb),
  status = COALESCE(status, 'ready'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE options IS NULL
  OR payload IS NULL
  OR render_model IS NULL
  OR status IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.prism_v4_outputs
  ALTER COLUMN session_id SET NOT NULL,
  ALTER COLUMN blueprint_id SET NOT NULL,
  ALTER COLUMN blueprint_version SET NOT NULL,
  ALTER COLUMN output_type SET NOT NULL,
  ALTER COLUMN options SET DEFAULT '{}'::jsonb,
  ALTER COLUMN payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN render_model SET DEFAULT '{}'::jsonb,
  ALTER COLUMN status SET DEFAULT 'ready',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN options SET NOT NULL,
  ALTER COLUMN payload SET NOT NULL,
  ALTER COLUMN render_model SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_outputs_session_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_outputs
      ADD CONSTRAINT prism_v4_outputs_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.prism_v4_sessions(session_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_outputs_blueprint_id_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_outputs
      ADD CONSTRAINT prism_v4_outputs_blueprint_id_fkey
      FOREIGN KEY (blueprint_id) REFERENCES public.prism_v4_blueprints(blueprint_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prism_v4_outputs_blueprint_version_fkey'
  ) THEN
    ALTER TABLE public.prism_v4_outputs
      ADD CONSTRAINT prism_v4_outputs_blueprint_version_fkey
      FOREIGN KEY (blueprint_id, blueprint_version) REFERENCES public.prism_v4_blueprint_versions(blueprint_id, version) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prism_v4_outputs_session_id
  ON public.prism_v4_outputs(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prism_v4_outputs_blueprint
  ON public.prism_v4_outputs(blueprint_id, blueprint_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prism_v4_outputs_target
  ON public.prism_v4_outputs(target_type, target_id, created_at DESC);