-- Server-side function: Get current cycle for a user
CREATE OR REPLACE FUNCTION public.get_current_cycle(p_user_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  cycle_id UUID,
  goal TEXT,
  why TEXT,
  identity TEXT,
  target_feeling TEXT,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.cycle_id,
    c.goal,
    c.why,
    c.identity,
    c.target_feeling,
    c.start_date,
    c.end_date,
    (c.end_date - p_today)::INTEGER as days_remaining
  FROM public.cycles_90_day c
  WHERE c.user_id = p_user_id
    AND c.start_date <= p_today
    AND c.end_date >= p_today
  ORDER BY c.start_date DESC
  LIMIT 1;
END;
$$;

-- Server-side function: Get current week for a cycle
CREATE OR REPLACE FUNCTION public.get_current_week(p_cycle_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  week_id UUID,
  top_3_priorities JSONB,
  weekly_thought TEXT,
  weekly_feeling TEXT,
  start_of_week DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.week_id,
    w.top_3_priorities,
    w.weekly_thought,
    w.weekly_feeling,
    w.start_of_week
  FROM public.weekly_plans w
  WHERE w.cycle_id = p_cycle_id
    AND w.start_of_week <= p_today
    AND w.start_of_week + INTERVAL '6 days' >= p_today
  ORDER BY w.start_of_week DESC
  LIMIT 1;
END;
$$;

-- Server-side function: Evaluate habit color for a date
CREATE OR REPLACE FUNCTION public.evaluate_habit_color(p_user_id UUID, p_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_habits INTEGER;
  completed_habits INTEGER;
  completion_rate NUMERIC;
BEGIN
  -- Count total active habits for the user
  SELECT COUNT(*) INTO total_habits
  FROM public.habits
  WHERE user_id = p_user_id AND is_active = true;
  
  -- If no habits, return grey
  IF total_habits = 0 THEN
    RETURN 'grey';
  END IF;
  
  -- Count completed habits for the date
  SELECT COUNT(*) INTO completed_habits
  FROM public.habit_logs
  WHERE user_id = p_user_id
    AND date = p_date
    AND completed = true;
  
  -- Calculate completion rate
  completion_rate := (completed_habits::NUMERIC / total_habits::NUMERIC) * 100;
  
  -- Return color based on completion rate
  IF completion_rate >= 80 THEN
    RETURN 'green';
  ELSIF completion_rate >= 50 THEN
    RETURN 'yellow';
  ELSE
    RETURN 'grey';
  END IF;
END;
$$;

-- Server-side function: Get dashboard summary
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  current_cycle RECORD;
  current_week RECORD;
  today_plan RECORD;
  habit_status TEXT;
BEGIN
  -- Get current cycle
  SELECT * INTO current_cycle
  FROM public.get_current_cycle(p_user_id);
  
  -- Get current week if cycle exists
  IF current_cycle.cycle_id IS NOT NULL THEN
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
  
  -- Build result JSON
  result := jsonb_build_object(
    'cycle', jsonb_build_object(
      'goal', current_cycle.goal,
      'days_remaining', current_cycle.days_remaining
    ),
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

-- Server-side function: Create daily plan (CRUD)
CREATE OR REPLACE FUNCTION public.create_daily_plan(
  p_user_id UUID,
  p_date DATE,
  p_top_3_today JSONB,
  p_thought TEXT,
  p_feeling TEXT,
  p_selected_weekly_priorities JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_day_id UUID;
  current_cycle_id UUID;
  current_week_id UUID;
BEGIN
  -- Get current cycle and week
  SELECT cycle_id INTO current_cycle_id
  FROM public.get_current_cycle(p_user_id, p_date);
  
  IF current_cycle_id IS NOT NULL THEN
    SELECT week_id INTO current_week_id
    FROM public.get_current_week(current_cycle_id, p_date);
  END IF;
  
  -- Insert daily plan
  INSERT INTO public.daily_plans (
    user_id, cycle_id, week_id, date,
    top_3_today, thought, feeling, selected_weekly_priorities
  )
  VALUES (
    p_user_id, current_cycle_id, current_week_id, p_date,
    p_top_3_today, p_thought, p_feeling, p_selected_weekly_priorities
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    top_3_today = EXCLUDED.top_3_today,
    thought = EXCLUDED.thought,
    feeling = EXCLUDED.feeling,
    selected_weekly_priorities = EXCLUDED.selected_weekly_priorities,
    updated_at = now()
  RETURNING day_id INTO new_day_id;
  
  RETURN new_day_id;
END;
$$;

-- Server-side function: Toggle habit completion (CRUD)
CREATE OR REPLACE FUNCTION public.toggle_habit(
  p_user_id UUID,
  p_habit_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status BOOLEAN;
  new_status BOOLEAN;
  current_cycle_id UUID;
  current_week_id UUID;
  current_day_id UUID;
BEGIN
  -- Get current cycle, week, and day
  SELECT cycle_id INTO current_cycle_id
  FROM public.get_current_cycle(p_user_id, p_date);
  
  IF current_cycle_id IS NOT NULL THEN
    SELECT week_id INTO current_week_id
    FROM public.get_current_week(current_cycle_id, p_date);
  END IF;
  
  SELECT day_id INTO current_day_id
  FROM public.daily_plans
  WHERE user_id = p_user_id AND date = p_date;
  
  -- Check current status
  SELECT completed INTO current_status
  FROM public.habit_logs
  WHERE user_id = p_user_id
    AND habit_id = p_habit_id
    AND date = p_date;
  
  -- Toggle status
  new_status := NOT COALESCE(current_status, false);
  
  -- Upsert habit log
  INSERT INTO public.habit_logs (
    user_id, habit_id, date, cycle_id, week_id, day_id, completed
  )
  VALUES (
    p_user_id, p_habit_id, p_date, current_cycle_id, current_week_id, current_day_id, new_status
  )
  ON CONFLICT (user_id, habit_id, date)
  DO UPDATE SET
    completed = new_status;
  
  RETURN new_status;
END;
$$;

-- Server-side function: Get habit summary for week
CREATE OR REPLACE FUNCTION public.get_habit_summary_for_week(
  p_user_id UUID,
  p_week_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  start_date DATE;
BEGIN
  -- Get week start date
  SELECT start_of_week INTO start_date
  FROM public.weekly_plans
  WHERE week_id = p_week_id;
  
  -- Build habit summary
  SELECT jsonb_object_agg(
    h.habit_name,
    jsonb_build_object(
      'total', 7,
      'completed', COUNT(hl.log_id) FILTER (WHERE hl.completed = true)
    )
  )
  INTO result
  FROM public.habits h
  LEFT JOIN public.habit_logs hl ON h.habit_id = hl.habit_id
    AND hl.date BETWEEN start_date AND start_date + INTERVAL '6 days'
  WHERE h.user_id = p_user_id
    AND h.is_active = true
  GROUP BY h.habit_id, h.habit_name;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;