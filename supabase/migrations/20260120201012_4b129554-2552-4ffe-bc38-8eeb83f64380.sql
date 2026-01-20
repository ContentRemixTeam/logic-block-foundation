-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NULL,
  course_url TEXT NULL,
  purchase_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'implementing', 'complete', 'archived')),
  intention TEXT NULL CHECK (char_length(intention) <= 1000),
  roi_type TEXT NULL
    CHECK (roi_type IS NULL OR roi_type IN ('revenue', 'leads', 'calls', 'conversion', 'time_saved', 'skill', 'other')),
  roi_target TEXT NULL CHECK (char_length(roi_target) <= 500),
  success_criteria TEXT NULL CHECK (char_length(success_criteria) <= 1000),
  start_date DATE NULL,
  target_finish_date DATE NULL,
  roi_checkin_days INT NOT NULL DEFAULT 30,
  roi_checkin_date DATE NULL,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_user_created ON public.courses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_user_status ON public.courses(user_id, status);

-- RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses" ON public.courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses" ON public.courses
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for courses
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COURSE STUDY PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.course_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sessions_per_week INT NOT NULL DEFAULT 3 CHECK (sessions_per_week >= 1 AND sessions_per_week <= 7),
  session_minutes INT NOT NULL DEFAULT 45 CHECK (session_minutes >= 10 AND session_minutes <= 240),
  preferred_days INT[] NOT NULL DEFAULT '{1,3,5}',
  start_date DATE NOT NULL,
  target_finish_date DATE NULL,
  auto_generate_sessions BOOLEAN NOT NULL DEFAULT false,
  last_generation_op_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Indexes for study plans
CREATE INDEX IF NOT EXISTS idx_study_plans_user_course ON public.course_study_plans(user_id, course_id);

-- RLS for study plans
ALTER TABLE public.course_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study plans" ON public.course_study_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON public.course_study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON public.course_study_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON public.course_study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for study plans
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.course_study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COURSE CHECKINS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.course_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL CHECK (checkin_type IN ('weekly', 'monthly', 'roi')),
  checkin_date DATE NOT NULL,
  on_track BOOLEAN NULL,
  notes TEXT NULL CHECK (char_length(notes) <= 2000),
  blocker TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for checkins
CREATE INDEX IF NOT EXISTS idx_checkins_user_course_date ON public.course_checkins(user_id, course_id, checkin_date DESC);

-- RLS for checkins
ALTER TABLE public.course_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.course_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON public.course_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins" ON public.course_checkins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkins" ON public.course_checkins
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- ADD COURSE_ID TO TASKS TABLE
-- =============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS course_id UUID NULL REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT NULL;

-- Index for course-related task queries
CREATE INDEX IF NOT EXISTS idx_tasks_course ON public.tasks(user_id, course_id, scheduled_date) 
  WHERE course_id IS NOT NULL;

-- =============================================
-- RPC: GENERATE COURSE STUDY SESSIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_course_study_sessions(
  p_course_id UUID,
  p_plan_id UUID,
  p_client_op_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_weeks INT DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_course_title TEXT;
  v_session_minutes INT;
  v_preferred_days INT[];
  v_sessions_per_week INT;
  v_current_date DATE;
  v_end_date DATE;
  v_created_count INT := 0;
  v_day_of_week INT;
  v_session_num INT := 1;
  v_last_op_id UUID;
BEGIN
  -- Get plan details and check for duplicate operation
  SELECT sp.user_id, sp.session_minutes, sp.preferred_days, sp.sessions_per_week, 
         sp.last_generation_op_id, c.title
  INTO v_user_id, v_session_minutes, v_preferred_days, v_sessions_per_week, 
       v_last_op_id, v_course_title
  FROM course_study_plans sp
  JOIN courses c ON c.id = sp.course_id
  WHERE sp.id = p_plan_id AND sp.course_id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Study plan not found';
  END IF;

  -- Check for duplicate operation (idempotency)
  IF v_last_op_id = p_client_op_id THEN
    RETURN jsonb_build_object('created_count', 0, 'message', 'Operation already applied');
  END IF;

  -- Verify user owns this
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get existing session count for numbering
  SELECT COALESCE(MAX(
    CASE 
      WHEN task_text ~ 'Session (\d+)' 
      THEN (regexp_match(task_text, 'Session (\d+)'))[1]::int 
      ELSE 0 
    END
  ), 0) INTO v_session_num
  FROM tasks
  WHERE user_id = v_user_id
    AND course_id = p_course_id
    AND task_type = 'course_session';
  
  v_session_num := v_session_num + 1;

  v_end_date := p_from_date + (p_weeks * 7);
  v_current_date := p_from_date;

  -- Loop through each day in the range
  WHILE v_current_date < v_end_date LOOP
    -- Get day of week (0=Sunday, 6=Saturday)
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INT;
    
    -- Check if this day is in preferred_days
    IF v_day_of_week = ANY(v_preferred_days) THEN
      -- Check if task already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM tasks
        WHERE user_id = v_user_id
          AND course_id = p_course_id
          AND scheduled_date = v_current_date
          AND task_type = 'course_session'
          AND is_system_generated = true
      ) THEN
        -- Create the study session task
        INSERT INTO tasks (
          user_id, task_text, scheduled_date, estimated_minutes, 
          course_id, task_type, is_system_generated, system_source, template_key, status
        ) VALUES (
          v_user_id,
          'Study: ' || v_course_title || ' (Session ' || v_session_num || ')',
          v_current_date,
          v_session_minutes,
          p_course_id,
          'course_session',
          true,
          'course_study_plan',
          'course_study_session_v1',
          'scheduled'
        );
        v_created_count := v_created_count + 1;
        v_session_num := v_session_num + 1;
      END IF;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;

  -- Mark operation as applied (for idempotency)
  UPDATE course_study_plans
  SET last_generation_op_id = p_client_op_id, updated_at = now()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object('created_count', v_created_count);
END;
$$;