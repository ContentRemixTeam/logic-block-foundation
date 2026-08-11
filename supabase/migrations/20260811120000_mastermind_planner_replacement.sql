-- Hidden Mastermind Planner replacement. Forward-only; no Vault provider data.
CREATE TABLE public.mastermind_onboarding_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_context text NOT NULL DEFAULT '' CHECK (char_length(business_context) <= 500),
  reason_joined text NOT NULL DEFAULT '' CHECK (char_length(reason_joined) <= 500),
  support_preference text NOT NULL DEFAULT '' CHECK (char_length(support_preference) <= 500),
  capacity_constraints text NOT NULL DEFAULT '' CHECK (char_length(capacity_constraints) <= 500),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Server-owned frozen curriculum. RLS has no member policies and table writes are
-- revoked; authenticated members can only receive catalog-derived data via RPCs.
CREATE TABLE public.mastermind_curriculum_catalog (
  manifest_version text NOT NULL CHECK (manifest_version = 'mastermind-curriculum-v1'),
  slot_order smallint NOT NULL CHECK (slot_order BETWEEN 1 AND 24),
  milestone_id text NOT NULL,
  stage_id text NOT NULL CHECK (stage_id IN ('offer','find','nurture','sell','deliver','leverage')),
  label text NOT NULL,
  member_output text NOT NULL,
  source_title text NOT NULL,
  source_owner text NOT NULL CHECK (source_owner = 'Faith Mariah'),
  status text NOT NULL CHECK (status IN ('Ready','Refresh','Gap')),
  provenance_note text NOT NULL,
  resource_id text NULL,
  PRIMARY KEY (manifest_version, milestone_id),
  UNIQUE (manifest_version, slot_order),
  CHECK ((status = 'Ready' AND resource_id IS NOT NULL) OR (status <> 'Ready' AND resource_id IS NULL))
);

INSERT INTO public.mastermind_curriculum_catalog
  (manifest_version,slot_order,milestone_id,stage_id,label,member_output,source_title,source_owner,status,provenance_note,resource_id)
VALUES
  ('mastermind-curriculum-v1',1,'offer-focus','offer','Choose the money-making focus','One active revenue stream for this quarter.','Mastermind Success Plan','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',2,'offer-buyer','offer','Choose the buyer and problem','One buyer doorway, paid problem, and piece of demand evidence.','Products & Offers','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',3,'offer-mvp','offer','Build the minimum viable offer','A clear promise, scope, delivery format, price, and boundary.','Products & Offers','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',4,'offer-validate','offer','Validate by making offers','A dated validation test with invitations and real response evidence.','Messy Action Sprints','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',5,'find-path','find','Choose one discovery path','One channel or outreach route with a four-week test.','Content Creation','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',6,'find-create','find','Create discovery content or outreach','Four focused pieces or outreach attempts with one next step.','Content Creation','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',7,'find-bridge','find','Build the bridge to your email list','One live opt-in or invitation connected to the offer.','Grow Your Email List','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',8,'find-evaluate','find','Repeat and evaluate discovery','Enough reach and opt-in evidence to choose the next test.','Mastermind Coaching','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',9,'nurture-map','nurture','Map the nurture ecosystem','A simple path from discovery to email to invitation.','Grow Your Email List','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',10,'nurture-content','nurture','Create content with a job','Four nurture ideas tied to a belief, proof, conversation, or invitation.','Content Creation','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',11,'nurture-email','nurture','Create a simple email system','A live welcome email or sequence and sustainable send rhythm.','Grow Your Email List','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',12,'nurture-evaluate','nurture','Learn from audience behavior','Replies, clicks, questions, and buying signals translated into one next test.','Mastermind Coaching','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',13,'sell-math','sell','Set the sales target and math','A revenue target, sales needed, and invitation target.','Sales & Marketing','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',14,'sell-process','sell','Choose one sales process','One capacity-fit route for making and following up on offers.','Sales & Marketing','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',15,'sell-run','sell','Run the complete sales cycle','The full invitation, follow-up, and close sequence completed.','Messy Action Sprints','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',16,'sell-evaluate','sell','Evaluate and repeat','A neutral debrief and one keep, change, or test-next decision.','Mastermind Coaching','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',17,'deliver-result','deliver','Map the customer result','A customer success path and definition of successful completion.','Mastermind Coaching','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',18,'deliver-first-win','deliver','Onboard to the first win','A clear first-win action and one improved onboarding step.','Organization & Systems','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',19,'deliver-follow-through','deliver','Support follow-through','A progress measure, check-in rhythm, and stuck-customer response.','Organization & Systems','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',20,'deliver-proof','deliver','Turn delivery into proof and improvement','A feedback and testimonial loop with one chosen improvement.','Mastermind Coaching','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',21,'leverage-constraint','leverage','Find the real operational constraint','One named constraint and one workflow chosen for improvement.','Organization & Systems','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',22,'leverage-simplify','leverage','Simplify and document what works','One reduced workflow with a minimum standard, owner, and review rhythm.','Organization & Systems','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',23,'leverage-choice','leverage','Choose the right leverage','A remove, simplify, automate, AI, delegate, or hire decision with a reason.','Faith AI','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL),
  ('mastermind-curriculum-v1',24,'leverage-evaluate','leverage','Lead through evidence and capacity','A small operating scorecard and proof of less founder dependence.','90-Day Planning','Faith Mariah','Gap','Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',NULL);

CREATE TABLE public.mastermind_cycle_curriculum_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  manifest_version text NOT NULL CHECK (manifest_version = 'mastermind-curriculum-v1'),
  manifest jsonb NOT NULL, frozen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_id), UNIQUE (assignment_id, user_id, cycle_id)
);

