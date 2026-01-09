-- Fix 1: Add proper unique constraint on entitlements.email
-- Drop the existing functional index first
DROP INDEX IF EXISTS entitlements_email_lower_idx;

-- Add a unique constraint on email (required for ON CONFLICT to work)
ALTER TABLE public.entitlements 
ADD CONSTRAINT entitlements_email_unique UNIQUE (email);

-- Fix 2: Replace get_dashboard_summary to handle NULL week/cycle for new users
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  current_cycle RECORD;
  current_week RECORD;
  today_plan RECORD;
  habit_status TEXT;
BEGIN
  -- Get current cycle (may not exist for new users)
  SELECT * INTO current_cycle
  FROM public.get_current_cycle(p_user_id);
  
  -- Only try to get week if cycle exists
  IF current_cycle IS NOT NULL AND current_cycle.cycle_id IS NOT NULL THEN
    SELECT * INTO current_week
    FROM public.get_current_week(current_cycle.cycle_id);
  END IF;
  
  -- Get today's plan
  SELECT * INTO today_plan
  FROM public.daily_plans
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE;
  
  -- Get habit status
  habit_status := public.evaluate_habit_color(p_user_id, CURRENT_DATE);
  
  -- Build result JSON with proper null handling
  result := jsonb_build_object(
    'cycle', CASE 
      WHEN current_cycle IS NULL OR current_cycle.cycle_id IS NULL THEN jsonb_build_object(
        'goal', NULL,
        'days_remaining', NULL
      )
      ELSE jsonb_build_object(
        'goal', current_cycle.goal,
        'days_remaining', current_cycle.days_remaining
      )
    END,
    'week', jsonb_build_object(
      'priorities', COALESCE(current_week.top_3_priorities, '[]'::jsonb)
    ),
    'today', jsonb_build_object(
      'plan_exists', today_plan.day_id IS NOT NULL,
      'top_3', COALESCE(today_plan.top_3_today, '[]'::jsonb)
    ),
    'habits', jsonb_build_object(
      'status', habit_status
    )
  );
  
  RETURN result;
END;
$$;