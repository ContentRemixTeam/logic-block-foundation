-- Add planned_day and day_order columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS planned_day date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day_order integer DEFAULT 0;

-- Create index for performance on planned_day queries
CREATE INDEX IF NOT EXISTS idx_tasks_planned_day ON public.tasks(user_id, planned_day);

-- Add weekly capacity settings to task_settings table
ALTER TABLE public.task_settings ADD COLUMN IF NOT EXISTS weekly_capacity_minutes integer DEFAULT 240;
ALTER TABLE public.task_settings ADD COLUMN IF NOT EXISTS week_start_day integer DEFAULT 1;