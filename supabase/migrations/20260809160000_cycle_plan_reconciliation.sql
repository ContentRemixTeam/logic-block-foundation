-- Planner + Success Path Wave 1: one retry-safe reconciliation transaction.
-- Additive only. Existing cycle/project/task rows are preserved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.cycles_90_day
  ADD COLUMN IF NOT EXISTS planner_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS planner_payload_version text,
  ADD COLUMN IF NOT EXISTS last_reconciliation_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS projects_user_generation_key_unique
  ON public.projects(user_id, generation_key);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_generation_key_unique
  ON public.tasks(user_id, generation_key);

CREATE TABLE IF NOT EXISTS public.cycle_plan_reconciliation_requests (
  request_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  payload_version text NOT NULL DEFAULT 'cycle-plan-v1',
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('in_progress', 'complete')),
  receipt jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cycle_plan_reconciliation_requests_user_cycle_idx
  ON public.cycle_plan_reconciliation_requests(user_id, cycle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS cycle_plan_reconciliation_requests_user_plan_idx
  ON public.cycle_plan_reconciliation_requests(user_id, plan_key, created_at DESC);

ALTER TABLE public.cycle_plan_reconciliation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own planner reconciliation receipts"
  ON public.cycle_plan_reconciliation_requests;
CREATE POLICY "Members can read own planner reconciliation receipts"
  ON public.cycle_plan_reconciliation_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.cycle_plan_reconciliation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_plan_reconciliation_requests TO service_role;
REVOKE ALL ON public.cycle_plan_reconciliation_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cycle_plan_reconciliation_requests FROM authenticated;

-- A recommendation may exist before a member explicitly confirms it.
ALTER TABLE public.cycle_success_path_snapshots
  ALTER COLUMN confirmed_stage DROP NOT NULL,
  ALTER COLUMN confirmed_at DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS planner_receipt_id uuid
    REFERENCES public.cycle_plan_reconciliation_requests(request_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cycle_success_path_snapshots_planner_receipt_idx
  ON public.cycle_success_path_snapshots(planner_receipt_id);

ALTER TABLE public.cycle_success_path_snapshots ENABLE ROW LEVEL SECURITY;

-- A member-visible Success Path must stay bound to a completed receipt for the
-- same member and cycle. Legacy unbound rows may remain for migration safety, but
-- authenticated clients cannot create, update, or delete around this invariant.
DROP POLICY IF EXISTS "Members can view own cycle success path"
  ON public.cycle_success_path_snapshots;
DROP POLICY IF EXISTS "Members can view receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can view receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND planner_receipt_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.cycle_plan_reconciliation_requests receipt
      WHERE receipt.request_id = planner_receipt_id
        AND receipt.user_id = auth.uid()
        AND receipt.cycle_id = cycle_success_path_snapshots.cycle_id
        AND receipt.status = 'complete'
    )
  );

DROP POLICY IF EXISTS "Members can create own cycle success path"
  ON public.cycle_success_path_snapshots;
DROP POLICY IF EXISTS "Members can create receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can create receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND planner_receipt_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.cycle_plan_reconciliation_requests receipt
      WHERE receipt.request_id = planner_receipt_id
        AND receipt.user_id = auth.uid()
        AND receipt.cycle_id = cycle_success_path_snapshots.cycle_id
        AND receipt.status = 'complete'
    )
  );

DROP POLICY IF EXISTS "Members can update own cycle success path"
  ON public.cycle_success_path_snapshots;
DROP POLICY IF EXISTS "Members can update receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can update receipt-bound cycle success path"
  ON public.cycle_success_path_snapshots
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND planner_receipt_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.cycle_plan_reconciliation_requests receipt
      WHERE receipt.request_id = planner_receipt_id
        AND receipt.user_id = auth.uid()
        AND receipt.cycle_id = cycle_success_path_snapshots.cycle_id
        AND receipt.status = 'complete'
    )
  );

DROP POLICY IF EXISTS "Members can delete own cycle success path"
  ON public.cycle_success_path_snapshots;

