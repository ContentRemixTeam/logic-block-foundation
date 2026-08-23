-- Wave 1: canonical transactional Planner reconciliation (source-only).
-- Rollback, if ever approved: revoke/drop reconcile_cycle_plan_v2 first, then
-- retain ledger/identity columns until receipts are archived. Do not blindly
-- drop generated metadata or owner constraints from a database with live rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.cycle_drafts
  ADD COLUMN IF NOT EXISTS logical_plan_key uuid,
  ADD COLUMN IF NOT EXISTS reconciliation_request_id uuid,
  ADD COLUMN IF NOT EXISTS draft_revision uuid;

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
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generation_retired_at timestamptz;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generation_retired_at timestamptz;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS generation_key text,
  ADD COLUMN IF NOT EXISTS generation_input_hash text,
  ADD COLUMN IF NOT EXISTS generation_baseline jsonb,
  ADD COLUMN IF NOT EXISTS generation_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generation_retired_at timestamptz;

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

-- Draft rows remain owner-readable for authoritative discovery, but all writes
-- are forced through the serialized CAS RPCs below. Remove historical policies
-- before recreating the one minimum member read path.
DROP POLICY IF EXISTS "Users can view own drafts" ON public.cycle_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.cycle_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.cycle_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.cycle_drafts;
DROP POLICY IF EXISTS "Members read own cycle drafts v2" ON public.cycle_drafts;
CREATE POLICY "Members read own cycle drafts v2"
  ON public.cycle_drafts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.cycle_drafts FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE public.cycle_drafts FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.cycle_drafts TO authenticated;

DROP POLICY IF EXISTS "Members read own cycle plan intents v2" ON public.cycle_plan_intents_v2;
CREATE POLICY "Members read own cycle plan intents v2"
  ON public.cycle_plan_intents_v2 FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members read own cycle plan receipts v2" ON public.cycle_plan_reconciliation_requests_v2;
CREATE POLICY "Members read own cycle plan receipts v2"
  ON public.cycle_plan_reconciliation_requests_v2 FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.cycle_plan_intents_v2 FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.cycle_plan_identity_aliases_v2 FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.cycle_plan_reconciliation_requests_v2 FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE public.cycle_plan_intents_v2 FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.cycle_plan_reconciliation_requests_v2 FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.cycle_plan_identity_aliases_v2 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cycle_plan_intents_v2 TO authenticated;
GRANT SELECT ON public.cycle_plan_reconciliation_requests_v2 TO authenticated;

