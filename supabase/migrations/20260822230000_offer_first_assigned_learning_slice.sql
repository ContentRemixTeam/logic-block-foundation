-- Wave 4: offer-first, assignment-bound Planner Learning presentation and playback.
-- Source-only private candidate. This migration contains no curriculum or member seed data.

CREATE TABLE IF NOT EXISTS public.planner_learning_playback_authorizations (
  authorization_receipt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  cycle_id uuid NOT NULL,
  assignment_item_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allowed', 'denied')),
  safe_reason text NOT NULL CHECK (safe_reason IN (
    'authorized', 'inaccessible', 'verification_unavailable', 'review_required',
    'unconfirmed', 'resource_not_ready', 'stale_authority'
  )),
  authority_sha256 text CHECK (authority_sha256 IS NULL OR authority_sha256 ~ '^[0-9a-f]{64}$'),
  evaluated_at timestamptz NOT NULL,
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id, request_id)
);

ALTER TABLE public.planner_learning_playback_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.planner_learning_playback_authorizations
  FROM PUBLIC, anon, authenticated, service_role;

-- Wave 4 narrows all access to the security-definer RPCs. The Wave 2 editorial
-- and assignment functions continue to work without direct caller table rights.
REVOKE ALL ON TABLE public.curriculum_media_assets_private
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_versions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_items
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_item_revocations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_version_revocations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_cycle_assignments
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_cycle_assignment_items
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.planner_learning_playback_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Planner Learning playback authorization history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS planner_learning_playback_authorizations_append_only
  ON public.planner_learning_playback_authorizations;
CREATE TRIGGER planner_learning_playback_authorizations_append_only
  BEFORE UPDATE OR DELETE ON public.planner_learning_playback_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.planner_learning_playback_forbid_mutation();

