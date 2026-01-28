-- Add scheduled time columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_time time;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_slot_duration integer DEFAULT 60;

-- Create index for efficient querying of scheduled tasks
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date_time 
ON public.tasks(scheduled_date, scheduled_time) 
WHERE scheduled_time IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.scheduled_time IS 'Time of day for the task (e.g., 14:00 for 2pm)';
COMMENT ON COLUMN public.tasks.time_slot_duration IS 'Duration in minutes (default 60)';