DROP FUNCTION IF EXISTS public.save_cycle_draft_v2(jsonb, integer, uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.save_cycle_draft_v2(
  p_draft_data jsonb,
  p_current_step integer,
  p_logical_plan_key uuid,
  p_request_id uuid,
  p_draft_revision uuid,
  p_expected_draft_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_draft_revision uuid,
  p_expect_absent boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_draft public.cycle_drafts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before saving a cycle draft.';
  END IF;
  IF p_draft_data IS NULL OR jsonb_typeof(p_draft_data) <> 'object' OR p_draft_revision IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Draft data and a draft revision are required.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cycle-draft:' || v_user_id::text, 0));
  SELECT * INTO v_draft
  FROM public.cycle_drafts
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF NOT COALESCE(p_expect_absent, false) THEN
      RETURN jsonb_build_object(
        'success', false, 'conflict', true, 'conflict_kind', 'draft_missing'
      );
    END IF;
    BEGIN
      INSERT INTO public.cycle_drafts(
        user_id, draft_data, current_step, logical_plan_key,
        reconciliation_request_id, draft_revision, updated_at
      ) VALUES (
        v_user_id, p_draft_data, COALESCE(p_current_step, 1), p_logical_plan_key,
        p_request_id, p_draft_revision, now()
      ) RETURNING * INTO v_draft;
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false, 'conflict', true, 'conflict_kind', 'draft_created_elsewhere'
      );
    END;
    RETURN jsonb_build_object(
      'success', true, 'created', true, 'replayed', false,
      'id', v_draft.id,
      'logical_plan_key', v_draft.logical_plan_key,
      'request_id', v_draft.reconciliation_request_id,
      'draft_revision', v_draft.draft_revision,
      'updated_at', v_draft.updated_at
    );
  END IF;

  -- A lost response may retry the exact already-applied write. Reusing that
  -- revision with any different content or identity is a typed conflict.
  IF v_draft.draft_revision = p_draft_revision THEN
    IF v_draft.draft_data IS NOT DISTINCT FROM p_draft_data
       AND v_draft.current_step IS NOT DISTINCT FROM COALESCE(p_current_step, 1)
       AND v_draft.logical_plan_key IS NOT DISTINCT FROM p_logical_plan_key
       AND v_draft.reconciliation_request_id IS NOT DISTINCT FROM p_request_id THEN
      RETURN jsonb_build_object(
        'success', true, 'created', false, 'replayed', true,
        'id', v_draft.id,
        'logical_plan_key', v_draft.logical_plan_key,
        'request_id', v_draft.reconciliation_request_id,
        'draft_revision', v_draft.draft_revision,
        'updated_at', v_draft.updated_at
      );
    END IF;
    RETURN jsonb_build_object(
      'success', false, 'conflict', true, 'conflict_kind', 'draft_revision_reused'
    );
  END IF;

  IF COALESCE(p_expect_absent, false) THEN
    RETURN jsonb_build_object(
      'success', false, 'conflict', true, 'conflict_kind', 'draft_created_elsewhere'
    );
  END IF;

  IF p_expected_draft_id IS NULL OR v_draft.id <> p_expected_draft_id
     OR (
       v_draft.draft_revision IS NOT NULL
       AND v_draft.draft_revision IS DISTINCT FROM p_expected_draft_revision
     )
     OR (
       v_draft.draft_revision IS NULL
       AND (p_expected_draft_revision IS NOT NULL
         OR p_expected_updated_at IS NULL
         OR v_draft.updated_at IS DISTINCT FROM p_expected_updated_at)
     ) THEN
    RETURN jsonb_build_object(
      'success', false, 'conflict', true, 'conflict_kind', 'draft_changed'
    );
  END IF;

  UPDATE public.cycle_drafts SET
    draft_data = p_draft_data,
    current_step = COALESCE(p_current_step, 1),
    logical_plan_key = p_logical_plan_key,
    reconciliation_request_id = p_request_id,
    draft_revision = p_draft_revision,
    updated_at = now()
  WHERE id = v_draft.id AND user_id = v_user_id
  RETURNING * INTO v_draft;
  RETURN jsonb_build_object(
    'success', true, 'created', false, 'replayed', false,
    'id', v_draft.id,
    'logical_plan_key', v_draft.logical_plan_key,
    'request_id', v_draft.reconciliation_request_id,
    'draft_revision', v_draft.draft_revision,
    'updated_at', v_draft.updated_at
  );
END
$$;

CREATE OR REPLACE FUNCTION public.delete_cycle_draft_conditionally_v2(
  p_draft_id uuid,
  p_expected_updated_at timestamptz,
  p_draft_revision uuid,
  p_logical_plan_key uuid,
  p_request_id uuid,
  p_expect_absent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_draft public.cycle_drafts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before clearing a cycle draft.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cycle-draft:' || v_user_id::text, 0));
  SELECT * INTO v_draft
  FROM public.cycle_drafts
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF p_expect_absent THEN
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'conflict', true, 'conflict_kind', 'newer_draft_present');
    END IF;
    RETURN jsonb_build_object('success', true, 'deleted', false, 'verified_absent', true);
  END IF;

  IF p_draft_id IS NULL OR p_expected_updated_at IS NULL OR NOT FOUND
     OR v_draft.id <> p_draft_id
     OR v_draft.updated_at IS DISTINCT FROM p_expected_updated_at
     OR v_draft.draft_revision IS DISTINCT FROM p_draft_revision
     OR v_draft.logical_plan_key IS DISTINCT FROM p_logical_plan_key
     OR v_draft.reconciliation_request_id IS DISTINCT FROM p_request_id THEN
    RETURN jsonb_build_object('success', false, 'conflict', true, 'conflict_kind', 'draft_changed');
  END IF;

  DELETE FROM public.cycle_drafts WHERE id = v_draft.id AND user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'deleted', true,
    'draft_id', v_draft.id,
    'expected_updated_at', v_draft.updated_at,
    'draft_revision', v_draft.draft_revision,
    'logical_plan_key', v_draft.logical_plan_key,
    'request_id', v_draft.reconciliation_request_id
  );
END
$$;

