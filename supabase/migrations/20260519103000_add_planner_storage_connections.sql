CREATE TABLE public.planner_storage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_mode TEXT NOT NULL DEFAULT 'supabase'
    CHECK (storage_mode IN ('supabase', 'sheets_shadow', 'sheets_primary')),
  provider TEXT NOT NULL DEFAULT 'google_sheets'
    CHECK (provider IN ('google_sheets')),
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  last_verified_at TIMESTAMPTZ,
  last_snapshot_at TIMESTAMPTZ,
  setup_completed_at TIMESTAMPTZ,
  last_error TEXT,
  is_healthy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.planner_storage_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planner storage connection"
ON public.planner_storage_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planner storage connection"
ON public.planner_storage_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner storage connection"
ON public.planner_storage_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner storage connection"
ON public.planner_storage_connections FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_planner_storage_connections_updated_at
BEFORE UPDATE ON public.planner_storage_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.planner_storage_write_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  write_id UUID NOT NULL DEFAULT gen_random_uuid(),
  storage_connection_id UUID REFERENCES public.planner_storage_connections(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'google_sheets',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'written', 'verified', 'failed', 'recovered')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id, write_id)
);

ALTER TABLE public.planner_storage_write_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planner storage audit"
ON public.planner_storage_write_audit FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planner storage audit"
ON public.planner_storage_write_audit FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_planner_storage_connections_user_id
ON public.planner_storage_connections(user_id);

CREATE INDEX idx_planner_storage_write_audit_user_created
ON public.planner_storage_write_audit(user_id, created_at DESC);
