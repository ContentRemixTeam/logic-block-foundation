
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_raw JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_unique
  ON public.tasks (user_id, external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_external_source_idx
  ON public.tasks (user_id, external_source)
  WHERE external_source IS NOT NULL;