REVOKE ALL ON FUNCTION public.save_cycle_draft_v2(jsonb, integer, uuid, uuid, uuid, uuid, timestamptz, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_cycle_draft_v2(jsonb, integer, uuid, uuid, uuid, uuid, timestamptz, uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_cycle_draft_conditionally_v2(uuid, timestamptz, uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_cycle_draft_conditionally_v2(uuid, timestamptz, uuid, uuid, uuid, boolean) TO authenticated;

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
  v_intent_found boolean := false;
  v_existing public.cycle_plan_reconciliation_requests_v2%ROWTYPE;
  v_cycle_id uuid;
  v_owner_quarter_cycle_ids uuid[] := ARRAY[]::uuid[];
  v_owner_quarter_cycle_count integer := 0;
  v_owner_quarter_cycle_id uuid;
  v_candidate_planner_plan_id uuid;
  v_candidate_reconciliation_version bigint;
  v_candidate_payload_version text;
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
  v_reactivated_projects integer := 0;
  v_reactivated_habits integer := 0;
  v_reactivated_tasks integer := 0;
  v_preserved_inactive_projects integer := 0;
  v_preserved_inactive_habits integer := 0;
  v_preserved_inactive_tasks integer := 0;
  v_generation_reactivation_conflicts jsonb := '[]'::jsonb;
  v_existing_generation_active boolean;
  v_safe_reactivation boolean;
  v_row_generation_active boolean;
  v_daily_dates date[] := ARRAY[]::date[];
  v_daily_plan_inserted_count integer := 0;
  v_daily_plan_linked_count integer := 0;
  v_daily_plan_preserved_count integer := 0;
  v_daily_plan_conflict_count integer := 0;
  v_daily_plan_outcomes jsonb := '[]'::jsonb;
  v_daily_date date;
  v_daily_day_id uuid;
  v_daily_cycle_id uuid;
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

  -- Lock and inventory every owner cycle already claiming this quarter before
  -- creating an intent or cycle. Aggregate outside the locked subquery because
  -- PostgreSQL does not allow FOR UPDATE directly on an aggregate result.
  SELECT COALESCE(array_agg(locked.cycle_id ORDER BY locked.cycle_id), ARRAY[]::uuid[])
  INTO v_owner_quarter_cycle_ids
  FROM (
    SELECT cycle_id
    FROM public.cycles_90_day
    WHERE user_id = v_user_id
      AND date_trunc('quarter', start_date)::date = v_quarter_start
    FOR UPDATE
  ) AS locked;
  v_owner_quarter_cycle_count := cardinality(v_owner_quarter_cycle_ids);

  IF v_cycle_id IS NOT NULL AND NOT (v_cycle_id = ANY(v_owner_quarter_cycle_ids)) THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'cycle_quarter_mismatch',
      'cycle_id', v_cycle_id,
      'quarter_start', v_quarter_start,
      'requires_review', true
    );
  END IF;

  -- Resolve durable logical identity before the quarter fallback. An existing
  -- plan may never be silently rebound to another quarter or cycle.
  SELECT intent.* INTO v_intent
  FROM public.cycle_plan_intents_v2 intent
  JOIN public.cycle_plan_identity_aliases_v2 alias
    ON alias.plan_id = intent.plan_id AND alias.user_id = intent.user_id
  WHERE alias.user_id = v_user_id AND alias.logical_plan_key = v_logical_plan_key
  FOR UPDATE OF intent;
  v_intent_found := FOUND;

  IF v_intent_found AND v_intent.quarter_start <> v_quarter_start THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'quarter_changed',
      'current_version', v_intent.current_version,
      'cycle_id', v_intent.cycle_id
    );
  END IF;

  IF NOT v_intent_found AND v_cycle_id IS NOT NULL THEN
    SELECT * INTO v_intent
    FROM public.cycle_plan_intents_v2
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id
    FOR UPDATE;
    v_intent_found := FOUND;
    IF v_intent_found AND v_intent.quarter_start <> v_quarter_start THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'quarter_changed',
        'current_version', v_intent.current_version,
        'cycle_id', v_intent.cycle_id
      );
    END IF;
  END IF;

  IF NOT v_intent_found THEN
    SELECT * INTO v_intent
    FROM public.cycle_plan_intents_v2
    WHERE user_id = v_user_id AND quarter_start = v_quarter_start
    FOR UPDATE;
    v_intent_found := FOUND;
  END IF;

  IF v_owner_quarter_cycle_count > 1 THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'ambiguous_owner_quarter_cycles',
      'quarter_start', v_quarter_start,
      'cycle_ids', to_jsonb(v_owner_quarter_cycle_ids),
      'requires_review', true
    );
  END IF;

  IF v_owner_quarter_cycle_count = 1 THEN
    v_owner_quarter_cycle_id := v_owner_quarter_cycle_ids[1];
    SELECT planner_plan_id, reconciliation_version, planner_payload_version
    INTO v_candidate_planner_plan_id, v_candidate_reconciliation_version, v_candidate_payload_version
    FROM public.cycles_90_day
    WHERE user_id = v_user_id AND cycle_id = v_owner_quarter_cycle_id;

    IF v_intent_found AND v_intent.cycle_id IS NOT NULL
       AND v_intent.cycle_id <> v_owner_quarter_cycle_id THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'owner_quarter_cycle_conflict',
        'quarter_start', v_quarter_start,
        'cycle_ids', to_jsonb(v_owner_quarter_cycle_ids),
        'requires_review', true
      );
    END IF;
    IF (NOT v_intent_found OR v_intent.cycle_id IS NULL)
       AND (v_candidate_planner_plan_id IS NOT NULL
         OR COALESCE(v_candidate_reconciliation_version, 0) <> 0
         OR v_candidate_payload_version IS NOT NULL) THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'owner_quarter_cycle_conflict',
        'quarter_start', v_quarter_start,
        'cycle_ids', to_jsonb(v_owner_quarter_cycle_ids),
        'requires_review', true
      );
    END IF;
    IF v_cycle_id IS NOT NULL AND v_cycle_id <> v_owner_quarter_cycle_id THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'owner_quarter_cycle_conflict',
        'quarter_start', v_quarter_start,
        'cycle_ids', to_jsonb(v_owner_quarter_cycle_ids),
        'requires_review', true
      );
    END IF;
    v_cycle_id := v_owner_quarter_cycle_id;
  ELSIF v_intent_found AND v_intent.cycle_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'owner_quarter_cycle_conflict',
      'quarter_start', v_quarter_start,
      'cycle_id', v_intent.cycle_id,
      'requires_review', true
    );
  END IF;

  -- Preflight every required Daily Plan date under deterministic locks before
  -- the first intent/cycle/project/task/ledger write. A date attached to any
  -- non-target cycle is a typed conflict and the caller keeps its recovery.
  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'daily_plans', '[]'::jsonb))
  LOOP
    BEGIN
      v_daily_date := (v_row->>'date')::date;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated Daily Plan dates must be valid.';
    END;
    IF v_daily_date IS NULL OR v_daily_date = ANY(v_daily_dates) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated Daily Plan dates must be present and unique.';
    END IF;
    v_daily_dates := array_append(v_daily_dates, v_daily_date);
  END LOOP;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::date[])
  INTO v_daily_dates
  FROM unnest(v_daily_dates) AS dates(value);
  FOREACH v_daily_date IN ARRAY v_daily_dates LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'daily-plan:' || v_user_id::text || ':' || v_daily_date::text, 0
    ));
    v_daily_cycle_id := NULL;
    SELECT cycle_id INTO v_daily_cycle_id
    FROM public.daily_plans
    WHERE user_id = v_user_id AND date = v_daily_date
    FOR UPDATE;
    IF FOUND AND v_daily_cycle_id IS NOT NULL
       AND (v_cycle_id IS NULL OR v_daily_cycle_id <> v_cycle_id) THEN
      RETURN jsonb_build_object(
        'status', 'conflict', 'conflict', true,
        'conflict_kind', 'daily_plan_collision',
        'date', v_daily_date,
        'existing_cycle_id', v_daily_cycle_id,
        'requires_support', true
      );
    END IF;
  END LOOP;

  IF NOT v_intent_found THEN
    INSERT INTO public.cycle_plan_intents_v2(user_id, logical_plan_key, quarter_start, cycle_id)
    VALUES (v_user_id, v_logical_plan_key, v_quarter_start, v_cycle_id)
    RETURNING * INTO v_intent;
    v_intent_found := true;
  END IF;

  INSERT INTO public.cycle_plan_identity_aliases_v2(user_id, logical_plan_key, plan_id)
  VALUES (v_user_id, v_logical_plan_key, v_intent.plan_id)
  ON CONFLICT (user_id, logical_plan_key) DO NOTHING;

  IF v_cycle_id IS NULL THEN
    v_cycle_id := v_intent.cycle_id;
  ELSIF v_intent.cycle_id IS NOT NULL AND v_intent.cycle_id <> v_cycle_id THEN
    RETURN jsonb_build_object(
      'status', 'conflict', 'conflict', true,
      'conflict_kind', 'owner_quarter_cycle_conflict',
      'current_version', v_intent.current_version,
      'requires_review', true
    );
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
      'payload_hash', v_payload_hash,
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

  -- Generated projects preserve completed/member-edited rows. A retired row
  -- reactivates only when its complete archived state still matches the exact
  -- generator baseline and retirement provenance.
  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'generated_projects', '[]'::jsonb)) LOOP
    v_generation_key := btrim(v_row->>'generation_key');
    IF v_generation_key = '' OR btrim(v_row->>'name') = '' OR v_generation_key = ANY(v_project_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated project keys and names must be unique.';
    END IF;
    v_project_keys := array_append(v_project_keys, v_generation_key);
    v_existing_generation_active := NULL;
    v_safe_reactivation := false;
    SELECT generation_active,
      (NOT generation_active
        AND generation_retired_at IS NOT NULL
        AND updated_at IS NOT DISTINCT FROM generation_retired_at
        AND status = 'archived'
        AND generation_baseline IS NOT NULL
        AND generation_baseline->>'status' = 'active'
        AND name IS NOT DISTINCT FROM generation_baseline->>'name'
        AND description IS NOT DISTINCT FROM generation_baseline->>'description')
    INTO v_existing_generation_active, v_safe_reactivation
    FROM public.projects
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key = v_generation_key
    FOR UPDATE;
    INSERT INTO public.projects(user_id, cycle_id, name, description, status, generation_key, generation_input_hash, generation_baseline, generation_active)
    VALUES (v_user_id, v_cycle_id, btrim(v_row->>'name'), NULLIF(v_row->>'description', ''), 'active', v_generation_key,
      v_content_hash, jsonb_build_object('name', btrim(v_row->>'name'), 'description', NULLIF(v_row->>'description', ''), 'status', 'active'), true)
    ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO UPDATE SET
      name = CASE WHEN NOT public.projects.generation_active AND NOT v_safe_reactivation THEN public.projects.name
        WHEN v_safe_reactivation THEN EXCLUDED.name
        WHEN public.projects.status = 'completed' OR public.projects.generation_baseline IS NULL
        OR public.projects.name IS DISTINCT FROM public.projects.generation_baseline->>'name'
        THEN public.projects.name ELSE EXCLUDED.name END,
      description = CASE WHEN NOT public.projects.generation_active AND NOT v_safe_reactivation THEN public.projects.description
        WHEN v_safe_reactivation THEN EXCLUDED.description
        WHEN public.projects.status = 'completed' OR public.projects.generation_baseline IS NULL
        OR public.projects.description IS DISTINCT FROM public.projects.generation_baseline->>'description'
        THEN public.projects.description ELSE EXCLUDED.description END,
      status = CASE WHEN v_safe_reactivation THEN COALESCE(public.projects.generation_baseline->>'status', 'active') ELSE public.projects.status END,
      generation_input_hash = CASE WHEN NOT public.projects.generation_active AND NOT v_safe_reactivation
        THEN public.projects.generation_input_hash ELSE EXCLUDED.generation_input_hash END,
      generation_baseline = CASE
        WHEN NOT public.projects.generation_active AND NOT v_safe_reactivation THEN public.projects.generation_baseline
        WHEN v_safe_reactivation THEN EXCLUDED.generation_baseline
        WHEN public.projects.generation_baseline IS NULL THEN NULL
        ELSE jsonb_build_object(
          'name', CASE
            WHEN public.projects.status <> 'completed'
              AND public.projects.name IS NOT DISTINCT FROM public.projects.generation_baseline->>'name'
            THEN EXCLUDED.generation_baseline->'name'
            ELSE public.projects.generation_baseline->'name'
          END,
          'description', CASE
            WHEN public.projects.status <> 'completed'
              AND public.projects.description IS NOT DISTINCT FROM public.projects.generation_baseline->>'description'
            THEN EXCLUDED.generation_baseline->'description'
            ELSE public.projects.generation_baseline->'description'
          END,
          'status', public.projects.generation_baseline->'status'
        )
      END,
      generation_active = public.projects.generation_active OR v_safe_reactivation,
      generation_retired_at = CASE WHEN v_safe_reactivation THEN NULL ELSE public.projects.generation_retired_at END,
      updated_at = CASE WHEN NOT public.projects.generation_active AND NOT v_safe_reactivation
        THEN public.projects.updated_at ELSE now() END
    RETURNING id, generation_active INTO v_project_id, v_row_generation_active;
    v_project_ids := v_project_ids || jsonb_build_object(v_generation_key, v_project_id);
    IF v_row_generation_active THEN
      v_active_projects := v_active_projects + 1;
      IF v_existing_generation_active = false AND v_safe_reactivation THEN
        v_reactivated_projects := v_reactivated_projects + 1;
      END IF;
    ELSE
      v_preserved_inactive_projects := v_preserved_inactive_projects + 1;
      v_generation_reactivation_conflicts := v_generation_reactivation_conflicts || jsonb_build_array(
        jsonb_build_object('kind', 'project', 'generation_key', v_generation_key, 'outcome', 'member_state_preserved')
      );
    END IF;
  END LOOP;

  UPDATE public.projects SET generation_active = false, status = 'archived',
    generation_retired_at = now(), updated_at = now()
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
    v_existing_generation_active := NULL;
    v_safe_reactivation := false;
    SELECT generation_active,
      (NOT generation_active
        AND generation_retired_at IS NOT NULL
        AND updated_at IS NOT DISTINCT FROM generation_retired_at
        AND NOT is_active
        AND deleted_at IS NOT DISTINCT FROM generation_retired_at
        AND generation_baseline IS NOT NULL
        AND COALESCE((generation_baseline->>'is_active')::boolean, true)
        AND habit_name IS NOT DISTINCT FROM generation_baseline->>'habit_name'
        AND category IS NOT DISTINCT FROM generation_baseline->>'category')
    INTO v_existing_generation_active, v_safe_reactivation
    FROM public.habits
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key = v_generation_key
    FOR UPDATE;
    INSERT INTO public.habits(user_id, cycle_id, habit_name, category, display_order, is_active, generation_key, generation_input_hash, generation_baseline, generation_active)
    VALUES (v_user_id, v_cycle_id, btrim(v_row->>'habit_name'), NULLIF(v_row->>'category', ''), COALESCE((v_row->>'display_order')::integer, 0), true,
      v_generation_key, v_content_hash, jsonb_build_object('habit_name', btrim(v_row->>'habit_name'), 'category', NULLIF(v_row->>'category', ''), 'is_active', true), true)
    ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO UPDATE SET
      habit_name = CASE WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation THEN public.habits.habit_name
        WHEN v_safe_reactivation THEN EXCLUDED.habit_name
        WHEN public.habits.generation_baseline IS NULL OR public.habits.habit_name IS DISTINCT FROM public.habits.generation_baseline->>'habit_name'
        THEN public.habits.habit_name ELSE EXCLUDED.habit_name END,
      category = CASE WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation THEN public.habits.category
        WHEN v_safe_reactivation THEN EXCLUDED.category
        WHEN public.habits.generation_baseline IS NULL OR public.habits.category IS DISTINCT FROM public.habits.generation_baseline->>'category'
        THEN public.habits.category ELSE EXCLUDED.category END,
      display_order = CASE WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation
        THEN public.habits.display_order ELSE EXCLUDED.display_order END,
      is_active = CASE WHEN v_safe_reactivation THEN true ELSE public.habits.is_active END,
      deleted_at = CASE WHEN v_safe_reactivation THEN NULL ELSE public.habits.deleted_at END,
      generation_input_hash = CASE WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation
        THEN public.habits.generation_input_hash ELSE EXCLUDED.generation_input_hash END,
      generation_baseline = CASE
        WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation THEN public.habits.generation_baseline
        WHEN v_safe_reactivation THEN EXCLUDED.generation_baseline
        WHEN public.habits.generation_baseline IS NULL THEN NULL
        ELSE jsonb_build_object(
          'habit_name', CASE
            WHEN public.habits.habit_name IS NOT DISTINCT FROM public.habits.generation_baseline->>'habit_name'
            THEN EXCLUDED.generation_baseline->'habit_name'
            ELSE public.habits.generation_baseline->'habit_name'
          END,
          'category', CASE
            WHEN public.habits.category IS NOT DISTINCT FROM public.habits.generation_baseline->>'category'
            THEN EXCLUDED.generation_baseline->'category'
            ELSE public.habits.generation_baseline->'category'
          END,
          'is_active', public.habits.generation_baseline->'is_active'
        )
      END,
      generation_active = public.habits.generation_active OR v_safe_reactivation,
      generation_retired_at = CASE WHEN v_safe_reactivation THEN NULL ELSE public.habits.generation_retired_at END,
      updated_at = CASE WHEN NOT public.habits.generation_active AND NOT v_safe_reactivation
        THEN public.habits.updated_at ELSE now() END
    RETURNING generation_active INTO v_row_generation_active;
    IF v_row_generation_active THEN
      v_active_habits := v_active_habits + 1;
      IF v_existing_generation_active = false AND v_safe_reactivation THEN
        v_reactivated_habits := v_reactivated_habits + 1;
      END IF;
    ELSE
      v_preserved_inactive_habits := v_preserved_inactive_habits + 1;
      v_generation_reactivation_conflicts := v_generation_reactivation_conflicts || jsonb_build_array(
        jsonb_build_object('kind', 'habit', 'generation_key', v_generation_key, 'outcome', 'member_state_preserved')
      );
    END IF;
  END LOOP;
  UPDATE public.habits SET generation_active = false, is_active = false,
    generation_retired_at = now(), deleted_at = now(), updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key IS NOT NULL AND generation_active
    AND NOT (generation_key = ANY(v_habit_keys)) AND generation_baseline IS NOT NULL
    AND habit_name IS NOT DISTINCT FROM generation_baseline->>'habit_name'
    AND category IS NOT DISTINCT FROM generation_baseline->>'category'
    AND is_active = true AND deleted_at IS NULL;
  GET DIAGNOSTICS v_retired_habits = ROW_COUNT;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'generated_tasks', '[]'::jsonb)) LOOP
    v_generation_key := btrim(v_row->>'generation_key');
    IF v_generation_key = '' OR btrim(v_row->>'task_text') = '' OR v_generation_key = ANY(v_task_keys) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Generated task keys and text must be unique.';
    END IF;
    v_task_keys := array_append(v_task_keys, v_generation_key);
    v_project_id := NULLIF(v_project_ids->>COALESCE(v_row->>'project_generation_key', ''), '')::uuid;
    v_existing_generation_active := NULL;
    v_safe_reactivation := false;
    SELECT generation_active,
      (NOT generation_active
        AND generation_retired_at IS NOT NULL
        AND updated_at IS NOT DISTINCT FROM generation_retired_at
        AND deleted_at IS NOT DISTINCT FROM generation_retired_at
        AND system_source = 'cycle_reconciliation_v2_retired'
        AND NOT COALESCE(is_completed, false)
        AND generation_baseline IS NOT NULL
        AND project_id::text IS NOT DISTINCT FROM generation_baseline->>'project_id'
        AND task_text IS NOT DISTINCT FROM generation_baseline->>'task_text'
        AND task_description IS NOT DISTINCT FROM generation_baseline->>'task_description'
        AND scheduled_date::text IS NOT DISTINCT FROM generation_baseline->>'scheduled_date'
        AND planned_day::text IS NOT DISTINCT FROM generation_baseline->>'planned_day'
        AND priority IS NOT DISTINCT FROM generation_baseline->>'priority'
        AND status IS NOT DISTINCT FROM generation_baseline->>'status'
        AND category IS NOT DISTINCT FROM generation_baseline->>'category'
        AND to_jsonb(context_tags) IS NOT DISTINCT FROM generation_baseline->'context_tags'
        AND (v_project_id IS NULL OR EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.user_id = v_user_id AND p.id = v_project_id AND p.generation_active
        )))
    INTO v_existing_generation_active, v_safe_reactivation
    FROM public.tasks
    WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key = v_generation_key
    FOR UPDATE;
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
      project_id = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.project_id WHEN v_safe_reactivation THEN EXCLUDED.project_id WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.project_id::text IS DISTINCT FROM public.tasks.generation_baseline->>'project_id' THEN public.tasks.project_id ELSE EXCLUDED.project_id END,
      task_text = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.task_text WHEN v_safe_reactivation THEN EXCLUDED.task_text WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.task_text IS DISTINCT FROM public.tasks.generation_baseline->>'task_text' THEN public.tasks.task_text ELSE EXCLUDED.task_text END,
      task_description = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.task_description WHEN v_safe_reactivation THEN EXCLUDED.task_description WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.task_description IS DISTINCT FROM public.tasks.generation_baseline->>'task_description' THEN public.tasks.task_description ELSE EXCLUDED.task_description END,
      scheduled_date = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.scheduled_date WHEN v_safe_reactivation THEN EXCLUDED.scheduled_date WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.scheduled_date::text IS DISTINCT FROM public.tasks.generation_baseline->>'scheduled_date' THEN public.tasks.scheduled_date ELSE EXCLUDED.scheduled_date END,
      planned_day = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.planned_day WHEN v_safe_reactivation THEN EXCLUDED.planned_day WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.planned_day::text IS DISTINCT FROM public.tasks.generation_baseline->>'planned_day' THEN public.tasks.planned_day ELSE EXCLUDED.planned_day END,
      priority = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.priority WHEN v_safe_reactivation THEN EXCLUDED.priority WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.priority IS DISTINCT FROM public.tasks.generation_baseline->>'priority' THEN public.tasks.priority ELSE EXCLUDED.priority END,
      category = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.category WHEN v_safe_reactivation THEN EXCLUDED.category WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR public.tasks.category IS DISTINCT FROM public.tasks.generation_baseline->>'category' THEN public.tasks.category ELSE EXCLUDED.category END,
      context_tags = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.context_tags WHEN v_safe_reactivation THEN EXCLUDED.context_tags WHEN COALESCE(public.tasks.is_completed, false) OR public.tasks.generation_baseline IS NULL OR to_jsonb(public.tasks.context_tags) IS DISTINCT FROM public.tasks.generation_baseline->'context_tags' THEN public.tasks.context_tags ELSE EXCLUDED.context_tags END,
      deleted_at = CASE WHEN v_safe_reactivation THEN NULL ELSE public.tasks.deleted_at END,
      generation_input_hash = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation
        THEN public.tasks.generation_input_hash ELSE EXCLUDED.generation_input_hash END,
      generation_baseline = CASE
        WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation THEN public.tasks.generation_baseline
        WHEN v_safe_reactivation THEN EXCLUDED.generation_baseline
        WHEN public.tasks.generation_baseline IS NULL THEN NULL
        ELSE jsonb_build_object(
          'project_id', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.project_id::text IS NOT DISTINCT FROM public.tasks.generation_baseline->>'project_id'
            THEN EXCLUDED.generation_baseline->'project_id' ELSE public.tasks.generation_baseline->'project_id' END,
          'task_text', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.task_text IS NOT DISTINCT FROM public.tasks.generation_baseline->>'task_text'
            THEN EXCLUDED.generation_baseline->'task_text' ELSE public.tasks.generation_baseline->'task_text' END,
          'task_description', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.task_description IS NOT DISTINCT FROM public.tasks.generation_baseline->>'task_description'
            THEN EXCLUDED.generation_baseline->'task_description' ELSE public.tasks.generation_baseline->'task_description' END,
          'scheduled_date', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.scheduled_date::text IS NOT DISTINCT FROM public.tasks.generation_baseline->>'scheduled_date'
            THEN EXCLUDED.generation_baseline->'scheduled_date' ELSE public.tasks.generation_baseline->'scheduled_date' END,
          'planned_day', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.planned_day::text IS NOT DISTINCT FROM public.tasks.generation_baseline->>'planned_day'
            THEN EXCLUDED.generation_baseline->'planned_day' ELSE public.tasks.generation_baseline->'planned_day' END,
          'priority', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.priority IS NOT DISTINCT FROM public.tasks.generation_baseline->>'priority'
            THEN EXCLUDED.generation_baseline->'priority' ELSE public.tasks.generation_baseline->'priority' END,
          'status', public.tasks.generation_baseline->'status',
          'category', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND public.tasks.category IS NOT DISTINCT FROM public.tasks.generation_baseline->>'category'
            THEN EXCLUDED.generation_baseline->'category' ELSE public.tasks.generation_baseline->'category' END,
          'context_tags', CASE WHEN NOT COALESCE(public.tasks.is_completed, false)
              AND to_jsonb(public.tasks.context_tags) IS NOT DISTINCT FROM public.tasks.generation_baseline->'context_tags'
            THEN EXCLUDED.generation_baseline->'context_tags' ELSE public.tasks.generation_baseline->'context_tags' END
        )
      END,
      generation_active = public.tasks.generation_active OR v_safe_reactivation,
      generation_retired_at = CASE WHEN v_safe_reactivation THEN NULL ELSE public.tasks.generation_retired_at END,
      system_source = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation
        THEN public.tasks.system_source ELSE 'cycle_reconciliation_v2' END,
      updated_at = CASE WHEN NOT public.tasks.generation_active AND NOT v_safe_reactivation
        THEN public.tasks.updated_at ELSE now() END
    RETURNING generation_active INTO v_row_generation_active;
    IF v_row_generation_active THEN
      v_active_tasks := v_active_tasks + 1;
      IF v_existing_generation_active = false AND v_safe_reactivation THEN
        v_reactivated_tasks := v_reactivated_tasks + 1;
      END IF;
    ELSE
      v_preserved_inactive_tasks := v_preserved_inactive_tasks + 1;
      v_generation_reactivation_conflicts := v_generation_reactivation_conflicts || jsonb_build_array(
        jsonb_build_object('kind', 'task', 'generation_key', v_generation_key, 'outcome', 'member_state_preserved')
      );
    END IF;
  END LOOP;

  UPDATE public.tasks SET generation_active = false, system_source = 'cycle_reconciliation_v2_retired',
    generation_retired_at = now(), deleted_at = now(), updated_at = now()
  WHERE user_id = v_user_id AND cycle_id = v_cycle_id AND generation_key IS NOT NULL AND generation_active
    AND NOT (generation_key = ANY(v_task_keys)) AND NOT COALESCE(is_completed, false)
    AND generation_baseline IS NOT NULL AND status = COALESCE(generation_baseline->>'status', 'todo')
    AND task_text IS NOT DISTINCT FROM generation_baseline->>'task_text'
    AND task_description IS NOT DISTINCT FROM generation_baseline->>'task_description'
    AND scheduled_date::text IS NOT DISTINCT FROM generation_baseline->>'scheduled_date'
    AND planned_day::text IS NOT DISTINCT FROM generation_baseline->>'planned_day'
    AND priority IS NOT DISTINCT FROM generation_baseline->>'priority'
    AND category IS NOT DISTINCT FROM generation_baseline->>'category'
    AND to_jsonb(context_tags) IS NOT DISTINCT FROM generation_baseline->'context_tags'
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_retired_tasks = ROW_COUNT;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'daily_plans', '[]'::jsonb)) LOOP
    v_daily_date := (v_row->>'date')::date;
    v_daily_day_id := NULL;
    INSERT INTO public.daily_plans(user_id, cycle_id, date, top_3_today, thought)
    VALUES (v_user_id, v_cycle_id, v_daily_date, COALESCE(v_row->'top_3_today', '[]'::jsonb), NULLIF(v_row->>'thought', ''))
    ON CONFLICT (user_id, date) DO NOTHING
    RETURNING day_id INTO v_daily_day_id;

    IF v_daily_day_id IS NOT NULL THEN
      v_daily_plan_inserted_count := v_daily_plan_inserted_count + 1;
      v_daily_plan_outcomes := v_daily_plan_outcomes || jsonb_build_array(jsonb_build_object(
        'date', v_daily_date, 'outcome', 'created_generated_plan'
      ));
    ELSE
      v_daily_cycle_id := NULL;
      SELECT day_id, cycle_id
      INTO v_daily_day_id, v_daily_cycle_id
      FROM public.daily_plans
      WHERE user_id = v_user_id AND date = v_daily_date
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A Daily Plan changed concurrently; retry reconciliation.';
      END IF;

      IF v_daily_cycle_id IS NULL THEN
        -- Link only the missing relationship. Every authored/completion field is
        -- deliberately absent from this UPDATE and remains byte-for-byte owned
        -- by the member-facing Daily Plan writer.
        UPDATE public.daily_plans
        SET cycle_id = v_cycle_id
        WHERE day_id = v_daily_day_id AND user_id = v_user_id AND cycle_id IS NULL;
        v_daily_plan_linked_count := v_daily_plan_linked_count + 1;
        v_daily_plan_outcomes := v_daily_plan_outcomes || jsonb_build_array(jsonb_build_object(
          'date', v_daily_date, 'outcome', 'linked_existing_preserved'
        ));
      ELSIF v_daily_cycle_id = v_cycle_id THEN
        v_daily_plan_preserved_count := v_daily_plan_preserved_count + 1;
        v_daily_plan_outcomes := v_daily_plan_outcomes || jsonb_build_array(jsonb_build_object(
          'date', v_daily_date, 'outcome', 'existing_same_cycle_preserved'
        ));
      ELSE
        RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'cycle_plan_daily_plan_collision: required date changed ownership; retry after support review.';
      END IF;
    END IF;
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
    'reactivated_generated_project_count', v_reactivated_projects,
    'reactivated_generated_habit_count', v_reactivated_habits,
    'reactivated_generated_task_count', v_reactivated_tasks,
    'preserved_inactive_generated_project_count', v_preserved_inactive_projects,
    'preserved_inactive_generated_habit_count', v_preserved_inactive_habits,
    'preserved_inactive_generated_task_count', v_preserved_inactive_tasks,
    'generation_reactivation_conflicts', v_generation_reactivation_conflicts,
    'daily_plan_inserted_count', v_daily_plan_inserted_count,
    'daily_plan_linked_count', v_daily_plan_linked_count,
    'daily_plan_preserved_count', v_daily_plan_preserved_count,
    'daily_plan_conflict_count', v_daily_plan_conflict_count,
    'daily_plan_outcomes', v_daily_plan_outcomes,
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
