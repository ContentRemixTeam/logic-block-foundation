
-- Add category field to tasks if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'category' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN category text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'month_in_cycle' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN month_in_cycle integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'week_in_cycle' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN week_in_cycle integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN due_date date;
  END IF;
END $$;

-- Add proper fields to monthly_reviews for structured data
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_reviews' AND column_name = 'challenges' AND table_schema = 'public') THEN
    ALTER TABLE public.monthly_reviews ADD COLUMN challenges jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_reviews' AND column_name = 'lessons' AND table_schema = 'public') THEN
    ALTER TABLE public.monthly_reviews ADD COLUMN lessons jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_reviews' AND column_name = 'next_month_priorities' AND table_schema = 'public') THEN
    ALTER TABLE public.monthly_reviews ADD COLUMN next_month_priorities jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_reviews' AND column_name = 'month_score' AND table_schema = 'public') THEN
    ALTER TABLE public.monthly_reviews ADD COLUMN month_score integer DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_reviews' AND column_name = 'month_in_cycle' AND table_schema = 'public') THEN
    ALTER TABLE public.monthly_reviews ADD COLUMN month_in_cycle integer;
  END IF;
END $$;

-- Create weekly_goals table for lightweight weekly goal tracking
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  weekly_goal_text text,
  practice_thought text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS on weekly_goals
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_goals (drop first if exists, then create)
DROP POLICY IF EXISTS "Users can view their own weekly goals" ON public.weekly_goals;
CREATE POLICY "Users can view their own weekly goals"
  ON public.weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own weekly goals" ON public.weekly_goals;
CREATE POLICY "Users can create their own weekly goals"
  ON public.weekly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own weekly goals" ON public.weekly_goals;
CREATE POLICY "Users can update their own weekly goals"
  ON public.weekly_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own weekly goals" ON public.weekly_goals;
CREATE POLICY "Users can delete their own weekly goals"
  ON public.weekly_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster task queries by category
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_cycle_category ON public.tasks(cycle_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date_category ON public.tasks(scheduled_date, category);

-- Add index for weekly_goals
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week ON public.weekly_goals(user_id, week_start_date);
