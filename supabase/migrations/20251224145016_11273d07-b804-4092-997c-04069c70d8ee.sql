-- Add one_thing column to daily_plans for "The ONE Thing" focus
ALTER TABLE public.daily_plans 
ADD COLUMN IF NOT EXISTS one_thing text;

-- Add priority_order column to tasks (1, 2, 3 for Top 3, null for others)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority_order integer;

-- Add constraint to ensure priority_order is 1, 2, or 3 when set
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_priority_order_check 
CHECK (priority_order IS NULL OR (priority_order >= 1 AND priority_order <= 3));

-- Add index for faster Top 3 queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority_order ON public.tasks(user_id, scheduled_date, priority_order) WHERE priority_order IS NOT NULL;

COMMENT ON COLUMN public.daily_plans.one_thing IS 'The ONE most important thing to focus on today';
COMMENT ON COLUMN public.tasks.priority_order IS '1, 2, or 3 for Top 3 priorities, null for regular tasks';