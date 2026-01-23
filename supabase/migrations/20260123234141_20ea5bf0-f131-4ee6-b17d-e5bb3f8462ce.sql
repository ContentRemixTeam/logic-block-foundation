-- Create wizard_drafts table for draft persistence
CREATE TABLE IF NOT EXISTS public.wizard_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wizard_name TEXT NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wizard_name)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wizard_drafts_user 
ON public.wizard_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_wizard_drafts_user_wizard 
ON public.wizard_drafts(user_id, wizard_name);

-- Enable RLS
ALTER TABLE public.wizard_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own drafts
CREATE POLICY "Users can view own wizard drafts"
ON public.wizard_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wizard drafts"
ON public.wizard_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wizard drafts"
ON public.wizard_drafts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wizard drafts"
ON public.wizard_drafts FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_wizard_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wizard_drafts_updated_at
  BEFORE UPDATE ON public.wizard_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wizard_drafts_updated_at();