\set ON_ERROR_STOP on
INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test');

DO $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{}'::jsonb::text, false);
  BEGIN
    PERFORM public.reconcile_cycle_plan_v2(
      '00000000-0000-4000-8000-000000000001',
      '{"payload_version":"cycle-plan-v2"}'::jsonb
    );
    RAISE EXCEPTION 'unauthenticated reconciliation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

DO $$
DECLARE
  alice uuid := '11111111-1111-1111-1111-111111111111';
  bob uuid := '22222222-2222-2222-2222-222222222222';
  payload1 jsonb;
  payload2 jsonb;
  payload3 jsonb;
  receipt1 jsonb;
  receipt2 jsonb;
  replay jsonb;
  conflict jsonb;
  v_cycle_id uuid;
  bob_cycle uuid;
  bob_project uuid;
  n integer;
  value text;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', alice, 'role', 'authenticated')::text, false);
  payload1 := $json${
    "payload_version":"cycle-plan-v2",
    "logical_plan_key":"aaaaaaaa-1111-4111-8111-111111111111",
    "expected_version":null,
    "cycle":{"start_date":"2026-08-10","end_date":"2026-11-08","goal":"Wave one goal","why":"Durable results","identity":"Finisher","target_feeling":"steady","supporting_projects":["Launch"],"discover_score":4,"nurture_score":5,"convert_score":6,"focus_area":"find","wish":"Ten members","metric_1_name":"Leads","metric_1_start":2,"metric_1_goal":20,"office_hours_start":"09:00","office_hours_end":"17:00","office_hours_days":["Monday"],"day1_top3":["Task A","Task B","Task C"],"promotions":[]},
    "strategy":{"lead_primary_platform":"email","lead_committed_90_days":true,"proof_methods":[],"posting_days":["Monday"],"secondary_platforms":[],"nurture_platforms":[]},
    "offers":[{"name":"Core Offer","price":"100","frequency":"always-open","transformation":"Result","isPrimary":true,"sort_order":0}],
    "limited_offers":[{"name":"Promo","startDate":"2026-08-15","endDate":"2026-08-20","promoType":"flash_sale","discount":"10%"}],
    "revenue_plan":{"revenue_goal":1000,"price_per_sale":100,"sales_needed":10,"launch_schedule":"August"},
    "month_plans":[{"month_number":1,"monthName":"Month 1","projects":"Build","salesPromos":"Promo","mainFocus":"Find"}],
    "generated_projects":[
      {"generation_key":"implementation","name":"Implementation","description":"Generated"},
      {"generation_key":"supporting","name":"Supporting","description":"Generated supporting"}
    ],
    "generated_habits":[
      {"generation_key":"habit:slot-1","habit_name":"Follow up","category":"sales","display_order":0},
      {"generation_key":"habit:slot-2","habit_name":"Review metrics","category":"planning","display_order":1}
    ],
    "generated_tasks":[
      {"generation_key":"task-a","project_generation_key":"implementation","task_text":"Task A","priority":"high","category":"cycle-plan","context_tags":["cycle-plan"]},
      {"generation_key":"task-b","project_generation_key":"implementation","task_text":"Task B","priority":"high","category":"cycle-plan","context_tags":["cycle-plan"]},
      {"generation_key":"task-c","project_generation_key":"implementation","task_text":"Task C","priority":"high","category":"cycle-plan","context_tags":["cycle-plan"]}
    ],
    "daily_plans":[{"date":"2026-08-10","top_3_today":["Task A","Task B","Task C"],"thought":"Start"}],
    "details":{"goal":"Wave one goal"}
  }$json$::jsonb;

  receipt1 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload1);
  IF receipt1->>'status' <> 'complete' OR (receipt1->>'version')::int <> 1 THEN
    RAISE EXCEPTION 'first reconciliation failed: %', receipt1;
  END IF;
  v_cycle_id := (receipt1->>'cycle_id')::uuid;
  SELECT count(*) INTO n FROM public.cycle_strategy s WHERE s.cycle_id = v_cycle_id;
  IF n <> 1 THEN RAISE EXCEPTION 'strategy destination missing'; END IF;
  SELECT count(*) INTO n FROM public.cycle_offers WHERE public.cycle_offers.cycle_id = v_cycle_id;
  IF n <> 1 THEN RAISE EXCEPTION 'offer destination missing'; END IF;
  SELECT count(*) INTO n FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_active;
  IF n <> 2 THEN RAISE EXCEPTION 'project destination count %', n; END IF;
  SELECT count(*) INTO n FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_active;
  IF n <> 2 THEN RAISE EXCEPTION 'habit destination count %', n; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_active;
  IF n <> 3 THEN RAISE EXCEPTION 'task destination count %', n; END IF;

  replay := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload1);
  IF replay IS DISTINCT FROM receipt1 THEN RAISE EXCEPTION 'identical retry did not return original receipt'; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id;
  IF n <> 3 THEN RAISE EXCEPTION 'identical retry duplicated tasks'; END IF;

  conflict := public.reconcile_cycle_plan_v2(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    jsonb_set(payload1, '{cycle,goal}', '"changed request payload"')
  );
  IF conflict->>'conflict_kind' <> 'request_changed' THEN RAISE EXCEPTION 'changed request was not rejected: %', conflict; END IF;
  SELECT goal INTO value FROM public.cycles_90_day WHERE public.cycles_90_day.cycle_id = v_cycle_id;
  IF value <> 'Wave one goal' THEN RAISE EXCEPTION 'changed request mutated cycle'; END IF;

  UPDATE public.tasks SET is_completed = true, status = 'completed', task_text = 'Member completed A'
    WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  UPDATE public.tasks SET task_text = 'Member edited B'
    WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  UPDATE public.projects SET name = 'Member adopted implementation'
    WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  UPDATE public.habits SET habit_name = 'Member adopted follow up'
    WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:slot-1';

  payload2 := jsonb_set(jsonb_set(payload1, '{expected_version}', '1'), '{cycle,goal}', '"Version two goal"');
  payload2 := jsonb_set(payload2, '{generated_tasks,0,task_text}', '"Generated A replacement"');
  payload2 := jsonb_set(payload2, '{generated_tasks,1,task_text}', '"Generated B replacement"');
  -- Simulate a lost/ambiguous response: commit, discard response, retry exactly.
  PERFORM public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', payload2);
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', payload2);
  IF (receipt2->>'version')::int <> 2 THEN RAISE EXCEPTION 'lost response retry changed version: %', receipt2; END IF;
  SELECT task_text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  IF value <> 'Member completed A' THEN RAISE EXCEPTION 'completed task overwritten'; END IF;
  SELECT task_text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'Member edited B' THEN RAISE EXCEPTION 'member-edited unfinished task overwritten'; END IF;
  SELECT name INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'Member adopted implementation' THEN RAISE EXCEPTION 'member-edited project overwritten'; END IF;
  SELECT habit_name INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:slot-1';
  IF value <> 'Member adopted follow up' THEN RAISE EXCEPTION 'member-edited habit overwritten'; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_active;
  IF n <> 3 THEN RAISE EXCEPTION 'changed content duplicated active tasks: %', n; END IF;

  payload3 := jsonb_set(jsonb_set(payload2, '{expected_version}', '2'), '{cycle,goal}', '"Version three goal"');
  payload3 := jsonb_set(payload3, '{generated_tasks}', '[]');
  payload3 := jsonb_set(payload3, '{generated_projects}', '[]');
  payload3 := jsonb_set(payload3, '{generated_habits}', '[]');
  PERFORM public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', payload3);
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  IF value <> 'true' THEN RAISE EXCEPTION 'removed completed task retired'; END IF;
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'true' THEN RAISE EXCEPTION 'removed member-edited task retired'; END IF;
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-c';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed task not retired'; END IF;
  SELECT generation_active::text INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-edited project retired'; END IF;
  SELECT generation_active::text INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'supporting';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed project not retired'; END IF;
  SELECT generation_active::text INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:slot-1';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-edited habit retired'; END IF;
  SELECT generation_active::text INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:slot-2';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed habit not retired'; END IF;

  conflict := public.reconcile_cycle_plan_v2(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    jsonb_set(jsonb_set(payload3, '{expected_version}', '2'), '{cycle,goal}', '"Stale overwrite"')
  );
  IF conflict->>'conflict_kind' <> 'stale_version' OR (conflict->>'current_version')::int <> 3 THEN
    RAISE EXCEPTION 'stale expected version not rejected: %', conflict;
  END IF;

  -- Two independent first-cycle browsers with different local/cloud identities
  -- converge by owner + quarter on one logical cycle and canonical receipt.
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bob, 'role', 'authenticated')::text, false);
  payload1 := jsonb_set(payload1, '{logical_plan_key}', '"bbbbbbbb-1111-4111-8111-111111111111"');
  receipt1 := public.reconcile_cycle_plan_v2('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', payload1);
  payload1 := jsonb_set(payload1, '{logical_plan_key}', '"bbbbbbbb-2222-4222-8222-222222222222"');
  replay := public.reconcile_cycle_plan_v2('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', payload1);
  IF replay->>'cycle_id' <> receipt1->>'cycle_id'
     OR replay->>'logical_plan_id' <> receipt1->>'logical_plan_id'
     OR replay->>'planner_receipt_id' <> receipt1->>'planner_receipt_id'
     OR replay->>'logical_plan_key' <> payload1->>'logical_plan_key'
     OR replay->>'request_id' <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
     OR NOT (replay->>'replayed')::boolean THEN
    RAISE EXCEPTION 'two-browser quarter convergence failed: first %, second %', receipt1, replay;
  END IF;
  SELECT count(*) INTO n FROM public.cycles_90_day WHERE user_id = bob;
  IF n <> 1 THEN RAISE EXCEPTION 'two browsers created % Bob cycles', n; END IF;
  bob_cycle := (receipt1->>'cycle_id')::uuid;
  SELECT id INTO bob_project FROM public.projects WHERE user_id = bob AND public.projects.cycle_id = bob_cycle LIMIT 1;

  BEGIN
    INSERT INTO public.tasks(user_id, cycle_id, project_id, task_text)
    VALUES (bob, v_cycle_id, bob_project, 'Cross-owner cycle');
    RAISE EXCEPTION 'cross-owner cycle relationship unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.tasks(user_id, cycle_id, project_id, task_text)
    VALUES (alice, v_cycle_id, bob_project, 'Cross-owner project');
    RAISE EXCEPTION 'cross-owner project relationship unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END
$$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.cycle_plan_reconciliation_requests_v2
  WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF n <> 0 THEN RAISE EXCEPTION 'Alice read Bob receipt rows'; END IF;
  BEGIN
    INSERT INTO public.cycle_plan_reconciliation_requests_v2(
      request_id, user_id, plan_id, payload_hash, content_hash, payload_version, status
    ) SELECT gen_random_uuid(), user_id, plan_id, repeat('a', 64), repeat('b', 64), 'cycle-plan-v2', 'complete'
      FROM public.cycle_plan_intents_v2 LIMIT 1;
    RAISE EXCEPTION 'member forged receipt ledger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

\echo 'PASS cycle plan reconciliation v2 PostgreSQL behavior'
