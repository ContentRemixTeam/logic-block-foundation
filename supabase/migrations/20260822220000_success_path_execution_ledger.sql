-- Wave 3: protected Success Path orientation, canonical action linkage,
-- evidence, evaluation, recovery, focus transitions, and support history.
-- This migration is source-only until an explicitly approved production apply.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_owner_cycle_task_unique
  ON public.tasks(user_id, cycle_id, task_id);
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_assignment_items_owner_item_unique
  ON public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id);

CREATE TABLE IF NOT EXISTS public.success_path_cycle_states (
  path_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  planner_request_ledger_id uuid NOT NULL,
  planner_receipt_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  assignment_version bigint NOT NULL CHECK (assignment_version > 0),
  catalog_version_id uuid NOT NULL,
  catalog_content_sha256 text NOT NULL CHECK (catalog_content_sha256 ~ '^[0-9a-f]{64}$'),
  recommendation_request_id uuid NOT NULL,
  recommendation_request_sha256 text NOT NULL CHECK (recommendation_request_sha256 ~ '^[0-9a-f]{64}$'),
  recommendation_receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommendation_evidence_sha256 text NOT NULL CHECK (recommendation_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  recommendation_reason text NOT NULL CHECK (char_length(recommendation_reason) BETWEEN 1 AND 800),
  recommended_stage text NOT NULL CHECK (char_length(recommended_stage) BETWEEN 1 AND 80),
  recommended_milestone_key text NOT NULL CHECK (char_length(recommended_milestone_key) BETWEEN 1 AND 120),
  recommended_milestone_title text NOT NULL CHECK (char_length(recommended_milestone_title) BETWEEN 1 AND 180),
  recommended_assignment_item_id uuid NOT NULL,
  recommended_move_key text NOT NULL CHECK (recommended_move_key ~ '^[a-z0-9][a-z0-9:_-]{0,119}$'),
  recommended_action_text text NOT NULL CHECK (char_length(recommended_action_text) BETWEEN 1 AND 300),
  recommended_action_minutes integer NOT NULL CHECK (recommended_action_minutes BETWEEN 5 AND 240),
  confirmed_stage text,
  active_milestone_key text,
  active_milestone_title text,
  active_assignment_item_id uuid,
  current_action_id uuid,
  capacity_mode text NOT NULL DEFAULT 'standard'
    CHECK (capacity_mode IN ('standard', 'reduced', 'recovery')),
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version > 0),
  state_receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, cycle_id),
  UNIQUE(user_id, cycle_id, path_id),
  UNIQUE(user_id, recommendation_request_id),
  CONSTRAINT success_path_state_owner_cycle_fkey
    FOREIGN KEY (user_id, cycle_id)
    REFERENCES public.cycles_90_day(user_id, cycle_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_state_exact_planner_receipt_fkey
    FOREIGN KEY (user_id, cycle_id, planner_receipt_id, planner_request_ledger_id)
    REFERENCES public.cycle_plan_reconciliation_requests_v2(user_id, cycle_id, planner_receipt_id, ledger_id)
    ON DELETE RESTRICT,
  CONSTRAINT success_path_state_frozen_assignment_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id)
    REFERENCES public.curriculum_cycle_assignments(user_id, cycle_id, assignment_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_state_recommended_item_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id, recommended_assignment_item_id)
    REFERENCES public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id)
    ON DELETE RESTRICT,
  CONSTRAINT success_path_state_active_item_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id, active_assignment_item_id)
    REFERENCES public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id)
    ON DELETE RESTRICT,
  CHECK (
    (confirmed_stage IS NULL AND active_milestone_key IS NULL AND active_milestone_title IS NULL
      AND active_assignment_item_id IS NULL AND current_action_id IS NULL AND confirmed_at IS NULL)
    OR
    (confirmed_stage IS NOT NULL AND char_length(confirmed_stage) BETWEEN 1 AND 80
      AND active_milestone_key IS NOT NULL AND char_length(active_milestone_key) BETWEEN 1 AND 120
      AND active_milestone_title IS NOT NULL AND char_length(active_milestone_title) BETWEEN 1 AND 180
      AND active_assignment_item_id IS NOT NULL AND current_action_id IS NOT NULL AND confirmed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.success_path_actions (
  action_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  path_version bigint NOT NULL CHECK (path_version > 0),
  milestone_key text NOT NULL CHECK (char_length(milestone_key) BETWEEN 1 AND 120),
  assignment_id uuid NOT NULL,
  assignment_item_id uuid NOT NULL,
  move_key text NOT NULL CHECK (move_key ~ '^[a-z0-9][a-z0-9:_-]{0,119}$'),
  action_version bigint NOT NULL CHECK (action_version > 0),
  logical_action_key text NOT NULL CHECK (logical_action_key ~ '^guided-action-v1:[0-9a-f]{64}$'),
  task_id uuid NOT NULL,
  action_text text NOT NULL CHECK (char_length(action_text) BETWEEN 1 AND 300),
  estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 240),
  task_baseline jsonb NOT NULL CHECK (jsonb_typeof(task_baseline) = 'object'),
  creation_reason text NOT NULL
    CHECK (creation_reason IN ('initial_confirmation', 'reduce', 'absence_recovery', 'confirmed_transition')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, cycle_id, milestone_key, move_key, action_version),
  UNIQUE(user_id, cycle_id, logical_action_key),
  UNIQUE(user_id, task_id),
  UNIQUE(user_id, cycle_id, action_id),
  CONSTRAINT success_path_actions_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_actions_frozen_item_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id, assignment_item_id)
    REFERENCES public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id)
    ON DELETE RESTRICT,
  CONSTRAINT success_path_actions_owner_task_fkey
    FOREIGN KEY (user_id, cycle_id, task_id)
    REFERENCES public.tasks(user_id, cycle_id, task_id) ON DELETE RESTRICT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.success_path_cycle_states'::regclass
       AND conname = 'success_path_state_current_action_fkey'
  ) THEN
    ALTER TABLE public.success_path_cycle_states
      ADD CONSTRAINT success_path_state_current_action_fkey
      FOREIGN KEY (user_id, cycle_id, current_action_id)
      REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.success_path_confirmations (
  confirmation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  expected_path_version bigint NOT NULL,
  resulting_path_version bigint NOT NULL,
  action_id uuid NOT NULL,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  UNIQUE(path_id),
  CONSTRAINT success_path_confirmations_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_confirmations_owner_action_fkey
    FOREIGN KEY (user_id, cycle_id, action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.success_path_evidence_receipts (
  evidence_receipt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  path_version bigint NOT NULL CHECK (path_version > 0),
  milestone_key text NOT NULL,
  action_id uuid NOT NULL,
  task_id uuid NOT NULL,
  planner_request_ledger_id uuid NOT NULL,
  planner_receipt_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  assignment_version bigint NOT NULL,
  catalog_version_id uuid NOT NULL,
  catalog_content_sha256 text NOT NULL CHECK (catalog_content_sha256 ~ '^[0-9a-f]{64}$'),
  assignment_item_id uuid NOT NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'business_metric', 'customer_response', 'deliverable', 'decision',
    'experiment_result', 'capacity_observation', 'other_business_observation'
  )),
  structured_value jsonb NOT NULL CHECK (jsonb_typeof(structured_value) = 'object'),
  member_note text,
  reference_label text,
  observed_at timestamptz NOT NULL,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  UNIQUE(user_id, cycle_id, evidence_receipt_id),
  CONSTRAINT success_path_evidence_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_evidence_owner_action_fkey
    FOREIGN KEY (user_id, cycle_id, action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_evidence_owner_task_fkey
    FOREIGN KEY (user_id, cycle_id, task_id)
    REFERENCES public.tasks(user_id, cycle_id, task_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_evidence_exact_planner_receipt_fkey
    FOREIGN KEY (user_id, cycle_id, planner_receipt_id, planner_request_ledger_id)
    REFERENCES public.cycle_plan_reconciliation_requests_v2(user_id, cycle_id, planner_receipt_id, ledger_id)
    ON DELETE RESTRICT,
  CONSTRAINT success_path_evidence_frozen_item_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id, assignment_item_id)
    REFERENCES public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.success_path_support_requests (
  support_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  checkin_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  status_receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, cycle_id, support_request_id),
  CONSTRAINT success_path_support_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CHECK ((status <> 'acknowledged' OR acknowledged_at IS NOT NULL)
    AND (status <> 'resolved' OR resolved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.success_path_checkins (
  checkin_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  path_version bigint NOT NULL,
  period_key text NOT NULL CHECK (period_key ~ '^[a-z0-9][a-z0-9:_-]{0,63}$'),
  action_id uuid NOT NULL,
  evidence_receipt_id uuid NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('continue', 'improve', 'reduce', 'support')),
  resulting_action_id uuid NOT NULL,
  resulting_path_version bigint NOT NULL,
  support_request_id uuid,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  UNIQUE(user_id, cycle_id, period_key),
  UNIQUE(user_id, cycle_id, checkin_id),
  CONSTRAINT success_path_checkins_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_checkins_owner_action_fkey
    FOREIGN KEY (user_id, cycle_id, action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_checkins_owner_result_action_fkey
    FOREIGN KEY (user_id, cycle_id, resulting_action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_checkins_owner_evidence_fkey
    FOREIGN KEY (user_id, cycle_id, evidence_receipt_id)
    REFERENCES public.success_path_evidence_receipts(user_id, cycle_id, evidence_receipt_id) ON DELETE RESTRICT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.success_path_support_requests'::regclass
       AND conname = 'success_path_support_checkin_fkey'
  ) THEN
    ALTER TABLE public.success_path_support_requests
      ADD CONSTRAINT success_path_support_checkin_fkey
      FOREIGN KEY (user_id, cycle_id, checkin_id)
      REFERENCES public.success_path_checkins(user_id, cycle_id, checkin_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.success_path_checkins'::regclass
       AND conname = 'success_path_checkins_support_fkey'
  ) THEN
    ALTER TABLE public.success_path_checkins
      ADD CONSTRAINT success_path_checkins_support_fkey
      FOREIGN KEY (user_id, cycle_id, support_request_id)
      REFERENCES public.success_path_support_requests(user_id, cycle_id, support_request_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.success_path_focus_proposals (
  proposal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  expected_path_version bigint NOT NULL,
  transition_kind text NOT NULL CHECK (transition_kind IN ('focus_change', 'milestone_advance')),
  reason_code text NOT NULL CHECK (reason_code IN ('member_requested', 'reviewed_business_evidence', 'planner_reconciled')),
  evidence_receipt_id uuid,
  proposed_planner_request_ledger_id uuid NOT NULL,
  proposed_planner_receipt_id uuid NOT NULL,
  proposed_assignment_id uuid NOT NULL,
  proposed_assignment_version bigint NOT NULL,
  proposed_catalog_version_id uuid NOT NULL,
  proposed_catalog_content_sha256 text NOT NULL CHECK (proposed_catalog_content_sha256 ~ '^[0-9a-f]{64}$'),
  proposed_assignment_item_id uuid NOT NULL,
  proposed_stage text NOT NULL,
  proposed_milestone_key text NOT NULL,
  proposed_milestone_title text NOT NULL,
  proposed_move_key text NOT NULL CHECK (proposed_move_key ~ '^[a-z0-9][a-z0-9:_-]{0,119}$'),
  proposed_action_text text NOT NULL CHECK (char_length(proposed_action_text) BETWEEN 1 AND 300),
  proposed_action_minutes integer NOT NULL CHECK (proposed_action_minutes BETWEEN 5 AND 240),
  impact_diff jsonb NOT NULL CHECK (jsonb_typeof(impact_diff) = 'object'),
  impact_diff_sha256 text NOT NULL CHECK (impact_diff_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  UNIQUE(user_id, cycle_id, proposal_id),
  CONSTRAINT success_path_proposals_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_proposals_evidence_fkey
    FOREIGN KEY (user_id, cycle_id, evidence_receipt_id)
    REFERENCES public.success_path_evidence_receipts(user_id, cycle_id, evidence_receipt_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_proposals_planner_fkey
    FOREIGN KEY (user_id, cycle_id, proposed_planner_receipt_id, proposed_planner_request_ledger_id)
    REFERENCES public.cycle_plan_reconciliation_requests_v2(user_id, cycle_id, planner_receipt_id, ledger_id)
    ON DELETE RESTRICT,
  CONSTRAINT success_path_proposals_assignment_fkey
    FOREIGN KEY (user_id, cycle_id, proposed_assignment_id)
    REFERENCES public.curriculum_cycle_assignments(user_id, cycle_id, assignment_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_proposals_item_fkey
    FOREIGN KEY (user_id, cycle_id, proposed_assignment_id, proposed_assignment_item_id)
    REFERENCES public.curriculum_cycle_assignment_items(user_id, cycle_id, assignment_id, assignment_item_id)
    ON DELETE RESTRICT,
  CHECK (transition_kind <> 'milestone_advance' OR evidence_receipt_id IS NOT NULL),
  CHECK (reason_code <> 'reviewed_business_evidence' OR evidence_receipt_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.success_path_focus_transitions (
  transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_request_id uuid NOT NULL,
  confirmation_request_sha256 text NOT NULL CHECK (confirmation_request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  from_path_version bigint NOT NULL,
  to_path_version bigint NOT NULL,
  prior_action_id uuid NOT NULL,
  action_id uuid NOT NULL,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, confirmation_request_id),
  UNIQUE(proposal_id),
  CONSTRAINT success_path_transitions_proposal_fkey
    FOREIGN KEY (user_id, cycle_id, proposal_id)
    REFERENCES public.success_path_focus_proposals(user_id, cycle_id, proposal_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_transitions_prior_action_fkey
    FOREIGN KEY (user_id, cycle_id, prior_action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_transitions_action_fkey
    FOREIGN KEY (user_id, cycle_id, action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.success_path_absence_recoveries (
  recovery_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  from_path_version bigint NOT NULL,
  to_path_version bigint NOT NULL,
  prior_action_id uuid NOT NULL,
  action_id uuid NOT NULL,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  CONSTRAINT success_path_recoveries_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_recoveries_prior_action_fkey
    FOREIGN KEY (user_id, cycle_id, prior_action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT,
  CONSTRAINT success_path_recoveries_action_fkey
    FOREIGN KEY (user_id, cycle_id, action_id)
    REFERENCES public.success_path_actions(user_id, cycle_id, action_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.success_path_support_events (
  support_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  support_request_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('requested', 'acknowledged', 'resolved')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'support_operator')),
  actor_reference text NOT NULL CHECK (char_length(actor_reference) BETWEEN 1 AND 120),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  status_receipt_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id),
  UNIQUE(support_request_id, event_type),
  CONSTRAINT success_path_support_events_request_fkey
    FOREIGN KEY (user_id, cycle_id, support_request_id)
    REFERENCES public.success_path_support_requests(user_id, cycle_id, support_request_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.success_path_timeline_events (
  timeline_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  path_version bigint NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'recommendation_created', 'stage_confirmed', 'canonical_action_attached',
    'canonical_action_replaced_preserved', 'evidence_submitted', 'evaluation_recorded',
    'support_requested', 'support_acknowledged', 'support_resolved',
    'focus_transition_confirmed', 'absence_recovery'
  )),
  event_key text NOT NULL CHECK (char_length(event_key) BETWEEN 1 AND 180),
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'system', 'support_operator')),
  actor_reference text NOT NULL CHECK (char_length(actor_reference) BETWEEN 1 AND 120),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  member_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(member_payload) = 'object'),
  private_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(private_payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, cycle_id, event_key),
  CONSTRAINT success_path_timeline_owner_path_fkey
    FOREIGN KEY (user_id, cycle_id, path_id)
    REFERENCES public.success_path_cycle_states(user_id, cycle_id, path_id) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION public.success_path_forbid_history_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Success Path history is append-only';
END;
$$;

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'success_path_actions', 'success_path_confirmations', 'success_path_evidence_receipts', 'success_path_checkins',
    'success_path_focus_proposals', 'success_path_focus_transitions',
    'success_path_absence_recoveries', 'success_path_support_events', 'success_path_timeline_events'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_table || '_append_only', v_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.success_path_forbid_history_mutation()',
      v_table || '_append_only', v_table
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.success_path_text_is_safe(p_value text, p_max integer)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT p_value IS NULL OR (
    char_length(p_value) <= p_max
    AND p_value !~* '(https?://|s3://|gs://|file://|bearer[[:space:]]|password[[:space:]]*[:=]|api[_ -]?key[[:space:]]*[:=]|secret[[:space:]]*[:=]|token[[:space:]]*[:=])'
  )
$$;

CREATE OR REPLACE FUNCTION public.success_path_evidence_value_is_safe(p_value jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT jsonb_typeof(p_value) = 'object'
    AND octet_length(p_value::text) <= 2048
    AND NOT (p_value ?| ARRAY[
      'watch_percentage', 'watch_percent', 'video_completion', 'lesson_completion',
      'password', 'api_key', 'secret', 'token', 'url', 'locator', 'path'
    ])
    AND p_value::text !~* '(https?://|s3://|gs://|file://|bearer[[:space:]]|password|api[_ -]?key|secret|access[_ -]?token)'
$$;

CREATE OR REPLACE FUNCTION public.success_path_authority_is_valid(p_path_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce((
    SELECT cap.decision_state = 'granted'
      AND r.status = 'complete'
      AND i.last_planner_receipt_id = s.planner_receipt_id
      AND a.assignment_status = 'active'
      AND a.assignment_version = s.assignment_version
      AND a.catalog_version_id = s.catalog_version_id
      AND a.catalog_content_sha256 = s.catalog_content_sha256
      AND a.planner_request_ledger_id = s.planner_request_ledger_id
      AND a.planner_receipt_id = s.planner_receipt_id
      AND public.curriculum_assignment_authority_is_valid(a.assignment_id)
    FROM public.success_path_cycle_states s
    JOIN public.cycle_plan_reconciliation_requests_v2 r
      ON r.ledger_id = s.planner_request_ledger_id AND r.user_id = s.user_id
     AND r.cycle_id = s.cycle_id AND r.planner_receipt_id = s.planner_receipt_id
    JOIN public.cycle_plan_intents_v2 i ON i.user_id = s.user_id AND i.cycle_id = s.cycle_id
    JOIN public.curriculum_cycle_assignments a
      ON a.assignment_id = s.assignment_id AND a.user_id = s.user_id AND a.cycle_id = s.cycle_id
    CROSS JOIN LATERAL public.mastermind_capability_state(
      s.user_id, 'mastermind.learning.assigned', clock_timestamp()
    ) cap
    WHERE s.path_id = p_path_id AND s.user_id = p_user_id
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.success_path_append_timeline(
  p_user_id uuid, p_cycle_id uuid, p_path_id uuid, p_path_version bigint,
  p_event_type text, p_event_key text, p_actor_kind text, p_actor_reference text,
  p_reason text, p_member_payload jsonb, p_private_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.success_path_timeline_events(
    user_id, cycle_id, path_id, path_version, event_type, event_key,
    actor_kind, actor_reference, reason, member_payload, private_payload
  ) VALUES (
    p_user_id, p_cycle_id, p_path_id, p_path_version, p_event_type, p_event_key,
    p_actor_kind, p_actor_reference, p_reason, coalesce(p_member_payload, '{}'::jsonb),
    coalesce(p_private_payload, '{}'::jsonb)
  ) ON CONFLICT (user_id, cycle_id, event_key) DO NOTHING
  RETURNING timeline_event_id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.success_path_attach_canonical_action(
  p_user_id uuid, p_cycle_id uuid, p_path_id uuid, p_path_version bigint,
  p_milestone_key text, p_assignment_id uuid, p_assignment_item_id uuid, p_move_key text,
  p_action_version bigint, p_action_text text, p_estimated_minutes integer,
  p_creation_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_logical_key text;
  v_action public.success_path_actions%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_baseline jsonb;
BEGIN
  v_logical_key := 'guided-action-v1:' || encode(digest(convert_to(
    p_cycle_id::text || ':' || p_milestone_key || ':' || p_move_key || ':' || p_action_version::text,
    'UTF8'), 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_logical_key, 0));
  SELECT * INTO v_action FROM public.success_path_actions
   WHERE user_id = p_user_id AND cycle_id = p_cycle_id AND logical_action_key = v_logical_key;
  IF FOUND THEN
    IF v_action.path_id <> p_path_id OR v_action.milestone_key <> p_milestone_key
       OR v_action.assignment_id <> p_assignment_id OR v_action.assignment_item_id <> p_assignment_item_id
       OR v_action.move_key <> p_move_key OR v_action.action_version <> p_action_version
       OR v_action.action_text <> p_action_text OR v_action.estimated_minutes <> p_estimated_minutes THEN
      RAISE EXCEPTION 'canonical action identity conflict';
    END IF;
    RETURN v_action.action_id;
  END IF;

  INSERT INTO public.tasks(
    user_id, cycle_id, task_text, task_description, status, priority,
    is_system_generated, system_source, is_completed, generation_key,
    generation_input_hash, generation_baseline, generation_active
  ) VALUES (
    p_user_id, p_cycle_id, p_action_text, NULL, 'todo', 'medium',
    true, 'guided_action_v1', false, v_logical_key,
    encode(digest(convert_to(p_action_text || ':' || p_estimated_minutes::text, 'UTF8'), 'sha256'), 'hex'),
    jsonb_build_object('task_text', p_action_text, 'task_description', NULL,
      'status', 'todo', 'priority', 'medium', 'scheduled_date', NULL,
      'planned_day', NULL, 'category', NULL, 'context_tags', '[]'::jsonb), true
  ) ON CONFLICT (user_id, cycle_id, generation_key) WHERE generation_key IS NOT NULL DO NOTHING;

  SELECT * INTO v_task FROM public.tasks
   WHERE user_id = p_user_id AND cycle_id = p_cycle_id AND generation_key = v_logical_key
   FOR UPDATE;
  IF NOT FOUND OR v_task.system_source IS DISTINCT FROM 'guided_action_v1'
     OR v_task.task_text IS DISTINCT FROM p_action_text THEN
    RAISE EXCEPTION 'canonical Planner action is unavailable';
  END IF;
  v_baseline := jsonb_build_object('task_text', p_action_text, 'estimated_minutes', p_estimated_minutes,
    'generation_key', v_logical_key);
  INSERT INTO public.success_path_actions(
    user_id, cycle_id, path_id, path_version, milestone_key, assignment_id, assignment_item_id,
    move_key, action_version, logical_action_key, task_id, action_text,
    estimated_minutes, task_baseline, creation_reason
  ) VALUES (
    p_user_id, p_cycle_id, p_path_id, p_path_version, p_milestone_key,
    p_assignment_id, p_assignment_item_id, p_move_key, p_action_version, v_logical_key,
    v_task.task_id, p_action_text, p_estimated_minutes, v_baseline, p_creation_reason
  ) RETURNING action_id INTO v_action.action_id;
  RETURN v_action.action_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_success_path_recommendation(
  p_user_id uuid, p_cycle_id uuid, p_planner_request_ledger_id uuid,
  p_planner_receipt_id uuid, p_assignment_id uuid, p_recommended_assignment_item_id uuid,
  p_request_id uuid, p_recommended_stage text, p_recommended_milestone_key text,
  p_recommended_milestone_title text, p_recommended_move_key text,
  p_recommended_action_text text, p_recommended_action_minutes integer,
  p_recommendation_reason text, p_recommendation_evidence_sha256 text,
  p_actor_reference text DEFAULT 'success_path_inference_v1'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_hash text;
  v_existing public.success_path_cycle_states%ROWTYPE;
  v_assignment public.curriculum_cycle_assignments%ROWTYPE;
  v_item public.curriculum_cycle_assignment_items%ROWTYPE;
  v_path_id uuid := gen_random_uuid();
  v_receipt_id uuid := gen_random_uuid();
  v_receipt jsonb;
BEGIN
  IF p_user_id IS NULL OR p_cycle_id IS NULL OR p_request_id IS NULL
     OR p_recommendation_evidence_sha256 !~ '^[0-9a-f]{64}$'
     OR NOT public.success_path_text_is_safe(p_recommendation_reason, 800)
     OR NOT public.success_path_text_is_safe(p_recommended_action_text, 300) THEN
    RAISE EXCEPTION 'invalid Success Path recommendation request';
  END IF;
  v_hash := public.mastermind_wave2_jsonb_sha256(jsonb_build_object(
    'cycle_id', p_cycle_id, 'planner_request_ledger_id', p_planner_request_ledger_id,
    'planner_receipt_id', p_planner_receipt_id, 'assignment_id', p_assignment_id,
    'assignment_item_id', p_recommended_assignment_item_id, 'stage', p_recommended_stage,
    'milestone_key', p_recommended_milestone_key, 'milestone_title', p_recommended_milestone_title,
    'move_key', p_recommended_move_key, 'action_text', p_recommended_action_text,
    'action_minutes', p_recommended_action_minutes, 'reason', p_recommendation_reason,
    'evidence_sha256', p_recommendation_evidence_sha256
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:' || p_user_id::text || ':' || p_cycle_id::text, 0));
  SELECT * INTO v_existing FROM public.success_path_cycle_states
   WHERE user_id = p_user_id AND cycle_id = p_cycle_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.recommendation_request_id = p_request_id
       AND v_existing.recommendation_request_sha256 = v_hash THEN
      RETURN jsonb_build_object('status','unconfirmed','replayed',true,'path_id',v_existing.path_id,
        'path_version',v_existing.state_version,'recommendation_receipt_id',v_existing.recommendation_receipt_id);
    END IF;
    RAISE EXCEPTION 'Success Path recommendation conflict';
  END IF;
  SELECT * INTO v_assignment FROM public.curriculum_cycle_assignments a
   WHERE a.assignment_id = p_assignment_id AND a.user_id = p_user_id AND a.cycle_id = p_cycle_id
     AND a.assignment_status = 'active' AND a.planner_request_ledger_id = p_planner_request_ledger_id
     AND a.planner_receipt_id = p_planner_receipt_id FOR SHARE;
  IF NOT FOUND OR NOT public.curriculum_assignment_authority_is_valid(p_assignment_id)
     OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_intents_v2 i
       WHERE i.user_id=p_user_id AND i.cycle_id=p_cycle_id AND i.last_planner_receipt_id=p_planner_receipt_id)
     OR NOT EXISTS (SELECT 1 FROM public.mastermind_capability_state(
       p_user_id,'mastermind.learning.assigned',clock_timestamp()) c WHERE c.decision_state='granted') THEN
    RAISE EXCEPTION 'Success Path authority unavailable';
  END IF;
  SELECT * INTO v_item FROM public.curriculum_cycle_assignment_items ai
   WHERE ai.assignment_item_id=p_recommended_assignment_item_id AND ai.assignment_id=p_assignment_id
     AND ai.user_id=p_user_id AND ai.cycle_id=p_cycle_id;
  IF NOT FOUND OR v_item.authority_snapshot #>> '{item,stage}' IS DISTINCT FROM p_recommended_stage
     OR v_item.authority_snapshot #>> '{item,milestone_key}' IS DISTINCT FROM p_recommended_milestone_key
     OR v_item.authority_snapshot #>> '{item,milestone_title}' IS DISTINCT FROM p_recommended_milestone_title THEN
    RAISE EXCEPTION 'Success Path recommendation does not match frozen Learning authority';
  END IF;
  INSERT INTO public.success_path_cycle_states(
    path_id,user_id,cycle_id,planner_request_ledger_id,planner_receipt_id,
    assignment_id,assignment_version,catalog_version_id,catalog_content_sha256,
    recommendation_request_id,recommendation_request_sha256,recommendation_receipt_id,
    recommendation_evidence_sha256,recommendation_reason,recommended_stage,
    recommended_milestone_key,recommended_milestone_title,recommended_assignment_item_id,
    recommended_move_key,recommended_action_text,recommended_action_minutes
  ) VALUES (
    v_path_id,p_user_id,p_cycle_id,p_planner_request_ledger_id,p_planner_receipt_id,
    p_assignment_id,v_assignment.assignment_version,v_assignment.catalog_version_id,
    v_assignment.catalog_content_sha256,p_request_id,v_hash,v_receipt_id,
    p_recommendation_evidence_sha256,p_recommendation_reason,p_recommended_stage,
    p_recommended_milestone_key,p_recommended_milestone_title,p_recommended_assignment_item_id,
    p_recommended_move_key,p_recommended_action_text,p_recommended_action_minutes
  );
  PERFORM public.success_path_append_timeline(p_user_id,p_cycle_id,v_path_id,1,
    'recommendation_created','recommendation:'||v_receipt_id::text,'system',p_actor_reference,
    'recommendation_created',jsonb_build_object('confirmation_state','unconfirmed'),
    jsonb_build_object('recommendation_evidence_sha256',p_recommendation_evidence_sha256));
  v_receipt := jsonb_build_object('status','unconfirmed','replayed',false,'path_id',v_path_id,
    'path_version',1,'recommendation_receipt_id',v_receipt_id);
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_success_path(p_cycle_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cap_state text;
  v_cap_reason text;
  v_state public.success_path_cycle_states%ROWTYPE;
  v_action public.success_path_actions%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_support_state text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT decision_state,safe_reason INTO v_cap_state,v_cap_reason
    FROM public.mastermind_capability_state(v_user_id,'mastermind.learning.assigned',clock_timestamp());
  IF v_cap_state <> 'granted' THEN
    RETURN jsonb_build_object('capability_state',v_cap_state,'reason',v_cap_reason,
      'path_state',NULL,'success_path',NULL);
  END IF;
  IF p_cycle_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.cycles_90_day
      WHERE user_id=v_user_id AND cycle_id=p_cycle_id) THEN
    RETURN jsonb_build_object('capability_state','denied','reason','inaccessible',
      'path_state',NULL,'success_path',NULL);
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states
   WHERE user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('capability_state','granted','reason','no_success_path',
      'path_state','pending','success_path',NULL);
  END IF;
  IF NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id) THEN
    RETURN jsonb_build_object('capability_state','granted','reason','success_path_authority_stale',
      'path_state','stale','success_path',NULL);
  END IF;
  IF v_state.current_action_id IS NOT NULL THEN
    SELECT * INTO v_action FROM public.success_path_actions a
     WHERE a.action_id=v_state.current_action_id AND a.user_id=v_user_id AND a.cycle_id=p_cycle_id;
    IF FOUND THEN
      SELECT * INTO v_task FROM public.tasks t
       WHERE t.task_id=v_action.task_id AND t.user_id=v_user_id AND t.cycle_id=p_cycle_id;
    END IF;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('capability_state','granted','reason','success_path_authority_stale',
        'path_state','stale','success_path',NULL);
    END IF;
  END IF;
  SELECT sr.status INTO v_support_state FROM public.success_path_support_requests sr
   WHERE sr.user_id=v_user_id AND sr.cycle_id=p_cycle_id AND sr.path_id=v_state.path_id
     AND sr.status IN ('open','acknowledged') ORDER BY sr.opened_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'capability_state','granted','reason',CASE WHEN v_state.confirmed_stage IS NULL THEN 'confirmation_required' ELSE 'success_path_available' END,
    'path_state',CASE WHEN v_state.confirmed_stage IS NULL THEN 'unconfirmed' ELSE 'saved' END,
    'success_path',jsonb_build_object(
      'path_id',v_state.path_id,'cycle_id',v_state.cycle_id,'path_version',v_state.state_version,
      'state_receipt_id',v_state.state_receipt_id,
      'confirmation_state',CASE WHEN v_state.confirmed_stage IS NULL THEN 'unconfirmed' ELSE 'confirmed' END,
      'recommended_stage',v_state.recommended_stage,'recommendation_reason',v_state.recommendation_reason,
      'recommendation_receipt_id',v_state.recommendation_receipt_id,
      'recommended_milestone',jsonb_build_object('key',v_state.recommended_milestone_key,'title',v_state.recommended_milestone_title),
      'confirmed_stage',v_state.confirmed_stage,
      'active_milestone',CASE WHEN v_state.active_milestone_key IS NULL THEN NULL ELSE jsonb_build_object(
        'key',v_state.active_milestone_key,'title',v_state.active_milestone_title) END,
      'capacity_mode',v_state.capacity_mode,'support_state',v_support_state,
      'action',CASE WHEN v_state.current_action_id IS NULL THEN NULL ELSE jsonb_build_object(
        'action_id',v_action.action_id,'task_id',v_action.task_id,'text',v_action.action_text,
        'estimated_minutes',v_action.estimated_minutes,'task_completed',coalesce(v_task.is_completed,false),
        'task_retired',v_task.deleted_at IS NOT NULL OR NOT v_task.generation_active) END,
      'versioned_at',v_state.updated_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_my_success_path(
  p_cycle_id uuid, p_request_id uuid, p_expected_path_version bigint,
  p_confirmed_stage text, p_milestone_key text, p_milestone_title text,
  p_assignment_item_id uuid, p_move_key text, p_action_text text,
  p_action_minutes integer, p_correction_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_hash text; v_state public.success_path_cycle_states%ROWTYPE;
  v_existing public.success_path_confirmations%ROWTYPE; v_item public.curriculum_cycle_assignment_items%ROWTYPE;
  v_action_id uuid; v_receipt jsonb; v_receipt_id uuid := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL OR NOT public.success_path_text_is_safe(p_action_text,300)
     OR NOT public.success_path_text_is_safe(p_correction_reason,500) THEN RAISE EXCEPTION 'invalid confirmation request'; END IF;
  v_hash := public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,
    'expected_path_version',p_expected_path_version,'stage',p_confirmed_stage,'milestone_key',p_milestone_key,
    'milestone_title',p_milestone_title,'assignment_item_id',p_assignment_item_id,'move_key',p_move_key,
    'action_text',p_action_text,'action_minutes',p_action_minutes,'correction_reason',p_correction_reason));
  SELECT * INTO v_existing FROM public.success_path_confirmations WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'Success Path confirmation request conflict';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:'||v_user_id::text||':'||p_cycle_id::text,0));
  SELECT * INTO v_existing FROM public.success_path_confirmations WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'Success Path confirmation request conflict';
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id FOR UPDATE;
  IF NOT FOUND OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id) THEN RAISE EXCEPTION 'Success Path unavailable'; END IF;
  IF v_state.confirmed_stage IS NOT NULL OR v_state.state_version<>p_expected_path_version THEN RAISE EXCEPTION 'Success Path confirmation is stale'; END IF;
  SELECT * INTO v_item FROM public.curriculum_cycle_assignment_items ai
   WHERE ai.user_id=v_user_id AND ai.cycle_id=p_cycle_id AND ai.assignment_id=v_state.assignment_id
     AND ai.assignment_item_id=p_assignment_item_id;
  IF NOT FOUND OR v_item.authority_snapshot #>> '{item,stage}' IS DISTINCT FROM p_confirmed_stage
     OR v_item.authority_snapshot #>> '{item,milestone_key}' IS DISTINCT FROM p_milestone_key
     OR v_item.authority_snapshot #>> '{item,milestone_title}' IS DISTINCT FROM p_milestone_title THEN
    RAISE EXCEPTION 'confirmed focus does not match frozen Learning authority';
  END IF;
  IF (p_confirmed_stage,p_milestone_key,p_milestone_title) IS DISTINCT FROM
     (v_state.recommended_stage,v_state.recommended_milestone_key,v_state.recommended_milestone_title)
     AND btrim(coalesce(p_correction_reason,''))='' THEN RAISE EXCEPTION 'a correction reason is required'; END IF;
  v_action_id := public.success_path_attach_canonical_action(v_user_id,p_cycle_id,v_state.path_id,
    v_state.state_version+1,p_milestone_key,v_state.assignment_id,p_assignment_item_id,p_move_key,1,p_action_text,p_action_minutes,'initial_confirmation');
  UPDATE public.success_path_cycle_states SET confirmed_stage=p_confirmed_stage,
    active_milestone_key=p_milestone_key,active_milestone_title=p_milestone_title,
    active_assignment_item_id=p_assignment_item_id,current_action_id=v_action_id,
    state_version=state_version+1,state_receipt_id=v_receipt_id,confirmed_at=clock_timestamp(),updated_at=clock_timestamp()
   WHERE path_id=v_state.path_id;
  v_receipt := jsonb_build_object('status','saved','replayed',false,'path_id',v_state.path_id,
    'path_version',v_state.state_version+1,'state_receipt_id',v_receipt_id,'action_id',v_action_id);
  INSERT INTO public.success_path_confirmations(request_id,request_sha256,user_id,cycle_id,path_id,
    expected_path_version,resulting_path_version,action_id,receipt)
  VALUES(p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,v_state.state_version,v_state.state_version+1,v_action_id,v_receipt);
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version+1,
    'stage_confirmed','confirmation:'||p_request_id::text,'member',v_user_id::text,'member_confirmation',
    jsonb_build_object('stage',p_confirmed_stage,'milestone_key',p_milestone_key,'milestone_title',p_milestone_title));
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version+1,
    'canonical_action_attached','action:'||v_action_id::text,'member',v_user_id::text,'initial_confirmation',
    jsonb_build_object('action_id',v_action_id));
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_my_success_path_evidence(
  p_cycle_id uuid, p_request_id uuid, p_expected_path_version bigint,
  p_action_id uuid, p_evidence_type text, p_structured_value jsonb,
  p_member_note text, p_reference_label text, p_observed_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_hash text; v_state public.success_path_cycle_states%ROWTYPE;
  v_action public.success_path_actions%ROWTYPE; v_existing public.success_path_evidence_receipts%ROWTYPE;
  v_id uuid := gen_random_uuid(); v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL OR p_evidence_type NOT IN ('business_metric','customer_response','deliverable','decision','experiment_result','capacity_observation','other_business_observation')
     OR NOT public.success_path_evidence_value_is_safe(p_structured_value)
     OR NOT public.success_path_text_is_safe(p_member_note,1000)
     OR NOT public.success_path_text_is_safe(p_reference_label,200)
     OR p_observed_at IS NULL OR p_observed_at > clock_timestamp()+interval '5 minutes' THEN
    RAISE EXCEPTION 'invalid business evidence request';
  END IF;
  v_hash := public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,
    'path_version',p_expected_path_version,'action_id',p_action_id,'evidence_type',p_evidence_type,
    'structured_value',p_structured_value,'member_note',p_member_note,'reference_label',p_reference_label,
    'observed_at',p_observed_at));
  SELECT * INTO v_existing FROM public.success_path_evidence_receipts WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'evidence request conflict';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:'||v_user_id::text||':'||p_cycle_id::text,0));
  SELECT * INTO v_existing FROM public.success_path_evidence_receipts WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'evidence request conflict';
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id FOR UPDATE;
  IF NOT FOUND OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id)
     OR v_state.confirmed_stage IS NULL OR v_state.state_version<>p_expected_path_version
     OR v_state.current_action_id<>p_action_id THEN RAISE EXCEPTION 'Success Path unavailable or stale'; END IF;
  SELECT * INTO v_action FROM public.success_path_actions WHERE action_id=p_action_id AND user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND OR v_action.milestone_key<>v_state.active_milestone_key
     OR v_action.assignment_item_id<>v_state.active_assignment_item_id THEN RAISE EXCEPTION 'Success Path action unavailable'; END IF;
  v_receipt := jsonb_build_object('status','saved','replayed',false,'evidence_receipt_id',v_id,
    'path_version',v_state.state_version,'action_id',v_action.action_id,'received_at',clock_timestamp());
  INSERT INTO public.success_path_evidence_receipts(
    evidence_receipt_id,request_id,request_sha256,user_id,cycle_id,path_id,path_version,milestone_key,
    action_id,task_id,planner_request_ledger_id,planner_receipt_id,assignment_id,assignment_version,catalog_version_id,catalog_content_sha256,
    assignment_item_id,evidence_type,structured_value,member_note,reference_label,observed_at,receipt
  ) VALUES(v_id,p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,v_state.state_version,
    v_state.active_milestone_key,v_action.action_id,v_action.task_id,v_state.planner_request_ledger_id,
    v_state.planner_receipt_id,v_state.assignment_id,
    v_state.assignment_version,v_state.catalog_version_id,v_state.catalog_content_sha256,
    v_state.active_assignment_item_id,p_evidence_type,p_structured_value,p_member_note,p_reference_label,p_observed_at,v_receipt);
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version,
    'evidence_submitted','evidence:'||v_id::text,'member',v_user_id::text,'business_evidence_submitted',
    jsonb_build_object('evidence_receipt_id',v_id,'evidence_type',p_evidence_type));
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_my_success_path_week(
  p_cycle_id uuid, p_request_id uuid, p_period_key text, p_expected_path_version bigint,
  p_action_id uuid, p_evidence_receipt_id uuid, p_outcome text,
  p_reduced_action_text text DEFAULT NULL, p_reduced_action_minutes integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_hash text; v_state public.success_path_cycle_states%ROWTYPE;
  v_action public.success_path_actions%ROWTYPE; v_evidence public.success_path_evidence_receipts%ROWTYPE;
  v_existing public.success_path_checkins%ROWTYPE; v_result_action uuid; v_result_version bigint;
  v_checkin_id uuid := gen_random_uuid(); v_support_id uuid; v_status_receipt uuid; v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL OR p_period_key !~ '^[a-z0-9][a-z0-9:_-]{0,63}$'
     OR p_outcome NOT IN ('continue','improve','reduce','support') THEN RAISE EXCEPTION 'invalid check-in request'; END IF;
  IF p_outcome='reduce' AND (NOT public.success_path_text_is_safe(p_reduced_action_text,300)
       OR p_reduced_action_minutes IS NULL) THEN RAISE EXCEPTION 'reduce requires a smaller action'; END IF;
  IF p_outcome<>'reduce' AND (p_reduced_action_text IS NOT NULL OR p_reduced_action_minutes IS NOT NULL) THEN
    RAISE EXCEPTION 'only reduce may replace action size'; END IF;
  v_hash := public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,
    'period_key',p_period_key,'path_version',p_expected_path_version,'action_id',p_action_id,
    'evidence_receipt_id',p_evidence_receipt_id,'outcome',p_outcome,
    'reduced_action_text',p_reduced_action_text,'reduced_action_minutes',p_reduced_action_minutes));
  SELECT * INTO v_existing FROM public.success_path_checkins WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'check-in request conflict';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path-checkin:'||v_user_id::text||':'||p_cycle_id::text||':'||p_period_key,0));
  SELECT * INTO v_existing FROM public.success_path_checkins
   WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND period_key=p_period_key;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt || jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'check-in period conflict';
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id FOR UPDATE;
  IF NOT FOUND OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id)
     OR v_state.state_version<>p_expected_path_version OR v_state.current_action_id<>p_action_id THEN
    RAISE EXCEPTION 'Success Path unavailable or stale';
  END IF;
  SELECT * INTO v_action FROM public.success_path_actions WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND action_id=p_action_id;
  SELECT * INTO v_evidence FROM public.success_path_evidence_receipts
   WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND evidence_receipt_id=p_evidence_receipt_id
     AND path_id=v_state.path_id AND path_version=v_state.state_version AND action_id=p_action_id;
  IF v_action.action_id IS NULL OR v_evidence.evidence_receipt_id IS NULL THEN RAISE EXCEPTION 'check-in evidence unavailable'; END IF;
  v_result_action:=p_action_id; v_result_version:=v_state.state_version;
  IF p_outcome='reduce' THEN
    IF p_reduced_action_minutes<5 OR p_reduced_action_minutes>=v_action.estimated_minutes THEN RAISE EXCEPTION 'reduce must lower action minutes'; END IF;
    v_result_version:=v_state.state_version+1;
    v_result_action:=public.success_path_attach_canonical_action(v_user_id,p_cycle_id,v_state.path_id,
      v_result_version,v_state.active_milestone_key,v_state.assignment_id,v_state.active_assignment_item_id,v_action.move_key,
      v_action.action_version+1,p_reduced_action_text,p_reduced_action_minutes,'reduce');
    UPDATE public.success_path_cycle_states SET current_action_id=v_result_action,capacity_mode='reduced',
      state_version=v_result_version,state_receipt_id=gen_random_uuid(),updated_at=clock_timestamp() WHERE path_id=v_state.path_id;
  ELSIF p_outcome='support' THEN
    v_support_id:=gen_random_uuid(); v_status_receipt:=gen_random_uuid();
  END IF;
  v_receipt:=jsonb_build_object('status','saved','replayed',false,'checkin_id',v_checkin_id,
    'period_key',p_period_key,'outcome',p_outcome,'path_version',v_result_version,
    'action_id',v_result_action,'support_request_id',v_support_id,
    'support_status',CASE WHEN v_support_id IS NULL THEN NULL ELSE 'open' END);
  INSERT INTO public.success_path_checkins(checkin_id,request_id,request_sha256,user_id,cycle_id,path_id,
    path_version,period_key,action_id,evidence_receipt_id,outcome,resulting_action_id,
    resulting_path_version,support_request_id,receipt)
  VALUES(v_checkin_id,p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,p_expected_path_version,
    p_period_key,p_action_id,p_evidence_receipt_id,p_outcome,v_result_action,v_result_version,v_support_id,v_receipt);
  IF v_support_id IS NOT NULL THEN
    INSERT INTO public.success_path_support_requests(support_request_id,user_id,cycle_id,path_id,checkin_id,status_receipt_id)
    VALUES(v_support_id,v_user_id,p_cycle_id,v_state.path_id,v_checkin_id,v_status_receipt);
    INSERT INTO public.success_path_support_events(request_id,request_sha256,user_id,cycle_id,path_id,
      support_request_id,event_type,actor_kind,actor_reference,reason,status_receipt_id)
    VALUES(p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,v_support_id,'requested','member',v_user_id::text,
      'weekly_checkin_support',v_status_receipt);
    PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_result_version,
      'support_requested','support:'||v_support_id::text||':requested','member',v_user_id::text,
      'weekly_checkin_support',jsonb_build_object('support_request_id',v_support_id,'status','open'));
  END IF;
  IF p_outcome='reduce' THEN
    PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_result_version,
      'canonical_action_replaced_preserved','action:'||v_result_action::text,'member',v_user_id::text,'reduce',
      jsonb_build_object('action_id',v_result_action,'prior_action_id',p_action_id,'capacity_mode','reduced'));
  END IF;
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_result_version,
    'evaluation_recorded','checkin:'||v_checkin_id::text,'member',v_user_id::text,p_outcome,
    jsonb_build_object('checkin_id',v_checkin_id,'period_key',p_period_key,'outcome',p_outcome,
      'evidence_receipt_id',p_evidence_receipt_id));
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_my_success_path_transition(
  p_cycle_id uuid, p_request_id uuid, p_expected_path_version bigint,
  p_transition_kind text, p_reason_code text, p_evidence_receipt_id uuid,
  p_proposed_assignment_id uuid, p_proposed_assignment_item_id uuid,
  p_proposed_stage text, p_proposed_milestone_key text, p_proposed_milestone_title text,
  p_proposed_move_key text, p_proposed_action_text text, p_proposed_action_minutes integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid:=auth.uid(); v_hash text; v_state public.success_path_cycle_states%ROWTYPE;
  v_existing public.success_path_focus_proposals%ROWTYPE; v_assignment public.curriculum_cycle_assignments%ROWTYPE;
  v_item public.curriculum_cycle_assignment_items%ROWTYPE; v_evidence public.success_path_evidence_receipts%ROWTYPE;
  v_proposal_id uuid:=gen_random_uuid(); v_diff jsonb; v_diff_hash text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL OR p_transition_kind NOT IN ('focus_change','milestone_advance')
     OR p_reason_code NOT IN ('member_requested','reviewed_business_evidence','planner_reconciled')
     OR NOT public.success_path_text_is_safe(p_proposed_action_text,300) THEN RAISE EXCEPTION 'invalid transition proposal'; END IF;
  IF (p_transition_kind='milestone_advance' OR p_reason_code='reviewed_business_evidence') AND p_evidence_receipt_id IS NULL THEN
    RAISE EXCEPTION 'observable business evidence is required'; END IF;
  v_hash:=public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,'path_version',p_expected_path_version,
    'transition_kind',p_transition_kind,'reason_code',p_reason_code,'evidence_receipt_id',p_evidence_receipt_id,
    'assignment_id',p_proposed_assignment_id,'assignment_item_id',p_proposed_assignment_item_id,'stage',p_proposed_stage,
    'milestone_key',p_proposed_milestone_key,'milestone_title',p_proposed_milestone_title,'move_key',p_proposed_move_key,
    'action_text',p_proposed_action_text,'action_minutes',p_proposed_action_minutes));
  SELECT * INTO v_existing FROM public.success_path_focus_proposals WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN jsonb_build_object('status','pending','replayed',true,
      'proposal_id',v_existing.proposal_id,'impact_diff',v_existing.impact_diff,'impact_diff_sha256',v_existing.impact_diff_sha256); END IF;
    RAISE EXCEPTION 'transition proposal request conflict';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:'||v_user_id::text||':'||p_cycle_id::text,0));
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id FOR UPDATE;
  IF NOT FOUND OR v_state.confirmed_stage IS NULL OR v_state.state_version<>p_expected_path_version
     OR NOT EXISTS (SELECT 1 FROM public.mastermind_capability_state(v_user_id,'mastermind.learning.assigned',clock_timestamp()) c
       WHERE c.decision_state='granted') THEN RAISE EXCEPTION 'Success Path unavailable or stale'; END IF;
  SELECT * INTO v_assignment FROM public.curriculum_cycle_assignments a
   WHERE a.user_id=v_user_id AND a.cycle_id=p_cycle_id AND a.assignment_id=p_proposed_assignment_id
     AND a.assignment_status='active' FOR SHARE;
  IF NOT FOUND OR NOT public.curriculum_assignment_authority_is_valid(v_assignment.assignment_id)
     OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_intents_v2 i WHERE i.user_id=v_user_id AND i.cycle_id=p_cycle_id
       AND i.last_planner_receipt_id=v_assignment.planner_receipt_id) THEN RAISE EXCEPTION 'proposed Success Path authority unavailable'; END IF;
  IF v_state.assignment_id<>v_assignment.assignment_id AND NOT EXISTS (
    SELECT 1 FROM public.curriculum_cycle_assignments old WHERE old.assignment_id=v_state.assignment_id
      AND old.user_id=v_user_id AND old.cycle_id=p_cycle_id AND old.assignment_status='superseded'
      AND old.superseded_by_assignment_id=v_assignment.assignment_id
      AND public.curriculum_assignment_authority_is_valid(old.assignment_id)
  ) THEN RAISE EXCEPTION 'proposed assignment does not explicitly supersede current history'; END IF;
  SELECT * INTO v_item FROM public.curriculum_cycle_assignment_items ai
   WHERE ai.user_id=v_user_id AND ai.cycle_id=p_cycle_id AND ai.assignment_id=v_assignment.assignment_id
     AND ai.assignment_item_id=p_proposed_assignment_item_id;
  IF NOT FOUND OR v_item.authority_snapshot #>> '{item,stage}' IS DISTINCT FROM p_proposed_stage
     OR v_item.authority_snapshot #>> '{item,milestone_key}' IS DISTINCT FROM p_proposed_milestone_key
     OR v_item.authority_snapshot #>> '{item,milestone_title}' IS DISTINCT FROM p_proposed_milestone_title THEN
    RAISE EXCEPTION 'proposed focus does not match frozen Learning authority'; END IF;
  IF p_evidence_receipt_id IS NOT NULL THEN
    SELECT * INTO v_evidence FROM public.success_path_evidence_receipts WHERE user_id=v_user_id AND cycle_id=p_cycle_id
      AND path_id=v_state.path_id AND evidence_receipt_id=p_evidence_receipt_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transition evidence unavailable'; END IF;
  END IF;
  v_diff:=jsonb_build_object('encoding_contract','success-path-transition-diff-jsonb-v1',
    'impact_order',jsonb_build_array('stage','milestone','assignment','action','history'),
    'current',jsonb_build_object('path_version',v_state.state_version,'stage',v_state.confirmed_stage,
      'milestone_key',v_state.active_milestone_key,'assignment_id',v_state.assignment_id,'action_id',v_state.current_action_id),
    'proposed',jsonb_build_object('stage',p_proposed_stage,'milestone_key',p_proposed_milestone_key,
      'milestone_title',p_proposed_milestone_title,'assignment_id',v_assignment.assignment_id,
      'assignment_version',v_assignment.assignment_version,'planner_receipt_id',v_assignment.planner_receipt_id,
      'move_key',p_proposed_move_key,'action_text',p_proposed_action_text,'action_minutes',p_proposed_action_minutes),
    'history',jsonb_build_object('evidence_preserved',true,'actions_preserved',true,'checkins_preserved',true));
  v_diff_hash:=public.mastermind_wave2_jsonb_sha256(v_diff);
  INSERT INTO public.success_path_focus_proposals(proposal_id,request_id,request_sha256,user_id,cycle_id,path_id,
    expected_path_version,transition_kind,reason_code,evidence_receipt_id,proposed_planner_request_ledger_id,
    proposed_planner_receipt_id,proposed_assignment_id,proposed_assignment_version,proposed_catalog_version_id,
    proposed_catalog_content_sha256,proposed_assignment_item_id,proposed_stage,proposed_milestone_key,
    proposed_milestone_title,proposed_move_key,proposed_action_text,proposed_action_minutes,impact_diff,impact_diff_sha256)
  VALUES(v_proposal_id,p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,v_state.state_version,p_transition_kind,
    p_reason_code,p_evidence_receipt_id,v_assignment.planner_request_ledger_id,v_assignment.planner_receipt_id,
    v_assignment.assignment_id,v_assignment.assignment_version,v_assignment.catalog_version_id,v_assignment.catalog_content_sha256,
    p_proposed_assignment_item_id,p_proposed_stage,p_proposed_milestone_key,p_proposed_milestone_title,p_proposed_move_key,
    p_proposed_action_text,p_proposed_action_minutes,v_diff,v_diff_hash);
  RETURN jsonb_build_object('status','pending','replayed',false,'proposal_id',v_proposal_id,
    'impact_diff',v_diff,'impact_diff_sha256',v_diff_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_my_success_path_transition(
  p_proposal_id uuid, p_confirmation_request_id uuid, p_expected_impact_diff jsonb,
  p_expected_impact_diff_sha256 text, p_confirm boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid:=auth.uid(); v_hash text; v_existing public.success_path_focus_transitions%ROWTYPE;
  v_proposal public.success_path_focus_proposals%ROWTYPE; v_state public.success_path_cycle_states%ROWTYPE;
  v_assignment public.curriculum_cycle_assignments%ROWTYPE; v_action public.success_path_actions%ROWTYPE;
  v_action_id uuid; v_receipt jsonb; v_receipt_id uuid:=gen_random_uuid(); v_next_action_version bigint;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_confirmation_request_id IS NULL OR p_confirm IS DISTINCT FROM true OR p_expected_impact_diff IS NULL
     OR jsonb_typeof(p_expected_impact_diff)<>'object' OR p_expected_impact_diff='{}'::jsonb
     OR p_expected_impact_diff_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'exact reviewed transition confirmation required'; END IF;
  v_hash:=public.mastermind_wave2_jsonb_sha256(jsonb_build_object('proposal_id',p_proposal_id,
    'impact_diff',p_expected_impact_diff,'impact_diff_sha256',p_expected_impact_diff_sha256,'confirm',p_confirm));
  SELECT * INTO v_existing FROM public.success_path_focus_transitions
   WHERE user_id=v_user_id AND confirmation_request_id=p_confirmation_request_id;
  IF FOUND THEN
    IF v_existing.confirmation_request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'transition confirmation request conflict';
  END IF;
  SELECT * INTO v_proposal FROM public.success_path_focus_proposals
   WHERE proposal_id=p_proposal_id AND user_id=v_user_id FOR SHARE;
  IF NOT FOUND OR p_expected_impact_diff IS DISTINCT FROM v_proposal.impact_diff
     OR p_expected_impact_diff_sha256 IS DISTINCT FROM v_proposal.impact_diff_sha256
     OR public.mastermind_wave2_jsonb_sha256(v_proposal.impact_diff)<>v_proposal.impact_diff_sha256 THEN
    RAISE EXCEPTION 'transition confirmation does not match exact reviewed proposal'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:'||v_user_id::text||':'||v_proposal.cycle_id::text,0));
  SELECT * INTO v_existing FROM public.success_path_focus_transitions
   WHERE user_id=v_user_id AND confirmation_request_id=p_confirmation_request_id;
  IF FOUND THEN
    IF v_existing.confirmation_request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'transition confirmation request conflict';
  END IF;
  IF EXISTS (SELECT 1 FROM public.success_path_focus_transitions WHERE proposal_id=p_proposal_id) THEN
    RAISE EXCEPTION 'transition proposal already confirmed'; END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE path_id=v_proposal.path_id AND user_id=v_user_id FOR UPDATE;
  SELECT * INTO v_assignment FROM public.curriculum_cycle_assignments a
   WHERE a.assignment_id=v_proposal.proposed_assignment_id AND a.user_id=v_user_id
     AND a.cycle_id=v_proposal.cycle_id AND a.assignment_status='active';
  IF v_state.path_id IS NULL OR v_state.state_version<>v_proposal.expected_path_version
     OR v_assignment.assignment_id IS NULL OR v_assignment.assignment_version<>v_proposal.proposed_assignment_version
     OR v_assignment.catalog_content_sha256<>v_proposal.proposed_catalog_content_sha256
     OR NOT public.curriculum_assignment_authority_is_valid(v_assignment.assignment_id)
     OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_intents_v2 i WHERE i.user_id=v_user_id
       AND i.cycle_id=v_proposal.cycle_id AND i.last_planner_receipt_id=v_assignment.planner_receipt_id)
     OR NOT EXISTS (SELECT 1 FROM public.mastermind_capability_state(v_user_id,'mastermind.learning.assigned',clock_timestamp()) c
       WHERE c.decision_state='granted') THEN RAISE EXCEPTION 'transition proposal is stale'; END IF;
  SELECT * INTO v_action FROM public.success_path_actions WHERE action_id=v_state.current_action_id;
  SELECT coalesce(max(a.action_version),0)+1 INTO v_next_action_version FROM public.success_path_actions a
   WHERE a.user_id=v_user_id AND a.cycle_id=v_state.cycle_id AND a.milestone_key=v_proposal.proposed_milestone_key
     AND a.move_key=v_proposal.proposed_move_key;
  v_action_id:=public.success_path_attach_canonical_action(v_user_id,v_state.cycle_id,v_state.path_id,
    v_state.state_version+1,v_proposal.proposed_milestone_key,v_proposal.proposed_assignment_id,v_proposal.proposed_assignment_item_id,
    v_proposal.proposed_move_key,v_next_action_version,v_proposal.proposed_action_text,
    v_proposal.proposed_action_minutes,'confirmed_transition');
  UPDATE public.success_path_cycle_states SET planner_request_ledger_id=v_proposal.proposed_planner_request_ledger_id,
    planner_receipt_id=v_proposal.proposed_planner_receipt_id,assignment_id=v_proposal.proposed_assignment_id,
    assignment_version=v_proposal.proposed_assignment_version,catalog_version_id=v_proposal.proposed_catalog_version_id,
    catalog_content_sha256=v_proposal.proposed_catalog_content_sha256,confirmed_stage=v_proposal.proposed_stage,
    active_milestone_key=v_proposal.proposed_milestone_key,active_milestone_title=v_proposal.proposed_milestone_title,
    active_assignment_item_id=v_proposal.proposed_assignment_item_id,current_action_id=v_action_id,capacity_mode='standard',
    state_version=state_version+1,state_receipt_id=v_receipt_id,updated_at=clock_timestamp() WHERE path_id=v_state.path_id;
  v_receipt:=jsonb_build_object('status','saved','replayed',false,'transition_id',gen_random_uuid(),
    'proposal_id',p_proposal_id,'path_version',v_state.state_version+1,'state_receipt_id',v_receipt_id,
    'action_id',v_action_id,'prior_action_id',v_state.current_action_id);
  INSERT INTO public.success_path_focus_transitions(transition_id,confirmation_request_id,confirmation_request_sha256,
    user_id,cycle_id,path_id,proposal_id,from_path_version,to_path_version,prior_action_id,action_id,receipt)
  VALUES((v_receipt->>'transition_id')::uuid,p_confirmation_request_id,v_hash,v_user_id,v_state.cycle_id,v_state.path_id,
    p_proposal_id,v_state.state_version,v_state.state_version+1,v_state.current_action_id,v_action_id,v_receipt);
  PERFORM public.success_path_append_timeline(v_user_id,v_state.cycle_id,v_state.path_id,v_state.state_version+1,
    'canonical_action_replaced_preserved','transition-action:'||p_proposal_id::text,'member',v_user_id::text,
    'confirmed_transition',jsonb_build_object('action_id',v_action_id,'prior_action_id',v_state.current_action_id));
  PERFORM public.success_path_append_timeline(v_user_id,v_state.cycle_id,v_state.path_id,v_state.state_version+1,
    'focus_transition_confirmed','transition:'||p_proposal_id::text,'member',v_user_id::text,v_proposal.reason_code,
    jsonb_build_object('proposal_id',p_proposal_id,'transition_kind',v_proposal.transition_kind,
      'stage',v_proposal.proposed_stage,'milestone_key',v_proposal.proposed_milestone_key));
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_my_success_path_after_absence(
  p_cycle_id uuid, p_request_id uuid, p_expected_path_version bigint,
  p_small_action_text text, p_small_action_minutes integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid:=auth.uid(); v_hash text; v_existing public.success_path_absence_recoveries%ROWTYPE;
  v_state public.success_path_cycle_states%ROWTYPE; v_action public.success_path_actions%ROWTYPE;
  v_action_id uuid; v_receipt jsonb; v_receipt_id uuid:=gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL OR NOT public.success_path_text_is_safe(p_small_action_text,300)
     OR p_small_action_minutes NOT BETWEEN 5 AND 60 THEN RAISE EXCEPTION 'invalid absence recovery request'; END IF;
  v_hash:=public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,'path_version',p_expected_path_version,
    'action_text',p_small_action_text,'action_minutes',p_small_action_minutes));
  SELECT * INTO v_existing FROM public.success_path_absence_recoveries WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'absence recovery request conflict';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('success-path:'||v_user_id::text||':'||p_cycle_id::text,0));
  SELECT * INTO v_existing FROM public.success_path_absence_recoveries WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RAISE EXCEPTION 'absence recovery request conflict';
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id FOR UPDATE;
  IF NOT FOUND OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id)
     OR v_state.state_version<>p_expected_path_version OR v_state.current_action_id IS NULL THEN
    RAISE EXCEPTION 'Success Path unavailable or stale'; END IF;
  SELECT * INTO v_action FROM public.success_path_actions WHERE action_id=v_state.current_action_id;
  v_action_id:=public.success_path_attach_canonical_action(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version+1,
    v_state.active_milestone_key,v_state.assignment_id,v_state.active_assignment_item_id,v_action.move_key,v_action.action_version+1,
    p_small_action_text,p_small_action_minutes,'absence_recovery');
  UPDATE public.success_path_cycle_states SET current_action_id=v_action_id,capacity_mode='recovery',
    state_version=state_version+1,state_receipt_id=v_receipt_id,updated_at=clock_timestamp() WHERE path_id=v_state.path_id;
  v_receipt:=jsonb_build_object('status','saved','replayed',false,'recovery_id',gen_random_uuid(),
    'path_version',v_state.state_version+1,'action_id',v_action_id,'prior_action_id',v_state.current_action_id,
    'stage_preserved',true,'milestone_preserved',true,'overdue_items_created',0);
  INSERT INTO public.success_path_absence_recoveries(recovery_id,request_id,request_sha256,user_id,cycle_id,path_id,
    from_path_version,to_path_version,prior_action_id,action_id,receipt)
  VALUES((v_receipt->>'recovery_id')::uuid,p_request_id,v_hash,v_user_id,p_cycle_id,v_state.path_id,
    v_state.state_version,v_state.state_version+1,v_state.current_action_id,v_action_id,v_receipt);
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version+1,
    'canonical_action_replaced_preserved','recovery-action:'||p_request_id::text,'member',v_user_id::text,
    'absence_recovery',jsonb_build_object('action_id',v_action_id,'prior_action_id',v_state.current_action_id));
  PERFORM public.success_path_append_timeline(v_user_id,p_cycle_id,v_state.path_id,v_state.state_version+1,
    'absence_recovery','recovery:'||p_request_id::text,'member',v_user_id::text,'return_after_absence',
    jsonb_build_object('stage_preserved',true,'milestone_preserved',true,'action_id',v_action_id));
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_success_path_support(
  p_support_request_id uuid, p_request_id uuid, p_status text,
  p_actor_reference text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_hash text; v_existing public.success_path_support_events%ROWTYPE;
  v_support public.success_path_support_requests%ROWTYPE; v_receipt_id uuid:=gen_random_uuid(); v_receipt jsonb;
BEGIN
  IF p_request_id IS NULL OR p_status NOT IN ('acknowledged','resolved')
     OR NOT public.success_path_text_is_safe(p_actor_reference,120)
     OR NOT public.success_path_text_is_safe(p_reason,500) THEN RAISE EXCEPTION 'invalid support operation'; END IF;
  v_hash:=public.mastermind_wave2_jsonb_sha256(jsonb_build_object('support_request_id',p_support_request_id,
    'status',p_status,'actor_reference',p_actor_reference,'reason',p_reason));
  SELECT * INTO v_existing FROM public.success_path_support_events WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN jsonb_build_object('status',v_existing.event_type,'replayed',true,
      'support_request_id',v_existing.support_request_id,'status_receipt_id',v_existing.status_receipt_id); END IF;
    RAISE EXCEPTION 'support operation request conflict';
  END IF;
  SELECT * INTO v_support FROM public.success_path_support_requests WHERE support_request_id=p_support_request_id FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_existing FROM public.success_path_support_events WHERE request_id=p_request_id;
    IF FOUND THEN
      IF v_existing.request_sha256=v_hash THEN RETURN jsonb_build_object('status',v_existing.event_type,'replayed',true,
        'support_request_id',v_existing.support_request_id,'status_receipt_id',v_existing.status_receipt_id); END IF;
      RAISE EXCEPTION 'support operation request conflict';
    END IF;
  END IF;
  IF v_support.support_request_id IS NULL OR NOT public.success_path_authority_is_valid(v_support.path_id,v_support.user_id) THEN RAISE EXCEPTION 'support request unavailable'; END IF;
  IF (p_status='acknowledged' AND v_support.status<>'open') OR
     (p_status='resolved' AND v_support.status NOT IN ('open','acknowledged')) THEN RAISE EXCEPTION 'support status transition conflict'; END IF;
  UPDATE public.success_path_support_requests SET status=p_status,status_receipt_id=v_receipt_id,
    acknowledged_at=CASE WHEN p_status='acknowledged' THEN clock_timestamp() ELSE acknowledged_at END,
    resolved_at=CASE WHEN p_status='resolved' THEN clock_timestamp() ELSE resolved_at END,
    updated_at=clock_timestamp() WHERE support_request_id=p_support_request_id;
  INSERT INTO public.success_path_support_events(request_id,request_sha256,user_id,cycle_id,path_id,support_request_id,
    event_type,actor_kind,actor_reference,reason,status_receipt_id)
  VALUES(p_request_id,v_hash,v_support.user_id,v_support.cycle_id,v_support.path_id,p_support_request_id,
    p_status,'support_operator',p_actor_reference,p_reason,v_receipt_id);
  PERFORM public.success_path_append_timeline(v_support.user_id,v_support.cycle_id,v_support.path_id,
    (SELECT state_version FROM public.success_path_cycle_states WHERE path_id=v_support.path_id),
    CASE WHEN p_status='acknowledged' THEN 'support_acknowledged' ELSE 'support_resolved' END,
    'support:'||p_support_request_id::text||':'||p_status,'support_operator',p_actor_reference,p_reason,
    jsonb_build_object('support_request_id',p_support_request_id,'status',p_status),
    jsonb_build_object('operator_reason',p_reason));
  v_receipt:=jsonb_build_object('status',p_status,'replayed',false,'support_request_id',p_support_request_id,
    'status_receipt_id',v_receipt_id);
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_success_path_timeline(p_cycle_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id uuid:=auth.uid(); v_state public.success_path_cycle_states%ROWTYPE; v_events jsonb;
  v_cap_state text; v_cap_reason text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT decision_state,safe_reason INTO v_cap_state,v_cap_reason
    FROM public.mastermind_capability_state(v_user_id,'mastermind.learning.assigned',clock_timestamp());
  IF v_cap_state<>'granted' THEN
    RETURN jsonb_build_object('capability_state',v_cap_state,'reason',v_cap_reason,'timeline_state',NULL,'events','[]'::jsonb);
  END IF;
  IF p_cycle_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.cycles_90_day
      WHERE user_id=v_user_id AND cycle_id=p_cycle_id) THEN
    RETURN jsonb_build_object('capability_state','denied','reason','inaccessible','timeline_state',NULL,'events','[]'::jsonb);
  END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('capability_state','granted','reason','no_success_path','timeline_state','pending','events','[]'::jsonb);
  END IF;
  IF NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id) THEN
    RETURN jsonb_build_object('capability_state','granted','reason','success_path_authority_stale','timeline_state','stale','events','[]'::jsonb);
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('event_id',e.timeline_event_id,'event_type',e.event_type,
    'path_version',e.path_version,'payload',e.member_payload,'created_at',e.created_at) ORDER BY e.created_at,e.timeline_event_id),'[]'::jsonb)
    INTO v_events FROM public.success_path_timeline_events e
   WHERE e.user_id=v_user_id AND e.cycle_id=p_cycle_id AND e.path_id=v_state.path_id;
  RETURN jsonb_build_object('capability_state','granted','reason','timeline_available','timeline_state','saved','events',v_events);
END;
$$;

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'success_path_cycle_states','success_path_actions','success_path_confirmations',
    'success_path_evidence_receipts','success_path_checkins','success_path_support_requests',
    'success_path_focus_proposals','success_path_focus_transitions','success_path_absence_recoveries',
    'success_path_support_events','success_path_timeline_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',v_table);
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.success_path_forbid_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_text_is_safe(text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_evidence_value_is_safe(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_authority_is_valid(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_append_timeline(uuid,uuid,uuid,bigint,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_attach_canonical_action(uuid,uuid,uuid,bigint,text,uuid,uuid,text,bigint,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION public.create_success_path_recommendation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_success_path_recommendation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,integer,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.update_success_path_support(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_success_path_support(uuid,uuid,text,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_my_success_path(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_my_success_path(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.confirm_my_success_path(uuid,uuid,bigint,text,text,text,uuid,text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_my_success_path(uuid,uuid,bigint,text,text,text,uuid,text,text,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_my_success_path_evidence(uuid,uuid,bigint,uuid,text,jsonb,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_my_success_path_evidence(uuid,uuid,bigint,uuid,text,jsonb,text,text,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.evaluate_my_success_path_week(uuid,uuid,text,bigint,uuid,uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.evaluate_my_success_path_week(uuid,uuid,text,bigint,uuid,uuid,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.preview_my_success_path_transition(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_my_success_path_transition(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.confirm_my_success_path_transition(uuid,uuid,jsonb,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_my_success_path_transition(uuid,uuid,jsonb,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.recover_my_success_path_after_absence(uuid,uuid,bigint,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.recover_my_success_path_after_absence(uuid,uuid,bigint,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_my_success_path_timeline(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_my_success_path_timeline(uuid) TO authenticated;

COMMENT ON TABLE public.success_path_cycle_states IS
  'Thin protected per-cycle orientation/execution snapshot. Planner and frozen Learning remain authoritative.';
COMMENT ON TABLE public.success_path_actions IS
  'Protected immutable linkage to one neutral canonical Planner task; no parallel completion state.';
COMMENT ON TABLE public.success_path_evidence_receipts IS
  'Private append-only business evidence bound to exact path, task, Planner, and frozen Learning authority.';
COMMENT ON TABLE public.success_path_timeline_events IS
  'Protected append-only privacy-safe Success Path history; members read only the RPC projection.';
