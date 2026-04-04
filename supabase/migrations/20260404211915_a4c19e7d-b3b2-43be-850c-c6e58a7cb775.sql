
CREATE TABLE public.google_sheets_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  selected_tables TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.google_sheets_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync config"
ON public.google_sheets_sync FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync config"
ON public.google_sheets_sync FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync config"
ON public.google_sheets_sync FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync config"
ON public.google_sheets_sync FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_google_sheets_sync_updated_at
BEFORE UPDATE ON public.google_sheets_sync
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
