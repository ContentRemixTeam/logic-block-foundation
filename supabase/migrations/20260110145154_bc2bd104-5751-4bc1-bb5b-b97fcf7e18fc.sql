-- Create cycle_drafts table for server-side draft persistence
CREATE TABLE public.cycle_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.cycle_drafts ENABLE ROW LEVEL SECURITY;

-- Users can view their own drafts
CREATE POLICY "Users can view own drafts" ON public.cycle_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own drafts
CREATE POLICY "Users can insert own drafts" ON public.cycle_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts" ON public.cycle_drafts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts" ON public.cycle_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_cycle_drafts_updated_at
  BEFORE UPDATE ON public.cycle_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();