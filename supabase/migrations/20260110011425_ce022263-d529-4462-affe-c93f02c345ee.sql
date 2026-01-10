-- Fix the get_dashboard_summary function to properly handle NULL records
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  current_cycle RECORD;
  current_week RECORD;
  today_plan RECORD;
  habit_status TEXT;
  week_priorities JSONB := '[]'::jsonb;
BEGIN
  -- Get current cycle (may not exist for new users)
  SELECT * INTO current_cycle
  FROM public.get_current_cycle(p_user_id);
  
  -- Only try to get week if cycle exists
  IF current_cycle IS NOT NULL AND current_cycle.cycle_id IS NOT NULL THEN
    SELECT * INTO current_week
    FROM public.get_current_week(current_cycle.cycle_id);
    
    -- Only access current_week fields if it was actually assigned
    IF FOUND AND current_week.week_id IS NOT NULL THEN
      week_priorities := COALESCE(current_week.top_3_priorities, '[]'::jsonb);
    END IF;
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
      'priorities', week_priorities
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
$function$;

-- Fix existing users with mismatched data: update user_type to 'member' where membership_status is 'active'
UPDATE public.user_profiles 
SET user_type = 'member', updated_at = now()
WHERE membership_status = 'active' AND user_type = 'guest';

-- Also update users who have active mastermind entitlements but wrong user_type
UPDATE public.user_profiles up
SET user_type = 'member', updated_at = now()
FROM public.entitlements e
WHERE LOWER(up.email) = LOWER(e.email)
  AND e.tier = 'mastermind'
  AND e.status = 'active'
  AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
  AND up.user_type = 'guest';