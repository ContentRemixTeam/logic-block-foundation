-- Bind every Success Path action to the exact completed planner reconciliation
-- receipt that authorized it. Forward-only repair for receipt rotation.

ALTER TABLE public.cycle_plan_reconciliation_requests
  ADD CONSTRAINT cycle_plan_reconciliation_requests_request_owner_cycle_key
  UNIQUE (request_id, user_id, cycle_id);

ALTER TABLE public.mastermind_success_path_actions
  ADD COLUMN planner_receipt_id uuid NULL;

UPDATE public.mastermind_success_path_actions action
SET planner_receipt_id = snapshot.confirmed_planner_receipt_id
FROM public.cycle_success_path_snapshots snapshot
WHERE snapshot.user_id = action.user_id
  AND snapshot.cycle_id = action.cycle_id
  AND snapshot.confirmed_planner_receipt_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cycle_plan_reconciliation_requests receipt
    WHERE receipt.request_id = snapshot.confirmed_planner_receipt_id
      AND receipt.user_id = action.user_id AND receipt.cycle_id = action.cycle_id
      AND receipt.status = 'complete'
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.mastermind_success_path_actions WHERE planner_receipt_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot bind existing Success Path actions to a completed planner receipt.';
  END IF;
END $$;

ALTER TABLE public.mastermind_success_path_actions
  ALTER COLUMN planner_receipt_id SET NOT NULL,
  ADD CONSTRAINT mastermind_success_path_actions_receipt_owner_cycle_fkey
  FOREIGN KEY (planner_receipt_id, user_id, cycle_id)
  REFERENCES public.cycle_plan_reconciliation_requests(request_id, user_id, cycle_id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.confirm_mastermind_success_path(p_cycle_id uuid, p_stage text, p_milestone_id text, planner_receipt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE v_user uuid:=auth.uid(); v_assignment uuid; v_slot public.mastermind_curriculum_catalog%ROWTYPE; v_receipt uuid; v_milestone public.mastermind_curriculum_catalog%ROWTYPE; v_manifest jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Sign in to confirm a Success Path.'; END IF;
  IF p_stage NOT IN ('offer','find','nurture','sell','deliver','leverage') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Choose a valid Success Path focus.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cycles_90_day WHERE cycle_id=p_cycle_id AND user_id=v_user) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='This cycle is unavailable.'; END IF;
  SELECT snapshot.planner_receipt_id INTO v_receipt FROM public.cycle_success_path_snapshots snapshot WHERE snapshot.user_id=v_user AND snapshot.cycle_id=p_cycle_id;
  IF planner_receipt_id IS NULL OR planner_receipt_id<>v_receipt THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The planner receipt does not match this Success Path.'; END IF;
  IF v_receipt IS NULL OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_reconciliation_requests WHERE request_id=v_receipt AND user_id=v_user AND cycle_id=p_cycle_id AND status='complete') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Save your canonical 90-day plan first.'; END IF;
  SELECT * INTO v_milestone FROM public.mastermind_curriculum_catalog WHERE manifest_version='mastermind-curriculum-v1' AND milestone_id=p_milestone_id AND stage_id=p_stage;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Choose a milestone that belongs to this focus.'; END IF;
  SELECT jsonb_agg(jsonb_build_object('id',milestone_id,'label',label,'output',member_output,'stageId',stage_id,'sourceTitle',source_title,'sourceOwner',source_owner,'status',status,'provenanceNote',provenance_note,'resourceId',resource_id) ORDER BY slot_order)
    INTO v_manifest FROM public.mastermind_curriculum_catalog WHERE manifest_version='mastermind-curriculum-v1';
  IF COALESCE(jsonb_array_length(v_manifest),0)<>24 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The server curriculum catalog is incomplete.'; END IF;
  UPDATE public.cycle_success_path_snapshots SET confirmed_stage=p_stage,current_milestone_id=p_milestone_id,current_milestone_title=v_milestone.label,confirmed_at=now(),confirmed_planner_receipt_id=v_receipt,curriculum_version='mastermind-curriculum-v1',updated_at=now() WHERE user_id=v_user AND cycle_id=p_cycle_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The planner recommendation is missing.'; END IF;
  UPDATE public.mastermind_success_path_actions action SET retired_at=now(),updated_at=now()
    WHERE action.user_id=v_user AND action.cycle_id=p_cycle_id AND action.retired_at IS NULL
      AND (action.milestone_id IS DISTINCT FROM p_milestone_id OR action.planner_receipt_id IS DISTINCT FROM v_receipt);
  INSERT INTO public.mastermind_cycle_curriculum_assignments(user_id,cycle_id,manifest_version,manifest) VALUES(v_user,p_cycle_id,'mastermind-curriculum-v1',v_manifest)
  ON CONFLICT(user_id,cycle_id) DO NOTHING RETURNING assignment_id INTO v_assignment;
  IF v_assignment IS NULL THEN SELECT assignment_id INTO v_assignment FROM public.mastermind_cycle_curriculum_assignments WHERE user_id=v_user AND cycle_id=p_cycle_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mastermind_curriculum_resource_refs WHERE assignment_id=v_assignment) THEN
    FOR v_slot IN SELECT * FROM public.mastermind_curriculum_catalog WHERE manifest_version='mastermind-curriculum-v1' ORDER BY slot_order LOOP
      INSERT INTO public.mastermind_curriculum_resource_refs(assignment_id,user_id,cycle_id,milestone_id,status,source_title,source_owner,member_output,provenance_note,resource_id)
      VALUES(v_assignment,v_user,p_cycle_id,v_slot.milestone_id,v_slot.status,v_slot.source_title,v_slot.source_owner,v_slot.member_output,v_slot.provenance_note,v_slot.resource_id);
    END LOOP;
  END IF;
  RETURN jsonb_build_object('confirmed_stage',p_stage,'current_milestone_id',p_milestone_id,'assignment_id',v_assignment);
