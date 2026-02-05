-- Drop and recreate the view with SECURITY INVOKER (the default and secure option)
DROP VIEW IF EXISTS public.recurring_task_averages;

CREATE VIEW public.recurring_task_averages 
WITH (security_invoker = true) AS
SELECT 
  parent_task_id,
  COUNT(*) as instance_count,
  AVG(actual_minutes)::NUMERIC(10,2) as avg_actual_minutes,
  AVG(estimated_minutes)::NUMERIC(10,2) as avg_estimated_minutes,
  STDDEV(actual_minutes)::NUMERIC(10,2) as stddev_minutes
FROM public.time_entries
WHERE parent_task_id IS NOT NULL
GROUP BY parent_task_id;