-- Wave 1: canonical transactional Planner reconciliation (source-only).
-- Rollback, if ever approved: revoke/drop reconcile_cycle_plan_v2 first, then
-- retain ledger/identity columns until receipts are archived. Do not blindly
-- drop generated metadata or owner constraints from a database with live rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.cycle_drafts
  ADD COLUMN IF NOT EXISTS logical_plan_key uuid,
  ADD COLUMN IF NOT EXISTS reconciliation_request_id uuid;

ALTER TABLE public.cycles_90_day
  ADD COLUMN IF NOT EXISTS planner_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS planner_payload_version text,
  ADD COLUMN IF NOT EXISTS planner_plan_id uuid,
  ADD COLUMN IF NOT EXISTS reconciliation_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reconciliation_request_id uuid,
  ADD COLUMN IF NOT EXISTS planner_content_hash text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS cycles_90_day_owner_cycle_unique
  ON public.cycles_90_day(user_id, cycle_id);
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_project_unique
  ON public.projects(user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_cycle_generation_unique
  ON public.projects(user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS habits_owner_cycle_generation_unique
  ON public.habits(user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_owner_cycle_generation_unique
  ON public.tasks(user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL;

-- NOT VALID avoids making deployment depend on unrelated historical bad rows,
-- while PostgreSQL still enforces every new/updated relationship immediately.
DO $$
DECLARE
  v_table text;
  v_constraint text;
BEGIN
  FOR v_table, v_constraint IN
    SELECT * FROM (VALUES
      ('cycle_strategy', 'cycle_strategy_owner_cycle_fkey'),
      ('cycle_offers', 'cycle_offers_owner_cycle_fkey'),
      ('cycle_limited_offers', 'cycle_limited_offers_owner_cycle_fkey'),
      ('cycle_revenue_plan', 'cycle_revenue_plan_owner_cycle_fkey'),
      ('cycle_month_plans', 'cycle_month_plans_owner_cycle_fkey'),
      ('projects', 'projects_owner_cycle_fkey'),
      ('habits', 'habits_owner_cycle_fkey'),
      ('tasks', 'tasks_owner_cycle_fkey'),
      ('daily_plans', 'daily_plans_owner_cycle_fkey')
    ) AS constraints(table_name, constraint_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass
        AND conname = v_constraint
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id, cycle_id) REFERENCES public.cycles_90_day(user_id, cycle_id) NOT VALID',
        v_table, v_constraint
      );
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_owner_project_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_owner_project_fkey
      FOREIGN KEY (user_id, project_id)
      REFERENCES public.projects(user_id, id) NOT VALID;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.cycle_plan_intents_v2 (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logical_plan_key uuid NOT NULL,
  quarter_start date NOT NULL,
  cycle_id uuid,
  current_version bigint NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  last_content_hash text CHECK (last_content_hash IS NULL OR last_content_hash ~ '^[0-9a-f]{64}$'),
  last_planner_receipt_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quarter_start),
  UNIQUE(user_id, logical_plan_key),
  UNIQUE(user_id, cycle_id),
  CONSTRAINT cycle_plan_intents_v2_owner_cycle_fkey
    FOREIGN KEY (user_id, cycle_id)
    REFERENCES public.cycles_90_day(user_id, cycle_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS public.cycle_plan_identity_aliases_v2 (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logical_plan_key uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.cycle_plan_intents_v2(plan_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, logical_plan_key)
);

CREATE TABLE IF NOT EXISTS public.cycle_plan_reconciliation_requests_v2 (
  ledger_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.cycle_plan_intents_v2(plan_id) ON DELETE CASCADE,
  planner_receipt_id uuid,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  payload_version text NOT NULL,
  expected_version bigint,
  resulting_version bigint,
  cycle_id uuid,
  status text NOT NULL CHECK (status IN ('in_progress', 'complete')),
  receipt jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id),
  CONSTRAINT cycle_plan_requests_v2_owner_cycle_fkey
    FOREIGN KEY (user_id, cycle_id)
    REFERENCES public.cycles_90_day(user_id, cycle_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS cycle_plan_requests_v2_owner_plan_idx
  ON public.cycle_plan_reconciliation_requests_v2(user_id, plan_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS cycle_plan_requests_v2_receipt_idx
  ON public.cycle_plan_reconciliation_requests_v2(user_id, planner_receipt_id);

ALTER TABLE public.cycle_plan_intents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_plan_identity_aliases_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_plan_reconciliation_requests_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own cycle plan intents v2" ON public.cycle_plan_intents_v2;
CREATE POLICY "Members read own cycle plan intents v2"
  ON public.cycle_plan_intents_v2 FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members read own cycle plan receipts v2" ON public.cycle_plan_reconciliation_requests_v2;
CREATE POLICY "Members read own cycle plan receipts v2"
  ON public.cycle_plan_reconciliation_requests_v2 FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.cycle_plan_intents_v2 TO authenticated;
GRANT SELECT ON public.cycle_plan_reconciliation_requests_v2 TO authenticated;
REVOKE ALL ON public.cycle_plan_identity_aliases_v2 FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cycle_plan_intents_v2 FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cycle_plan_reconciliation_requests_v2 FROM authenticated;
REVOKE ALL ON public.cycle_plan_intents_v2 FROM anon;
REVOKE ALL ON public.cycle_plan_reconciliation_requests_v2 FROM anon;

CREATE OR REPLACE FUNCTION public.reconcile_cycle_plan_v2(
  p_request_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payload_hash text;
  v_content jsonb;
  v_content_hash text;
  v_logical_plan_key uuid;
  v_cycle jsonb := COALESCE(p_payload->'cycle', '{}'::jsonb);
  v_start_date date;
  v_end_date date;
  v_quarter_start date;
  v_expected_version bigint;
  v_intent public.cycle_plan_intents_v2%ROWTYPE;
  v_existing public.cycle_plan_reconciliation_requests_v2%ROWTYPE;
  v_cycle_id uuid;
  v_new_version bigint;
  v_planner_receipt_id uuid;
  v_receipt jsonb;
  v_row jsonb;
  v_generation_key text;
  v_project_id uuid;
  v_project_ids jsonb := '{}'::jsonb;
  v_project_keys text[] := ARRAY[]::text[];
  v_habit_keys text[] := ARRAY[]::text[];
  v_task_keys text[] := ARRAY[]::text[];
  v_active_projects integer := 0;
  v_active_habits integer := 0;
  v_active_tasks integer := 0;
  v_retired_projects integer := 0;
  v_retired_habits integer := 0;
  v_retired_tasks integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before saving your 90-day plan.';
  END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A request ID and Planner payload are required.';
  END IF;
  IF p_payload->>'payload_version' <> 'cycle-plan-v2' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported Planner payload version.';
  END IF;
  BEGIN
    v_logical_plan_key := (p_payload->>'logical_plan_key')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid logical plan identity is required.';
  END;
  IF v_logical_plan_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A logical plan identity is required.';
  END IF;
  IF COALESCE(btrim(v_cycle->>'goal'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Add your 90-day goal before saving.';
  END IF;
  BEGIN
    v_start_date := (v_cycle->>'start_date')::date;
    v_end_date := (v_cycle->>'end_date')::date;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Valid plan dates are required.';
  END;
  IF v_start_date IS NULL OR v_end_date IS NULL OR v_end_date <= v_start_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The plan end date must follow its start date.';
  END IF;
  v_quarter_start := date_trunc('quarter', v_start_date)::date;
  v_expected_version := NULLIF(p_payload->>'expected_version', '')::bigint;
  BEGIN
    v_cycle_id := NULLIF(p_payload->>'cycle_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid cycle identity is required.';
  END;
  IF v_cycle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cycles_90_day
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'That plan is unavailable or belongs to another member.';
  END IF;
  v_payload_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  v_content := p_payload - 'logical_plan_key' - 'cycle_id' - 'expected_version';
  v_content_hash := encode(digest(convert_to(v_content::text, 'UTF8'), 'sha256'), 'hex');

  -- Owner + quarter is the server convergence key even when browser/cloud cache
  -- identities were independently cleared in two sessions.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_quarter_start::text, 0));

  SELECT * INTO v_existing
  FROM public.cycle_plan_reconciliation_requests_v2
  WHERE user_id = v_user_id AND request_id = p_request_id
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_payload_hash THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'request_changed',
        'planner_receipt_id', v_existing.planner_receipt_id,
        'current_version', v_existing.resulting_version
      );
    END IF;
    IF v_existing.status = 'complete' AND v_existing.receipt IS NOT NULL THEN
      RETURN v_existing.receipt;
    END IF;
  END IF;

  -- Resolve durable logical identity before the quarter fallback. An existing
  -- plan may never be silently rebound to another quarter or cycle.
  SELECT intent.* INTO v_intent
  FROM public.cycle_plan_intents_v2 intent
  JOIN public.cycle_plan_identity_aliases_v2 alias
    ON alias.plan_id = intent.plan_id AND alias.user_id = intent.user_id
  WHERE alias.user_id = v_user_id AND alias.logical_plan_key = v_logical_plan_key
  FOR UPDATE OF intent;

  IF FOUND AND v_intent.quarter_start <> v_quarter_start THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'quarter_changed',
      'current_version', v_intent.current_version,
      'cycle_id', v_intent.cycle_id
    );
  END IF;

  IF NOT FOUND AND v_cycle_id IS NOT NULL THEN
    SELECT * INTO v_intent
    FROM public.cycle_plan_intents_v2
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id
    FOR UPDATE;
    IF FOUND AND v_intent.quarter_start <> v_quarter_start THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'quarter_changed',
        'current_version', v_intent.current_version,
        'cycle_id', v_intent.cycle_id
      );
    END IF;
  END IF;

  IF NOT FOUND THEN
    SELECT * INTO v_intent
    FROM public.cycle_plan_intents_v2
    WHERE user_id = v_user_id AND quarter_start = v_quarter_start
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.cycle_plan_intents_v2(user_id, logical_plan_key, quarter_start)
    VALUES (v_user_id, v_logical_plan_key, v_quarter_start)
    RETURNING * INTO v_intent;
  END IF;

  INSERT INTO public.cycle_plan_identity_aliases_v2(user_id, logical_plan_key, plan_id)
  VALUES (v_user_id, v_logical_plan_key, v_intent.plan_id)
  ON CONFLICT (user_id, logical_plan_key) DO NOTHING;

  IF v_cycle_id IS NOT NULL THEN
    IF v_intent.cycle_id IS NOT NULL AND v_intent.cycle_id <> v_cycle_id THEN
      RETURN jsonb_build_object('status', 'conflict', 'conflict', true, 'conflict_kind', 'quarter_changed', 'current_version', v_intent.current_version);
    END IF;
  ELSE
    v_cycle_id := v_intent.cycle_id;
  END IF;

  -- A second browser with identical content converges on the canonical receipt.
  IF v_intent.current_version > 0 AND v_intent.last_content_hash = v_content_hash THEN
    SELECT receipt INTO v_receipt
    FROM public.cycle_plan_reconciliation_requests_v2
    WHERE user_id = v_user_id
      AND plan_id = v_intent.plan_id
      AND planner_receipt_id = v_intent.last_planner_receipt_id
      AND status = 'complete'
    ORDER BY completed_at DESC LIMIT 1;

    v_receipt := v_receipt || jsonb_build_object(
      'request_id', p_request_id,
      'logical_plan_key', v_logical_plan_key,
      'replayed', true
    );
    INSERT INTO public.cycle_plan_reconciliation_requests_v2(
      request_id, user_id, plan_id, planner_receipt_id, payload_hash, content_hash,
      payload_version, expected_version, resulting_version, cycle_id, status,
      receipt, completed_at
    ) VALUES (
      p_request_id, v_user_id, v_intent.plan_id, v_intent.last_planner_receipt_id,
      v_payload_hash, v_content_hash, 'cycle-plan-v2', v_expected_version,
      v_intent.current_version, v_intent.cycle_id, 'complete', v_receipt, now()
    );
    RETURN v_receipt;
  END IF;

  IF v_intent.current_version > 0
     AND v_expected_version IS DISTINCT FROM v_intent.current_version THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'stale_version',
      'current_version', v_intent.current_version,
      'cycle_id', v_intent.cycle_id
    );
  END IF;

  IF v_existing.ledger_id IS NULL THEN
    INSERT INTO public.cycle_plan_reconciliation_requests_v2(
      request_id, user_id, plan_id, payload_hash, content_hash, payload_version,
      expected_version, status
    ) VALUES (
      p_request_id, v_user_id, v_intent.plan_id, v_payload_hash, v_content_hash,
      'cycle-plan-v2', v_expected_version, 'in_progress'
    ) RETURNING * INTO v_existing;
  END IF;

  v_new_version := v_intent.current_version + 1;
  IF v_cycle_id IS NULL THEN
    INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal)
    VALUES (v_user_id, v_start_date, v_end_date, btrim(v_cycle->>'goal'))
    RETURNING cycle_id INTO v_cycle_id;
  END IF;

  UPDATE public.cycles_90_day SET
    start_date = v_start_date,
    end_date = v_end_date,
    goal = btrim(v_cycle->>'goal'),
    why = NULLIF(btrim(v_cycle->>'why'), ''),
    identity = NULLIF(btrim(v_cycle->>'identity'), ''),
    target_feeling = NULLIF(btrim(v_cycle->>'target_feeling'), ''),
    supporting_projects = COALESCE(v_cycle->'supporting_projects', '[]'::jsonb),
    discover_score = COALESCE(NULLIF(v_cycle->>'discover_score', '')::integer, 5),
    nurture_score = COALESCE(NULLIF(v_cycle->>'nurture_score', '')::integer, 5),
    convert_score = COALESCE(NULLIF(v_cycle->>'convert_score', '')::integer, 5),
    focus_area = NULLIF(btrim(v_cycle->>'focus_area'), ''),
    biggest_bottleneck = NULLIF(btrim(v_cycle->>'biggest_bottleneck'), ''),
    audience_target = NULLIF(btrim(v_cycle->>'audience_target'), ''),
    audience_frustration = NULLIF(btrim(v_cycle->>'audience_frustration'), ''),
    signature_message = NULLIF(btrim(v_cycle->>'signature_message'), ''),
    wish = NULLIF(btrim(v_cycle->>'wish'), ''),
    outcome = NULLIF(btrim(v_cycle->>'outcome'), ''),
    obstacle = NULLIF(btrim(v_cycle->>'obstacle'), ''),
    if_then_plan = NULLIF(btrim(v_cycle->>'if_then_plan'), ''),
    low_energy_version = NULLIF(btrim(v_cycle->>'low_energy_version'), ''),
    medium_energy_version = NULLIF(btrim(v_cycle->>'medium_energy_version'), ''),
    high_energy_version = NULLIF(btrim(v_cycle->>'high_energy_version'), ''),
    things_to_remember = COALESCE(v_cycle->'things_to_remember', '[]'::jsonb),
    metric_1_name = NULLIF(v_cycle->>'metric_1_name', ''), metric_1_start = NULLIF(v_cycle->>'metric_1_start', '')::numeric, metric_1_goal = NULLIF(v_cycle->>'metric_1_goal', '')::numeric,
    metric_2_name = NULLIF(v_cycle->>'metric_2_name', ''), metric_2_start = NULLIF(v_cycle->>'metric_2_start', '')::numeric, metric_2_goal = NULLIF(v_cycle->>'metric_2_goal', '')::numeric,
    metric_3_name = NULLIF(v_cycle->>'metric_3_name', ''), metric_3_start = NULLIF(v_cycle->>'metric_3_start', '')::numeric, metric_3_goal = NULLIF(v_cycle->>'metric_3_goal', '')::numeric,
    metric_4_name = NULLIF(v_cycle->>'metric_4_name', ''), metric_4_start = NULLIF(v_cycle->>'metric_4_start', '')::numeric, metric_4_goal = NULLIF(v_cycle->>'metric_4_goal', '')::numeric,
    metric_5_name = NULLIF(v_cycle->>'metric_5_name', ''), metric_5_start = NULLIF(v_cycle->>'metric_5_start', '')::numeric, metric_5_goal = NULLIF(v_cycle->>'metric_5_goal', '')::numeric,
    weekly_planning_day = NULLIF(v_cycle->>'weekly_planning_day', ''),
    weekly_debrief_day = NULLIF(v_cycle->>'weekly_debrief_day', ''),
    office_hours_start = NULLIF(v_cycle->>'office_hours_start', '')::time,
    office_hours_end = NULLIF(v_cycle->>'office_hours_end', '')::time,
    office_hours_days = COALESCE(v_cycle->'office_hours_days', '[]'::jsonb),
    biggest_fear = NULLIF(v_cycle->>'biggest_fear', ''),
    fear_response = NULLIF(v_cycle->>'fear_response', ''),
    commitment_statement = NULLIF(v_cycle->>'commitment_statement', ''),
    accountability_person = NULLIF(v_cycle->>'accountability_person', ''),
    day1_top3 = COALESCE(v_cycle->'day1_top3', '[]'::jsonb), day1_why = NULLIF(v_cycle->>'day1_why', ''),
    day2_top3 = COALESCE(v_cycle->'day2_top3', '[]'::jsonb), day2_why = NULLIF(v_cycle->>'day2_why', ''),
    day3_top3 = COALESCE(v_cycle->'day3_top3', '[]'::jsonb), day3_why = NULLIF(v_cycle->>'day3_why', ''),
    promotions = COALESCE(v_cycle->'promotions', '[]'::jsonb),
    planner_payload = p_payload,
    planner_payload_version = 'cycle-plan-v2',
    planner_plan_id = v_intent.plan_id,
    reconciliation_version = v_new_version,
    last_reconciliation_request_id = p_request_id,
    planner_content_hash = v_content_hash,
    updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'That plan is unavailable or belongs to another member.';
  END IF;

  -- Strategy and plan-detail tables are authoritative projections of the payload.
  INSERT INTO public.cycle_strategy(
    cycle_id, user_id, lead_primary_platform, lead_content_type, lead_frequency,
    lead_committed_90_days, nurture_method, nurture_frequency, free_transformation,
    proof_methods, posting_days, posting_time, batch_day, batch_frequency,
    lead_gen_content_audit, nurture_posting_days, nurture_posting_time,
    nurture_batch_day, nurture_batch_frequency, nurture_content_audit,
    secondary_platforms, nurture_platforms
  ) VALUES (
    v_cycle_id, v_user_id, NULLIF(p_payload#>>'{strategy,lead_primary_platform}', ''),
    NULLIF(p_payload#>>'{strategy,lead_content_type}', ''), NULLIF(p_payload#>>'{strategy,lead_frequency}', ''),
    COALESCE((p_payload#>>'{strategy,lead_committed_90_days}')::boolean, false),
    NULLIF(p_payload#>>'{strategy,nurture_method}', ''), NULLIF(p_payload#>>'{strategy,nurture_frequency}', ''),
    NULLIF(p_payload#>>'{strategy,free_transformation}', ''), COALESCE(p_payload#>'{strategy,proof_methods}', '[]'::jsonb),
    COALESCE(p_payload#>'{strategy,posting_days}', '[]'::jsonb), NULLIF(p_payload#>>'{strategy,posting_time}', ''),
    NULLIF(p_payload#>>'{strategy,batch_day}', ''), COALESCE(NULLIF(p_payload#>>'{strategy,batch_frequency}', ''), 'weekly'),
    NULLIF(p_payload#>>'{strategy,lead_gen_content_audit}', ''), COALESCE(p_payload#>'{strategy,nurture_posting_days}', '[]'::jsonb),
    NULLIF(p_payload#>>'{strategy,nurture_posting_time}', ''), NULLIF(p_payload#>>'{strategy,nurture_batch_day}', ''),
    COALESCE(NULLIF(p_payload#>>'{strategy,nurture_batch_frequency}', ''), 'weekly'),
    NULLIF(p_payload#>>'{strategy,nurture_content_audit}', ''), COALESCE(p_payload#>'{strategy,secondary_platforms}', '[]'::jsonb),
    COALESCE(p_payload#>'{strategy,nurture_platforms}', '[]'::jsonb)
  ) ON CONFLICT (cycle_id) DO UPDATE SET
    user_id = EXCLUDED.user_id, lead_primary_platform = EXCLUDED.lead_primary_platform,
    lead_content_type = EXCLUDED.lead_content_type, lead_frequency = EXCLUDED.lead_frequency,
    lead_committed_90_days = EXCLUDED.lead_committed_90_days, nurture_method = EXCLUDED.nurture_method,
    nurture_frequency = EXCLUDED.nurture_frequency, free_transformation = EXCLUDED.free_transformation,
    proof_methods = EXCLUDED.proof_methods, posting_days = EXCLUDED.posting_days,
    posting_time = EXCLUDED.posting_time, batch_day = EXCLUDED.batch_day,
    batch_frequency = EXCLUDED.batch_frequency, lead_gen_content_audit = EXCLUDED.lead_gen_content_audit,
    nurture_posting_days = EXCLUDED.nurture_posting_days, nurture_posting_time = EXCLUDED.nurture_posting_time,
    nurture_batch_day = EXCLUDED.nurture_batch_day, nurture_batch_frequency = EXCLUDED.nurture_batch_frequency,
    nurture_content_audit = EXCLUDED.nurture_content_audit, secondary_platforms = EXCLUDED.secondary_platforms,
    nurture_platforms = EXCLUDED.nurture_platforms, updated_at = now();

  DELETE FROM public.cycle_limited_offers WHERE user_id = v_user_id AND cycle_id = v_cycle_id;
  DELETE FROM public.cycle_offers WHERE user_id = v_user_id AND cycle_id = v_cycle_id;
  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'offers', '[]'::jsonb)) LOOP
    INSERT INTO public.cycle_offers(cycle_id, user_id, offer_name, price, sales_frequency, transformation, sort_order, is_primary)
    VALUES (v_cycle_id, v_user_id, btrim(v_row->>'name'), NULLIF(v_row->>'price', '')::numeric,
      NULLIF(v_row->>'frequency', ''), NULLIF(v_row->>'transformation', ''), COALESCE((v_row->>'sort_order')::integer, 0),
      COALESCE((v_row->>'isPrimary')::boolean, false));
  END LOOP;
  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'limited_offers', '[]'::jsonb)) LOOP
    INSERT INTO public.cycle_limited_offers(cycle_id, user_id, name, start_date, end_date, promo_type, discount, notes, sort_order)
    VALUES (v_cycle_id, v_user_id, btrim(v_row->>'name'), (v_row->>'startDate')::date, (v_row->>'endDate')::date,
      COALESCE(NULLIF(v_row->>'promoType', ''), 'flash_sale'), NULLIF(v_row->>'discount', ''), NULLIF(v_row->>'notes', ''),
      COALESCE((v_row->>'sort_order')::integer, 0));
  END LOOP;

  INSERT INTO public.cycle_revenue_plan(cycle_id, user_id, revenue_goal, price_per_sale, sales_needed, launch_schedule)
  VALUES (v_cycle_id, v_user_id, NULLIF(p_payload#>>'{revenue_plan,revenue_goal}', '')::numeric,
    NULLIF(p_payload#>>'{revenue_plan,price_per_sale}', '')::numeric, NULLIF(p_payload#>>'{revenue_plan,sales_needed}', '')::numeric,
    NULLIF(p_payload#>>'{revenue_plan,launch_schedule}', ''))
  ON CONFLICT (cycle_id) DO UPDATE SET user_id = EXCLUDED.user_id, revenue_goal = EXCLUDED.revenue_goal,
    price_per_sale = EXCLUDED.price_per_sale, sales_needed = EXCLUDED.sales_needed,
    launch_schedule = EXCLUDED.launch_schedule, updated_at = now();

  DELETE FROM public.cycle_month_plans WHERE user_id = v_user_id AND cycle_id = v_cycle_id;
  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'month_plans', '[]'::jsonb)) LOOP
    INSERT INTO public.cycle_month_plans(cycle_id, user_id, month_number, month_name, projects_text, sales_promos_text, main_focus)
    VALUES (v_cycle_id, v_user_id, (v_row->>'month_number')::integer, NULLIF(v_row->>'monthName', ''),
      NULLIF(v_row->>'projects', ''), NULLIF(v_row->>'salesPromos', ''), NULLIF(v_row->>'mainFocus', ''));
  END LOOP;

  -- Generated projects preserve completed or member-edited rows.
  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'generated_projects', '[]'::jsonb)) LOOP
    v_generation_key := btrim(v_row->>'generation_key');
    IF v_generation_key = '' OR btrim(v_row->>'name') = '' OR v_generation_key = ANY(v_project_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated project keys and names must be unique.';
    END IF;
    v_project_keys := array_append(v_project_keys, v_generation_key);
    INSERT INTO public.projects(user_id, cycle_id, name, description, status, generation_key, generation_input_hash, generation_baseline, generation_active)
    VALUES (v_user_id, v_cycle_id, btrim(v_row->>'name'), NULLIF(v_row->>'description', ''), 'active', v_generation_key,
      v_content_hash, jsonb_build_object('name', btrim(v_row->>'name'), 'description', NULLIF(v_row->>'description', ''), 'status', 'active'), true)
    ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO UPDATE SET
      name = CASE WHEN public.projects.status = 'completed' OR public.projects.generation_baseline IS NULL
        OR public.projects.name IS DISTINCT FROM public.projects.generation_baseline->>'name'
        OR public.projects.description IS DISTINCT FROM public.projects.generation_baseline->>'description'
        THEN public.projects.name ELSE EXCLUDED.name END,
      description = CASE WHEN public.projects.status = 'completed' OR public.projects.generation_baseline IS NULL
        OR public.projects.name IS DISTINCT FROM public.projects.generation_baseline->>'name'
        OR public.projects.description IS DISTINCT FROM public.projects.generation_baseline->>'description'
        THEN public.projects.description ELSE EXCLUDED.description END,
      generation_input_hash = EXCLUDED.generation_input_hash,
      generation_baseline = CASE WHEN public.projects.status = 'completed' THEN public.projects.generation_baseline ELSE EXCLUDED.generation_baseline END,
      generation_active = true, updated_at = now()
    RETURNING id INTO v_project_id;
    v_project_ids := v_project_ids || jsonb_build_object(v_generation_key, v_project_id);
    v_active_projects := v_active_projects + 1;
  END LOOP;

  UPDATE public.projects SET generation_active = false, status = 'archived', updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key IS NOT NULL AND generation_active
    AND NOT (generation_key = ANY(v_project_keys)) AND status <> 'completed'
    AND generation_baseline IS NOT NULL
    AND name IS NOT DISTINCT FROM generation_baseline->>'name'
    AND description IS NOT DISTINCT FROM generation_baseline->>'description'
    AND status = COALESCE(generation_baseline->>'status', 'active');
  GET DIAGNOSTICS v_retired_projects = ROW_COUNT;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'generated_habits', '[]'::jsonb)) LOOP
    v_generation_key := btrim(v_row->>'generation_key');
    IF v_generation_key = '' OR btrim(v_row->>'habit_name') = '' OR v_generation_key = ANY(v_habit_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated habit keys and names must be unique.';
    END IF;
    v_habit_keys := array_append(v_habit_keys, v_generation_key);
    INSERT INTO public.habits(user_id, cycle_id, habit_name, category, display_order, is_active, generation_key, generation_input_hash, generation_baseline, generation_active)
    VALUES (v_user_id, v_cycle_id, btrim(v_row->>'habit_name'), NULLIF(v_row->>'category', ''), COALESCE((v_row->>'display_order')::integer, 0), true,
      v_generation_key, v_content_hash, jsonb_build_object('habit_name', btrim(v_row->>'habit_name'), 'category', NULLIF(v_row->>'category', ''), 'is_active', true), true)
    ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO UPDATE SET
      habit_name = CASE WHEN public.habits.generation_baseline IS NULL OR public.habits.habit_name IS DISTINCT FROM public.habits.generation_baseline->>'habit_name'
        THEN public.habits.habit_name ELSE EXCLUDED.habit_name END,
      category = CASE WHEN public.habits.generation_baseline IS NULL OR public.habits.category IS DISTINCT FROM public.habits.generation_baseline->>'category'
        THEN public.habits.category ELSE EXCLUDED.category END,
      display_order = EXCLUDED.display_order, generation_input_hash = EXCLUDED.generation_input_hash,
      generation_baseline = EXCLUDED.generation_baseline, generation_active = true, updated_at = now();
    v_active_habits := v_active_habits + 1;
  END LOOP;
  UPDATE public.habits SET generation_active = false, is_active = false, deleted_at = COALESCE(deleted_at, now()), updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key IS NOT NULL AND generation_active
    AND NOT (generation_key = ANY(v_habit_keys)) AND generation_baseline IS NOT NULL
    AND habit_name IS NOT DISTINCT FROM generation_baseline->>'habit_name'
    AND category IS NOT DISTINCT FROM generation_baseline->>'category'
    AND is_active = true;
  GET DIAGNOSTICS v_retired_habits = ROW_COUNT;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'generated_tasks', '[]'::jsonb)) LOOP
    v_generation_key := btrim(v_row->>'generation_key');
    IF v_generation_key = '' OR btrim(v_row->>'task_text') = '' OR v_generation_key = ANY(v_task_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated task keys and text must be unique.';
    END IF;
    v_task_keys := array_append(v_task_keys, v_generation_key);
    v_project_id := NULLIF(v_project_ids->>COALESCE(v_row->>'project_generation_key', ''), '')::uuid;
    INSERT INTO public.tasks(user_id, project_id, cycle_id, task_text, task_description, scheduled_date, planned_day,
      priority, status, category, context_tags, is_system_generated, system_source, generation_key,
      generation_input_hash, generation_baseline, generation_active)
    VALUES (v_user_id, v_project_id, v_cycle_id, btrim(v_row->>'task_text'), NULLIF(v_row->>'task_description', ''),
      NULLIF(v_row->>'scheduled_date', '')::date, NULLIF(v_row->>'planned_day', '')::date,
      COALESCE(NULLIF(v_row->>'priority', ''), 'high'), 'todo', COALESCE(NULLIF(v_row->>'category', ''), 'cycle-plan'),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_row->'context_tags', '["cycle-plan"]'::jsonb))),
      true, 'cycle_reconciliation_v2', v_generation_key, v_content_hash,
      jsonb_build_object('project_id', v_project_id, 'task_text', btrim(v_row->>'task_text'),
        'task_description', NULLIF(v_row->>'task_description', ''), 'scheduled_date', NULLIF(v_row->>'scheduled_date', ''),
        'planned_day', NULLIF(v_row->>'planned_day', ''), 'priority', COALESCE(NULLIF(v_row->>'priority', ''), 'high'),
        'status', 'todo', 'category', COALESCE(NULLIF(v_row->>'category', ''), 'cycle-plan'),
        'context_tags', COALESCE(v_row->'context_tags', '["cycle-plan"]'::jsonb)), true)
    ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO UPDATE SET
      project_id = CASE WHEN public.tasks.generation_baseline IS NULL OR public.tasks.project_id::text IS DISTINCT FROM public.tasks.generation_baseline->>'project_id' THEN public.tasks.project_id ELSE EXCLUDED.project_id END,
      task_text = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.task_text IS DISTINCT FROM public.tasks.generation_baseline->>'task_text' THEN public.tasks.task_text ELSE EXCLUDED.task_text END,
      task_description = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.task_description IS DISTINCT FROM public.tasks.generation_baseline->>'task_description' THEN public.tasks.task_description ELSE EXCLUDED.task_description END,
      scheduled_date = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.scheduled_date::text IS DISTINCT FROM public.tasks.generation_baseline->>'scheduled_date' THEN public.tasks.scheduled_date ELSE EXCLUDED.scheduled_date END,
      planned_day = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.planned_day::text IS DISTINCT FROM public.tasks.generation_baseline->>'planned_day' THEN public.tasks.planned_day ELSE EXCLUDED.planned_day END,
      priority = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.priority IS DISTINCT FROM public.tasks.generation_baseline->>'priority' THEN public.tasks.priority ELSE EXCLUDED.priority END,
      category = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.category IS DISTINCT FROM public.tasks.generation_baseline->>'category' THEN public.tasks.category ELSE EXCLUDED.category END,
      context_tags = CASE WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR to_jsonb(public.tasks.context_tags) IS DISTINCT FROM public.tasks.generation_baseline->'context_tags' THEN public.tasks.context_tags ELSE EXCLUDED.context_tags END,
      generation_input_hash = EXCLUDED.generation_input_hash,
      generation_baseline = CASE WHEN COALESCE(public.tasks.is_completed, false) THEN public.tasks.generation_baseline ELSE EXCLUDED.generation_baseline END,
      generation_active = true, system_source = 'cycle_reconciliation_v2', updated_at = now();
    v_active_tasks := v_active_tasks + 1;
  END LOOP;

  UPDATE public.tasks SET generation_active = false, system_source = 'cycle_reconciliation_v2_retired', deleted_at = COALESCE(deleted_at, now()), updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key IS NOT NULL AND generation_active
    AND NOT (generation_key = ANY(v_task_keys)) AND NOT COALESCE(is_completed, false)
    AND generation_baseline IS NOT NULL AND status = COALESCE(generation_baseline->>'status', 'todo')
    AND task_text IS NOT DISTINCT FROM generation_baseline->>'task_text'
    AND task_description IS NOT DISTINCT FROM generation_baseline->>'task_description'
    AND scheduled_date::text IS NOT DISTINCT FROM generation_baseline->>'scheduled_date'
    AND planned_day::text IS NOT DISTINCT FROM generation_baseline->>'planned_day'
    AND priority IS NOT DISTINCT FROM generation_baseline->>'priority'
    AND category IS NOT DISTINCT FROM generation_baseline->>'category'
    AND to_jsonb(context_tags) IS NOT DISTINCT FROM generation_baseline->'context_tags';
  GET DIAGNOSTICS v_retired_tasks = ROW_COUNT;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'daily_plans', '[]'::jsonb)) LOOP
    INSERT INTO public.daily_plans(user_id, cycle_id, date, top_3_today, thought)
    VALUES (v_user_id, v_cycle_id, (v_row->>'date')::date, COALESCE(v_row->'top_3_today', '[]'::jsonb), NULLIF(v_row->>'thought', ''))
    ON CONFLICT (user_id, date) DO UPDATE SET cycle_id = EXCLUDED.cycle_id,
      top_3_today = EXCLUDED.top_3_today, thought = EXCLUDED.thought, updated_at = now();
  END LOOP;
  INSERT INTO public.user_settings(user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  v_planner_receipt_id := gen_random_uuid();
  v_receipt := jsonb_build_object(
    'planner_receipt_id', v_planner_receipt_id,
    'request_id', p_request_id,
    'logical_plan_id', v_intent.plan_id,
    'logical_plan_key', v_logical_plan_key,
    'status', 'complete', 'replayed', false,
    'payload_hash', v_payload_hash, 'content_hash', v_content_hash,
    'cycle_id', v_cycle_id, 'version', v_new_version,
    'active_generated_project_count', v_active_projects,
    'active_generated_habit_count', v_active_habits,
    'active_generated_task_count', v_active_tasks,
    'retired_generated_project_count', v_retired_projects,
    'retired_generated_habit_count', v_retired_habits,
    'retired_generated_task_count', v_retired_tasks,
    'completed_at', now()
  );

  UPDATE public.cycle_plan_intents_v2 SET cycle_id = v_cycle_id, current_version = v_new_version,
    last_content_hash = v_content_hash, last_planner_receipt_id = v_planner_receipt_id, updated_at = now()
  WHERE plan_id = v_intent.plan_id AND user_id = v_user_id;
  UPDATE public.cycle_plan_reconciliation_requests_v2 SET planner_receipt_id = v_planner_receipt_id,
    resulting_version = v_new_version, cycle_id = v_cycle_id, status = 'complete', receipt = v_receipt,
    completed_at = now(), updated_at = now()
  WHERE ledger_id = v_existing.ledger_id AND user_id = v_user_id;

  RETURN v_receipt;
END
$$;

REVOKE ALL ON FUNCTION public.reconcile_cycle_plan_v2(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_cycle_plan_v2(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.reconcile_cycle_plan_v2(uuid, jsonb) TO authenticated;
