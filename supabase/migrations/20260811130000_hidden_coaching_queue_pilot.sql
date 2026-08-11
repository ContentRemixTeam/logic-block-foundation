-- Hidden Coaching Queue pilot.
-- Source-only until Faith approves deployment. The route remains admin-only and
-- absent from Planner navigation.

CREATE TABLE IF NOT EXISTS public.coaching_calls (
  call_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  queue_opens_at timestamptz NOT NULL,
  queue_closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'live', 'closed', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (queue_opens_at <= starts_at),
  CHECK (queue_closes_at > starts_at),
  CHECK (queue_closes_at <= starts_at + interval '15 minutes')
);

CREATE TABLE IF NOT EXISTS public.coaching_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_id uuid NOT NULL REFERENCES public.coaching_calls(call_id) ON DELETE RESTRICT,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  source_weekly_review_id uuid REFERENCES public.weekly_reviews(review_id) ON DELETE SET NULL,
  question text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 3 AND 4000),
  desired_result text,
  what_tried text,
  blocker text,
  deadline date,
  attendance_intent text NOT NULL DEFAULT 'live'
    CHECK (attendance_intent IN ('live', 'absent_ok', 'unsure')),
  coach_if_absent boolean NOT NULL DEFAULT false,
  replay_permission boolean NOT NULL DEFAULT false,
  sensitive boolean NOT NULL DEFAULT false,
  privacy_route text NOT NULL DEFAULT 'live_queue'
    CHECK (privacy_route IN ('live_queue', 'private_written')),
  returning_support_needed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'queued', 'withdrawn', 'deferred', 'coached', 'ask_faith', 'private_written')),
  waiting_since timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  withdrawn_at timestamptz,
  times_skipped integer NOT NULL DEFAULT 0 CHECK (times_skipped >= 0),
  manual_priority integer CHECK (manual_priority BETWEEN 1 AND 9999),
  manual_priority_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, call_id),
  CHECK (privacy_route = 'private_written' OR NOT sensitive OR privacy_route = 'live_queue'),
  CHECK (joined_at IS NULL OR privacy_route = 'live_queue')
);