CREATE OR REPLACE FUNCTION public.success_path_learning_text_is_safe(
  p_value text,
  p_max integer
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT p_value IS NULL OR (
    char_length(btrim(p_value)) BETWEEN 1 AND p_max
    AND p_value !~ '[[:cntrl:]]'
    AND p_value !~* '(https?://|s3://|gs://|file://|dropbox[_ -]?path|private[_ -]?locator|provider[_ -]?asset|/users/|/private/|[a-z]:\\\\)'
    AND p_value !~* '(bearer[[:space:]]|password[[:space:]]*[:=]|api[_ -]?key[[:space:]]*[:=]|secret[[:space:]]*[:=]|token[[:space:]]*[:=])'
  )
$$;

CREATE OR REPLACE FUNCTION public.success_path_learning_empty(
  p_slice_state text,
  p_reason text
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT jsonb_build_object(
    'slice_state', CASE WHEN p_slice_state IN (
      'denied','verification_unavailable','no_plan','unconfirmed','review_required','resource_not_ready'
    ) THEN p_slice_state ELSE 'review_required' END,
    'reason', CASE WHEN p_reason IN (
      'inaccessible','verification_unavailable','no_plan','confirmation_required',
      'stale_authority','resource_not_ready','no_current_action','no_current_item'
    ) THEN p_reason ELSE 'stale_authority' END,
    'slice', NULL
  )
$$;

-- Private shared authority resolver. It is never executable by a browser or
-- service role directly; the two narrow public RPCs map its result separately.
CREATE OR REPLACE FUNCTION public.success_path_learning_authority(
  p_user_id uuid,
  p_cycle_id uuid,
  p_assignment_item_id uuid DEFAULT NULL,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cap_state text;
  v_cap_reason text;
  v_cycle public.cycles_90_day%ROWTYPE;
  v_state public.success_path_cycle_states%ROWTYPE;
  v_action public.success_path_actions%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_assignment public.curriculum_cycle_assignments%ROWTYPE;
  v_item public.curriculum_cycle_assignment_items%ROWTYPE;
  v_catalog_item public.curriculum_catalog_items%ROWTYPE;
  v_catalog public.curriculum_catalog_versions%ROWTYPE;
  v_media public.curriculum_media_assets_private%ROWTYPE;
  v_support_state text;
  v_latest_outcome text;
  v_receipt_valid boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_cycle_id IS NULL OR p_as_of IS NULL THEN
    RETURN jsonb_build_object('decision','denied','reason','inaccessible');
  END IF;

  SELECT decision_state, safe_reason INTO v_cap_state, v_cap_reason
    FROM public.mastermind_capability_state(
      p_user_id, 'mastermind.learning.assigned', p_as_of
    );
  IF v_cap_state = 'verification_unavailable' THEN
    RETURN jsonb_build_object('decision','denied','reason','verification_unavailable');
  ELSIF v_cap_state = 'review_required' THEN
    RETURN jsonb_build_object('decision','denied','reason','review_required');
  ELSIF v_cap_state <> 'granted' THEN
    RETURN jsonb_build_object('decision','denied','reason','inaccessible');
  END IF;

  SELECT * INTO v_cycle FROM public.cycles_90_day
   WHERE user_id = p_user_id AND cycle_id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision','denied','reason','inaccessible');
  END IF;

  SELECT * INTO v_state FROM public.success_path_cycle_states
   WHERE user_id = p_user_id AND cycle_id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision','denied','reason','no_plan');
  END IF;
  IF btrim(coalesce(v_cycle.goal,''))='' THEN
    RETURN jsonb_build_object('decision','denied','reason','no_plan');
  END IF;
  IF v_state.confirmed_stage IS NULL OR v_state.active_assignment_item_id IS NULL THEN
    RETURN jsonb_build_object('decision','denied','reason','unconfirmed');
  END IF;
  IF v_state.confirmed_stage <> 'offer' THEN
    RETURN jsonb_build_object('decision','denied','reason','review_required');
  END IF;
  IF p_assignment_item_id IS NOT NULL
     AND p_assignment_item_id <> v_state.active_assignment_item_id THEN
    RETURN jsonb_build_object('decision','denied','reason','inaccessible');
  END IF;

  IF NOT public.success_path_authority_is_valid(v_state.path_id, p_user_id) THEN
    RETURN jsonb_build_object('decision','denied','reason','stale_authority');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT c.resulting_path_version AS version, c.action_id,
             c.receipt->>'state_receipt_id' AS receipt_id
        FROM public.success_path_confirmations c WHERE c.path_id=v_state.path_id
      UNION ALL
      SELECT c.resulting_path_version, c.resulting_action_id, c.receipt->>'state_receipt_id'
        FROM public.success_path_checkins c
       WHERE c.path_id=v_state.path_id AND c.outcome='reduce'
      UNION ALL
      SELECT t.to_path_version, t.action_id, t.receipt->>'state_receipt_id'
        FROM public.success_path_focus_transitions t WHERE t.path_id=v_state.path_id
      UNION ALL
      SELECT r.to_path_version, r.action_id, r.receipt->>'state_receipt_id'
        FROM public.success_path_absence_recoveries r WHERE r.path_id=v_state.path_id
    ) receipts
    WHERE receipts.version=v_state.state_version
      AND receipts.action_id=v_state.current_action_id
      AND receipts.receipt_id=v_state.state_receipt_id::text
  ) INTO v_receipt_valid;
  IF NOT v_receipt_valid THEN
    RETURN jsonb_build_object('decision','denied','reason','stale_authority');
  END IF;

  SELECT * INTO v_assignment FROM public.curriculum_cycle_assignments
   WHERE assignment_id=v_state.assignment_id AND user_id=p_user_id AND cycle_id=p_cycle_id
     AND context_key='success_path' AND assignment_status='active';
  SELECT * INTO v_item FROM public.curriculum_cycle_assignment_items
   WHERE assignment_item_id=v_state.active_assignment_item_id
     AND assignment_id=v_state.assignment_id AND user_id=p_user_id AND cycle_id=p_cycle_id;
  IF v_assignment.assignment_id IS NULL OR v_item.assignment_item_id IS NULL THEN
    RETURN jsonb_build_object('decision','denied','reason','no_current_item');
  END IF;
  IF v_assignment.planner_request_ledger_id<>v_state.planner_request_ledger_id
     OR v_assignment.planner_receipt_id<>v_state.planner_receipt_id
     OR v_assignment.assignment_version<>v_state.assignment_version
     OR v_assignment.catalog_version_id<>v_state.catalog_version_id
     OR v_assignment.catalog_content_sha256<>v_state.catalog_content_sha256
     OR v_item.catalog_version_id<>v_state.catalog_version_id
     OR v_item.required_capability<>'mastermind.learning.assigned' THEN
    RETURN jsonb_build_object('decision','denied','reason','stale_authority');
  END IF;

  SELECT * INTO v_catalog FROM public.curriculum_catalog_versions
   WHERE catalog_version_id=v_assignment.catalog_version_id;
  SELECT * INTO v_catalog_item FROM public.curriculum_catalog_items
   WHERE catalog_version_id=v_item.catalog_version_id AND catalog_item_id=v_item.catalog_item_id;
  IF v_catalog.catalog_version_id IS NULL OR v_catalog_item.catalog_item_id IS NULL
     OR v_catalog.lifecycle_state NOT IN ('active','superseded')
     OR v_catalog.content_sha256 IS DISTINCT FROM v_assignment.catalog_content_sha256
     OR v_catalog.content_sha256 IS DISTINCT FROM public.curriculum_catalog_content_sha256(v_catalog.catalog_version_id)
     OR EXISTS (SELECT 1 FROM public.curriculum_catalog_version_revocations r
                 WHERE r.catalog_version_id=v_catalog.catalog_version_id)
     OR EXISTS (SELECT 1 FROM public.curriculum_catalog_item_revocations r
                 WHERE r.catalog_item_id=v_catalog_item.catalog_item_id) THEN
    RETURN jsonb_build_object('decision','denied','reason','resource_not_ready');
  END IF;
  IF v_catalog_item.item_state<>'ready'
     OR v_catalog_item.required_capability<>'mastermind.learning.assigned'
     OR v_catalog_item.stage<>v_state.confirmed_stage
     OR v_catalog_item.milestone_key<>v_state.active_milestone_key
     OR v_catalog_item.milestone_title<>v_state.active_milestone_title
     OR v_catalog_item.qa_receipt_sha256 IS NULL
     OR v_catalog_item.qa_approved_at IS NULL
     OR v_catalog_item.qa_approved_by IS NULL
     OR 'approved' <> ANY(ARRAY[
       v_catalog_item.transcript_qa_state,v_catalog_item.provenance_qa_state,
       v_catalog_item.rights_qa_state,v_catalog_item.privacy_qa_state,
       v_catalog_item.edit_qa_state,v_catalog_item.caption_qa_state,
       v_catalog_item.playback_qa_state,v_catalog_item.action_qa_state,
       v_catalog_item.evidence_qa_state
     ])
     OR v_item.canonical_resource_id IS DISTINCT FROM v_catalog_item.canonical_resource_id
     OR v_item.transcript_version_id IS DISTINCT FROM v_catalog_item.transcript_version_id
     OR v_item.playback_attempt_id IS DISTINCT FROM v_catalog_item.playback_attempt_id
     OR v_item.publication_sha256 IS DISTINCT FROM v_catalog_item.publication_sha256
     OR v_item.authority_snapshot IS DISTINCT FROM
        public.curriculum_catalog_item_publication_authority(v_catalog_item.catalog_item_id)
     OR v_item.authority_sha256 IS DISTINCT FROM
        public.mastermind_wave2_jsonb_sha256(v_item.authority_snapshot) THEN
    RETURN jsonb_build_object('decision','denied','reason','resource_not_ready');
  END IF;

  SELECT * INTO v_media FROM public.curriculum_media_assets_private
   WHERE media_asset_id=v_catalog_item.media_asset_id;
  IF v_media.media_asset_id IS NULL
     OR v_catalog_item.canonical_resource_id IS DISTINCT FROM v_media.canonical_resource_id
     OR v_catalog_item.transcript_version_id IS DISTINCT FROM v_media.transcript_version_id
     OR v_catalog_item.playback_attempt_id IS DISTINCT FROM v_media.playback_attempt_id
     OR v_item.authority_snapshot #>> '{media,source_content_sha256}' IS DISTINCT FROM v_media.source_content_sha256
     OR v_item.authority_snapshot #>> '{media,provider}' IS DISTINCT FROM v_media.provider
     OR v_item.authority_snapshot #>> '{media,private_locator}' IS DISTINCT FROM v_media.private_locator THEN
    RETURN jsonb_build_object('decision','denied','reason','resource_not_ready');
  END IF;

  SELECT * INTO v_action FROM public.success_path_actions
   WHERE action_id=v_state.current_action_id AND user_id=p_user_id AND cycle_id=p_cycle_id
     AND path_id=v_state.path_id AND path_version=v_state.state_version
     AND assignment_id=v_state.assignment_id
     AND assignment_item_id=v_state.active_assignment_item_id
     AND milestone_key=v_state.active_milestone_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision','denied','reason','no_current_action');
  END IF;
  SELECT * INTO v_task FROM public.tasks
   WHERE task_id=v_action.task_id AND user_id=p_user_id AND cycle_id=p_cycle_id
     AND system_source='guided_action_v1' AND generation_active AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision','denied','reason','no_current_action');
  END IF;

  IF NOT public.success_path_learning_text_is_safe(v_cycle.goal,300)
     OR NOT public.success_path_learning_text_is_safe(v_state.active_milestone_title,180)
     OR NOT public.success_path_learning_text_is_safe(v_action.action_text,300)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.title,160)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.intended_output,400)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.action_prompt,500)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.evidence_prompt,500)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.teacher_display_name,120)
     OR NOT public.success_path_learning_text_is_safe(v_catalog_item.attribution_text,200) THEN
    RETURN jsonb_build_object('decision','denied','reason','resource_not_ready');
  END IF;

  SELECT sr.status INTO v_support_state FROM public.success_path_support_requests sr
   WHERE sr.user_id=p_user_id AND sr.cycle_id=p_cycle_id AND sr.path_id=v_state.path_id
     AND sr.status IN ('open','acknowledged') ORDER BY sr.opened_at DESC LIMIT 1;
  SELECT c.outcome INTO v_latest_outcome FROM public.success_path_checkins c
   WHERE c.user_id=p_user_id AND c.cycle_id=p_cycle_id AND c.path_id=v_state.path_id
   ORDER BY c.created_at DESC, c.checkin_id DESC LIMIT 1;

  RETURN jsonb_build_object(
    'decision','allowed','reason','authorized',
    'cycle_id',v_state.cycle_id,'path_id',v_state.path_id,
    'path_version',v_state.state_version,'state_receipt_id',v_state.state_receipt_id,
    'result_text',left(btrim(v_cycle.goal),300),
    'confirmed_stage',v_state.confirmed_stage,
    'milestone_key',v_state.active_milestone_key,
    'milestone_title',left(btrim(v_state.active_milestone_title),180),
    'action_id',v_action.action_id,'task_id',v_action.task_id,
    'action_text',left(btrim(v_action.action_text),300),
    'estimated_minutes',v_action.estimated_minutes,
    'completion_state',CASE WHEN coalesce(v_task.is_completed,false) THEN 'completed' ELSE 'open' END,
    'assignment_item_id',v_item.assignment_item_id,
    'title',left(btrim(v_catalog_item.title),160),
    'intended_output',left(btrim(v_catalog_item.intended_output),400),
    'action_prompt',left(btrim(v_catalog_item.action_prompt),500),
    'evidence_prompt',left(btrim(v_catalog_item.evidence_prompt),500),
    'teacher',left(btrim(v_catalog_item.teacher_display_name),120),
    'attribution',left(btrim(v_catalog_item.attribution_text),200),
    'support_state',v_support_state,'latest_evaluation_outcome',v_latest_outcome,
    'provider',v_media.provider,'private_locator',v_media.private_locator,
    'authority_sha256',public.mastermind_wave2_jsonb_sha256(jsonb_build_object(
      'user_id',p_user_id,'cycle_id',p_cycle_id,'path_id',v_state.path_id,
      'path_version',v_state.state_version,'state_receipt_id',v_state.state_receipt_id,
      'planner_request_ledger_id',v_state.planner_request_ledger_id,
      'planner_receipt_id',v_state.planner_receipt_id,'assignment_id',v_state.assignment_id,
      'assignment_version',v_state.assignment_version,'assignment_item_id',v_item.assignment_item_id,
      'catalog_version_id',v_catalog.catalog_version_id,'catalog_content_sha256',v_catalog.content_sha256,
      'catalog_item_id',v_catalog_item.catalog_item_id,'authority_sha256',v_item.authority_sha256,
      'canonical_resource_id',v_item.canonical_resource_id,'media_asset_id',v_media.media_asset_id,
      'source_content_sha256',v_media.source_content_sha256,
      'transcript_version_id',v_item.transcript_version_id,
      'playback_attempt_id',v_item.playback_attempt_id,'publication_sha256',v_item.publication_sha256,
      'action_id',v_action.action_id,'task_id',v_action.task_id
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_success_path_learning_slice(
  p_cycle_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_authority jsonb;
  v_reason text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE='28000';
  END IF;
  v_authority := public.success_path_learning_authority(
    v_user_id, p_cycle_id, NULL, clock_timestamp()
  );
  IF v_authority->>'decision' <> 'allowed' THEN
    v_reason := v_authority->>'reason';
    RETURN public.success_path_learning_empty(
      CASE v_reason
        WHEN 'verification_unavailable' THEN 'verification_unavailable'
        WHEN 'no_plan' THEN 'no_plan'
        WHEN 'unconfirmed' THEN 'unconfirmed'
        WHEN 'resource_not_ready' THEN 'resource_not_ready'
        WHEN 'inaccessible' THEN 'denied'
        ELSE 'review_required'
      END,
      CASE v_reason
        WHEN 'unconfirmed' THEN 'confirmation_required'
        WHEN 'review_required' THEN 'stale_authority'
        ELSE v_reason
      END
    );
  END IF;

  RETURN jsonb_build_object(
    'slice_state','ready','reason','assigned_learning_available',
    'slice',jsonb_build_object(
      'cycle_id',v_authority->'cycle_id','path_id',v_authority->'path_id',
      'path_version',v_authority->'path_version','state_receipt_id',v_authority->'state_receipt_id',
      'result_text',v_authority->'result_text','confirmed_stage',v_authority->'confirmed_stage',
      'milestone',jsonb_build_object('key',v_authority->'milestone_key','title',v_authority->'milestone_title'),
      'action',jsonb_build_object(
        'action_id',v_authority->'action_id','task_id',v_authority->'task_id',
        'text',v_authority->'action_text','estimated_minutes',v_authority->'estimated_minutes',
        'completion_state',v_authority->'completion_state'
      ),
      'learning',jsonb_build_object(
        'assignment_item_id',v_authority->'assignment_item_id','title',v_authority->'title',
        'intended_output',v_authority->'intended_output','action_prompt',v_authority->'action_prompt',
        'evidence_prompt',v_authority->'evidence_prompt','teacher',v_authority->'teacher',
        'attribution',v_authority->'attribution'
      ),
      'support_state',v_authority->'support_state',
      'latest_evaluation_outcome',v_authority->'latest_evaluation_outcome'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_assigned_learning_playback(
  p_user_id uuid,
  p_cycle_id uuid,
  p_assignment_item_id uuid,
  p_request_id uuid,
  p_as_of timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hash text;
  v_authority jsonb;
  v_existing public.planner_learning_playback_authorizations%ROWTYPE;
  v_decision text;
  v_reason text;
  v_receipt_id uuid := gen_random_uuid();
  v_receipt jsonb;
  v_existing_found boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_cycle_id IS NULL OR p_assignment_item_id IS NULL
     OR p_request_id IS NULL OR p_as_of IS NULL THEN
    RETURN jsonb_build_object('decision','denied','reason','inaccessible');
  END IF;
  v_hash := public.mastermind_wave2_jsonb_sha256(jsonb_build_object(
    'user_id',p_user_id,'cycle_id',p_cycle_id,
    'assignment_item_id',p_assignment_item_id
  ));

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'planner-learning-playback:'||p_user_id::text||':'||p_request_id::text,0
  ));
  SELECT * INTO v_existing FROM public.planner_learning_playback_authorizations
   WHERE user_id=p_user_id AND request_id=p_request_id;
  v_existing_found := FOUND;
  IF v_existing_found AND v_existing.request_sha256<>v_hash THEN
    RAISE EXCEPTION 'playback authorization request conflict';
  END IF;

  -- Always revalidate before returning an idempotent receipt. A prior allowed
  -- decision cannot outlive an entitlement, Planner receipt, reroute, or QA drift.
  v_authority := public.success_path_learning_authority(
    p_user_id,p_cycle_id,p_assignment_item_id,p_as_of
  );
  v_decision := CASE WHEN v_authority->>'decision'='allowed' THEN 'allowed' ELSE 'denied' END;
  v_reason := CASE v_authority->>'reason'
    WHEN 'authorized' THEN 'authorized'
    WHEN 'verification_unavailable' THEN 'verification_unavailable'
    WHEN 'review_required' THEN 'review_required'
    WHEN 'unconfirmed' THEN 'unconfirmed'
    WHEN 'resource_not_ready' THEN 'resource_not_ready'
    WHEN 'stale_authority' THEN 'stale_authority'
    ELSE 'inaccessible' END;

  IF NOT v_existing_found THEN
    v_receipt := jsonb_build_object(
      'authorization_receipt_id',v_receipt_id,'request_id',p_request_id,
      'decision',v_decision,'reason',v_reason,'evaluated_at',p_as_of
    );
    INSERT INTO public.planner_learning_playback_authorizations(
      authorization_receipt_id,request_id,request_sha256,user_id,cycle_id,
      assignment_item_id,decision,safe_reason,authority_sha256,evaluated_at,receipt
    ) VALUES(
      v_receipt_id,p_request_id,v_hash,p_user_id,p_cycle_id,p_assignment_item_id,
      v_decision,v_reason,CASE WHEN v_decision='allowed' THEN v_authority->>'authority_sha256' ELSE NULL END,
      p_as_of,v_receipt
    );
  ELSE
    v_receipt_id := v_existing.authorization_receipt_id;
  END IF;

  IF v_decision<>'allowed' THEN
    RETURN jsonb_build_object('decision','denied','reason',v_reason);
  END IF;
  RETURN jsonb_build_object(
    'decision','allowed','reason','authorized','replayed',v_existing_found,
    'authorization_receipt_id',v_receipt_id,
    'assignment_item_id',v_authority->'assignment_item_id',
    'title',v_authority->'title','provider',v_authority->'provider',
    'private_locator',v_authority->'private_locator'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.planner_learning_playback_forbid_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.success_path_learning_text_is_safe(text,integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.success_path_learning_empty(text,text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.success_path_learning_authority(uuid,uuid,uuid,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_my_success_path_learning_slice(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_my_success_path_learning_slice(uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)
  TO service_role;

COMMENT ON TABLE public.planner_learning_playback_authorizations IS
  'Append-only assignment-bound Planner Learning playback decisions. Never stores locators, URLs, email, credentials, or Vault authority.';
COMMENT ON FUNCTION public.resolve_my_success_path_learning_slice(uuid) IS
  'Closed member-safe projection for one confirmed current Success Path lesson and canonical Planner action.';
COMMENT ON FUNCTION public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz) IS
  'Service-only, request-idempotent authorization for one current assigned Planner Learning media item.';
