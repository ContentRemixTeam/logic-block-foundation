-- Add columns for custom recurrence patterns
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_unit text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL;

-- Add check constraint for valid recurrence units
ALTER TABLE public.tasks
ADD CONSTRAINT valid_recurrence_unit 
CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('days', 'weeks', 'months'));

-- Add index for recurring task queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON public.tasks(is_recurring_parent, recurrence_pattern) 
WHERE is_recurring_parent = true;