CREATE TABLE IF NOT EXISTS public.coaching_outcomes (
  outcome_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.coaching_requests(request_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  disposition text NOT NULL
    CHECK (disposition IN ('completed', 'deferred', 'ask_faith', 'private_written')),
  main_decision text,
  next_action text,
  due_date date,
  resource_recommended text,
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_note text,
  coached_at timestamptz NOT NULL DEFAULT now(),
  planner_task_id uuid REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  result_logged_at timestamptz,
  result_note text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_queue_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.coaching_requests(request_id) ON DELETE CASCADE,
  call_id uuid NOT NULL REFERENCES public.coaching_calls(call_id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'submitted', 'updated', 'resubmitted', 'joined', 'withdrawn', 'priority_override',
    'deferred', 'carried_forward', 'coached', 'ask_faith', 'private_written'
  )),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coaching_calls_window_idx
  ON public.coaching_calls(status, queue_opens_at, queue_closes_at);
CREATE INDEX IF NOT EXISTS coaching_requests_call_queue_idx
  ON public.coaching_requests(call_id, status, joined_at, waiting_since);
CREATE INDEX IF NOT EXISTS coaching_requests_member_idx
  ON public.coaching_requests(user_id, waiting_since DESC);
CREATE INDEX IF NOT EXISTS coaching_outcomes_member_idx
  ON public.coaching_outcomes(user_id, coached_at DESC);
CREATE INDEX IF NOT EXISTS coaching_queue_events_request_idx
  ON public.coaching_queue_events(request_id, created_at);

ALTER TABLE public.coaching_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_queue_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view coaching calls" ON public.coaching_calls;
CREATE POLICY "Admins view coaching calls"
  ON public.coaching_calls FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Members view own coaching requests" ON public.coaching_requests;
CREATE POLICY "Members view own coaching requests"
  ON public.coaching_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all coaching requests" ON public.coaching_requests;
CREATE POLICY "Admins view all coaching requests"
  ON public.coaching_requests FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Members view own coaching outcomes" ON public.coaching_outcomes;
CREATE POLICY "Members view own coaching outcomes"
  ON public.coaching_outcomes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all coaching outcomes" ON public.coaching_outcomes;
CREATE POLICY "Admins view all coaching outcomes"
  ON public.coaching_outcomes FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view coaching queue events" ON public.coaching_queue_events;
CREATE POLICY "Admins view coaching queue events"
  ON public.coaching_queue_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- All consequential writes go through narrow SECURITY DEFINER commands.
REVOKE INSERT, UPDATE, DELETE ON public.coaching_calls FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coaching_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coaching_outcomes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coaching_queue_events FROM anon, authenticated;
GRANT SELECT ON public.coaching_calls, public.coaching_requests, public.coaching_outcomes TO authenticated;

CREATE OR REPLACE FUNCTION public.create_coaching_call(
  p_title text,
  p_starts_at timestamptz,
  p_queue_opens_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id uuid;
  v_opens_at timestamptz;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;
  IF char_length(btrim(coalesce(p_title, ''))) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A call title is required.';
  END IF;

  v_opens_at := coalesce(p_queue_opens_at, p_starts_at);
  IF v_opens_at > p_starts_at OR v_opens_at < p_starts_at - interval '30 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The queue may open at the call start or up to 30 minutes before it.';
  END IF;

  INSERT INTO public.coaching_calls(
    title, starts_at, queue_opens_at, queue_closes_at, created_by
  ) VALUES (
    btrim(p_title), p_starts_at, v_opens_at, p_starts_at + interval '15 minutes', auth.uid()
  ) RETURNING call_id INTO v_call_id;

  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_my_coaching_request(
  p_call_id uuid,
  p_cycle_id uuid,
  p_question text,
  p_desired_result text DEFAULT NULL,
  p_what_tried text DEFAULT NULL,
  p_blocker text DEFAULT NULL,
  p_deadline date DEFAULT NULL,
  p_attendance_intent text DEFAULT 'live',
  p_coach_if_absent boolean DEFAULT false,
  p_replay_permission boolean DEFAULT false,
  p_sensitive boolean DEFAULT false,
  p_privacy_route text DEFAULT 'live_queue',
  p_returning_support_needed boolean DEFAULT false,
  p_source_weekly_review_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_existing_wait timestamptz;
  v_existing_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required.';
  END IF;
  IF char_length(btrim(coalesce(p_question, ''))) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Please describe what you want coaching on.';
  END IF;
  IF p_attendance_intent NOT IN ('live', 'absent_ok', 'unsure') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Attendance choice is invalid.';
  END IF;
  IF p_privacy_route NOT IN ('live_queue', 'private_written') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Privacy route is invalid.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.coaching_calls
    WHERE call_id = p_call_id AND status IN ('planned', 'live')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This coaching call is not accepting requests.';
  END IF;
  IF p_cycle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cycles_90_day
    WHERE cycle_id = p_cycle_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'That planning cycle does not belong to you.';
  END IF;
  IF p_source_weekly_review_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.weekly_reviews
    WHERE review_id = p_source_weekly_review_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'That weekly check-in does not belong to you.';
  END IF;

  SELECT waiting_since, status INTO v_existing_wait, v_existing_status
  FROM public.coaching_requests
  WHERE user_id = v_user_id AND call_id = p_call_id;

  INSERT INTO public.coaching_requests(
    user_id, call_id, cycle_id, source_weekly_review_id, question,
    desired_result, what_tried, blocker, deadline, attendance_intent,
    coach_if_absent, replay_permission, sensitive, privacy_route,
    returning_support_needed, waiting_since, status
  ) VALUES (
    v_user_id, p_call_id, p_cycle_id, p_source_weekly_review_id, btrim(p_question),
    nullif(btrim(coalesce(p_desired_result, '')), ''),
    nullif(btrim(coalesce(p_what_tried, '')), ''),
    nullif(btrim(coalesce(p_blocker, '')), ''),
    p_deadline, p_attendance_intent, p_coach_if_absent, p_replay_permission,
    p_sensitive, p_privacy_route, p_returning_support_needed,
    coalesce(v_existing_wait, now()),
    CASE WHEN p_privacy_route = 'private_written' THEN 'private_written' ELSE 'submitted' END
  )
  ON CONFLICT (user_id, call_id) DO UPDATE SET
    cycle_id = excluded.cycle_id,
    source_weekly_review_id = excluded.source_weekly_review_id,
    question = excluded.question,
    desired_result = excluded.desired_result,
    what_tried = excluded.what_tried,
    blocker = excluded.blocker,
    deadline = excluded.deadline,
    attendance_intent = excluded.attendance_intent,
    coach_if_absent = excluded.coach_if_absent,
    replay_permission = excluded.replay_permission,
    sensitive = excluded.sensitive,
    privacy_route = excluded.privacy_route,
    returning_support_needed = excluded.returning_support_needed,
    waiting_since = public.coaching_requests.waiting_since,
    joined_at = CASE WHEN public.coaching_requests.status = 'withdrawn' THEN NULL ELSE public.coaching_requests.joined_at END,
    withdrawn_at = NULL,
    status = CASE
      WHEN public.coaching_requests.status = 'withdrawn' AND excluded.privacy_route = 'private_written' THEN 'private_written'
      WHEN public.coaching_requests.status = 'withdrawn' THEN 'submitted'
      WHEN public.coaching_requests.joined_at IS NOT NULL THEN public.coaching_requests.status
      WHEN excluded.privacy_route = 'private_written' THEN 'private_written'
      ELSE 'submitted'
    END,
    updated_at = now()
  RETURNING request_id INTO v_request_id;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type)
  VALUES (v_request_id, p_call_id, v_user_id, CASE
    WHEN v_existing_wait IS NULL THEN 'submitted'
    WHEN v_existing_status = 'withdrawn' THEN 'resubmitted'
    ELSE 'updated'
  END);

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_my_coaching_queue(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.coaching_requests%ROWTYPE;
  v_call public.coaching_calls%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.coaching_requests
  WHERE request_id = p_request_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Coaching request not found.';
  END IF;
  IF v_request.privacy_route = 'private_written' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Private written requests are not placed in the live queue.';
  END IF;
  IF v_request.withdrawn_at IS NOT NULL OR v_request.status = 'withdrawn' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Withdrawn requests cannot join the queue.';
  END IF;

  -- Idempotent retries must succeed even if the window closed after the first join.
  IF v_request.joined_at IS NOT NULL THEN
    RETURN public.get_my_coaching_queue_status(v_request.call_id);
  END IF;

  SELECT * INTO v_call FROM public.coaching_calls WHERE call_id = v_request.call_id FOR UPDATE;
  IF NOT FOUND OR v_call.status NOT IN ('planned', 'live') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This coaching queue is closed.';
  END IF;
  IF clock_timestamp() < v_call.queue_opens_at THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The coaching queue is not open yet.';
  END IF;
  IF clock_timestamp() > v_call.queue_closes_at THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The first 15-minute arrival window has closed.';
  END IF;

  UPDATE public.coaching_requests
  SET joined_at = clock_timestamp(), status = 'queued', updated_at = now()
  WHERE request_id = p_request_id;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type)
  VALUES (p_request_id, v_request.call_id, v_user_id, 'joined');

  RETURN public.get_my_coaching_queue_status(v_request.call_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_and_join_my_coaching_queue(
  p_call_id uuid,
  p_cycle_id uuid,
  p_question text,
  p_desired_result text DEFAULT NULL,
  p_what_tried text DEFAULT NULL,
  p_blocker text DEFAULT NULL,
  p_deadline date DEFAULT NULL,
  p_attendance_intent text DEFAULT 'live',
  p_coach_if_absent boolean DEFAULT false,
  p_replay_permission boolean DEFAULT false,
  p_sensitive boolean DEFAULT false,
  p_returning_support_needed boolean DEFAULT false,
  p_source_weekly_review_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_status jsonb;
BEGIN
  -- One database statement means a failed arrival check rolls back the save.
  v_request_id := public.save_my_coaching_request(
    p_call_id, p_cycle_id, p_question, p_desired_result, p_what_tried,
    p_blocker, p_deadline, p_attendance_intent, p_coach_if_absent,
    p_replay_permission, p_sensitive, 'live_queue', p_returning_support_needed,
    p_source_weekly_review_id
  );
  v_status := public.join_my_coaching_queue(v_request_id);
  RETURN v_status || jsonb_build_object('request_id', v_request_id, 'saved', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_coaching_queue_status(p_call_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH history AS (
    SELECT
      member.id AS user_id,
      count(outcome.outcome_id)::integer AS coached_count,
      max(outcome.coached_at) AS last_coached_at
    FROM auth.users member
    LEFT JOIN public.coaching_outcomes outcome ON outcome.user_id = member.id
    GROUP BY member.id
  ), ranked AS (
    SELECT
      request.request_id,
      request.user_id,
      row_number() OVER (ORDER BY
        coalesce(request.manual_priority, 10000) ASC,
        (coalesce(history.coached_count, 0) = 0) DESC,
        (request.deadline IS NOT NULL AND nullif(btrim(request.blocker), '') IS NOT NULL) DESC,
        history.last_coached_at ASC NULLS FIRST,
        request.times_skipped DESC,
        request.returning_support_needed DESC,
        request.waiting_since ASC,
        request.request_id ASC
      )::integer AS position,
      count(*) OVER ()::integer AS total
    FROM public.coaching_requests request
    LEFT JOIN history ON history.user_id = request.user_id
    WHERE request.call_id = p_call_id
      AND request.status = 'queued'
      AND request.joined_at IS NOT NULL
  )
  SELECT coalesce(
    (SELECT jsonb_build_object(
      'joined', true,
      'position', position,
      'total', total,
      'estimated_status', CASE
        WHEN position = 1 THEN 'Near the front'
        WHEN position <= 3 THEN 'In the first group'
        ELSE 'In the queue'
      END
    ) FROM ranked WHERE user_id = auth.uid()),
    jsonb_build_object(
      'joined', false,
      'position', NULL,
      'total', coalesce((SELECT max(total) FROM ranked), 0),
      'estimated_status', 'Not currently in the live queue'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.withdraw_my_coaching_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id uuid;
BEGIN
  UPDATE public.coaching_requests
  SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
  WHERE request_id = p_request_id
    AND user_id = auth.uid()
    AND status NOT IN ('coached', 'ask_faith')
  RETURNING call_id INTO v_call_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Coaching request not found or cannot be withdrawn.';
  END IF;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type)
  VALUES (p_request_id, v_call_id, auth.uid(), 'withdrawn');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_coaching_calls()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(call_row) ORDER BY
    CASE WHEN clock_timestamp() BETWEEN call_row.queue_opens_at AND call_row.queue_closes_at THEN 0 ELSE 1 END,
    call_row.starts_at
  ), '[]'::jsonb)
  INTO v_result
  FROM public.coaching_calls call_row
  WHERE call_row.status IN ('planned', 'live')
    AND call_row.queue_closes_at >= clock_timestamp();
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_coaching_queue(p_call_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;

  WITH history AS (
    SELECT user_id, count(*)::integer AS coached_count, max(coached_at) AS last_coached_at,
      jsonb_agg(jsonb_build_object(
        'coached_at', coached_at,
        'main_decision', main_decision,
        'next_action', next_action,
        'result_note', result_note
      ) ORDER BY coached_at DESC) AS previous_coaching_notes
    FROM public.coaching_outcomes
    WHERE disposition = 'completed'
    GROUP BY user_id
  ), latest_cycle AS (
    SELECT DISTINCT ON (cycle.user_id)
      cycle.user_id, cycle.cycle_id, cycle.goal, cycle.focus_area, cycle.biggest_bottleneck,
      snapshot.current_milestone_title, snapshot.capacity_mode
    FROM public.cycles_90_day cycle
    LEFT JOIN public.cycle_success_path_snapshots snapshot
      ON snapshot.user_id = cycle.user_id AND snapshot.cycle_id = cycle.cycle_id
    ORDER BY cycle.user_id, cycle.end_date DESC, cycle.created_at DESC
  ), latest_review AS (
    SELECT DISTINCT ON (review.user_id)
      review.user_id, review.created_at AS last_checkin_at,
      review.wins AS latest_wins, review.challenges AS latest_challenges
    FROM public.weekly_reviews review
    ORDER BY review.user_id, review.created_at DESC
  ), ranked AS (
    SELECT
      request.*,
      coalesce(profile.first_name, split_part(coalesce(profile.email, 'Member'), '@', 1)) AS member_name,
      cycle.goal, cycle.focus_area, cycle.biggest_bottleneck,
      cycle.current_milestone_title, cycle.capacity_mode,
      review.last_checkin_at, review.latest_wins, review.latest_challenges,
      coalesce(history.coached_count, 0) AS coached_count,
      history.last_coached_at, history.previous_coaching_notes,
      row_number() OVER (ORDER BY
        coalesce(request.manual_priority, 10000) ASC,
        (coalesce(history.coached_count, 0) = 0) DESC,
        (request.deadline IS NOT NULL AND nullif(btrim(request.blocker), '') IS NOT NULL) DESC,
        history.last_coached_at ASC NULLS FIRST,
        request.times_skipped DESC,
        request.returning_support_needed DESC,
        request.waiting_since ASC,
        request.request_id ASC
      ) AS queue_position
    FROM public.coaching_requests request
    LEFT JOIN public.user_profiles profile ON profile.id = request.user_id
    LEFT JOIN latest_cycle cycle ON cycle.user_id = request.user_id
    LEFT JOIN latest_review review ON review.user_id = request.user_id
    LEFT JOIN history ON history.user_id = request.user_id
    WHERE request.call_id = p_call_id
      AND request.status IN ('queued', 'private_written')
  )
  SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY
    CASE WHEN privacy_route = 'live_queue' THEN 0 ELSE 1 END,
    queue_position
  ), '[]'::jsonb)
  INTO v_result
  FROM ranked;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_coaching_priority_override(
  p_request_id uuid,
  p_priority integer,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;
  IF p_priority IS NOT NULL AND (p_priority < 1 OR p_priority > 9999) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Priority must be between 1 and 9999.';
  END IF;
  IF p_priority IS NOT NULL AND char_length(btrim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Record why the queue was manually adjusted.';
  END IF;

  UPDATE public.coaching_requests
  SET manual_priority = p_priority,
      manual_priority_reason = CASE WHEN p_priority IS NULL THEN NULL ELSE btrim(p_reason) END,
      updated_at = now()
  WHERE request_id = p_request_id
  RETURNING call_id INTO v_call_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Coaching request not found.';
  END IF;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type, event_data)
  VALUES (p_request_id, v_call_id, auth.uid(), 'priority_override',
    jsonb_build_object('priority', p_priority, 'reason', p_reason));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.defer_coaching_request(
  p_request_id uuid,
  p_next_call_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.coaching_requests%ROWTYPE;
  v_new_request_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;

  SELECT * INTO v_request FROM public.coaching_requests
  WHERE request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Coaching request not found.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.coaching_calls
    WHERE call_id = p_next_call_id AND status IN ('planned', 'live')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The next coaching call is not accepting requests.';
  END IF;

  UPDATE public.coaching_requests
  SET status = 'deferred', times_skipped = times_skipped + 1, updated_at = now()
  WHERE request_id = p_request_id;

  INSERT INTO public.coaching_requests(
    user_id, call_id, cycle_id, source_weekly_review_id, question,
    desired_result, what_tried, blocker, deadline, attendance_intent,
    coach_if_absent, replay_permission, sensitive, privacy_route,
    returning_support_needed, status, waiting_since, times_skipped
  ) VALUES (
    v_request.user_id, p_next_call_id, v_request.cycle_id, v_request.source_weekly_review_id,
    v_request.question, v_request.desired_result, v_request.what_tried, v_request.blocker,
    v_request.deadline, v_request.attendance_intent, v_request.coach_if_absent,
    v_request.replay_permission, v_request.sensitive, v_request.privacy_route,
    v_request.returning_support_needed,
    CASE WHEN v_request.privacy_route = 'private_written' THEN 'private_written' ELSE 'submitted' END,
    v_request.waiting_since, v_request.times_skipped + 1
  )
  ON CONFLICT (user_id, call_id) DO UPDATE SET
    waiting_since = least(public.coaching_requests.waiting_since, excluded.waiting_since),
    times_skipped = greatest(public.coaching_requests.times_skipped, excluded.times_skipped),
    question = excluded.question,
    desired_result = excluded.desired_result,
    what_tried = excluded.what_tried,
    blocker = excluded.blocker,
    deadline = excluded.deadline,
    updated_at = now()
  RETURNING request_id INTO v_new_request_id;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type, event_data)
  VALUES (p_request_id, v_request.call_id, auth.uid(), 'deferred', jsonb_build_object('next_call_id', p_next_call_id));
  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type, event_data)
  VALUES (v_new_request_id, p_next_call_id, auth.uid(), 'carried_forward', jsonb_build_object('from_request_id', p_request_id));

  RETURN v_new_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_coaching_request(
  p_request_id uuid,
  p_disposition text,
  p_main_decision text DEFAULT NULL,
  p_next_action text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_resource_recommended text DEFAULT NULL,
  p_follow_up_required boolean DEFAULT false,
  p_follow_up_note text DEFAULT NULL,
  p_add_to_planner boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.coaching_requests%ROWTYPE;
  v_outcome_id uuid;
  v_task_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required.';
  END IF;
  IF p_disposition NOT IN ('completed', 'ask_faith', 'private_written') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use the defer command for a skipped request.';
  END IF;

  -- Serialize on the request first, then check for an existing outcome so
  -- concurrent retries return the same successful receipt.
  SELECT * INTO v_request FROM public.coaching_requests
  WHERE request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Coaching request not found.';
  END IF;

  SELECT outcome_id, planner_task_id INTO v_outcome_id, v_task_id
  FROM public.coaching_outcomes WHERE request_id = p_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('outcome_id', v_outcome_id, 'planner_task_id', v_task_id, 'replayed', true);
  END IF;

  IF p_add_to_planner AND nullif(btrim(coalesce(p_next_action, '')), '') IS NOT NULL THEN
    INSERT INTO public.tasks(
      user_id, cycle_id, task_text, task_description, source,
      system_source, external_id, is_system_generated, priority,
      scheduled_date, due_date, status, is_completed
    ) VALUES (
      v_request.user_id, v_request.cycle_id, btrim(p_next_action),
      nullif(btrim(coalesce(p_main_decision, '')), ''), 'coaching',
      'coaching_queue', 'coaching:' || p_request_id::text, true, 'high',
      p_due_date, p_due_date, 'todo', false
    ) RETURNING task_id INTO v_task_id;
  END IF;

  INSERT INTO public.coaching_outcomes(
    request_id, user_id, cycle_id, disposition, main_decision, next_action,
    due_date, resource_recommended, follow_up_required, follow_up_note,
    planner_task_id, created_by
  ) VALUES (
    p_request_id, v_request.user_id, v_request.cycle_id, p_disposition,
    nullif(btrim(coalesce(p_main_decision, '')), ''),
    nullif(btrim(coalesce(p_next_action, '')), ''), p_due_date,
    nullif(btrim(coalesce(p_resource_recommended, '')), ''),
    p_follow_up_required, nullif(btrim(coalesce(p_follow_up_note, '')), ''),
    v_task_id, auth.uid()
  ) RETURNING outcome_id INTO v_outcome_id;

  UPDATE public.coaching_requests
  SET status = CASE WHEN p_disposition = 'completed' THEN 'coached' ELSE p_disposition END,
      updated_at = now()
  WHERE request_id = p_request_id;

  INSERT INTO public.coaching_queue_events(request_id, call_id, actor_user_id, event_type)
  VALUES (
    p_request_id,
    v_request.call_id,
    auth.uid(),
    CASE WHEN p_disposition = 'completed' THEN 'coached' ELSE p_disposition END
  );

  RETURN jsonb_build_object('outcome_id', v_outcome_id, 'planner_task_id', v_task_id, 'replayed', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_pending_coaching_followups()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'outcome_id', outcome.outcome_id,
    'main_decision', outcome.main_decision,
    'next_action', outcome.next_action,
    'due_date', outcome.due_date,
    'resource_recommended', outcome.resource_recommended,
    'follow_up_required', outcome.follow_up_required,
    'planner_task_id', outcome.planner_task_id,
    'coached_at', outcome.coached_at
  ) ORDER BY outcome.coached_at DESC), '[]'::jsonb)
  FROM public.coaching_outcomes outcome
  WHERE outcome.user_id = auth.uid()
    AND outcome.acknowledged_at IS NULL
    AND outcome.disposition = 'completed';
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_my_coaching_outcome(p_outcome_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coaching_outcomes
  SET acknowledged_at = coalesce(acknowledged_at, now()), updated_at = now()
  WHERE outcome_id = p_outcome_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Coaching outcome not found.';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_my_coaching_result(p_outcome_id uuid, p_result_note text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF char_length(btrim(coalesce(p_result_note, ''))) < 2 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Add a short result update.';
  END IF;
  UPDATE public.coaching_outcomes
  SET result_note = btrim(p_result_note), result_logged_at = now(),
      acknowledged_at = coalesce(acknowledged_at, now()), updated_at = now()
  WHERE outcome_id = p_outcome_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Coaching outcome not found.';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_coaching_call(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_my_coaching_request(uuid, uuid, text, text, text, text, date, text, boolean, boolean, boolean, text, boolean, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_my_coaching_queue(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_and_join_my_coaching_queue(uuid, uuid, text, text, text, text, date, text, boolean, boolean, boolean, boolean, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_coaching_queue_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_my_coaching_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_coaching_calls() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_coaching_queue(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_coaching_priority_override(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.defer_coaching_request(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_coaching_request(uuid, text, text, text, date, text, boolean, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_pending_coaching_followups() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acknowledge_my_coaching_outcome(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_my_coaching_result(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_coaching_call(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_coaching_request(uuid, uuid, text, text, text, text, date, text, boolean, boolean, boolean, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_my_coaching_queue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_and_join_my_coaching_queue(uuid, uuid, text, text, text, text, date, text, boolean, boolean, boolean, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_coaching_queue_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_my_coaching_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_coaching_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_coaching_queue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_coaching_priority_override(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.defer_coaching_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_coaching_request(uuid, text, text, text, date, text, boolean, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_pending_coaching_followups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_my_coaching_outcome(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_my_coaching_result(uuid, text) TO authenticated;
