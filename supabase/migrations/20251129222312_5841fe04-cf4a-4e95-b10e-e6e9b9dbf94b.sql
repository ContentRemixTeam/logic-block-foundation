-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Settings table
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  minimal_mode BOOLEAN DEFAULT false,
  quick_mode_default BOOLEAN DEFAULT true,
  ai_api_key TEXT,
  habit_categories_enabled BOOLEAN DEFAULT true,
  show_income_tracker BOOLEAN DEFAULT false,
  daily_review_questions JSONB DEFAULT '[]'::jsonb,
  weekly_review_questions JSONB DEFAULT '[]'::jsonb,
  monthly_review_questions JSONB DEFAULT '[]'::jsonb,
  reminder_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 90-Day Cycles table
CREATE TABLE public.cycles_90_day (
  cycle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal TEXT NOT NULL,
  why TEXT,
  identity TEXT,
  target_feeling TEXT,
  supporting_projects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly Plans table
CREATE TABLE public.weekly_plans (
  week_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_of_week DATE NOT NULL,
  top_3_priorities JSONB DEFAULT '[]'::jsonb,
  weekly_thought TEXT,
  weekly_feeling TEXT,
  challenges TEXT,
  adjustments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Plans table
CREATE TABLE public.daily_plans (
  day_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  week_id UUID REFERENCES public.weekly_plans(week_id) ON DELETE SET NULL,
  date DATE NOT NULL,
  top_3_today JSONB DEFAULT '[]'::jsonb,
  thought TEXT,
  feeling TEXT,
  selected_weekly_priorities JSONB DEFAULT '[]'::jsonb,
  deep_mode_notes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Habits table
CREATE TABLE public.habits (
  habit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habit Logs table
CREATE TABLE public.habit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(habit_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  week_id UUID REFERENCES public.weekly_plans(week_id) ON DELETE SET NULL,
  day_id UUID REFERENCES public.daily_plans(day_id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

-- Daily Reviews table
CREATE TABLE public.daily_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id UUID REFERENCES public.daily_plans(day_id) ON DELETE CASCADE,
  wins TEXT,
  what_worked TEXT,
  what_didnt TEXT,
  reflections JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly Reviews table
CREATE TABLE public.weekly_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id UUID REFERENCES public.weekly_plans(week_id) ON DELETE CASCADE,
  wins TEXT,
  challenges TEXT,
  adjustments TEXT,
  habit_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly Reviews table
CREATE TABLE public.monthly_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  wins TEXT,
  habit_trends JSONB DEFAULT '{}'::jsonb,
  thought_patterns JSONB DEFAULT '{}'::jsonb,
  adjustments JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ideas DB table
CREATE TABLE public.ideas_db (
  idea_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  date_added TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CTFAR Models table
CREATE TABLE public.ctfar (
  model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  date DATE NOT NULL,
  circumstance TEXT,
  thought TEXT,
  feeling TEXT,
  action TEXT,
  result TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reminders table
CREATE TABLE public.reminders (
  reminder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'sms')),
  active BOOLEAN DEFAULT true,
  last_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_cycles_user_id ON public.cycles_90_day(user_id);
CREATE INDEX idx_weekly_plans_user_id ON public.weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_cycle_id ON public.weekly_plans(cycle_id);
CREATE INDEX idx_daily_plans_user_id ON public.daily_plans(user_id);
CREATE INDEX idx_daily_plans_date ON public.daily_plans(date);
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(date);
CREATE INDEX idx_daily_reviews_user_id ON public.daily_reviews(user_id);
CREATE INDEX idx_weekly_reviews_user_id ON public.weekly_reviews(user_id);
CREATE INDEX idx_monthly_reviews_user_id ON public.monthly_reviews(user_id);
CREATE INDEX idx_ideas_user_id ON public.ideas_db(user_id);
CREATE INDEX idx_ctfar_user_id ON public.ctfar(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles_90_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctfar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for cycles_90_day
CREATE POLICY "Users can view their own cycles"
  ON public.cycles_90_day FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cycles"
  ON public.cycles_90_day FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycles"
  ON public.cycles_90_day FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cycles"
  ON public.cycles_90_day FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for weekly_plans
CREATE POLICY "Users can view their own weekly plans"
  ON public.weekly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly plans"
  ON public.weekly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly plans"
  ON public.weekly_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly plans"
  ON public.weekly_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_plans
CREATE POLICY "Users can view their own daily plans"
  ON public.daily_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plans"
  ON public.daily_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
  ON public.daily_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily plans"
  ON public.daily_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for habit_logs
CREATE POLICY "Users can view their own habit logs"
  ON public.habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit logs"
  ON public.habit_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit logs"
  ON public.habit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_reviews
CREATE POLICY "Users can view their own daily reviews"
  ON public.daily_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily reviews"
  ON public.daily_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily reviews"
  ON public.daily_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for weekly_reviews
CREATE POLICY "Users can view their own weekly reviews"
  ON public.weekly_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly reviews"
  ON public.weekly_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly reviews"
  ON public.weekly_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for monthly_reviews
CREATE POLICY "Users can view their own monthly reviews"
  ON public.monthly_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly reviews"
  ON public.monthly_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly reviews"
  ON public.monthly_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for ideas_db
CREATE POLICY "Users can view their own ideas"
  ON public.ideas_db FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas"
  ON public.ideas_db FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas"
  ON public.ideas_db FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
  ON public.ideas_db FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ctfar
CREATE POLICY "Users can view their own CTFAR models"
  ON public.ctfar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CTFAR models"
  ON public.ctfar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CTFAR models"
  ON public.ctfar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CTFAR models"
  ON public.ctfar FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON public.cycles_90_day
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_plans_updated_at
  BEFORE UPDATE ON public.daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_reviews_updated_at
  BEFORE UPDATE ON public.daily_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_reviews_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_reviews_updated_at
  BEFORE UPDATE ON public.monthly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ctfar_updated_at
  BEFORE UPDATE ON public.ctfar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();