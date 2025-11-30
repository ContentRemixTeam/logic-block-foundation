-- Create beliefs table
CREATE TABLE IF NOT EXISTS public.beliefs (
  belief_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  limiting_belief TEXT NOT NULL,
  upgraded_belief TEXT NOT NULL,
  evidence_for_new_belief JSONB DEFAULT '[]'::jsonb,
  action_commitments JSONB DEFAULT '[]'::jsonb,
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create belief_evidence_logs table
CREATE TABLE IF NOT EXISTS public.belief_evidence_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belief_id UUID NOT NULL REFERENCES public.beliefs(belief_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  evidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.belief_evidence_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beliefs
CREATE POLICY "Users can view their own beliefs"
  ON public.beliefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own beliefs"
  ON public.beliefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beliefs"
  ON public.beliefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beliefs"
  ON public.beliefs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for belief_evidence_logs
CREATE POLICY "Users can view their own belief evidence"
  ON public.belief_evidence_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own belief evidence"
  ON public.belief_evidence_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own belief evidence"
  ON public.belief_evidence_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_beliefs_user_id ON public.beliefs(user_id);
CREATE INDEX idx_belief_evidence_logs_user_id ON public.belief_evidence_logs(user_id);
CREATE INDEX idx_belief_evidence_logs_belief_id ON public.belief_evidence_logs(belief_id);

-- Trigger for updated_at
CREATE TRIGGER update_beliefs_updated_at
  BEFORE UPDATE ON public.beliefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();