-- Drop the existing check constraint and add a more permissive one
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_pattern_check;

-- Add updated check constraint that includes 'custom' and 'weekdays'
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_recurrence_pattern_check 
CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'weekdays', 'custom'));