-- ===========================================
-- RLS SECURITY TEST SUITE
-- Comprehensive test to verify RLS policies prevent data leaks
-- Tests core tables for SELECT, INSERT, UPDATE, DELETE protection
-- ===========================================

DO $$
DECLARE
  test_user_1 UUID := '10000000-0000-0000-0000-000000000001';
  test_user_2 UUID := '20000000-0000-0000-0000-000000000002';
  test_results TEXT := '';
  passed_count INT := 0;
  failed_count INT := 0;
  
  test_task_id UUID;
  test_project_id UUID;
  test_journal_id UUID;
  
  row_count INT;
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RLS SECURITY TEST SUITE';
  RAISE NOTICE 'Testing data isolation between users';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';

  -- ========================================
  -- SETUP: Create test data for User 1
  -- ========================================
  
  RAISE NOTICE 'Setting up test data...';
  
  test_task_id := gen_random_uuid();
  test_project_id := gen_random_uuid();
  test_journal_id := gen_random_uuid();
  
  INSERT INTO public.tasks (task_id, user_id, task_text, status, created_at)
  VALUES (test_task_id, test_user_1, 'User 1 Secret Task', 'todo', NOW());
  
  INSERT INTO public.projects (id, user_id, name, created_at)
  VALUES (test_project_id, test_user_1, 'User 1 Secret Project', NOW());
  
  INSERT INTO public.journal_pages (id, user_id, title, created_at)
  VALUES (test_journal_id, test_user_1, 'User 1 Secret Journal', NOW());

  RAISE NOTICE 'Test data created ✓';
  RAISE NOTICE '';

  -- ========================================
  -- TEST 1: Tasks - User 2 cannot see User 1 data
  -- ========================================
  
  RAISE NOTICE 'TEST 1: Tasks table RLS';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  SELECT COUNT(*) INTO row_count FROM public.tasks WHERE user_id = test_user_1;
  
  IF row_count = 0 THEN
    test_results := test_results || '✅ Tasks: User 2 cannot see User 1 data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ CRITICAL: User 2 can see User 1 tasks!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- TEST 2: Projects - User 2 cannot see User 1 data
  -- ========================================
  
  RAISE NOTICE 'TEST 2: Projects table RLS';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  SELECT COUNT(*) INTO row_count FROM public.projects WHERE user_id = test_user_1;
  
  IF row_count = 0 THEN
    test_results := test_results || '✅ Projects: User 2 cannot see User 1 data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ CRITICAL: User 2 can see User 1 projects!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- TEST 3: Journal Pages - User 2 cannot see User 1 data
  -- ========================================
  
  RAISE NOTICE 'TEST 3: Journal Pages table RLS';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  SELECT COUNT(*) INTO row_count FROM public.journal_pages WHERE user_id = test_user_1;
  
  IF row_count = 0 THEN
    test_results := test_results || '✅ Journal Pages: User 2 cannot see User 1 data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ CRITICAL: User 2 can see User 1 journal pages!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- TEST 4: User 1 CAN see their own data
  -- ========================================
  
  RAISE NOTICE 'TEST 4: User can see own data';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_1::text, 'role', 'authenticated')::text, true);
  
  SELECT COUNT(*) INTO row_count FROM public.tasks WHERE user_id = test_user_1;
  
  IF row_count > 0 THEN
    test_results := test_results || '✅ User 1 can see their own data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ FAIL: User 1 cannot see their own tasks!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- TEST 5: INSERT Protection
  -- ========================================
  
  RAISE NOTICE 'TEST 5: INSERT protection';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  BEGIN
    INSERT INTO public.tasks (task_id, user_id, task_text, status)
    VALUES (gen_random_uuid(), test_user_1, 'Malicious Task', 'todo');
    
    test_results := test_results || '❌ CRITICAL: User 2 can INSERT as User 1!' || E'\n';
    failed_count := failed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || '✅ INSERT protection: User 2 cannot insert as User 1' || E'\n';
    passed_count := passed_count + 1;
  END;
  
  RESET ROLE;

  -- ========================================
  -- TEST 6: UPDATE Protection
  -- ========================================
  
  RAISE NOTICE 'TEST 6: UPDATE protection';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  UPDATE public.tasks SET task_text = 'Hacked!' WHERE task_id = test_task_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count = 0 THEN
    test_results := test_results || '✅ UPDATE protection: User 2 cannot update User 1 data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ CRITICAL: User 2 can UPDATE User 1 data!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- TEST 7: DELETE Protection
  -- ========================================
  
  RAISE NOTICE 'TEST 7: DELETE protection';
  
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_2::text, 'role', 'authenticated')::text, true);
  
  DELETE FROM public.tasks WHERE task_id = test_task_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count = 0 THEN
    test_results := test_results || '✅ DELETE protection: User 2 cannot delete User 1 data' || E'\n';
    passed_count := passed_count + 1;
  ELSE
    test_results := test_results || '❌ CRITICAL: User 2 can DELETE User 1 data!' || E'\n';
    failed_count := failed_count + 1;
  END IF;
  
  RESET ROLE;

  -- ========================================
  -- CLEANUP
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE 'Cleaning up test data...';
  
  DELETE FROM public.tasks WHERE user_id IN (test_user_1, test_user_2);
  DELETE FROM public.projects WHERE user_id IN (test_user_1, test_user_2);
  DELETE FROM public.journal_pages WHERE user_id IN (test_user_1, test_user_2);
  
  RAISE NOTICE 'Cleanup complete ✓';

  -- ========================================
  -- RESULTS
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'TEST RESULTS';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '%', test_results;
  RAISE NOTICE 'Passed: % | Failed: %', passed_count, failed_count;
  RAISE NOTICE '===========================================';
  
  IF failed_count > 0 THEN
    RAISE EXCEPTION E'\n❌ SECURITY VULNERABILITIES DETECTED! % test(s) failed.\nFIX IMMEDIATELY!\n', failed_count;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL TESTS PASSED - RLS is properly configured';
    RAISE NOTICE '';
  END IF;
  
END $$;