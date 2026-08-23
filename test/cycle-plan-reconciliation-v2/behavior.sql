\set ON_ERROR_STOP on
INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'dana@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'erin@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'fran@example.test');

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
  BEGIN
    PERFORM public.save_cycle_draft_v2('{}', 1, NULL, NULL, gen_random_uuid(), NULL, NULL, NULL, true);
    RAISE EXCEPTION 'unauthenticated draft save unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.delete_cycle_draft_conditionally_v2(NULL, NULL, NULL, NULL, NULL, true);
    RAISE EXCEPTION 'unauthenticated draft delete unexpectedly succeeded';
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
  payload4 jsonb;
  payload5 jsonb;
  payload6 jsonb;
  payload7 jsonb;
  payload8 jsonb;
  receipt1 jsonb;
  receipt2 jsonb;
  replay jsonb;
  conflict jsonb;
  v_cycle_id uuid;
  other_cycle uuid;
  stable_project_id uuid;
  stable_habit_id uuid;
  lookup_id uuid;
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
      {"generation_key":"supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","name":"Duplicate","description":"Generated supporting"},
      {"generation_key":"supporting-project:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2","name":"Duplicate","description":"Generated supporting"}
    ],
    "generated_habits":[
      {"generation_key":"habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","habit_name":"Duplicate","category":"sales","display_order":0},
      {"generation_key":"habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2","habit_name":"Duplicate","category":"planning","display_order":1}
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
  IF n <> 3 THEN RAISE EXCEPTION 'project destination count %', n; END IF;
  SELECT count(*) INTO n FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_active;
  IF n <> 2 THEN RAISE EXCEPTION 'habit destination count %', n; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_active;
  IF n <> 3 THEN RAISE EXCEPTION 'task destination count %', n; END IF;
  IF (receipt1->>'daily_plan_inserted_count')::int <> 1
     OR jsonb_array_length(receipt1->'daily_plan_outcomes') <> 1 THEN
    RAISE EXCEPTION 'new Daily Plan receipt was not truthful: %', receipt1;
  END IF;

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

  UPDATE public.tasks SET is_completed = true, status = 'done', task_text = 'Member completed A'
    WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  UPDATE public.tasks SET task_text = 'Member edited B'
    WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  UPDATE public.projects SET name = 'Member adopted implementation'
    WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  UPDATE public.habits SET habit_name = 'Member adopted follow up'
    WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  SELECT id INTO stable_project_id FROM public.projects
    WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'supporting-project:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  UPDATE public.projects SET status = 'completed'
    WHERE id = stable_project_id;
  SELECT habit_id INTO stable_habit_id FROM public.habits
    WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';

  UPDATE public.daily_plans SET
    top_3_today = '["Member A","Member B"]', thought = 'Member thought', feeling = 'steady',
    selected_weekly_priorities = '["Owned"]', deep_mode_notes = '{"note":"owned"}',
    made_offer = true, daily_wins = '["Won"]', scratch_pad_content = 'scratch',
    one_thing = 'Member one thing', alignment_score = 9, brain_dump = 'Member brain dump',
    end_of_day_reflection = 'Member reflection'
  WHERE user_id = alice AND date = '2026-08-10';
  INSERT INTO public.daily_plans(user_id, cycle_id, date, top_3_today, thought, feeling)
  VALUES (alice, NULL, '2026-08-11', '[]', NULL, 'member empty day');
  INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal)
  VALUES (alice, '2027-01-01', '2027-03-31', 'Other-quarter cycle') RETURNING cycle_id INTO other_cycle;
  INSERT INTO public.daily_plans(user_id, cycle_id, date, top_3_today, thought)
  VALUES (alice, other_cycle, '2026-08-12', '["Other cycle owned"]', 'Do not steal');

  payload2 := jsonb_set(jsonb_set(payload1, '{expected_version}', '1'), '{cycle,goal}', '"Version two goal"');
  payload2 := jsonb_set(payload2, '{generated_tasks,0,task_text}', '"Generated A replacement"');
  payload2 := jsonb_set(payload2, '{generated_tasks,1,task_text}', '"Generated B replacement"');
  payload2 := jsonb_set(payload2, '{generated_projects}', $json$[
    {"generation_key":"supporting-project:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2","name":"Duplicate","description":"Generated supporting"},
    {"generation_key":"implementation","name":"Implementation replacement","description":"Generated"},
    {"generation_key":"supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","name":"Duplicate","description":"Generated supporting"}
  ]$json$::jsonb);
  payload2 := jsonb_set(payload2, '{generated_habits}', $json$[
    {"generation_key":"habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2","habit_name":"Duplicate","category":"planning","display_order":0},
    {"generation_key":"habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","habit_name":"Duplicate replacement","category":"sales","display_order":1}
  ]$json$::jsonb);
  payload2 := jsonb_set(payload2, '{daily_plans}', $json$[
    {"date":"2026-08-10","top_3_today":["Generated replacement"],"thought":"Generated replacement"},
    {"date":"2026-08-11","top_3_today":["Generated on empty"],"thought":"Generated on empty"},
    {"date":"2026-08-13","top_3_today":[],"thought":null}
  ]$json$::jsonb);
  -- Simulate a lost/ambiguous response: commit, discard response, retry exactly.
  PERFORM public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', payload2);
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', payload2);
  IF (receipt2->>'version')::int <> 2 THEN RAISE EXCEPTION 'lost response retry changed version: %', receipt2; END IF;
  IF (receipt2->>'daily_plan_inserted_count')::int <> 1
     OR (receipt2->>'daily_plan_linked_count')::int <> 1
     OR (receipt2->>'daily_plan_preserved_count')::int <> 1
     OR (receipt2->>'daily_plan_conflict_count')::int <> 0 THEN
    RAISE EXCEPTION 'Daily Plan preservation/conflict receipt was not truthful: %', receipt2;
  END IF;
  SELECT task_text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  IF value <> 'Member completed A' THEN RAISE EXCEPTION 'completed task overwritten'; END IF;
  SELECT task_text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'Member edited B' THEN RAISE EXCEPTION 'member-edited unfinished task overwritten'; END IF;
  SELECT name INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'Member adopted implementation' THEN RAISE EXCEPTION 'member-edited project overwritten'; END IF;
  SELECT habit_name INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'Member adopted follow up' THEN RAISE EXCEPTION 'member-edited habit overwritten after reorder'; END IF;
  SELECT id INTO lookup_id FROM public.projects WHERE public.projects.cycle_id = v_cycle_id
    AND generation_key = 'supporting-project:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF lookup_id <> stable_project_id THEN RAISE EXCEPTION 'supporting project identity changed on reorder'; END IF;
  SELECT habit_id INTO lookup_id FROM public.habits WHERE public.habits.cycle_id = v_cycle_id
    AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF lookup_id <> stable_habit_id THEN RAISE EXCEPTION 'habit identity changed on reorder'; END IF;
  SELECT top_3_today::text INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-10';
  IF value <> '["Member A", "Member B"]' THEN RAISE EXCEPTION 'same-cycle member Daily Plan Top 3 overwritten: %', value; END IF;
  SELECT thought INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-10';
  IF value <> 'Member thought' THEN RAISE EXCEPTION 'same-cycle member Daily Plan thought overwritten'; END IF;
  SELECT feeling INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-10';
  IF value <> 'steady' THEN RAISE EXCEPTION 'same-cycle member Daily Plan authored state overwritten'; END IF;
  SELECT one_thing INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-10';
  IF value <> 'Member one thing' THEN RAISE EXCEPTION 'same-cycle member Daily Plan focus overwritten'; END IF;
  SELECT made_offer::text INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-10';
  IF value <> 'true' THEN RAISE EXCEPTION 'same-cycle member Daily Plan completion state overwritten'; END IF;
  SELECT cycle_id::text INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-11';
  IF value <> v_cycle_id::text THEN RAISE EXCEPTION 'unlinked existing Daily Plan did not receive safe linkage'; END IF;
  SELECT feeling INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-11';
  IF value <> 'member empty day' THEN RAISE EXCEPTION 'unlinked existing Daily Plan authored state overwritten'; END IF;
  SELECT cycle_id::text INTO value FROM public.daily_plans WHERE user_id = alice AND date = '2026-08-12';
  IF value <> other_cycle::text THEN RAISE EXCEPTION 'other-cycle Daily Plan date was stolen'; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_active;
  IF n <> 3 THEN RAISE EXCEPTION 'changed content duplicated active tasks: %', n; END IF;

  -- A required date owned by another cycle is a typed preflight conflict. No
  -- cycle, generated row, intent, request ledger, or receipt mutation survives.
  payload3 := jsonb_set(jsonb_set(payload2, '{expected_version}', '2'), '{cycle,goal}', '"Collision must roll back"');
  payload3 := jsonb_set(payload3, '{daily_plans}', $json$[
    {"date":"2026-08-12","top_3_today":["Generated theft"],"thought":"Generated theft"}
  ]$json$::jsonb);
  conflict := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', payload3);
  IF conflict->>'conflict_kind' <> 'daily_plan_collision' OR conflict->>'status' <> 'conflict' THEN
    RAISE EXCEPTION 'Daily Plan collision did not fail closed: %', conflict;
  END IF;
  SELECT goal INTO value FROM public.cycles_90_day WHERE cycle_id = v_cycle_id;
  IF value <> 'Version two goal' THEN RAISE EXCEPTION 'Daily Plan collision partially mutated cycle'; END IF;
  SELECT count(*) INTO n FROM public.cycle_plan_reconciliation_requests_v2
    WHERE user_id = alice AND request_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
  IF n <> 0 THEN RAISE EXCEPTION 'Daily Plan collision left a request/receipt ledger row'; END IF;
  SELECT count(*) INTO n FROM public.tasks WHERE cycle_id = v_cycle_id;
  IF n <> 3 THEN RAISE EXCEPTION 'Daily Plan collision partially mutated tasks'; END IF;
  SELECT count(*) INTO n FROM public.projects WHERE cycle_id = v_cycle_id;
  IF n <> 3 THEN RAISE EXCEPTION 'Daily Plan collision partially mutated projects'; END IF;

  -- Multi-reconciliation non-absorption: generator proposes the member's B,
  -- then later C. Persisted B and the original A baseline must remain.
  payload3 := jsonb_set(jsonb_set(payload2, '{expected_version}', '2'), '{cycle,goal}', '"Version three goal"');
  payload3 := jsonb_set(payload3, '{daily_plans}', '[]');
  payload3 := jsonb_set(payload3, '{generated_projects,1,name}', '"Member adopted implementation"');
  payload3 := jsonb_set(payload3, '{generated_habits,1,habit_name}', '"Member adopted follow up"');
  payload3 := jsonb_set(payload3, '{generated_tasks,1,task_text}', '"Member edited B"');
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', payload3);
  IF (receipt2->>'version')::int <> 3 THEN RAISE EXCEPTION 'baseline B proposal did not reach version 3'; END IF;
  SELECT generation_baseline->>'name' INTO value FROM public.projects
    WHERE cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'Implementation' THEN RAISE EXCEPTION 'project member edit was absorbed into baseline: %', value; END IF;
  SELECT generation_baseline->>'habit_name' INTO value FROM public.habits
    WHERE cycle_id = v_cycle_id AND generation_key = 'habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'Duplicate' THEN RAISE EXCEPTION 'habit member edit was absorbed into baseline: %', value; END IF;
  SELECT generation_baseline->>'task_text' INTO value FROM public.tasks
    WHERE cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'Task B' THEN RAISE EXCEPTION 'task member edit was absorbed into baseline: %', value; END IF;

  payload4 := jsonb_set(jsonb_set(payload3, '{expected_version}', '3'), '{cycle,goal}', '"Version four goal"');
  payload4 := jsonb_set(payload4, '{generated_projects,1,name}', '"Generator C project"');
  payload4 := jsonb_set(payload4, '{generated_habits,1,habit_name}', '"Generator C habit"');
  payload4 := jsonb_set(payload4, '{generated_tasks,1,task_text}', '"Generator C task"');
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', payload4);
  IF (receipt2->>'version')::int <> 4 THEN RAISE EXCEPTION 'baseline C proposal did not reach version 4'; END IF;
  SELECT name INTO value FROM public.projects WHERE cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'Member adopted implementation' THEN RAISE EXCEPTION 'project B was absorbed then overwritten by C'; END IF;
  SELECT habit_name INTO value FROM public.habits WHERE cycle_id = v_cycle_id AND generation_key = 'habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'Member adopted follow up' THEN RAISE EXCEPTION 'habit B was absorbed then overwritten by C'; END IF;
  SELECT task_text INTO value FROM public.tasks WHERE cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'Member edited B' THEN RAISE EXCEPTION 'task B was absorbed then overwritten by C'; END IF;

  payload5 := jsonb_set(jsonb_set(payload4, '{expected_version}', '4'), '{cycle,goal}', '"Version five goal"');
  payload5 := jsonb_set(payload5, '{generated_tasks}', '[]');
  payload5 := jsonb_set(payload5, '{generated_projects}', '[]');
  payload5 := jsonb_set(payload5, '{generated_habits}', '[]');
  PERFORM public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', payload5);
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-a';
  IF value <> 'true' THEN RAISE EXCEPTION 'removed completed task retired'; END IF;
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-b';
  IF value <> 'true' THEN RAISE EXCEPTION 'removed member-edited task retired'; END IF;
  SELECT generation_active::text INTO value FROM public.tasks WHERE public.tasks.cycle_id = v_cycle_id AND generation_key = 'task-c';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed task not retired'; END IF;
  SELECT generation_active::text INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'implementation';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-edited project retired'; END IF;
  SELECT generation_active::text INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed duplicate project not retired'; END IF;
  SELECT generation_active::text INTO value FROM public.projects WHERE public.projects.cycle_id = v_cycle_id AND generation_key = 'supporting-project:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF value <> 'true' THEN RAISE EXCEPTION 'completed reordered project retired'; END IF;
  SELECT generation_active::text INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-edited habit retired'; END IF;
  SELECT generation_active::text INTO value FROM public.habits WHERE public.habits.cycle_id = v_cycle_id AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF value <> 'false' THEN RAISE EXCEPTION 'untouched removed habit not retired'; END IF;

  -- Generator-owned retired rows reactivate under the same stable keys and
  -- reverse only the archive/delete state written by reconciliation.
  payload6 := jsonb_set(jsonb_set(payload5, '{expected_version}', '5'), '{cycle,goal}', '"Version six reactivation"');
  payload6 := jsonb_set(payload6, '{generated_projects}', $json$[
    {"generation_key":"supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","name":"Duplicate","description":"Generated supporting"}
  ]$json$::jsonb);
  payload6 := jsonb_set(payload6, '{generated_habits}', $json$[
    {"generation_key":"habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2","habit_name":"Duplicate","category":"planning","display_order":0}
  ]$json$::jsonb);
  payload6 := jsonb_set(payload6, '{generated_tasks}', $json$[
    {"generation_key":"task-c","project_generation_key":"supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1","task_text":"Task C","priority":"high","category":"cycle-plan","context_tags":["cycle-plan"]}
  ]$json$::jsonb);
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', payload6);
  IF (receipt2->>'reactivated_generated_project_count')::int <> 1
     OR (receipt2->>'reactivated_generated_habit_count')::int <> 1
     OR (receipt2->>'reactivated_generated_task_count')::int <> 1 THEN
    RAISE EXCEPTION 'safe reactivation receipt was not truthful: %', receipt2;
  END IF;
  SELECT (generation_active AND status = 'active' AND generation_retired_at IS NULL)::text INTO value
    FROM public.projects WHERE cycle_id = v_cycle_id AND generation_key = 'supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'true' THEN RAISE EXCEPTION 'generator-retired project did not reactivate visibly'; END IF;
  SELECT (generation_active AND is_active AND deleted_at IS NULL AND generation_retired_at IS NULL)::text INTO value
    FROM public.habits WHERE cycle_id = v_cycle_id AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF value <> 'true' THEN RAISE EXCEPTION 'generator-retired habit did not reactivate visibly'; END IF;
  SELECT (generation_active AND deleted_at IS NULL AND generation_retired_at IS NULL)::text INTO value
    FROM public.tasks WHERE cycle_id = v_cycle_id AND generation_key = 'task-c';
  IF value <> 'true' THEN RAISE EXCEPTION 'generator-retired task did not reactivate visibly'; END IF;

  -- Retire again, then modify each row while inactive. Reintroduction must
  -- preserve human state, remain inactive, and report the fail-closed result.
  payload7 := jsonb_set(jsonb_set(payload6, '{expected_version}', '6'), '{cycle,goal}', '"Version seven retire again"');
  payload7 := jsonb_set(payload7, '{generated_projects}', '[]');
  payload7 := jsonb_set(payload7, '{generated_habits}', '[]');
  payload7 := jsonb_set(payload7, '{generated_tasks}', '[]');
  PERFORM public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', payload7);
  UPDATE public.projects SET name = 'Member archived project', updated_at = now() + interval '1 second'
    WHERE cycle_id = v_cycle_id AND generation_key = 'supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  UPDATE public.habits SET habit_name = 'Member deleted habit', updated_at = now() + interval '1 second'
    WHERE cycle_id = v_cycle_id AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  UPDATE public.tasks SET task_text = 'Member deleted task', updated_at = now() + interval '1 second'
    WHERE cycle_id = v_cycle_id AND generation_key = 'task-c';
  payload8 := jsonb_set(jsonb_set(payload6, '{expected_version}', '7'), '{cycle,goal}', '"Version eight unsafe reactivation"');
  receipt2 := public.reconcile_cycle_plan_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', payload8);
  IF (receipt2->>'preserved_inactive_generated_project_count')::int <> 1
     OR (receipt2->>'preserved_inactive_generated_habit_count')::int <> 1
     OR (receipt2->>'preserved_inactive_generated_task_count')::int <> 1
     OR jsonb_array_length(receipt2->'generation_reactivation_conflicts') <> 3 THEN
    RAISE EXCEPTION 'unsafe reactivation receipt was not truthful: %', receipt2;
  END IF;
  SELECT (NOT generation_active AND status = 'archived' AND name = 'Member archived project')::text INTO value
    FROM public.projects WHERE cycle_id = v_cycle_id AND generation_key = 'supporting-project:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-modified retired project was reactivated or overwritten'; END IF;
  SELECT (NOT generation_active AND NOT is_active AND deleted_at IS NOT NULL AND habit_name = 'Member deleted habit')::text INTO value
    FROM public.habits WHERE cycle_id = v_cycle_id AND generation_key = 'habit:22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-modified retired habit was reactivated or overwritten'; END IF;
  SELECT (NOT generation_active AND deleted_at IS NOT NULL AND task_text = 'Member deleted task')::text INTO value
    FROM public.tasks WHERE cycle_id = v_cycle_id AND generation_key = 'task-c';
  IF value <> 'true' THEN RAISE EXCEPTION 'member-modified retired task was reactivated or overwritten'; END IF;

  conflict := public.reconcile_cycle_plan_v2(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    jsonb_set(jsonb_set(payload8, '{expected_version}', '7'), '{cycle,goal}', '"Stale overwrite"')
  );
  IF conflict->>'conflict_kind' <> 'stale_version' OR (conflict->>'current_version')::int <> 8 THEN
    RAISE EXCEPTION 'stale expected version not rejected: %', conflict;
  END IF;

  -- Cloud saves are true CAS operations: legacy exact receipt, lost-response
  -- retry, revision reuse conflict, stale v2 save, and verified-absence create.
  INSERT INTO public.cycle_drafts(id, user_id, draft_data, updated_at)
  VALUES ('aaaaaaaa-0000-4000-8000-000000000001', alice, '{"goal":"legacy"}', '2026-08-20T12:00:00Z');
  conflict := public.delete_cycle_draft_conditionally_v2(
    'aaaaaaaa-0000-4000-8000-000000000001', '2026-08-20T11:59:59Z', NULL, NULL, NULL, false
  );
  IF conflict->>'conflict_kind' <> 'draft_changed' THEN
    RAISE EXCEPTION 'stale legacy draft timestamp was not rejected: %', conflict;
  END IF;
  SELECT count(*) INTO n FROM public.cycle_drafts WHERE user_id = alice;
  IF n <> 1 THEN RAISE EXCEPTION 'stale legacy delete removed the recovery row'; END IF;
  receipt2 := public.save_cycle_draft_v2(
    '{"goal":"legacy promoted"}', 2, 'aaaaaaaa-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'aaaaaaaa-5555-4555-8555-555555555551',
    'aaaaaaaa-0000-4000-8000-000000000001', '2026-08-20T12:00:00Z', NULL, false
  );
  IF NOT COALESCE((receipt2->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'exact legacy draft save did not return a receipt: %', receipt2;
  END IF;
  replay := public.save_cycle_draft_v2(
    '{"goal":"legacy promoted"}', 2, 'aaaaaaaa-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'aaaaaaaa-5555-4555-8555-555555555551',
    'aaaaaaaa-0000-4000-8000-000000000001', '2026-08-20T12:00:00Z', NULL, false
  );
  IF NOT COALESCE((replay->>'replayed')::boolean, false)
     OR replay->>'updated_at' <> receipt2->>'updated_at' THEN
    RAISE EXCEPTION 'lost-response exact draft retry was not idempotent: %', replay;
  END IF;
  conflict := public.save_cycle_draft_v2(
    '{"goal":"same revision different content"}', 2, 'aaaaaaaa-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'aaaaaaaa-5555-4555-8555-555555555551',
    'aaaaaaaa-0000-4000-8000-000000000001', '2026-08-20T12:00:00Z', NULL, false
  );
  IF conflict->>'conflict_kind' <> 'draft_revision_reused' THEN
    RAISE EXCEPTION 'same revision with different content was not rejected: %', conflict;
  END IF;
  replay := public.save_cycle_draft_v2(
    '{"goal":"newer v2"}', 3, 'aaaaaaaa-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'aaaaaaaa-5555-4555-8555-555555555552',
    (receipt2->>'id')::uuid, (receipt2->>'updated_at')::timestamptz,
    (receipt2->>'draft_revision')::uuid, false
  );
  IF NOT COALESCE((replay->>'success')::boolean, false) THEN RAISE EXCEPTION 'exact v2 save failed'; END IF;
  conflict := public.save_cycle_draft_v2(
    '{"goal":"stale tab overwrite"}', 4, 'aaaaaaaa-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'aaaaaaaa-5555-4555-8555-555555555553',
    (receipt2->>'id')::uuid, (receipt2->>'updated_at')::timestamptz,
    (receipt2->>'draft_revision')::uuid, false
  );
  IF conflict->>'conflict_kind' <> 'draft_changed' THEN
    RAISE EXCEPTION 'stale v2 save was not rejected: %', conflict;
  END IF;
  SELECT draft_data->>'goal' INTO value FROM public.cycle_drafts WHERE user_id = alice;
  IF value <> 'newer v2' THEN RAISE EXCEPTION 'stale v2 save mutated the row'; END IF;
  conflict := public.delete_cycle_draft_conditionally_v2(
    (replay->>'id')::uuid, (replay->>'updated_at')::timestamptz,
    (replay->>'draft_revision')::uuid, (replay->>'logical_plan_key')::uuid,
    (replay->>'request_id')::uuid, false
  );
  IF NOT COALESCE((conflict->>'deleted')::boolean, false) THEN
    RAISE EXCEPTION 'exact v2 draft cleanup failed: %', conflict;
  END IF;
  receipt2 := public.delete_cycle_draft_conditionally_v2(NULL, NULL, NULL, NULL, NULL, true);
  IF NOT COALESCE((receipt2->>'verified_absent')::boolean, false) THEN
    RAISE EXCEPTION 'cloud draft no-row was not verified: %', receipt2;
  END IF;
  receipt2 := public.save_cycle_draft_v2(
    '{"goal":"created after verified absence"}', 1, NULL, NULL,
    'aaaaaaaa-5555-4555-8555-555555555554', NULL, NULL, NULL, true
  );
  conflict := public.save_cycle_draft_v2(
    '{"goal":"losing create race"}', 1, NULL, NULL,
    'aaaaaaaa-5555-4555-8555-555555555555', NULL, NULL, NULL, true
  );
  IF conflict->>'conflict_kind' <> 'draft_created_elsewhere' THEN
    RAISE EXCEPTION 'verified-absence create race did not reject loser: %', conflict;
  END IF;
  SELECT draft_data->>'goal' INTO value FROM public.cycle_drafts WHERE user_id = alice;
  IF value <> 'created after verified absence' THEN RAISE EXCEPTION 'losing create race mutated winner'; END IF;
  conflict := public.delete_cycle_draft_conditionally_v2(
    (receipt2->>'id')::uuid, (receipt2->>'updated_at')::timestamptz,
    (receipt2->>'draft_revision')::uuid, NULL, NULL, false
  );
  IF NOT COALESCE((conflict->>'deleted')::boolean, false) THEN
    RAISE EXCEPTION 'created draft cleanup failed: %', conflict;
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

DO $$
DECLARE
  dana uuid := '44444444-4444-4444-8444-444444444444';
  erin uuid := '55555555-5555-4555-8555-555555555555';
  fran uuid := '66666666-6666-4666-8666-666666666666';
  legacy_cycle uuid;
  receipt jsonb;
  payload jsonb := $json${
    "payload_version":"cycle-plan-v2",
    "logical_plan_key":"44444444-1111-4111-8111-111111111111",
    "expected_version":null,
    "cycle":{"start_date":"2028-04-10","end_date":"2028-07-09","goal":"Legacy adoption goal"},
    "strategy":{},"offers":[],"limited_offers":[],"revenue_plan":{},"month_plans":[],
    "generated_projects":[],"generated_habits":[],"generated_tasks":[],"daily_plans":[],"details":{}
  }$json$::jsonb;
  n integer;
BEGIN
  -- One compatible pre-v2 row is adopted into the v2 intent authority.
  INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal)
  VALUES (dana, '2028-04-01', '2028-06-29', 'Legacy Dana') RETURNING cycle_id INTO legacy_cycle;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', dana, 'role', 'authenticated')::text, false);
  receipt := public.reconcile_cycle_plan_v2('44444444-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload);
  IF receipt->>'status' <> 'complete' OR (receipt->>'cycle_id')::uuid <> legacy_cycle THEN
    RAISE EXCEPTION 'compatible legacy cycle was not adopted: %', receipt;
  END IF;
  SELECT count(*) INTO n FROM public.cycles_90_day WHERE user_id = dana
    AND date_trunc('quarter', start_date)::date = '2028-04-01';
  IF n <> 1 THEN RAISE EXCEPTION 'legacy adoption created a duplicate cycle'; END IF;
  IF public.reconcile_cycle_plan_v2('44444444-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload) IS DISTINCT FROM receipt THEN
    RAISE EXCEPTION 'legacy adoption retry did not return the canonical receipt';
  END IF;

  -- A single row already carrying unexplained v2 state fails closed.
  INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal, reconciliation_version)
  VALUES (erin, '2028-04-02', '2028-06-30', 'Conflicting Erin', 2);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', erin, 'role', 'authenticated')::text, false);
  payload := jsonb_set(payload, '{logical_plan_key}', '"55555555-1111-4111-8111-111111111111"');
  receipt := public.reconcile_cycle_plan_v2('55555555-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload);
  IF receipt->>'conflict_kind' <> 'owner_quarter_cycle_conflict'
     OR NOT COALESCE((receipt->>'requires_review')::boolean, false) THEN
    RAISE EXCEPTION 'conflicting existing cycle did not fail closed: %', receipt;
  END IF;
  SELECT count(*) INTO n FROM public.cycles_90_day WHERE user_id = erin;
  IF n <> 1 THEN RAISE EXCEPTION 'conflicting existing cycle produced a duplicate'; END IF;

  -- Multiple legacy rows are ambiguous and cannot be guessed or merged.
  INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal) VALUES
    (fran, '2028-04-03', '2028-07-01', 'Ambiguous one'),
    (fran, '2028-05-03', '2028-08-01', 'Ambiguous two');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', fran, 'role', 'authenticated')::text, false);
  payload := jsonb_set(payload, '{logical_plan_key}', '"66666666-1111-4111-8111-111111111111"');
  receipt := public.reconcile_cycle_plan_v2('66666666-aaaa-4aaa-8aaa-aaaaaaaaaaa1', payload);
  IF receipt->>'conflict_kind' <> 'ambiguous_owner_quarter_cycles'
     OR jsonb_array_length(receipt->'cycle_ids') <> 2 THEN
    RAISE EXCEPTION 'ambiguous legacy cycles did not fail closed: %', receipt;
  END IF;
  SELECT count(*) INTO n FROM public.cycles_90_day WHERE user_id = fran;
  IF n <> 2 THEN RAISE EXCEPTION 'ambiguous legacy conflict changed source cycles'; END IF;

  -- Supplying another owner's otherwise-compatible cycle never adopts or alters it.
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', erin, 'role', 'authenticated')::text, false);
  payload := jsonb_set(payload, '{logical_plan_key}', '"55555555-2222-4222-8222-222222222222"');
  payload := jsonb_set(payload, '{cycle_id}', to_jsonb(legacy_cycle::text));
  BEGIN
    PERFORM public.reconcile_cycle_plan_v2('55555555-bbbb-4bbb-8bbb-bbbbbbbbbbb2', payload);
    RAISE EXCEPTION 'another owner cycle was adopted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
DO $$
DECLARE
  n integer;
  receipts_before integer;
  draft_receipt jsonb;
  privilege_name text;
  private_table text;
BEGIN
  SELECT count(*) INTO n
  FROM public.cycle_plan_reconciliation_requests_v2
  WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF n <> 0 THEN RAISE EXCEPTION 'Alice read Bob receipt rows'; END IF;
  FOREACH private_table IN ARRAY ARRAY[
    'cycle_drafts', 'cycle_plan_intents_v2', 'cycle_plan_identity_aliases_v2',
    'cycle_plan_reconciliation_requests_v2'
  ] LOOP
    FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege('authenticated', 'public.' || private_table, privilege_name)
         OR has_table_privilege('anon', 'public.' || private_table, privilege_name) THEN
        RAISE EXCEPTION 'direct private-table privilege %.% survived revocation', private_table, privilege_name;
      END IF;
    END LOOP;
  END LOOP;
  SELECT count(*) INTO receipts_before FROM public.cycle_plan_reconciliation_requests_v2;
  BEGIN
    TRUNCATE TABLE public.cycle_plan_reconciliation_requests_v2;
    RAISE EXCEPTION 'authenticated TRUNCATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.cycle_plan_reconciliation_requests_v2;
  IF n <> receipts_before OR n = 0 THEN
    RAISE EXCEPTION 'receipt ledger did not survive denied TRUNCATE: before %, after %', receipts_before, n;
  END IF;
  BEGIN
    INSERT INTO public.cycle_plan_reconciliation_requests_v2(
      request_id, user_id, plan_id, payload_hash, content_hash, payload_version, status
    ) SELECT gen_random_uuid(), user_id, plan_id, repeat('a', 64), repeat('b', 64), 'cycle-plan-v2', 'complete'
      FROM public.cycle_plan_intents_v2 LIMIT 1;
    RAISE EXCEPTION 'member forged receipt ledger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.cycle_drafts(user_id, draft_data)
    VALUES ('11111111-1111-1111-1111-111111111111', '{"forged":true}');
    RAISE EXCEPTION 'authenticated direct draft INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.cycle_drafts SET draft_data = '{"forged":true}'
    WHERE user_id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'authenticated direct draft UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.cycle_drafts
    WHERE user_id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'authenticated direct draft DELETE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  draft_receipt := public.save_cycle_draft_v2(
    '{"goal":"RPC allowed"}', 1, NULL, NULL,
    '11111111-5555-4555-8555-555555555555', NULL, NULL, NULL, true
  );
  IF NOT COALESCE((draft_receipt->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'authenticated draft RPC was not executable: %', draft_receipt;
  END IF;
  SELECT count(*) INTO n FROM public.cycle_drafts
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF n <> 1 THEN RAISE EXCEPTION 'owner SELECT did not expose exact RPC-created draft'; END IF;
END $$;
RESET ROLE;

\echo 'PASS cycle plan reconciliation v2 PostgreSQL behavior'
