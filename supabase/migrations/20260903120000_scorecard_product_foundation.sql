-- Scorecard product foundation
--
-- The Scorecard is a focused execution surface inside the existing Planner.
-- Definitions live in scorecard_actions; every dated check-off is a canonical
-- task so completion stays in sync with Today, Tasks, and the 90-day Planner.

ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS scorecard_status text,
  ADD COLUMN IF NOT EXISTS scorecard_starts_at date,
  ADD COLUMN IF NOT EXISTS scorecard_ends_at date,
  ADD COLUMN IF NOT EXISTS scorecard_product_id text,
  ADD COLUMN IF NOT EXISTS scorecard_price_id text,
  ADD COLUMN IF NOT EXISTS scorecard_order_id text,
  ADD COLUMN IF NOT EXISTS scorecard_last_purchase_at timestamptz;

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_scorecard_status_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_scorecard_status_check
  CHECK (scorecard_status IS NULL OR scorecard_status IN ('active', 'cancelled', 'expired', 'refunded'));

CREATE INDEX IF NOT EXISTS entitlements_scorecard_access_idx
  ON public.entitlements (scorecard_status, scorecard_ends_at);

-- Resolve access from the authenticated JWT. Callers cannot ask about another
-- email address. Planner and Mastermind customers inherit scorecard access.
CREATE OR REPLACE FUNCTION public.get_current_product_capabilities()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access_state AS (
    SELECT
      public.is_admin(auth.uid()) AS is_admin,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.scorecard_status = 'active'
          AND (e.scorecard_starts_at IS NULL OR e.scorecard_starts_at <= CURRENT_DATE)
          AND (e.scorecard_ends_at IS NULL OR e.scorecard_ends_at >= CURRENT_DATE)
      ) AS has_scorecard,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.planner_tier IN ('annual', 'lifetime')
          AND e.planner_status = 'active'
          AND (e.planner_starts_at IS NULL OR e.planner_starts_at <= CURRENT_DATE)
          AND (e.planner_ends_at IS NULL OR e.planner_ends_at >= CURRENT_DATE)
      ) AS has_planner,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.tier = 'mastermind'
          AND e.status = 'active'
          AND (e.starts_at IS NULL OR e.starts_at <= CURRENT_DATE)
          AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
      ) AS has_mastermind
  )
  SELECT ARRAY(
    SELECT capability
    FROM access_state a
    CROSS JOIN LATERAL (
      VALUES
        ('scorecard.core'::text, a.is_admin OR a.has_scorecard OR a.has_planner OR a.has_mastermind),
        ('planner.core'::text, a.is_admin OR a.has_planner OR a.has_mastermind),
        ('mastermind.core'::text, a.is_admin OR a.has_mastermind)
    ) AS capabilities(capability, allowed)
    WHERE allowed
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_product_capabilities() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_product_capabilities() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_product_capabilities() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_product_capability(p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(p_capability = ANY(public.get_current_product_capabilities()), false);
$$;

REVOKE ALL ON FUNCTION public.has_product_capability(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_product_capability(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_product_capability(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.scorecard_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  action_text text NOT NULL CHECK (char_length(action_text) BETWEEN 1 AND 160),
  category text,
  cadence text NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily', 'weekly')),
  scheduled_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scorecard_actions_scheduled_days_valid CHECK (
    cardinality(scheduled_days) BETWEEN 1 AND 7
    AND scheduled_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
  )
);

ALTER TABLE public.scorecard_actions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_actions TO authenticated;

DROP POLICY IF EXISTS "Scorecard users can view own actions" ON public.scorecard_actions;
CREATE POLICY "Scorecard users can view own actions"
  ON public.scorecard_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_product_capability('scorecard.core'));

DROP POLICY IF EXISTS "Scorecard users can create own actions" ON public.scorecard_actions;
CREATE POLICY "Scorecard users can create own actions"
  ON public.scorecard_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_product_capability('scorecard.core'));

DROP POLICY IF EXISTS "Scorecard users can update own actions" ON public.scorecard_actions;
CREATE POLICY "Scorecard users can update own actions"
  ON public.scorecard_actions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_product_capability('scorecard.core'))
  WITH CHECK (auth.uid() = user_id AND public.has_product_capability('scorecard.core'));

DROP POLICY IF EXISTS "Scorecard users can delete own actions" ON public.scorecard_actions;
CREATE POLICY "Scorecard users can delete own actions"
  ON public.scorecard_actions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.has_product_capability('scorecard.core'));