END $$;

CREATE OR REPLACE FUNCTION public.schedule_mastermind_success_path_action(p_cycle_id uuid, p_milestone_id text, p_stable_key text, p_exact_move text, p_capacity_mode text, p_done_enough text, p_evidence text, p_scheduled_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_task uuid; v_action uuid; v_stage text; v_current_milestone text; v_expected_key text; v_receipt uuid; v_confirmed_receipt uuid;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (SELECT 1 FROM public.cycles_90_day WHERE cycle_id=p_cycle_id AND user_id=v_user) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='This cycle is unavailable.'; END IF;
  IF p_scheduled_date IS NULL OR p_capacity_mode NOT IN ('minimum','standard','stretch') OR btrim(p_stable_key)='' OR btrim(p_exact_move)='' OR btrim(p_done_enough)='' OR btrim(p_evidence)='' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Complete the action, capacity, done-enough, evidence, and date fields.'; END IF;
  IF char_length(btrim(p_exact_move))>500 OR char_length(btrim(p_done_enough))>500 OR char_length(btrim(p_evidence))>500 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Action answers must be 500 characters or fewer.'; END IF;
  SELECT confirmed_stage,current_milestone_id,planner_receipt_id,confirmed_planner_receipt_id INTO v_stage,v_current_milestone,v_receipt,v_confirmed_receipt
    FROM public.cycle_success_path_snapshots WHERE user_id=v_user AND cycle_id=p_cycle_id AND confirmed_stage IS NOT NULL AND confirmed_at IS NOT NULL FOR UPDATE;
  IF v_stage IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm your Success Path focus first.'; END IF;
  IF v_receipt IS NULL OR v_confirmed_receipt IS DISTINCT FROM v_receipt OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_reconciliation_requests WHERE request_id=v_receipt AND user_id=v_user AND cycle_id=p_cycle_id AND status='complete') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm this Success Path for the current planner save first.'; END IF;
  IF v_current_milestone IS NULL OR p_milestone_id<>v_current_milestone THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Schedule the current confirmed milestone.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mastermind_cycle_curriculum_assignments a, jsonb_array_elements(a.manifest) slot WHERE a.user_id=v_user AND a.cycle_id=p_cycle_id AND slot->>'id'=p_milestone_id AND slot->>'stageId'=v_stage) THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The milestone is not in the frozen curriculum.'; END IF;
  v_expected_key := p_cycle_id::text||':'||p_milestone_id||':active';
  IF p_stable_key<>v_expected_key THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The action identity is invalid.'; END IF;
  UPDATE public.mastermind_success_path_actions SET retired_at=now(),updated_at=now()
    WHERE user_id=v_user AND cycle_id=p_cycle_id AND retired_at IS NULL
      AND (milestone_id IS DISTINCT FROM p_milestone_id OR planner_receipt_id IS DISTINCT FROM v_receipt);
  INSERT INTO public.tasks(user_id,cycle_id,task_text,task_description,scheduled_date,planned_day,priority,status,category,context_tags,is_system_generated,system_source,generation_key)
  VALUES(v_user,p_cycle_id,btrim(p_exact_move),btrim(p_done_enough),p_scheduled_date,p_scheduled_date,'high','todo','success-path',ARRAY['success-path',p_milestone_id],true,'mastermind_success_path_v1','mastermind-action:'||p_stable_key)
  ON CONFLICT (user_id,generation_key) DO UPDATE SET task_text=EXCLUDED.task_text,task_description=EXCLUDED.task_description,scheduled_date=EXCLUDED.scheduled_date,planned_day=EXCLUDED.planned_day,context_tags=EXCLUDED.context_tags RETURNING task_id INTO v_task;
  INSERT INTO public.mastermind_success_path_actions(user_id,cycle_id,milestone_id,stable_key,task_id,planner_receipt_id,exact_move,capacity_mode,done_enough,evidence,scheduled_date)
  VALUES(v_user,p_cycle_id,p_milestone_id,p_stable_key,v_task,v_receipt,btrim(p_exact_move),p_capacity_mode,btrim(p_done_enough),btrim(p_evidence),p_scheduled_date)
  ON CONFLICT (user_id,stable_key) DO UPDATE SET task_id=EXCLUDED.task_id,planner_receipt_id=EXCLUDED.planner_receipt_id,exact_move=EXCLUDED.exact_move,capacity_mode=EXCLUDED.capacity_mode,done_enough=EXCLUDED.done_enough,evidence=EXCLUDED.evidence,scheduled_date=EXCLUDED.scheduled_date,retired_at=NULL,updated_at=now()
  RETURNING action_id INTO v_action;
  RETURN jsonb_build_object('action_id',v_action,'task_id',v_task,'stable_key',p_stable_key,'scheduled_date',p_scheduled_date);