CREATE OR REPLACE FUNCTION public.reconcile_cycle_plan(
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
  v_plan_key text;
  v_existing public.cycle_plan_reconciliation_requests%ROWTYPE;
  v_prior public.cycle_plan_reconciliation_requests%ROWTYPE;
  v_cycle jsonb := COALESCE(p_payload->'cycle', '{}'::jsonb);
  v_project jsonb := COALESCE(p_payload->'implementation_project', '{}'::jsonb);
  v_success_path jsonb := COALESCE(p_payload->'success_path', '{}'::jsonb);
  v_cycle_id uuid;
  v_project_id uuid;
  v_project_generation_key text;
  v_task jsonb;
  v_task_id uuid;
  v_task_generation_key text;
  v_task_keys text[] := ARRAY[]::text[];
  v_task_count integer := 0;
  v_retired_task_count integer := 0;
  v_receipt jsonb;
  v_recommended_stage text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before saving your 90-day plan.';
  END IF;

  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A request ID and planner payload are required.';
  END IF;

  v_payload_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  v_plan_key := NULLIF(btrim(p_payload->>'plan_key'), '');
  IF v_plan_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A stable planner identity is required.';
  END IF;

  -- Serialize every request for the same member-owned planner, even when request IDs differ.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_plan_key, 0));

  IF NULLIF(p_payload->>'cycle_id', '') IS NULL THEN
    SELECT * INTO v_prior
    FROM public.cycle_plan_reconciliation_requests
    WHERE user_id = v_user_id
      AND plan_key = v_plan_key
      AND status = 'complete'
      AND receipt IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      IF v_prior.payload_hash = v_payload_hash THEN
        RETURN v_prior.receipt || jsonb_build_object(
          'request_id', p_request_id,
          'canonical_request_id', v_prior.request_id,
          'replayed', true,
          'deduplicated_plan', true
        );
      END IF;
      RETURN v_prior.receipt || jsonb_build_object(
        'status', 'conflict',
        'conflict', true,
        'conflict_kind', CASE
          WHEN v_prior.request_id = p_request_id THEN 'request_changed'
          ELSE 'plan_changed'
        END,
        'replayed', false,
        'message', CASE
          WHEN v_prior.request_id = p_request_id THEN 'The prior request completed with different planner answers.'
          ELSE 'This planner already completed with earlier answers.'
        END
      );
    END IF;
  END IF;

  INSERT INTO public.cycle_plan_reconciliation_requests(
    request_id, user_id, plan_key, payload_hash, payload_version, status
  ) VALUES (
    p_request_id,
    v_user_id,
    v_plan_key,
    v_payload_hash,
    COALESCE(NULLIF(p_payload->>'payload_version', ''), 'cycle-plan-v1'),
    'in_progress'
  )
  ON CONFLICT (request_id) DO NOTHING;

  SELECT * INTO v_existing
  FROM public.cycle_plan_reconciliation_requests
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF v_existing.user_id <> v_user_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'This planner request belongs to another member.';
  END IF;

  IF v_existing.payload_hash <> v_payload_hash THEN
    IF v_existing.status = 'complete' AND v_existing.receipt IS NOT NULL THEN
      RETURN v_existing.receipt || jsonb_build_object(
        'status', 'conflict',
        'conflict', true,
        'conflict_kind', 'request_changed',
        'replayed', false,
        'message', 'The prior request completed with different planner answers.'
      );
    END IF;
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'This save request is still resolving with different planner answers.';
  END IF;

  IF v_existing.status = 'complete' AND v_existing.receipt IS NOT NULL THEN
    RETURN v_existing.receipt || jsonb_build_object('replayed', true);
  END IF;

  IF COALESCE(btrim(v_cycle->>'goal'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Add your 90-day goal before saving.';
  END IF;

  IF COALESCE(v_cycle->>'start_date', '') = '' OR COALESCE(v_cycle->>'end_date', '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose the start and end dates before saving.';
  END IF;

  IF (v_cycle->>'end_date')::date <= (v_cycle->>'start_date')::date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The plan end date must be after its start date.';
  END IF;

  v_cycle_id := NULLIF(p_payload->>'cycle_id', '')::uuid;

  IF v_cycle_id IS NULL THEN
    INSERT INTO public.cycles_90_day(
      user_id, start_date, end_date, goal, why, identity, target_feeling,
      supporting_projects, discover_score, nurture_score, convert_score,
      focus_area, biggest_bottleneck, audience_target, audience_frustration,
      signature_message, low_energy_version, medium_energy_version,
      high_energy_version, day1_top3, day1_why, day2_top3, day2_why,
      day3_top3, day3_why, weekly_planning_day, weekly_debrief_day
    ) VALUES (
      v_user_id,
      (v_cycle->>'start_date')::date,
      (v_cycle->>'end_date')::date,
      btrim(v_cycle->>'goal'),
      NULLIF(btrim(v_cycle->>'why'), ''),
      NULLIF(btrim(v_cycle->>'identity'), ''),
      NULLIF(btrim(v_cycle->>'target_feeling'), ''),
      COALESCE(v_cycle->'supporting_projects', '[]'::jsonb),
      COALESCE(NULLIF(v_cycle->>'discover_score', '')::integer, 5),
      COALESCE(NULLIF(v_cycle->>'nurture_score', '')::integer, 5),
      COALESCE(NULLIF(v_cycle->>'convert_score', '')::integer, 5),
      NULLIF(btrim(v_cycle->>'focus_area'), ''),
      NULLIF(btrim(v_cycle->>'biggest_bottleneck'), ''),
      NULLIF(btrim(v_cycle->>'audience_target'), ''),
      NULLIF(btrim(v_cycle->>'audience_frustration'), ''),
      NULLIF(btrim(v_cycle->>'signature_message'), ''),
      NULLIF(btrim(v_cycle->>'low_energy_version'), ''),
      NULLIF(btrim(v_cycle->>'medium_energy_version'), ''),
      NULLIF(btrim(v_cycle->>'high_energy_version'), ''),
      COALESCE(v_cycle->'day1_top3', '[]'::jsonb),
      NULLIF(btrim(v_cycle->>'day1_why'), ''),
      COALESCE(v_cycle->'day2_top3', '[]'::jsonb),
      NULLIF(btrim(v_cycle->>'day2_why'), ''),
      COALESCE(v_cycle->'day3_top3', '[]'::jsonb),
      NULLIF(btrim(v_cycle->>'day3_why'), ''),
      NULLIF(btrim(v_cycle->>'weekly_planning_day'), ''),
      NULLIF(btrim(v_cycle->>'weekly_debrief_day'), '')
    ) RETURNING cycle_id INTO v_cycle_id;

    UPDATE public.cycles_90_day
    SET planner_payload = p_payload,
        planner_payload_version = COALESCE(NULLIF(p_payload->>'payload_version', ''), 'cycle-plan-v1'),
        last_reconciliation_request_id = p_request_id
    WHERE cycle_id = v_cycle_id AND user_id = v_user_id;
  ELSE
    UPDATE public.cycles_90_day
    SET
      start_date = (v_cycle->>'start_date')::date,
      end_date = (v_cycle->>'end_date')::date,
      goal = btrim(v_cycle->>'goal'),
      why = NULLIF(btrim(v_cycle->>'why'), ''),
      identity = NULLIF(btrim(v_cycle->>'identity'), ''),
      target_feeling = NULLIF(btrim(v_cycle->>'target_feeling'), ''),
      supporting_projects = COALESCE(v_cycle->'supporting_projects', '[]'::jsonb),
      discover_score = COALESCE(NULLIF(v_cycle->>'discover_score', '')::integer, discover_score),
      nurture_score = COALESCE(NULLIF(v_cycle->>'nurture_score', '')::integer, nurture_score),
      convert_score = COALESCE(NULLIF(v_cycle->>'convert_score', '')::integer, convert_score),
      focus_area = NULLIF(btrim(v_cycle->>'focus_area'), ''),
      biggest_bottleneck = NULLIF(btrim(v_cycle->>'biggest_bottleneck'), ''),
      audience_target = NULLIF(btrim(v_cycle->>'audience_target'), ''),
      audience_frustration = NULLIF(btrim(v_cycle->>'audience_frustration'), ''),
      signature_message = NULLIF(btrim(v_cycle->>'signature_message'), ''),
      low_energy_version = NULLIF(btrim(v_cycle->>'low_energy_version'), ''),
      medium_energy_version = NULLIF(btrim(v_cycle->>'medium_energy_version'), ''),
      high_energy_version = NULLIF(btrim(v_cycle->>'high_energy_version'), ''),
      day1_top3 = COALESCE(v_cycle->'day1_top3', '[]'::jsonb),
      day1_why = NULLIF(btrim(v_cycle->>'day1_why'), ''),
      day2_top3 = COALESCE(v_cycle->'day2_top3', '[]'::jsonb),
      day2_why = NULLIF(btrim(v_cycle->>'day2_why'), ''),
      day3_top3 = COALESCE(v_cycle->'day3_top3', '[]'::jsonb),
      day3_why = NULLIF(btrim(v_cycle->>'day3_why'), ''),
      weekly_planning_day = NULLIF(btrim(v_cycle->>'weekly_planning_day'), ''),
      weekly_debrief_day = NULLIF(btrim(v_cycle->>'weekly_debrief_day'), ''),
      planner_payload = p_payload,
      planner_payload_version = COALESCE(NULLIF(p_payload->>'payload_version', ''), 'cycle-plan-v1'),
      last_reconciliation_request_id = p_request_id,
      updated_at = now()
    WHERE cycle_id = v_cycle_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'That 90-day plan is unavailable or belongs to another member.';
    END IF;
  END IF;

  IF jsonb_typeof(v_project) = 'object' AND COALESCE(btrim(v_project->>'name'), '') <> '' THEN
    v_project_generation_key := 'cycle:' || v_cycle_id::text || ':implementation';
    INSERT INTO public.projects(
      user_id, cycle_id, name, description, status, start_date, end_date,
      is_template, generation_key, generation_input_hash, generation_active
    ) VALUES (
      v_user_id,
      v_cycle_id,
      COALESCE(NULLIF(btrim(v_project->>'name'), ''), '90-Day Implementation'),
      NULLIF(btrim(v_project->>'description'), ''),
      'active',
      (v_cycle->>'start_date')::date,
      (v_cycle->>'end_date')::date,
      false,
      v_project_generation_key,
      v_payload_hash,
      true
    )
    ON CONFLICT (user_id, generation_key)
    DO UPDATE SET
      cycle_id = EXCLUDED.cycle_id,
      name = CASE WHEN public.projects.status = 'completed' THEN public.projects.name ELSE EXCLUDED.name END,
      description = CASE WHEN public.projects.status = 'completed' THEN public.projects.description ELSE EXCLUDED.description END,
      start_date = CASE WHEN public.projects.status = 'completed' THEN public.projects.start_date ELSE EXCLUDED.start_date END,
      end_date = CASE WHEN public.projects.status = 'completed' THEN public.projects.end_date ELSE EXCLUDED.end_date END,
      generation_input_hash = EXCLUDED.generation_input_hash,
      generation_active = true,
      updated_at = now()
    RETURNING id INTO v_project_id;
  END IF;

  IF jsonb_typeof(COALESCE(p_payload->'tasks', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Planner tasks must be an array.';
  END IF;

  FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'tasks', '[]'::jsonb))
  LOOP
    IF COALESCE(btrim(v_task->>'generation_key'), '') = '' OR COALESCE(btrim(v_task->>'task_text'), '') = '' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Every generated task needs a stable key and task text.';
    END IF;

    v_task_generation_key := 'cycle:' || v_cycle_id::text || ':task:' || btrim(v_task->>'generation_key');
    IF v_task_generation_key = ANY(v_task_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated task keys must be unique inside one plan.';
    END IF;
    v_task_keys := array_append(v_task_keys, v_task_generation_key);

    INSERT INTO public.tasks(
      user_id, project_id, cycle_id, task_text, task_description,
      scheduled_date, planned_day, priority, status, category, context_tags,
      is_system_generated, system_source, generation_key,
      generation_input_hash, generation_baseline, generation_active
    ) VALUES (
      v_user_id,
      v_project_id,
      v_cycle_id,
      btrim(v_task->>'task_text'),
      NULLIF(btrim(v_task->>'task_description'), ''),
      NULLIF(v_task->>'scheduled_date', '')::date,
      NULLIF(v_task->>'planned_day', '')::date,
      COALESCE(NULLIF(v_task->>'priority', ''), 'high'),
      'todo',
      COALESCE(NULLIF(v_task->>'category', ''), 'cycle-plan'),
      (
        SELECT COALESCE(array_agg(tag), ARRAY['cycle-plan']::text[])
        FROM jsonb_array_elements_text(COALESCE(v_task->'context_tags', '["cycle-plan"]'::jsonb)) AS tag
      ),
      true,
      'cycle_reconciliation_v1',
      v_task_generation_key,
      v_payload_hash,
      jsonb_build_object(
        'task_text', btrim(v_task->>'task_text'),
        'task_description', NULLIF(btrim(v_task->>'task_description'), ''),
        'scheduled_date', NULLIF(v_task->>'scheduled_date', ''),
        'planned_day', NULLIF(v_task->>'planned_day', '')
      ),
      true
    )
    ON CONFLICT (user_id, generation_key)
    DO UPDATE SET
      project_id = EXCLUDED.project_id,
      cycle_id = EXCLUDED.cycle_id,
      task_text = CASE
        WHEN COALESCE(public.tasks.is_completed, false)
          OR public.tasks.generation_baseline IS NULL
          OR public.tasks.task_text IS DISTINCT FROM public.tasks.generation_baseline->>'task_text'
        THEN public.tasks.task_text ELSE EXCLUDED.task_text END,
      task_description = CASE
        WHEN COALESCE(public.tasks.is_completed, false)
          OR public.tasks.generation_baseline IS NULL
          OR public.tasks.task_description IS DISTINCT FROM public.tasks.generation_baseline->>'task_description'
        THEN public.tasks.task_description ELSE EXCLUDED.task_description END,
      scheduled_date = CASE
        WHEN COALESCE(public.tasks.is_completed, false)
          OR public.tasks.generation_baseline IS NULL
          OR public.tasks.scheduled_date::text IS DISTINCT FROM public.tasks.generation_baseline->>'scheduled_date'
        THEN public.tasks.scheduled_date ELSE EXCLUDED.scheduled_date END,
      planned_day = CASE
        WHEN COALESCE(public.tasks.is_completed, false)
          OR public.tasks.generation_baseline IS NULL
          OR public.tasks.planned_day::text IS DISTINCT FROM public.tasks.generation_baseline->>'planned_day'
        THEN public.tasks.planned_day ELSE EXCLUDED.planned_day END,
      priority = CASE WHEN public.tasks.is_completed THEN public.tasks.priority ELSE EXCLUDED.priority END,
      category = EXCLUDED.category,
      context_tags = EXCLUDED.context_tags,
      is_system_generated = true,
      system_source = 'cycle_reconciliation_v1',
      generation_input_hash = EXCLUDED.generation_input_hash,
      generation_baseline = EXCLUDED.generation_baseline,
      generation_active = true
    RETURNING task_id INTO v_task_id;

    v_task_count := v_task_count + 1;
  END LOOP;

  UPDATE public.tasks
  SET generation_active = false,
      system_source = 'cycle_reconciliation_v1_retired'
  WHERE user_id = v_user_id
    AND cycle_id = v_cycle_id
    AND system_source = 'cycle_reconciliation_v1'
    AND generation_active = true
    AND COALESCE(is_completed, false) = false
    AND NOT (generation_key = ANY(v_task_keys));
  GET DIAGNOSTICS v_retired_task_count = ROW_COUNT;

  v_recommended_stage := NULLIF(v_success_path->>'recommended_stage', '');
  IF v_recommended_stage IS NOT NULL THEN
    IF v_recommended_stage NOT IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The recommended Success Path stage is invalid.';
    END IF;

    INSERT INTO public.cycle_success_path_snapshots(
      user_id, cycle_id, recommended_stage, confirmed_stage,
      recommendation_reason, recommendation_evidence,
      curriculum_version, confirmed_at, planner_receipt_id
    ) VALUES (
      v_user_id,
      v_cycle_id,
      v_recommended_stage,
      NULL,
      NULLIF(v_success_path->>'recommendation_reason', ''),
      NULLIF(v_success_path->>'recommendation_evidence', ''),
      COALESCE(NULLIF(v_success_path->>'curriculum_version', ''), 'success-path-v1'),
      NULL,
      p_request_id
    )
    ON CONFLICT (user_id, cycle_id) DO UPDATE SET
      recommended_stage = EXCLUDED.recommended_stage,
      recommendation_reason = EXCLUDED.recommendation_reason,
      recommendation_evidence = EXCLUDED.recommendation_evidence,
      curriculum_version = EXCLUDED.curriculum_version,
      planner_receipt_id = EXCLUDED.planner_receipt_id,
      updated_at = now();
  END IF;

  v_receipt := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'complete',
    'replayed', false,
    'payload_hash', v_payload_hash,
    'cycle_id', v_cycle_id,
    'implementation_project_id', v_project_id,
    'active_generated_task_count', v_task_count,
    'retired_generated_task_count', v_retired_task_count,
    'success_path_ready', v_recommended_stage IS NOT NULL,
    'success_path_url', CASE
      WHEN v_recommended_stage IS NULL THEN NULL
      ELSE '/mastermind/success-path/' || v_cycle_id::text
    END,
    'completed_at', now()
  );

  UPDATE public.cycle_plan_reconciliation_requests
  SET cycle_id = v_cycle_id,
      status = 'complete',
      receipt = v_receipt,
      completed_at = now(),
      updated_at = now()
  WHERE request_id = p_request_id AND user_id = v_user_id;

  RETURN v_receipt;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) TO authenticated;
