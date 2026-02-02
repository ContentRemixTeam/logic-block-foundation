-- 1. Widget ordering
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS dashboard_widget_order JSONB DEFAULT '{}';

-- 2. Anti-comparison mode
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS anti_comparison_mode BOOLEAN DEFAULT false;

-- 3. Simplification logging
CREATE TABLE public.simplification_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  suggested_options JSONB NOT NULL,
  choice_made TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.simplification_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own suggestions" ON public.simplification_suggestions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_simplification_suggestions_user ON public.simplification_suggestions(user_id);

-- 4. Coaching call prep
CREATE TABLE public.coaching_call_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  call_date DATE NOT NULL,
  metrics JSONB,
  main_question TEXT,
  what_tried TEXT,
  blocking_thought TEXT,
  coaching_need TEXT,
  share_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.coaching_call_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prep" ON public.coaching_call_prep
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_coaching_call_prep_user ON public.coaching_call_prep(user_id);

-- 5. Strategy change logging
CREATE TABLE public.strategy_change_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  cycle_day INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  data_showing_issue TEXT,
  days_executed INTEGER,
  blocking_thought TEXT,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.strategy_change_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attempts" ON public.strategy_change_attempts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_strategy_change_attempts_user ON public.strategy_change_attempts(user_id);