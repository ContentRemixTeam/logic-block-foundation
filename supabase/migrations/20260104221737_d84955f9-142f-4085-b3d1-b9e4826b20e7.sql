-- Google Calendar Connection table
CREATE TABLE public.google_calendar_connection (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  selected_calendar_id TEXT,
  selected_calendar_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_connection ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar connection"
  ON public.google_calendar_connection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar connection"
  ON public.google_calendar_connection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connection"
  ON public.google_calendar_connection FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connection"
  ON public.google_calendar_connection FOR DELETE
  USING (auth.uid() = user_id);

-- Event Sync Mapping table
CREATE TABLE public.event_sync_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_block_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  google_etag TEXT,
  sync_direction TEXT DEFAULT 'app_to_google',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, app_block_id)
);

-- Create index for faster lookups
CREATE INDEX idx_event_sync_mapping_google_event ON public.event_sync_mapping(user_id, google_event_id);

-- Enable RLS
ALTER TABLE public.event_sync_mapping ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sync mappings"
  ON public.event_sync_mapping FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync mappings"
  ON public.event_sync_mapping FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync mappings"
  ON public.event_sync_mapping FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync mappings"
  ON public.event_sync_mapping FOR DELETE
  USING (auth.uid() = user_id);

-- Google Sync State table
CREATE TABLE public.google_sync_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  sync_token TEXT,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active',
  last_error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sync state"
  ON public.google_sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync state"
  ON public.google_sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync state"
  ON public.google_sync_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync state"
  ON public.google_sync_state FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger to google_calendar_connection
CREATE TRIGGER update_google_calendar_connection_updated_at
  BEFORE UPDATE ON public.google_calendar_connection
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger to google_sync_state
CREATE TRIGGER update_google_sync_state_updated_at
  BEFORE UPDATE ON public.google_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();