CREATE TABLE public.mastermind_curriculum_resource_refs (
  resource_ref_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL,
  user_id uuid NOT NULL, cycle_id uuid NOT NULL, milestone_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('Ready','Refresh','Gap')),
  source_title text NOT NULL, source_owner text NOT NULL, member_output text NOT NULL, provenance_note text NOT NULL,
  resource_id text NULL, UNIQUE (assignment_id, milestone_id),
  FOREIGN KEY (assignment_id, user_id, cycle_id) REFERENCES public.mastermind_cycle_curriculum_assignments(assignment_id, user_id, cycle_id) ON DELETE CASCADE,
  CHECK ((status = 'Ready' AND resource_id IS NOT NULL) OR (status <> 'Ready' AND resource_id IS NULL))
);

-- Bind confirmation to the exact canonical planner save without rewriting the
-- earlier reconciliation migration.
ALTER TABLE public.cycle_success_path_snapshots
  ADD COLUMN confirmed_planner_receipt_id uuid NULL;

-- Support an owner/cycle-bound task reference while preserving the existing
-- task primary-key relationship below.
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_task_id_user_id_cycle_id_key UNIQUE (task_id, user_id, cycle_id);

CREATE TABLE public.mastermind_success_path_actions (
  action_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  milestone_id text NOT NULL, stable_key text NOT NULL, task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(task_id) ON DELETE RESTRICT,
  exact_move text NOT NULL CHECK (char_length(exact_move) BETWEEN 1 AND 500),
  capacity_mode text NOT NULL CHECK (capacity_mode IN ('minimum','standard','stretch')),
  done_enough text NOT NULL CHECK (char_length(done_enough) BETWEEN 1 AND 500),
  evidence text NOT NULL CHECK (char_length(evidence) BETWEEN 1 AND 500), scheduled_date date NOT NULL,
  retired_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stable_key), UNIQUE (action_id, user_id, cycle_id),
  FOREIGN KEY (task_id, user_id, cycle_id) REFERENCES public.tasks(task_id, user_id, cycle_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX mastermind_success_path_one_active_action_per_cycle
  ON public.mastermind_success_path_actions(user_id, cycle_id)
  WHERE retired_at IS NULL;

CREATE TABLE public.mastermind_success_path_check_ins (
  check_in_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  action_id uuid NOT NULL, response text NOT NULL CHECK (response IN ('Continue','Improve','Reduce','Support')),
  evidence text NOT NULL DEFAULT '' CHECK (char_length(evidence) <= 1000),
  friction text NOT NULL DEFAULT '' CHECK (char_length(friction) <= 1000), support_suggestion text,
  stage_at_check_in text NOT NULL CHECK (stage_at_check_in IN ('offer','find','nurture','sell','deliver','leverage')),
  milestone_at_check_in text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (action_id, user_id, cycle_id) REFERENCES public.mastermind_success_path_actions(action_id, user_id, cycle_id) ON DELETE CASCADE
);

ALTER TABLE public.mastermind_onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_curriculum_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_cycle_curriculum_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_curriculum_resource_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_success_path_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_success_path_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members own onboarding" ON public.mastermind_onboarding_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members read own curriculum" ON public.mastermind_cycle_curriculum_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.cycles_90_day c WHERE c.cycle_id = mastermind_cycle_curriculum_assignments.cycle_id AND c.user_id = auth.uid()));
CREATE POLICY "members read own resource refs" ON public.mastermind_curriculum_resource_refs FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.cycles_90_day c WHERE c.cycle_id = mastermind_curriculum_resource_refs.cycle_id AND c.user_id = auth.uid()));
CREATE POLICY "members read own actions" ON public.mastermind_success_path_actions FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.cycles_90_day c WHERE c.cycle_id = mastermind_success_path_actions.cycle_id AND c.user_id = auth.uid()));
CREATE POLICY "members read own check ins" ON public.mastermind_success_path_check_ins FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.cycles_90_day c WHERE c.cycle_id = mastermind_success_path_check_ins.cycle_id AND c.user_id = auth.uid()));

