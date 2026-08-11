\set ON_ERROR_STOP on

INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test');

DO $$
DECLARE
  v_alice uuid := '11111111-1111-1111-1111-111111111111';
  v_bob uuid := '22222222-2222-2222-2222-222222222222';
  v_request_1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_request_2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  v_request_3 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  v_request_4 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  v_request_5 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  v_request_6 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6';
  v_payload_1 jsonb;
  v_payload_2 jsonb;
  v_receipt jsonb;
  v_cycle_id uuid;
  v_count integer;
  v_text text;
  v_bool boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_alice, 'role', 'authenticated')::text, false);

  v_payload_1 := $json$
  {
    "payload_version": "cycle-plan-v1",
    "plan_key": "planner-alice-wave-1",
    "details": {"advanced_answer": "preserved atomically"},
    "cycle": {
      "start_date": "2026-08-10",
      "end_date": "2026-11-08",
      "goal": "Enroll ten aligned members",
      "why": "Create durable recurring revenue",
      "identity": "I finish the useful plan",
      "target_feeling": "steady",
      "supporting_projects": ["Member enrollment"],
      "discover_score": 4,
      "nurture_score": 6,
      "convert_score": 5,
      "focus_area": "find",
      "biggest_bottleneck": "qualified leads",
      "audience_target": "capacity-aware business owners",
      "audience_frustration": "inconsistent sales",
      "signature_message": "Limited capacity does not mean limited ambition",
      "low_energy_version": "One useful follow-up",
      "medium_energy_version": "Complete the daily next move",
      "high_energy_version": "Batch the weekly campaign",
      "day1_top3": ["Clarify invitation"],
      "day1_why": "Start with the highest leverage message",
      "day2_top3": ["Invite five people"],
      "day2_why": "Create conversations",
      "day3_top3": ["Follow up"],
      "day3_why": "Close the loop",
      "weekly_planning_day": "Monday",
      "weekly_debrief_day": "Friday"
    },
    "implementation_project": {
            "name": "90-Day Member Enrollment",
      "description": "Generated from the canonical planner"
    },
    "tasks": [
      {
        "generation_key": "day-1:slot-1",
        "task_text": "Clarify the invitation",
        "scheduled_date": "2026-08-10",
        "planned_day": "2026-08-10",
        "priority": "high",
        "category": "cycle-plan",
        "context_tags": ["cycle-plan", "find"]
      },
      {
        "generation_key": "day-2:slot-1",
        "task_text": "Invite five aligned people",
        "scheduled_date": "2026-08-11",
        "planned_day": "2026-08-11",
        "priority": "high",
        "category": "cycle-plan",
        "context_tags": ["cycle-plan", "find"]
      }
    ],
    "success_path": {
      "recommended_stage": "find",
      "recommendation_reason": "The offer exists; qualified lead flow is the constraint.",
      "recommendation_evidence": "Discover score is the lowest relevant score.",
      "curriculum_version": "success-path-v1"
    }
  }
  $json$::jsonb;

  v_receipt := public.reconcile_cycle_plan(v_request_1, v_payload_1);
  IF v_receipt->>'status' <> 'complete' OR (v_receipt->>'replayed')::boolean THEN
    RAISE EXCEPTION 'first save did not return an original complete receipt: %', v_receipt;
  END IF;
  v_cycle_id := (v_receipt->>'cycle_id')::uuid;

  SELECT count(*) INTO v_count FROM public.cycles_90_day WHERE user_id = v_alice;
  IF v_count <> 1 THEN RAISE EXCEPTION 'expected one cycle, got %', v_count; END IF;
  SELECT planner_payload#>>'{details,advanced_answer}' INTO v_text
    FROM public.cycles_90_day WHERE cycle_id = v_cycle_id;
  IF v_text <> 'preserved atomically' THEN RAISE EXCEPTION 'full planner payload was not receipt-bound'; END IF;
  SELECT count(*) INTO v_count FROM public.tasks WHERE user_id = v_alice AND generation_active;
  IF v_count <> 2 THEN RAISE EXCEPTION 'expected two active generated tasks, got %', v_count; END IF;
  SELECT confirmed_stage IS NULL AND confirmed_at IS NULL INTO v_bool
    FROM public.cycle_success_path_snapshots WHERE user_id = v_alice AND cycle_id = v_cycle_id;
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'planner recommendation silently confirmed the Success Path';
  END IF;

  v_receipt := public.reconcile_cycle_plan(v_request_1, v_payload_1);
  IF NOT (v_receipt->>'replayed')::boolean THEN RAISE EXCEPTION 'retry was not identified as replay'; END IF;
  SELECT count(*) INTO v_count FROM public.cycles_90_day WHERE user_id = v_alice;
  IF v_count <> 1 THEN RAISE EXCEPTION 'retry duplicated the cycle'; END IF;
  SELECT count(*) INTO v_count FROM public.tasks WHERE user_id = v_alice;
  IF v_count <> 2 THEN RAISE EXCEPTION 'retry duplicated tasks'; END IF;

  v_receipt := public.reconcile_cycle_plan(
    v_request_1,
    jsonb_set(v_payload_1, '{cycle,goal}', '"Changed under reused request"'::jsonb)
  );
  IF v_receipt->>'status' <> 'conflict'
     OR v_receipt->>'conflict_kind' <> 'request_changed'
     OR (v_receipt->>'cycle_id')::uuid <> v_cycle_id THEN
    RAISE EXCEPTION 'changed payload did not return the existing-cycle conflict receipt: %', v_receipt;
  END IF;
  SELECT goal INTO v_text FROM public.cycles_90_day WHERE cycle_id = v_cycle_id;
  IF v_text <> 'Enroll ten aligned members' THEN RAISE EXCEPTION 'conflict changed durable cycle'; END IF;

  UPDATE public.tasks
    SET is_completed = true, status = 'completed', task_text = 'Member kept wording'
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-1:slot-1';

  UPDATE public.tasks
    SET task_text = 'Member unfinished wording'
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-2:slot-1';

  v_payload_2 := jsonb_set(v_payload_1, '{cycle,goal}', '"Enroll twelve aligned members"'::jsonb)
    || jsonb_build_object('cycle_id', v_cycle_id)
    || jsonb_build_object('tasks', jsonb_build_array(
      jsonb_build_object(
        'generation_key', 'day-1:slot-1',
        'task_text', 'Generated replacement wording',
        'scheduled_date', '2026-08-12',
        'planned_day', '2026-08-12',
        'priority', 'high',
        'category', 'cycle-plan',
        'context_tags', jsonb_build_array('cycle-plan', 'find')
      ),
      jsonb_build_object(
        'generation_key', 'day-2:slot-1',
        'task_text', 'Generated replacement for unfinished task',
        'scheduled_date', '2026-08-13',
        'planned_day', '2026-08-13',
        'priority', 'high',
        'category', 'cycle-plan',
        'context_tags', jsonb_build_array('cycle-plan', 'find')
      )
    ));

  v_receipt := public.reconcile_cycle_plan(v_request_2, v_payload_2);
  SELECT task_text INTO v_text FROM public.tasks
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-1:slot-1';
  IF v_text <> 'Member kept wording' THEN RAISE EXCEPTION 'completed task wording was overwritten'; END IF;
  SELECT task_text INTO v_text FROM public.tasks
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-2:slot-1';
  IF v_text <> 'Member unfinished wording' THEN RAISE EXCEPTION 'unfinished member edit was overwritten'; END IF;
  SELECT generation_active INTO v_bool FROM public.tasks
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-2:slot-1';
  IF v_bool IS DISTINCT FROM true THEN RAISE EXCEPTION 'retained generated task was unexpectedly retired'; END IF;

  v_receipt := public.reconcile_cycle_plan(
    v_request_5,
    jsonb_set(v_payload_2, '{tasks}', '[]'::jsonb)
  );
  SELECT generation_active INTO v_bool FROM public.tasks
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-1:slot-1';
  IF v_bool IS DISTINCT FROM true THEN RAISE EXCEPTION 'removed completed task was retired'; END IF;
  SELECT generation_active INTO v_bool FROM public.tasks
    WHERE user_id = v_alice AND generation_key = 'cycle:' || v_cycle_id::text || ':task:day-2:slot-1';
  IF v_bool IS DISTINCT FROM false THEN RAISE EXCEPTION 'removed unfinished generated task was not retired'; END IF;

  SELECT goal INTO v_text FROM public.cycles_90_day WHERE cycle_id = v_cycle_id;
  IF v_text <> 'Enroll twelve aligned members' THEN RAISE EXCEPTION 'new request did not reconcile cycle'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_bob, 'role', 'authenticated')::text, false);
  BEGIN
    PERFORM public.reconcile_cycle_plan(v_request_3, v_payload_2);
    RAISE EXCEPTION 'cross-member cycle update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  SELECT goal INTO v_text FROM public.cycles_90_day WHERE cycle_id = v_cycle_id;
  IF v_text <> 'Enroll twelve aligned members' THEN RAISE EXCEPTION 'cross-member attempt changed cycle'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_alice, 'role', 'authenticated')::text, false);
  BEGIN
    PERFORM public.reconcile_cycle_plan(
      v_request_4,
      jsonb_set(jsonb_set(v_payload_1, '{cycle,goal}', '""'::jsonb), '{plan_key}', '"invalid-plan"'::jsonb)
    );
    RAISE EXCEPTION 'blank goal unexpectedly saved';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  SELECT count(*) INTO v_count FROM public.cycle_plan_reconciliation_requests WHERE request_id = v_request_4;
  IF v_count <> 0 THEN RAISE EXCEPTION 'failed transaction left a false receipt row'; END IF;

  BEGIN
    PERFORM public.reconcile_cycle_plan(
      v_request_6,
      jsonb_set(
        jsonb_set(
          jsonb_set(v_payload_1, '{plan_key}', '"late-rollback-plan"'::jsonb),
          '{cycle,goal}',
          '"Late rollback probe"'::jsonb
        ),
        '{success_path,recommended_stage}',
        '"not-a-stage"'::jsonb
      )
    );
    RAISE EXCEPTION 'late invalid Success Path stage unexpectedly committed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  SELECT count(*) INTO v_count FROM public.cycle_plan_reconciliation_requests WHERE request_id = v_request_6;
  IF v_count <> 0 THEN RAISE EXCEPTION 'late failure left a false receipt row'; END IF;
  SELECT count(*) INTO v_count FROM public.cycles_90_day WHERE user_id = v_alice AND goal = 'Late rollback probe';
  IF v_count <> 0 THEN RAISE EXCEPTION 'late failure left a partial cycle'; END IF;

  IF has_function_privilege('anon', 'public.reconcile_cycle_plan(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute planner reconciliation';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.reconcile_cycle_plan(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated member cannot execute planner reconciliation';
  END IF;
END
$$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cycle_plan_reconciliation_requests(request_id, user_id, plan_key, payload_hash, status)
    VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa99',
      '11111111-1111-1111-1111-111111111111',
      'forged-plan',
      repeat('a', 64),
      'complete'
    );
    RAISE EXCEPTION 'member directly inserted a receipt';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.cycle_plan_reconciliation_requests;
  IF v_count < 2 THEN RAISE EXCEPTION 'Alice cannot read her own receipts'; END IF;
  BEGIN
    UPDATE public.cycle_plan_reconciliation_requests SET status = 'complete';
    RAISE EXCEPTION 'member directly updated a receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.cycle_plan_reconciliation_requests;
    RAISE EXCEPTION 'member directly deleted a receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
DO $$
DECLARE
  v_snapshot_id uuid;
  v_receipt_id uuid;
  v_rows integer;
BEGIN
  SELECT snapshot_id, planner_receipt_id
  INTO v_snapshot_id, v_receipt_id
  FROM public.cycle_success_path_snapshots
  WHERE user_id = '11111111-1111-1111-1111-111111111111'
  LIMIT 1;
  IF v_snapshot_id IS NULL OR v_receipt_id IS NULL THEN
    RAISE EXCEPTION 'verified Success Path snapshot is not receipt-bound';
  END IF;

  BEGIN
    UPDATE public.cycle_success_path_snapshots
    SET planner_receipt_id = NULL
    WHERE snapshot_id = v_snapshot_id;
    RAISE EXCEPTION 'member removed Success Path receipt binding';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  DELETE FROM public.cycle_success_path_snapshots WHERE snapshot_id = v_snapshot_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'member deleted receipt-bound Success Path snapshot'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cycle_success_path_snapshots
    WHERE snapshot_id = v_snapshot_id AND planner_receipt_id = v_receipt_id
  ) THEN
    RAISE EXCEPTION 'receipt-bound Success Path snapshot changed after denied mutations';
  END IF;
END
$$;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.cycle_plan_reconciliation_requests;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Bob can read Alice receipts: %', v_count; END IF;
END
$$;
RESET ROLE;

\echo 'PASS cycle plan reconciliation PostgreSQL behavior'
