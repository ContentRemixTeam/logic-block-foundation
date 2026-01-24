-- Emergency saves table for crash recovery (Prompt 8)
-- Stores data sent via sendBeacon when browser closes/crashes

CREATE TABLE public.emergency_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_type TEXT NOT NULL,
  page_id TEXT,
  data JSONB NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recovered_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint for upsert (one emergency save per page per user)
  CONSTRAINT emergency_saves_unique_page UNIQUE (user_id, page_type, page_id)
);

-- Enable RLS
ALTER TABLE public.emergency_saves ENABLE ROW LEVEL SECURITY;

-- Users can read their own emergency saves
CREATE POLICY "Users can read own emergency saves"
ON public.emergency_saves
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete/recover their own emergency saves
CREATE POLICY "Users can delete own emergency saves"
ON public.emergency_saves
FOR DELETE
USING (auth.uid() = user_id);

-- Service role inserts (from edge function)
-- No INSERT policy needed as edge function uses service role key

-- Index for quick lookups
CREATE INDEX idx_emergency_saves_user_page ON public.emergency_saves(user_id, page_type);
CREATE INDEX idx_emergency_saves_created ON public.emergency_saves(created_at);

-- Add comment
COMMENT ON TABLE public.emergency_saves IS 'Stores crash-recovery data sent via sendBeacon when browser closes unexpectedly';