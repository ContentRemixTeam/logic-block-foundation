-- Create daily_top3_tasks table for tracking user's daily focus tasks
CREATE TABLE IF NOT EXISTS public.daily_top3_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  task_id uuid REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  position smallint NOT NULL CHECK (position >= 1 AND position <= 3),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, position)
);

-- Enable RLS
ALTER TABLE public.daily_top3_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view their own top 3 tasks"
ON public.daily_top3_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own top 3 tasks"
ON public.daily_top3_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own top 3 tasks"
ON public.daily_top3_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own top 3 tasks"
ON public.daily_top3_tasks FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_daily_top3_user_date ON public.daily_top3_tasks(user_id, date);