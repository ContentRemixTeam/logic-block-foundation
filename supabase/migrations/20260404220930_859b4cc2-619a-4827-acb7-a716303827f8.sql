-- Weekly tactics: user-defined recurring actions per cycle
CREATE TABLE public.cycle_weekly_tactics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  tactic_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_weekly_tactics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tactics"
  ON public.cycle_weekly_tactics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tactics"
  ON public.cycle_weekly_tactics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tactics"
  ON public.cycle_weekly_tactics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tactics"
  ON public.cycle_weekly_tactics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_cycle_weekly_tactics_cycle ON public.cycle_weekly_tactics(cycle_id);

-- Weekly scorecards: one per week per cycle
CREATE TABLE public.weekly_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL, -- 1-13
  week_start_date DATE NOT NULL,
  tactic_completions JSONB NOT NULL DEFAULT '{}', -- { tactic_id: true/false }
  execution_score NUMERIC(5,2), -- 0-100 percentage
  sprint_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  sprint_phase TEXT, -- 'phase_1', 'phase_2', 'phase_3', 'complete'
  belief_score INTEGER, -- 1-10
  reflection_text TEXT,
  coaching_prompt_shown BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cycle_id, week_number)
);

ALTER TABLE public.weekly_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scorecards"
  ON public.weekly_scorecards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scorecards"
  ON public.weekly_scorecards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scorecards"
  ON public.weekly_scorecards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scorecards"
  ON public.weekly_scorecards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_scorecards_cycle ON public.weekly_scorecards(cycle_id);
CREATE INDEX idx_weekly_scorecards_week ON public.weekly_scorecards(week_start_date);

-- Add sprint_phase to projects for Messy Action Sprint tracking
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sprint_phase TEXT,
  ADD COLUMN IF NOT EXISTS sprint_month INTEGER; -- 1, 2, or 3 within the cycle

-- Enable realtime for scorecards
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_scorecards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_weekly_tactics;

-- Timestamp triggers
CREATE TRIGGER update_cycle_weekly_tactics_updated_at
  BEFORE UPDATE ON public.cycle_weekly_tactics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_scorecards_updated_at
  BEFORE UPDATE ON public.weekly_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();