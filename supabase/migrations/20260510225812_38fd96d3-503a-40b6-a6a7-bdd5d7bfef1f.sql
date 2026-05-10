-- 1. Business season preference on user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS business_season TEXT;

-- 2. WOOP + energy-version fields on 90-day cycles
ALTER TABLE public.cycles_90_day
  ADD COLUMN IF NOT EXISTS wish TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS obstacle TEXT,
  ADD COLUMN IF NOT EXISTS if_then_plan TEXT,
  ADD COLUMN IF NOT EXISTS low_energy_version TEXT,
  ADD COLUMN IF NOT EXISTS medium_energy_version TEXT,
  ADD COLUMN IF NOT EXISTS high_energy_version TEXT,
  ADD COLUMN IF NOT EXISTS minimum_viable_version TEXT;

-- 3. Confidence score on weekly plans (1-10, optional)
ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS confidence_score SMALLINT
    CHECK (confidence_score IS NULL OR (confidence_score >= 1 AND confidence_score <= 10));

-- 4. Reschedule counter for stuck-task detection
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;

-- 5. Evidence Bank table
CREATE TABLE IF NOT EXISTS public.evidence_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  category TEXT,                -- 'win' | 'learning' | 'proof' | 'pride' (free-form)
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,                  -- e.g. 'daily_review', 'weekly_review', 'manual'
  task_id UUID,
  day_id UUID,
  cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evidence"
  ON public.evidence_bank FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evidence"
  ON public.evidence_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evidence"
  ON public.evidence_bank FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evidence"
  ON public.evidence_bank FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_evidence_bank_user_date
  ON public.evidence_bank (user_id, entry_date DESC);

CREATE TRIGGER update_evidence_bank_updated_at
  BEFORE UPDATE ON public.evidence_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();