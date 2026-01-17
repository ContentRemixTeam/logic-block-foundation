-- Create table for storing multiple selected calendars per user
CREATE TABLE IF NOT EXISTS public.google_selected_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS
ALTER TABLE public.google_selected_calendars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own calendar selections"
  ON public.google_selected_calendars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar selections"
  ON public.google_selected_calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar selections"
  ON public.google_selected_calendars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar selections"
  ON public.google_selected_calendars FOR DELETE
  USING (auth.uid() = user_id);

-- Migrate existing data from google_calendar_connection to new table
INSERT INTO public.google_selected_calendars (user_id, calendar_id, calendar_name, is_enabled)
SELECT user_id, selected_calendar_id, COALESCE(selected_calendar_name, 'Primary Calendar'), true
FROM public.google_calendar_connection
WHERE selected_calendar_id IS NOT NULL
ON CONFLICT (user_id, calendar_id) DO NOTHING;

-- Add calendar_id column to google_sync_state if it doesn't exist (for per-calendar sync tracking)
ALTER TABLE public.google_sync_state 
ADD COLUMN IF NOT EXISTS calendar_id TEXT;

-- Update existing rows to have calendar_id from the connection
UPDATE public.google_sync_state gss
SET calendar_id = gcc.selected_calendar_id
FROM public.google_calendar_connection gcc
WHERE gss.user_id = gcc.user_id
AND gss.calendar_id IS NULL
AND gcc.selected_calendar_id IS NOT NULL;