CREATE INDEX IF NOT EXISTS scorecard_actions_user_active_idx
  ON public.scorecard_actions (user_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS scorecard_actions_cycle_idx
  ON public.scorecard_actions (cycle_id)
  WHERE cycle_id IS NOT NULL;

DROP TRIGGER IF EXISTS scorecard_actions_updated_at ON public.scorecard_actions;
CREATE TRIGGER scorecard_actions_updated_at
  BEFORE UPDATE ON public.scorecard_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scorecard_action_id uuid REFERENCES public.scorecard_actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scorecard_week_start date;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_scorecard_occurrence_unique_idx
  ON public.tasks (user_id, scorecard_action_id, scheduled_date)
  WHERE scorecard_action_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS tasks_scorecard_week_idx
  ON public.tasks (user_id, scorecard_week_start, scheduled_date)
  WHERE scorecard_action_id IS NOT NULL AND deleted_at IS NULL;

-- Create the current week's dated task occurrences. Re-running is safe.
-- Incomplete occurrences removed from setup are soft-deleted; completed work is
-- retained as history. Existing incomplete tasks keep their completion state.
CREATE OR REPLACE FUNCTION public.sync_scorecard_week(p_week_start date DEFAULT CURRENT_DATE)
RETURNS SETOF public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_week_start date := date_trunc('week', coalesce(p_week_start, CURRENT_DATE))::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_product_capability('scorecard.core') THEN
    RAISE EXCEPTION 'Scorecard access required' USING ERRCODE = '42501';
  END IF;

  -- Past weeks are history. Return what was actually generated and completed;
  -- never rebuild them from today's action setup.
  IF v_week_start < date_trunc('week', CURRENT_DATE)::date THEN
    RETURN QUERY
    SELECT t.*
    FROM public.tasks t
    WHERE t.user_id = v_user_id
      AND t.scorecard_week_start = v_week_start
      AND t.scorecard_action_id IS NOT NULL
      AND t.deleted_at IS NULL
    ORDER BY t.scheduled_date, t.day_order, t.created_at;
    RETURN;
  END IF;

  WITH desired AS (
    SELECT
      a.id AS action_id,
      a.action_text,
      a.category,
      a.cycle_id,
      a.sort_order,
      (v_week_start + (day_number - 1))::date AS action_date
    FROM public.scorecard_actions a
    CROSS JOIN LATERAL unnest(a.scheduled_days) AS day_number
    WHERE a.user_id = v_user_id
      AND a.is_active = true
  )
  UPDATE public.tasks t
  SET deleted_at = now(), updated_at = now()
  WHERE t.user_id = v_user_id
    AND t.scorecard_week_start = v_week_start
    AND t.scorecard_action_id IS NOT NULL
    AND t.is_completed = false
    AND t.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM desired d
      WHERE d.action_id = t.scorecard_action_id
        AND d.action_date = t.scheduled_date
    );

  INSERT INTO public.tasks (
    user_id,
    task_text,
    source,
    is_completed,
    scheduled_date,
    planned_day,
    status,
    project_column,
    category,
    cycle_id,
    day_order,
    scorecard_action_id,
    scorecard_week_start
  )
  SELECT
    v_user_id,
    a.action_text,
    'scorecard',
    false,
    (v_week_start + (day_number - 1))::date,
    (v_week_start + (day_number - 1))::date::text,
    'scheduled',
    'todo',
    nullif(a.category, ''),
    a.cycle_id,
    a.sort_order,
    a.id,
    v_week_start
  FROM public.scorecard_actions a
  CROSS JOIN LATERAL unnest(a.scheduled_days) AS day_number
  WHERE a.user_id = v_user_id
    AND a.is_active = true
  ON CONFLICT (user_id, scorecard_action_id, scheduled_date)
    WHERE scorecard_action_id IS NOT NULL AND deleted_at IS NULL
  DO UPDATE SET
    task_text = EXCLUDED.task_text,
    planned_day = EXCLUDED.planned_day,
    category = EXCLUDED.category,
    cycle_id = EXCLUDED.cycle_id,
    day_order = EXCLUDED.day_order,
    scorecard_week_start = EXCLUDED.scorecard_week_start,
    updated_at = now()
  WHERE public.tasks.is_completed = false;

  RETURN QUERY
  SELECT t.*
  FROM public.tasks t
  WHERE t.user_id = v_user_id
    AND t.scorecard_week_start = v_week_start
    AND t.scorecard_action_id IS NOT NULL
    AND t.deleted_at IS NULL
  ORDER BY t.scheduled_date, t.day_order, t.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_scorecard_week(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_scorecard_week(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_scorecard_week(date) TO authenticated;

-- Service-role entry point for the future GHL purchase/refund workflow. A new
-- scorecard-only row is deliberately non-Mastermind and non-Planner.
CREATE OR REPLACE FUNCTION public.grant_scorecard_entitlement(
  p_email text,
  p_status text DEFAULT 'active',
  p_starts_at date DEFAULT CURRENT_DATE,
  p_ends_at date DEFAULT NULL,
  p_product_id text DEFAULT NULL,
  p_price_id text DEFAULT NULL,
  p_order_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF nullif(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_status NOT IN ('active', 'cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'Invalid scorecard status';
  END IF;

  INSERT INTO public.entitlements (
    email,
    tier,
    status,
    starts_at,
    scorecard_status,
    scorecard_starts_at,
    scorecard_ends_at,
    scorecard_product_id,
    scorecard_price_id,
    scorecard_order_id,
    scorecard_last_purchase_at
  ) VALUES (
    lower(trim(p_email)),
    'none',
    'inactive',
    p_starts_at,
    p_status,
    p_starts_at,
    p_ends_at,
    p_product_id,
    p_price_id,
    p_order_id,
    now()
  )
  ON CONFLICT (lower(email)) DO UPDATE SET
    scorecard_status = EXCLUDED.scorecard_status,
    scorecard_starts_at = EXCLUDED.scorecard_starts_at,
    scorecard_ends_at = EXCLUDED.scorecard_ends_at,
    scorecard_product_id = coalesce(EXCLUDED.scorecard_product_id, public.entitlements.scorecard_product_id),
    scorecard_price_id = coalesce(EXCLUDED.scorecard_price_id, public.entitlements.scorecard_price_id),
    scorecard_order_id = coalesce(EXCLUDED.scorecard_order_id, public.entitlements.scorecard_order_id),
    scorecard_last_purchase_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_scorecard_entitlement(text, text, date, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_scorecard_entitlement(text, text, date, date, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_scorecard_entitlement(text, text, date, date, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_scorecard_entitlement(text, text, date, date, text, text, text) TO service_role;
