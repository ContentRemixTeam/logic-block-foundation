CREATE TABLE public.replay_pilot_staging (
  portal_resource_id text PRIMARY KEY,
  package jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.replay_pilot_staging TO service_role;
ALTER TABLE public.replay_pilot_staging ENABLE ROW LEVEL SECURITY;