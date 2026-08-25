-- Wave 5 private source candidate. Forward-only, rerunnable, and unapplied.

CREATE TABLE IF NOT EXISTS public.assigned_learning_engagement_events (
  engagement_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  assignment_item_id uuid NOT NULL,
  action_id uuid,
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  event_type text NOT NULL CHECK (event_type IN (
    'assignment_opened','playback_started','playback_progress','playback_completed',
    'action_opened','action_selected','evidence_submitted','checkin_completed',
    'support_requested','returned_after_absence'
  )),
  progress_basis_points integer CHECK (progress_basis_points BETWEEN 0 AND 10000),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  receipt jsonb NOT NULL,
  UNIQUE(user_id, request_id),
  CHECK ((event_type='playback_progress' AND progress_basis_points IS NOT NULL)
      OR (event_type<>'playback_progress' AND progress_basis_points IS NULL))
);

CREATE INDEX IF NOT EXISTS assigned_learning_engagement_current_idx
  ON public.assigned_learning_engagement_events(user_id,cycle_id,assignment_item_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.assigned_learning_engagement_requests (
  engagement_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  assignment_item_id uuid NOT NULL,
  request_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  reported_progress_basis_points integer CHECK (reported_progress_basis_points BETWEEN 0 AND 10000),
  accepted_progress_basis_points integer CHECK (accepted_progress_basis_points BETWEEN 0 AND 10000),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id,request_id)
);

CREATE TABLE IF NOT EXISTS public.assigned_learning_engagement_classifications (
  classification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  path_id uuid NOT NULL,
  assignment_item_id uuid NOT NULL,
  classification text NOT NULL CHECK (classification IN ('assigned_not_opened','watched_no_action','stalled','returned')),
  evidence_through timestamptz NOT NULL,
  classified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  classifier_reference text NOT NULL CHECK (length(classifier_reference) BETWEEN 1 AND 120),
  UNIQUE(user_id,cycle_id,assignment_item_id,classification,evidence_through)
);

CREATE OR REPLACE FUNCTION public.assigned_learning_engagement_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN RAISE EXCEPTION 'assigned learning engagement is append-only'; END;
$$;
DROP TRIGGER IF EXISTS assigned_learning_engagement_events_append_only ON public.assigned_learning_engagement_events;
CREATE TRIGGER assigned_learning_engagement_events_append_only BEFORE UPDATE OR DELETE ON public.assigned_learning_engagement_events
FOR EACH ROW EXECUTE FUNCTION public.assigned_learning_engagement_forbid_mutation();
DROP TRIGGER IF EXISTS assigned_learning_engagement_classifications_append_only ON public.assigned_learning_engagement_classifications;
CREATE TRIGGER assigned_learning_engagement_classifications_append_only BEFORE UPDATE OR DELETE ON public.assigned_learning_engagement_classifications
FOR EACH ROW EXECUTE FUNCTION public.assigned_learning_engagement_forbid_mutation();
DROP TRIGGER IF EXISTS assigned_learning_engagement_requests_append_only ON public.assigned_learning_engagement_requests;
CREATE TRIGGER assigned_learning_engagement_requests_append_only BEFORE UPDATE OR DELETE ON public.assigned_learning_engagement_requests
FOR EACH ROW EXECUTE FUNCTION public.assigned_learning_engagement_forbid_mutation();

