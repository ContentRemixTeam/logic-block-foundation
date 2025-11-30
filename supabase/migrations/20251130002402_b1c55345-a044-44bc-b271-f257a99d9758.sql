-- Add performance indices for common queries

-- Index for habits by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id) WHERE is_active = true;

-- Index for habit_logs by user and date
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date DESC);

-- Index for daily_plans by user and date
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON public.daily_plans(user_id, date DESC);

-- Index for weekly_plans by user and start_of_week
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON public.weekly_plans(user_id, start_of_week DESC);

-- Index for cycles_90_day by user and date range
CREATE INDEX IF NOT EXISTS idx_cycles_user_dates ON public.cycles_90_day(user_id, start_date DESC, end_date DESC);

-- Index for weekly_reviews by user
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON public.weekly_reviews(user_id);

-- Index for monthly_reviews by user and cycle
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_user_cycle ON public.monthly_reviews(user_id, cycle_id);

-- Composite index for habit completion queries
CREATE INDEX IF NOT EXISTS idx_habit_logs_completed ON public.habit_logs(user_id, habit_id, date, completed);
