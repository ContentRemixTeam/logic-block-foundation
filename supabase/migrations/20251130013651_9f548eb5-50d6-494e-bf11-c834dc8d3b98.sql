-- Create identity_anchors table
CREATE TABLE public.identity_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  identity_statement TEXT NOT NULL,
  supporting_habits JSONB DEFAULT '[]'::jsonb,
  supporting_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identity_anchors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own identity anchors"
  ON public.identity_anchors
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own identity anchors"
  ON public.identity_anchors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own identity anchors"
  ON public.identity_anchors
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own identity anchors"
  ON public.identity_anchors
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_identity_anchors_user_id ON public.identity_anchors(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_identity_anchors_updated_at
  BEFORE UPDATE ON public.identity_anchors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add daily_anchor_enabled field to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS daily_anchor_enabled BOOLEAN DEFAULT true;