CREATE OR REPLACE FUNCTION public.resolve_my_success_path_edit_context(p_cycle_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_user_id uuid:=auth.uid(); v_state public.success_path_cycle_states%ROWTYPE;
  v_action public.success_path_actions%ROWTYPE; v_item public.curriculum_cycle_assignment_items%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('state','denied','reason','unavailable','context',NULL); END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND OR v_state.confirmed_stage IS NULL OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id) THEN
    RETURN jsonb_build_object('state','denied','reason','unavailable','context',NULL); END IF;
  SELECT * INTO v_action FROM public.success_path_actions WHERE user_id=v_user_id AND action_id=v_state.current_action_id AND retired_at IS NULL;
  SELECT * INTO v_item FROM public.curriculum_cycle_assignment_items WHERE user_id=v_user_id AND assignment_id=v_state.assignment_id AND assignment_item_id=v_state.active_assignment_item_id;
  IF v_action.action_id IS NULL OR v_item.assignment_item_id IS NULL OR NOT public.curriculum_assignment_authority_is_valid(v_state.assignment_id) THEN
    RETURN jsonb_build_object('state','denied','reason','unavailable','context',NULL); END IF;
  RETURN jsonb_build_object('state','ready','reason','current_reviewed_authority','context',jsonb_build_object(
    'cycle_id',v_state.cycle_id,'path_version',v_state.state_version,'assignment_id',v_state.assignment_id,
    'assignment_item_id',v_state.active_assignment_item_id,'stage',v_state.confirmed_stage,
    'milestone_key',v_state.active_milestone_key,'milestone_title',v_state.active_milestone_title,
    'move_key',v_action.move_key,'action_id',v_action.action_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_my_assigned_learning_engagement(
  p_cycle_id uuid,p_assignment_item_id uuid,p_action_id uuid,p_request_id uuid,
  p_event_type text,p_progress_basis_points integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_user_id uuid:=auth.uid(); v_state public.success_path_cycle_states%ROWTYPE;
  v_existing public.assigned_learning_engagement_requests%ROWTYPE; v_hash text; v_id uuid:=gen_random_uuid();
  v_max integer; v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('status','denied','reason','unavailable'); END IF;
  IF p_request_id IS NULL OR p_event_type NOT IN ('assignment_opened','playback_started','playback_progress','playback_completed','action_opened','action_selected','evidence_submitted','checkin_completed','support_requested','returned_after_absence')
    OR (p_event_type='playback_progress') IS DISTINCT FROM (p_progress_basis_points IS NOT NULL)
    OR p_progress_basis_points IS NOT NULL AND p_progress_basis_points NOT BETWEEN 0 AND 10000 THEN
    RETURN jsonb_build_object('status','denied','reason','malformed'); END IF;
  v_hash:=public.mastermind_wave2_jsonb_sha256(jsonb_build_object('cycle_id',p_cycle_id,'assignment_item_id',p_assignment_item_id,'action_id',p_action_id,'event_type',p_event_type,'progress_basis_points',p_progress_basis_points));
  SELECT * INTO v_existing FROM public.assigned_learning_engagement_requests WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RETURN jsonb_build_object('status','conflict','reason','request_conflict');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('learning-engagement:'||v_user_id::text||':'||p_request_id::text,0));
  SELECT * INTO v_existing FROM public.assigned_learning_engagement_requests WHERE user_id=v_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_sha256=v_hash THEN RETURN v_existing.receipt||jsonb_build_object('replayed',true); END IF;
    RETURN jsonb_build_object('status','conflict','reason','request_conflict'); END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND OR v_state.active_assignment_item_id<>p_assignment_item_id OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id)
    OR NOT public.curriculum_assignment_authority_is_valid(v_state.assignment_id)
    OR (p_action_id IS NOT NULL AND p_action_id<>v_state.current_action_id)
    OR (p_event_type IN ('action_opened','action_selected','evidence_submitted','checkin_completed','support_requested','returned_after_absence') AND p_action_id IS NULL) THEN
    RETURN jsonb_build_object('status','denied','reason','unavailable'); END IF;
  IF p_event_type='playback_progress' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('learning-progress:'||v_user_id::text||':'||p_cycle_id::text||':'||p_assignment_item_id::text,0));
    SELECT coalesce(max(progress_basis_points),0) INTO v_max FROM public.assigned_learning_engagement_events
      WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND assignment_item_id=p_assignment_item_id AND event_type='playback_progress';
    IF p_progress_basis_points<=v_max THEN
      v_receipt:=jsonb_build_object('status','accepted','reason','heartbeat_deduplicated','event_id',NULL,'replayed',false,
        'reported_progress_basis_points',p_progress_basis_points,'progress_basis_points',v_max);
      INSERT INTO public.assigned_learning_engagement_requests(user_id,cycle_id,assignment_item_id,request_id,request_sha256,
        reported_progress_basis_points,accepted_progress_basis_points,receipt)
      VALUES(v_user_id,p_cycle_id,p_assignment_item_id,p_request_id,v_hash,p_progress_basis_points,v_max,v_receipt);
      RETURN v_receipt;
    END IF;
  END IF;
  v_receipt:=jsonb_build_object('status','accepted','reason','recorded','event_id',v_id,'replayed',false,
    'reported_progress_basis_points',p_progress_basis_points,'progress_basis_points',p_progress_basis_points);
  INSERT INTO public.assigned_learning_engagement_events(engagement_event_id,user_id,cycle_id,path_id,assignment_id,assignment_item_id,action_id,request_id,request_sha256,event_type,progress_basis_points,receipt)
  VALUES(v_id,v_user_id,p_cycle_id,v_state.path_id,v_state.assignment_id,p_assignment_item_id,p_action_id,p_request_id,v_hash,p_event_type,p_progress_basis_points,v_receipt);
  INSERT INTO public.assigned_learning_engagement_requests(user_id,cycle_id,assignment_item_id,request_id,request_sha256,
    reported_progress_basis_points,accepted_progress_basis_points,receipt)
  VALUES(v_user_id,p_cycle_id,p_assignment_item_id,p_request_id,v_hash,p_progress_basis_points,p_progress_basis_points,v_receipt);
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_assigned_learning_engagement(
  p_opened boolean,p_watched boolean,p_actioned boolean,p_returned boolean,p_last_activity_at timestamptz,p_as_of timestamptz
) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
  SELECT CASE WHEN coalesce(p_returned,false) THEN 'returned'
    WHEN coalesce(p_watched,false) AND NOT coalesce(p_actioned,false) AND p_last_activity_at<p_as_of-interval '7 days' THEN 'stalled'
    WHEN coalesce(p_watched,false) AND NOT coalesce(p_actioned,false) THEN 'watched_no_action'
    WHEN NOT coalesce(p_opened,false) THEN 'assigned_not_opened'
    ELSE 'in_progress' END
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_assigned_learning_status(p_cycle_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_user_id uuid:=auth.uid(); v_state public.success_path_cycle_states%ROWTYPE; v_last timestamptz; v_open boolean; v_watch boolean; v_action boolean; v_return boolean; v_label text;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('state','denied','reason','unavailable','status',NULL); END IF;
  SELECT * INTO v_state FROM public.success_path_cycle_states WHERE user_id=v_user_id AND cycle_id=p_cycle_id;
  IF NOT FOUND OR NOT public.success_path_authority_is_valid(v_state.path_id,v_user_id) THEN RETURN jsonb_build_object('state','denied','reason','unavailable','status',NULL); END IF;
  SELECT max(occurred_at),bool_or(event_type='assignment_opened'),bool_or(event_type IN ('playback_started','playback_progress','playback_completed')),bool_or(event_type IN ('action_opened','action_selected')),bool_or(event_type='returned_after_absence')
    INTO v_last,v_open,v_watch,v_action,v_return FROM public.assigned_learning_engagement_events WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND assignment_item_id=v_state.active_assignment_item_id;
  v_label:=public.classify_assigned_learning_engagement(v_open,v_watch,v_action,v_return,v_last,clock_timestamp());
  RETURN jsonb_build_object('state','ready','reason','current_assignment_activity','status',jsonb_build_object('classification',v_label,'last_activity_at',v_last));
END;
$$;

CREATE OR REPLACE FUNCTION public.project_assigned_learning_review_queue(p_as_of timestamptz DEFAULT clock_timestamp())
RETURNS TABLE(user_id uuid,cycle_id uuid,assignment_item_id uuid,classification text,evidence_through timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT s.user_id,s.cycle_id,s.active_assignment_item_id,
    public.classify_assigned_learning_engagement(bool_or(e.event_type='assignment_opened'),
      bool_or(e.event_type IN ('playback_started','playback_progress','playback_completed')),
      bool_or(e.event_type IN ('action_opened','action_selected')),bool_or(e.event_type='returned_after_absence'),
      max(e.occurred_at),p_as_of),coalesce(max(e.occurred_at),s.updated_at)
  FROM public.success_path_cycle_states s LEFT JOIN public.assigned_learning_engagement_events e ON e.user_id=s.user_id AND e.cycle_id=s.cycle_id AND e.assignment_item_id=s.active_assignment_item_id
  GROUP BY s.user_id,s.cycle_id,s.active_assignment_item_id,s.updated_at
  HAVING public.classify_assigned_learning_engagement(bool_or(e.event_type='assignment_opened'),
      bool_or(e.event_type IN ('playback_started','playback_progress','playback_completed')),
      bool_or(e.event_type IN ('action_opened','action_selected')),bool_or(e.event_type='returned_after_absence'),
      max(e.occurred_at),p_as_of)<>'in_progress';
$$;

CREATE OR REPLACE FUNCTION public.success_path_member_transition_diff(p_raw jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object(
    'transition',jsonb_build_object('kind',p_raw#>'{transition,kind}','reason_code',p_raw#>'{transition,reason_code}'),
    'stage',jsonb_build_object('old',p_raw#>'{stage,old}','new',p_raw#>'{stage,new}'),
    'milestone',jsonb_build_object(
      'old',jsonb_build_object('key',p_raw#>'{milestone,old,key}','title',p_raw#>'{milestone,old,title}'),
      'new',jsonb_build_object('key',p_raw#>'{milestone,new,key}','title',p_raw#>'{milestone,new,title}')),
    'learning',jsonb_build_object('assignment_reroute',p_raw#>'{transition,assignment_reroute}',
      'learning_item_changed',p_raw#>'{transition,learning_item_changed}'),
    'action',jsonb_build_object(
      'old',jsonb_build_object('text',p_raw#>'{action,old,text}','estimated_minutes',p_raw#>'{action,old,estimated_minutes}'),
      'new',jsonb_build_object('text',p_raw#>'{action,new,text}','estimated_minutes',p_raw#>'{action,new,estimated_minutes}')),
    'history',jsonb_build_object('prior_task_preserved',p_raw#>'{history,prior_task_preserved}',
      'prior_task_completion_preserved',p_raw#>'{history,prior_task_completion_preserved}',
      'evidence_preserved',p_raw#>'{history,evidence_preserved}','actions_preserved',p_raw#>'{history,actions_preserved}',
      'checkins_preserved',p_raw#>'{history,checkins_preserved}'))
$$;

CREATE OR REPLACE FUNCTION public.preview_my_success_path_transition_member(
  p_cycle_id uuid,p_request_id uuid,p_expected_path_version bigint,p_transition_kind text,p_reason_code text,
  p_evidence_receipt_id uuid,p_proposed_assignment_id uuid,p_proposed_assignment_item_id uuid,p_proposed_stage text,
  p_proposed_milestone_key text,p_proposed_milestone_title text,p_proposed_move_key text,p_proposed_action_text text,
  p_proposed_action_minutes integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_raw jsonb; v_safe jsonb;
BEGIN
  v_raw:=public.preview_my_success_path_transition(p_cycle_id,p_request_id,p_expected_path_version,p_transition_kind,p_reason_code,
    p_evidence_receipt_id,p_proposed_assignment_id,p_proposed_assignment_item_id,p_proposed_stage,p_proposed_milestone_key,
    p_proposed_milestone_title,p_proposed_move_key,p_proposed_action_text,p_proposed_action_minutes);
  v_safe:=public.success_path_member_transition_diff(v_raw->'impact_diff');
  RETURN jsonb_build_object('status',v_raw->'status','replayed',v_raw->'replayed','proposal_id',v_raw->'proposal_id',
    'impact_diff',v_safe,'impact_diff_sha256',public.mastermind_wave2_jsonb_sha256(v_safe));
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_my_success_path_transition_member(
  p_proposal_id uuid,p_confirmation_request_id uuid,p_expected_impact_diff jsonb,p_expected_impact_diff_sha256 text,p_confirm boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_user_id uuid:=auth.uid(); v_proposal public.success_path_focus_proposals%ROWTYPE; v_safe jsonb; v_safe_hash text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_proposal FROM public.success_path_focus_proposals WHERE proposal_id=p_proposal_id AND user_id=v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'transition proposal unavailable'; END IF;
  v_safe:=public.success_path_member_transition_diff(v_proposal.impact_diff);
  v_safe_hash:=public.mastermind_wave2_jsonb_sha256(v_safe);
  IF p_confirm IS DISTINCT FROM true OR p_expected_impact_diff IS DISTINCT FROM v_safe
    OR p_expected_impact_diff_sha256 IS DISTINCT FROM v_safe_hash THEN
    RAISE EXCEPTION 'member transition confirmation does not match safe reviewed impact';
  END IF;
  RETURN public.confirm_my_success_path_transition(p_proposal_id,p_confirmation_request_id,
    v_proposal.impact_diff,v_proposal.impact_diff_sha256,true);
END;
$$;

REVOKE ALL ON TABLE public.assigned_learning_engagement_events,public.assigned_learning_engagement_requests,public.assigned_learning_engagement_classifications FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE public.assigned_learning_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_learning_engagement_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_learning_engagement_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.assigned_learning_engagement_forbid_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.resolve_my_success_path_edit_context(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_my_assigned_learning_engagement(uuid,uuid,uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.resolve_my_assigned_learning_status(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.project_assigned_learning_review_queue(timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.classify_assigned_learning_engagement(boolean,boolean,boolean,boolean,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.success_path_member_transition_diff(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.preview_my_success_path_transition_member(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.confirm_my_success_path_transition_member(uuid,uuid,jsonb,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.preview_my_success_path_transition(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.confirm_my_success_path_transition(uuid,uuid,jsonb,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.resolve_my_success_path_edit_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_my_assigned_learning_engagement(uuid,uuid,uuid,uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_my_assigned_learning_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_assigned_learning_review_queue(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.preview_my_success_path_transition_member(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_my_success_path_transition_member(uuid,uuid,jsonb,text,boolean) TO authenticated;