REVOKE ALL ON public.mastermind_curriculum_catalog FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mastermind_onboarding_profiles, public.mastermind_cycle_curriculum_assignments, public.mastermind_curriculum_resource_refs, public.mastermind_success_path_actions, public.mastermind_success_path_check_ins FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.mastermind_onboarding_profiles TO authenticated;
GRANT SELECT ON public.mastermind_cycle_curriculum_assignments, public.mastermind_curriculum_resource_refs, public.mastermind_success_path_actions, public.mastermind_success_path_check_ins TO authenticated;

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
  UPDATE public.mastermind_success_path_actions
    SET retired_at=now(),updated_at=now()
    WHERE user_id=v_user AND cycle_id=p_cycle_id AND retired_at IS NULL AND milestone_id<>p_milestone_id;
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
  SELECT confirmed_stage,current_milestone_id,planner_receipt_id,confirmed_planner_receipt_id
    INTO v_stage,v_current_milestone,v_receipt,v_confirmed_receipt
    FROM public.cycle_success_path_snapshots
    WHERE user_id=v_user AND cycle_id=p_cycle_id AND confirmed_stage IS NOT NULL AND confirmed_at IS NOT NULL
    FOR UPDATE;
  IF v_stage IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm your Success Path focus first.'; END IF;
  IF v_receipt IS NULL OR v_confirmed_receipt IS DISTINCT FROM v_receipt OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_reconciliation_requests WHERE request_id=v_receipt AND user_id=v_user AND cycle_id=p_cycle_id AND status='complete') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm this Success Path for the current planner save first.'; END IF;
  IF v_current_milestone IS NULL OR p_milestone_id<>v_current_milestone THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Schedule the current confirmed milestone.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mastermind_cycle_curriculum_assignments a, jsonb_array_elements(a.manifest) slot WHERE a.user_id=v_user AND a.cycle_id=p_cycle_id AND slot->>'id'=p_milestone_id AND slot->>'stageId'=v_stage) THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The milestone is not in the frozen curriculum.'; END IF;
  v_expected_key := p_cycle_id::text||':'||p_milestone_id||':active';
  IF p_stable_key<>v_expected_key THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The action identity is invalid.'; END IF;
  UPDATE public.mastermind_success_path_actions SET retired_at=now(),updated_at=now()
    WHERE user_id=v_user AND cycle_id=p_cycle_id AND retired_at IS NULL AND milestone_id<>p_milestone_id;
  INSERT INTO public.tasks(user_id,cycle_id,task_text,task_description,scheduled_date,planned_day,priority,status,category,context_tags,is_system_generated,system_source,generation_key)
  VALUES(v_user,p_cycle_id,btrim(p_exact_move),btrim(p_done_enough),p_scheduled_date,p_scheduled_date,'high','todo','success-path',ARRAY['success-path',p_milestone_id],true,'mastermind_success_path_v1','mastermind-action:'||p_stable_key)
  ON CONFLICT (user_id,generation_key) DO UPDATE SET task_text=EXCLUDED.task_text,task_description=EXCLUDED.task_description,scheduled_date=EXCLUDED.scheduled_date,planned_day=EXCLUDED.planned_day,context_tags=EXCLUDED.context_tags
  RETURNING task_id INTO v_task;
  INSERT INTO public.mastermind_success_path_actions(user_id,cycle_id,milestone_id,stable_key,task_id,exact_move,capacity_mode,done_enough,evidence,scheduled_date)
  VALUES(v_user,p_cycle_id,p_milestone_id,p_stable_key,v_task,btrim(p_exact_move),p_capacity_mode,btrim(p_done_enough),btrim(p_evidence),p_scheduled_date)
  ON CONFLICT (user_id,stable_key) DO UPDATE SET task_id=EXCLUDED.task_id,exact_move=EXCLUDED.exact_move,capacity_mode=EXCLUDED.capacity_mode,done_enough=EXCLUDED.done_enough,evidence=EXCLUDED.evidence,scheduled_date=EXCLUDED.scheduled_date,retired_at=NULL,updated_at=now()
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
  SELECT confirmed_stage,current_milestone_id,planner_receipt_id,confirmed_planner_receipt_id
    INTO v_stage,v_milestone,v_receipt,v_confirmed_receipt
    FROM public.cycle_success_path_snapshots WHERE user_id=v_user AND cycle_id=v_action.cycle_id;
  IF v_stage IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm your Success Path focus before checking in.'; END IF;
  IF v_milestone IS DISTINCT FROM v_action.milestone_id THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='That action is not for the current confirmed milestone.'; END IF;
  IF v_receipt IS NULL OR v_confirmed_receipt IS DISTINCT FROM v_receipt OR NOT EXISTS (SELECT 1 FROM public.cycle_plan_reconciliation_requests WHERE request_id=v_receipt AND user_id=v_user AND cycle_id=v_action.cycle_id AND status='complete') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Confirm this Success Path for the current planner save before checking in.'; END IF;
  v_support := CASE WHEN p_response='Support' THEN 'Bring what you tried, what happened, and the smallest stuck point to Mastermind support.' ELSE NULL END;
  INSERT INTO public.mastermind_success_path_check_ins(user_id,cycle_id,action_id,response,evidence,friction,support_suggestion,stage_at_check_in,milestone_at_check_in)
  VALUES(v_user,v_action.cycle_id,v_action.action_id,p_response,COALESCE(btrim(p_evidence),''),COALESCE(btrim(p_friction),''),v_support,v_stage,v_action.milestone_id) RETURNING check_in_id INTO v_id;
  RETURN jsonb_build_object('check_in_id',v_id,'response',p_response,'support_suggestion',v_support,'stage_changed',false);
END $$;

REVOKE ALL ON FUNCTION public.schedule_mastermind_success_path_action(uuid,text,text,text,text,text,text,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_mastermind_success_path_check_in(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_mastermind_success_path(uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_mastermind_success_path_action(uuid,text,text,text,text,text,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mastermind_success_path_check_in(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_mastermind_success_path(uuid,text,text,uuid) TO authenticated;
