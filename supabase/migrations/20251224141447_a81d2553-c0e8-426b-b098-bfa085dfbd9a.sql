-- Add new columns to tasks table for descriptions and recurring tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_description TEXT,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS recurrence_days JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring_parent BOOLEAN DEFAULT false;

-- Add index for recurring parent tasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring_parent ON public.tasks(is_recurring_parent) WHERE is_recurring_parent = true;