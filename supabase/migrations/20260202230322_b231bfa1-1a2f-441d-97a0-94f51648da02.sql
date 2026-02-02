-- Money Momentum Wizard Tables
-- 5 tables for revenue sprint feature

-- 1. revenue_sprints - Main sprint data
CREATE TABLE IF NOT EXISTS public.revenue_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- Step 1: The Numbers
  current_revenue NUMERIC(12,2),
  revenue_goal NUMERIC(12,2),
  target_month TEXT, -- 'current' or 'next'
  days_in_sprint INTEGER,
  gap_to_close NUMERIC(12,2),
  daily_target NUMERIC(12,2),
  
  -- Step 2: Reality Check
  expense_cuts NUMERIC(12,2) DEFAULT 0,
  adjusted_gap NUMERIC(12,2),
  survival_mode BOOLEAN DEFAULT false,
  
  -- Step 3: What You Already Have
  current_offers JSONB DEFAULT '[]'::jsonb, -- [{name, price}]
  past_customers_count INTEGER DEFAULT 0,
  past_customers_comfortable INTEGER DEFAULT 0,
  past_customers_offer_type TEXT,
  past_customers_details TEXT,
  warm_leads_count INTEGER DEFAULT 0,
  warm_leads_sources JSONB DEFAULT '[]'::jsonb,
  fastest_sale TEXT,
  
  -- Step 4: Revenue Actions
  brainstormed_ideas JSONB DEFAULT '[]'::jsonb, -- [{type, details}]
  selected_actions JSONB DEFAULT '[]'::jsonb, -- [{action, details, why, time_per_day, expected_revenue}]
  
  -- Step 5: Mindset (CTFAR-inspired)
  blocking_thought TEXT,
  blocking_feeling TEXT,
  blocking_action TEXT,
  blocking_result TEXT,
  new_thought TEXT,
  counter_evidence TEXT,
  
  -- Step 6: Sprint Schedule
  sprint_start_date DATE,
  sprint_end_date DATE,
  working_days JSONB DEFAULT '[]'::jsonb, -- [0,1,2,3,4] for Mon-Fri
  daily_time TEXT, -- e.g., "09:00"
  daily_duration TEXT, -- e.g., "2 hours"
  
  -- Step 7: Commitment
  accountability_partner TEXT,
  accountability_method TEXT,
  commitment_options JSONB DEFAULT '[]'::jsonb,
  consequences TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  resume_date DATE,
  completed_at TIMESTAMPTZ,
  total_revenue_generated NUMERIC(12,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. sprint_daily_progress - Daily check-ins during sprint
CREATE TABLE IF NOT EXISTS public.sprint_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.revenue_sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  daily_target NUMERIC(12,2),
  actual_revenue NUMERIC(12,2) DEFAULT 0,
  hit_target BOOLEAN DEFAULT false,
  
  actions_completed JSONB DEFAULT '[]'::jsonb, -- [{action, completed, notes}]
  what_worked TEXT,
  what_didnt_work TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(sprint_id, date)
);

-- 3. sprint_action_metrics - Track performance per action
CREATE TABLE IF NOT EXISTS public.sprint_action_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.revenue_sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  action_name TEXT NOT NULL,
  action_type TEXT, -- 'all_access', 'vip_tier', 'intensive', etc.
  
  attempts INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated NUMERIC(12,2) DEFAULT 0,
  
  roi_rating TEXT CHECK (roi_rating IN ('hot', 'warm', 'cold')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(sprint_id, action_name)
);

-- 4. sprint_templates - Save successful sprints to reuse
CREATE TABLE IF NOT EXISTS public.sprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  template_name TEXT NOT NULL,
  source_sprint_id UUID REFERENCES public.revenue_sprints(id) ON DELETE SET NULL,
  
  selected_actions JSONB DEFAULT '[]'::jsonb,
  working_days JSONB DEFAULT '[]'::jsonb,
  daily_time TEXT,
  daily_duration TEXT,
  
  original_goal NUMERIC(12,2),
  original_actual NUMERIC(12,2),
  success_rate NUMERIC(5,2), -- percentage
  
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. sprint_reviews - Post-sprint reflection
CREATE TABLE IF NOT EXISTS public.sprint_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.revenue_sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  goal_amount NUMERIC(12,2),
  actual_amount NUMERIC(12,2),
  percent_of_goal NUMERIC(5,2),
  
  what_worked TEXT,
  what_didnt_work TEXT,
  biggest_win TEXT,
  would_change TEXT,
  
  next_sprint_goal NUMERIC(12,2),
  next_sprint_start_date DATE,
  
  save_as_template BOOLEAN DEFAULT false,
  template_name TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(sprint_id)
);

-- Enable RLS on all tables
ALTER TABLE public.revenue_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_action_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- revenue_sprints policies
CREATE POLICY "Users can view own sprints" ON public.revenue_sprints
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sprints" ON public.revenue_sprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sprints" ON public.revenue_sprints
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sprints" ON public.revenue_sprints
  FOR DELETE USING (auth.uid() = user_id);

-- sprint_daily_progress policies
CREATE POLICY "Users can view own progress" ON public.sprint_daily_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own progress" ON public.sprint_daily_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.sprint_daily_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.sprint_daily_progress
  FOR DELETE USING (auth.uid() = user_id);

-- sprint_action_metrics policies
CREATE POLICY "Users can view own metrics" ON public.sprint_action_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own metrics" ON public.sprint_action_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.sprint_action_metrics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metrics" ON public.sprint_action_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- sprint_templates policies
CREATE POLICY "Users can view own templates" ON public.sprint_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own templates" ON public.sprint_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.sprint_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.sprint_templates
  FOR DELETE USING (auth.uid() = user_id);

-- sprint_reviews policies
CREATE POLICY "Users can view own reviews" ON public.sprint_reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reviews" ON public.sprint_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.sprint_reviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.sprint_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_revenue_sprints_user_id ON public.revenue_sprints(user_id);
CREATE INDEX idx_revenue_sprints_status ON public.revenue_sprints(status) WHERE status = 'active';
CREATE INDEX idx_sprint_daily_progress_sprint_id ON public.sprint_daily_progress(sprint_id);
CREATE INDEX idx_sprint_daily_progress_user_id ON public.sprint_daily_progress(user_id);
CREATE INDEX idx_sprint_daily_progress_date ON public.sprint_daily_progress(date);
CREATE INDEX idx_sprint_action_metrics_sprint_id ON public.sprint_action_metrics(sprint_id);
CREATE INDEX idx_sprint_action_metrics_user_id ON public.sprint_action_metrics(user_id);
CREATE INDEX idx_sprint_templates_user_id ON public.sprint_templates(user_id);
CREATE INDEX idx_sprint_reviews_sprint_id ON public.sprint_reviews(sprint_id);
CREATE INDEX idx_sprint_reviews_user_id ON public.sprint_reviews(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_revenue_sprints_updated_at
  BEFORE UPDATE ON public.revenue_sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_daily_progress_updated_at
  BEFORE UPDATE ON public.sprint_daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_action_metrics_updated_at
  BEFORE UPDATE ON public.sprint_action_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_templates_updated_at
  BEFORE UPDATE ON public.sprint_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_reviews_updated_at
  BEFORE UPDATE ON public.sprint_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert wizard template entry
INSERT INTO public.wizard_templates (template_name, display_name, description, icon, estimated_time_minutes, questions)
VALUES (
  'money_momentum',
  'Money Momentum Sprint',
  '7-14 day action plan to get revenue moving when behind on goals',
  'DollarSign',
  20,
  '[]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  estimated_time_minutes = EXCLUDED.estimated_time_minutes;