END $$;

CREATE OR REPLACE FUNCTION public.record_mastermind_success_path_check_in(p_action_id uuid, p_response text, p_evidence text, p_friction text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE v_user uuid:=auth.uid(); v_action public.mastermind_success_path_actions%ROWTYPE; v_stage text; v_milestone text; v_receipt uuid; v_confirmed_receipt uuid; v_id uuid; v_support text;
BEGIN
  IF p_response NOT IN ('Continue','Improve','Reduce','Support') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Choose Continue, Improve, Reduce, or Support.'; END IF;
  IF char_length(COALESCE(btrim(p_evidence),''))>1000 OR char_length(COALESCE(btrim(p_friction),''))>1000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Check-in answers must be 1000 characters or fewer.'; END IF;
  SELECT * INTO v_action FROM public.mastermind_success_path_actions WHERE action_id=p_action_id AND user_id=v_user AND retired_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='That action is unavailable.'; END IF;
  SELECT confirmed_stage,current_milestone_id,planner_receipt_id,confirmed_planner_receipt_id INTO v_stage,v_milestone,v_receipt,v_confirmed_receipt
    FROM public.cycle_success_path_snapshots WHERE user_id=v_user AND cycle_id=v_action.cycle_id;
  IF v_stage IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm your Success Path focus before checking in.'; END IF;
  IF v_milestone IS DISTINCT FROM v_action.milestone_id THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='That action is not for the current confirmed milestone.'; END IF;
  IF v_receipt IS NULL OR v_confirmed_receipt IS DISTINCT FROM v_receipt OR v_action.planner_receipt_id IS DISTINCT FROM v_receipt OR v_action.planner_receipt_id IS DISTINCT FROM v_confirmed_receipt OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_reconciliation_requests WHERE request_id=v_receipt AND user_id=v_user AND cycle_id=v_action.cycle_id AND status='complete') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm and schedule this Success Path for the current planner save before checking in.'; END IF;
  v_support := CASE WHEN p_response='Support' THEN 'Bring what you tried, what happened, and the smallest stuck point to Mastermind support.' ELSE NULL END;
  INSERT INTO public.mastermind_success_path_check_ins(user_id,cycle_id,action_id,response,evidence,friction,support_suggestion,stage_at_check_in,milestone_at_check_in)
  VALUES(v_user,v_action.cycle_id,v_action.action_id,p_response,COALESCE(btrim(p_evidence),''),COALESCE(btrim(p_friction),''),v_support,v_stage,v_action.milestone_id) RETURNING check_in_id INTO v_id;
  RETURN jsonb_build_object('check_in_id',v_id,'response',p_response,'support_suggestion',v_support,'stage_changed',false);
END $$;
