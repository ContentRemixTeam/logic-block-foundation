-- Create user_mastermind_rsvps table for storing RSVP'd mastermind events
CREATE TABLE public.user_mastermind_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.user_mastermind_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see and manage their own RSVPs
CREATE POLICY "Users can view their own mastermind RSVPs"
  ON public.user_mastermind_rsvps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mastermind RSVPs"
  ON public.user_mastermind_rsvps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mastermind RSVPs"
  ON public.user_mastermind_rsvps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add show_mastermind_calls setting to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS show_mastermind_calls BOOLEAN DEFAULT true;