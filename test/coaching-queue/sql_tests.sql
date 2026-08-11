\echo 'coaching queue behavior tests'

INSERT INTO auth.users(id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'faith@example.com'),
  ('11111111-1111-1111-1111-111111111111', 'avery@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'jordan@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'morgan@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'riley@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'casey@example.com');
INSERT INTO public.admin_users(user_id) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
INSERT INTO public.user_profiles(id, email, first_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'avery@example.com', 'Avery'),
  ('22222222-2222-2222-2222-222222222222', 'jordan@example.com', 'Jordan'),
  ('33333333-3333-3333-3333-333333333333', 'morgan@example.com', 'Morgan'),
  ('44444444-4444-4444-4444-444444444444', 'riley@example.com', 'Riley'),
  ('55555555-5555-5555-5555-555555555555', 'casey@example.com', 'Casey');
INSERT INTO public.cycles_90_day(cycle_id, user_id, start_date, end_date, goal, focus_area, biggest_bottleneck)
VALUES
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', current_date - 10, current_date + 80, 'Sell ten spots', 'sell', 'Offer clarity'),
  ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', current_date - 10, current_date + 80, 'Launch the offer', 'offer', 'Decision overload');
INSERT INTO public.cycle_success_path_snapshots(user_id, cycle_id, current_milestone_title, capacity_mode)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Validate the offer', 'minimum');
INSERT INTO public.weekly_reviews(user_id, wins, challenges)
VALUES ('11111111-1111-1111-1111-111111111111', 'Sent the invitation', 'Positioning feels muddy');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
SELECT public.create_coaching_call('Current coaching call', now() - interval '5 minutes', now() - interval '5 minutes') AS current_call_id \gset
SELECT public.create_coaching_call('Next coaching call', now() + interval '7 days', now() + interval '7 days') AS next_call_id \gset
SELECT set_config('fixture.current_call_id', :'current_call_id', false);
SELECT set_config('fixture.next_call_id', :'next_call_id', false);

-- Historical coaching gives Avery one prior session; the other members have never been coached.
INSERT INTO public.coaching_calls(call_id, title, starts_at, queue_opens_at, queue_closes_at, status, created_by)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Old call', now() - interval '100 days', now() - interval '100 days', now() - interval '100 days' + interval '15 minutes', 'completed', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
INSERT INTO public.coaching_requests(request_id, user_id, call_id, question, status, joined_at)
VALUES ('eeeeeeee-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Historical question', 'coached', now() - interval '100 days');
INSERT INTO public.coaching_outcomes(request_id, user_id, disposition, main_decision, next_action, created_by, coached_at, acknowledged_at)
VALUES ('eeeeeeee-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'completed', 'Old decision', 'Old next action', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() - interval '100 days', now() - interval '99 days');

-- Non-live outcomes are retained as history but do not count as completed coaching
-- in the canonical live-queue rank.
INSERT INTO public.coaching_requests(request_id, user_id, call_id, question, status, joined_at)
VALUES
  ('eeeeeeee-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Ask Faith history', 'ask_faith', now() - interval '1 day'),
  ('eeeeeeee-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Private written history', 'private_written', now() - interval '2 days');
INSERT INTO public.coaching_outcomes(request_id, user_id, disposition, main_decision, created_by, coached_at)
VALUES
  ('eeeeeeee-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'ask_faith', 'Escalated to Ask Faith', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() - interval '1 day'),
  ('eeeeeeee-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'private_written', 'Answered privately', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() - interval '2 days');

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
SELECT public.save_my_coaching_request(
  :'current_call_id', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Which offer should I lead with?',
  'Choose one offer', 'Reviewed both offers', 'Second guessing', NULL, 'live', false, true, false,
  'live_queue', false, NULL
) AS request_a \gset
SELECT set_config('fixture.request_a', :'request_a', false);
SELECT public.join_my_coaching_queue(:'request_a');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SELECT public.save_my_coaching_request(
  :'current_call_id', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Should I simplify Friday launch?',
  'Decide today', 'Reduced the scope', 'Deadline pressure', current_date + 2, 'live', false, false, false,
  'live_queue', false, NULL
) AS request_b \gset
SELECT set_config('fixture.request_b', :'request_b', false);
SELECT public.join_my_coaching_queue(:'request_b');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
SELECT public.save_my_coaching_request(
  :'current_call_id', NULL, 'How do I restart after stepping away?',
  'Choose a tiny restart', NULL, 'Low momentum', NULL, 'unsure', true, false, false,
  'live_queue', true, NULL
) AS request_c \gset
SELECT set_config('fixture.request_c', :'request_c', false);
SELECT public.join_my_coaching_queue(:'request_c');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
SELECT (public.save_and_join_my_coaching_queue(
  :'current_call_id', NULL, 'Question after Ask Faith history', NULL, NULL, NULL, NULL,
  'live', false, false, false, false, NULL
)->>'request_id') AS request_d \gset
SELECT set_config('fixture.request_d', :'request_d', false);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', false);
SELECT (public.save_and_join_my_coaching_queue(
  :'current_call_id', NULL, 'Question after private written history', NULL, NULL, NULL, NULL,
  'live', false, false, false, false, NULL
)->>'request_id') AS request_e \gset
SELECT set_config('fixture.request_e', :'request_e', false);
RESET ROLE;

DO $$
DECLARE v_queue jsonb; v_first text; v_wait_before timestamptz; v_wait_after timestamptz;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
  v_queue := public.get_admin_coaching_queue(current_setting('fixture.current_call_id')::uuid);
  IF jsonb_array_length(v_queue) <> 5 THEN RAISE EXCEPTION 'expected 5 queued cards: %', v_queue; END IF;
  v_first := v_queue->0->>'member_name';
  IF v_first <> 'Jordan' THEN RAISE EXCEPTION 'never-coached deadline member should lead, got %', v_first; END IF;
  IF v_queue->0 ? 'manual_priority_reason' IS FALSE THEN RAISE EXCEPTION 'admin card contract incomplete'; END IF;

  SELECT waiting_since INTO v_wait_before FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_b')::uuid;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
  PERFORM public.save_my_coaching_request(
    current_setting('fixture.current_call_id')::uuid, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Updated question without losing wait time',
    'Decide today', 'Reduced scope again', 'Deadline pressure', current_date + 2, 'live', false, false, false,
    'live_queue', false, NULL
  );
  SELECT waiting_since INTO v_wait_after FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_b')::uuid;
  IF v_wait_before <> v_wait_after THEN RAISE EXCEPTION 'updating a request reset its original waiting date'; END IF;
END $$;

-- Mixed completed / Ask Faith / private-written history must produce exactly
-- the same position for Faith and the queued member.
DO $$
DECLARE v_queue jsonb; v_d integer; v_e integer; v_d_count integer; v_e_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
  v_queue := public.get_admin_coaching_queue(current_setting('fixture.current_call_id')::uuid);
  SELECT (entry->>'queue_position')::integer INTO v_d
  FROM jsonb_array_elements(v_queue) entry WHERE entry->>'user_id' = '44444444-4444-4444-4444-444444444444';
  SELECT (entry->>'queue_position')::integer INTO v_e
  FROM jsonb_array_elements(v_queue) entry WHERE entry->>'user_id' = '55555555-5555-5555-5555-555555555555';
  IF v_d IS NULL OR v_e IS NULL THEN RAISE EXCEPTION 'admin mixed-disposition positions missing: %', v_queue; END IF;
  PERFORM set_config('fixture.admin_d_position', v_d::text, false);
  PERFORM set_config('fixture.admin_e_position', v_e::text, false);

  SELECT coached_count INTO v_d_count FROM public.coaching_queue_ranked(current_setting('fixture.current_call_id')::uuid)
  WHERE user_id = '44444444-4444-4444-4444-444444444444';
  SELECT coached_count INTO v_e_count FROM public.coaching_queue_ranked(current_setting('fixture.current_call_id')::uuid)
  WHERE user_id = '55555555-5555-5555-5555-555555555555';
  IF v_d_count <> 0 OR v_e_count <> 0 THEN
    RAISE EXCEPTION 'non-completed outcomes changed canonical coaching counts: D=%, E=%', v_d_count, v_e_count;
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
DO $$ DECLARE v_status jsonb; BEGIN
  v_status := public.get_my_coaching_queue_status(current_setting('fixture.current_call_id')::uuid);
  IF (v_status->>'position')::integer <> current_setting('fixture.admin_d_position')::integer THEN
    RAISE EXCEPTION 'Ask Faith history member/admin position mismatch: member %, admin %', v_status->>'position', current_setting('fixture.admin_d_position');
  END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', false);
DO $$ DECLARE v_status jsonb; BEGIN
  v_status := public.get_my_coaching_queue_status(current_setting('fixture.current_call_id')::uuid);
  IF (v_status->>'position')::integer <> current_setting('fixture.admin_e_position')::integer THEN
    RAISE EXCEPTION 'private-written history member/admin position mismatch: member %, admin %', v_status->>'position', current_setting('fixture.admin_e_position');
  END IF;
END $$;
RESET ROLE;

-- Authenticated members cannot bypass RPC validation or read another member's request.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_b')::uuid;
  IF v_count <> 0 THEN RAISE EXCEPTION 'member read another member request'; END IF;
  BEGIN
    INSERT INTO public.coaching_requests(user_id, call_id, question)
    VALUES ('11111111-1111-1111-1111-111111111111', current_setting('fixture.next_call_id')::uuid, 'Bypass attempt');
    RAISE EXCEPTION 'direct member insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.coaching_queue_ranked(current_setting('fixture.current_call_id')::uuid);
    RAISE EXCEPTION 'member directly executed the internal ranking helper';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
COMMIT;

-- Withdrawn members can intentionally resubmit for the same call without losing their wait history.
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
DO $$
DECLARE v_before timestamptz; v_receipt jsonb; v_after timestamptz; v_withdrawn timestamptz;
BEGIN
  SELECT waiting_since INTO v_before FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_b')::uuid;
  PERFORM public.withdraw_my_coaching_request(current_setting('fixture.request_b')::uuid);
  v_receipt := public.save_and_join_my_coaching_queue(
    current_setting('fixture.current_call_id')::uuid, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Resubmitted deadline question', 'Decide today', 'Reduced scope again', 'Deadline pressure',
    current_date + 2, 'live', false, false, false, false, NULL
  );
  IF v_receipt->>'request_id' <> current_setting('fixture.request_b') OR (v_receipt->>'joined')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'withdraw/resubmit did not return the original joined request: %', v_receipt;
  END IF;
  SELECT waiting_since, withdrawn_at INTO v_after, v_withdrawn
  FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_b')::uuid;
  IF v_after <> v_before OR v_withdrawn IS NOT NULL THEN RAISE EXCEPTION 'resubmit lost fairness history or stayed withdrawn'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE v_events integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.coaching_queue_events
  WHERE request_id = current_setting('fixture.request_b')::uuid AND event_type = 'resubmitted';
  IF v_events <> 1 THEN RAISE EXCEPTION 'resubmission audit event missing'; END IF;
END $$;

-- Manual override is audited and changes ordering without exposing a score to members.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
SELECT public.set_coaching_priority_override(:'request_a', 1, 'Useful follow-up from previous coaching');
DO $$
DECLARE v_queue jsonb;
BEGIN
  v_queue := public.get_admin_coaching_queue(current_setting('fixture.current_call_id')::uuid);
  IF v_queue->0->>'request_id' <> current_setting('fixture.request_a') THEN RAISE EXCEPTION 'manual override did not move request'; END IF;
END $$;

-- Completion writes one durable outcome and one Planner task; replay is idempotent.
SELECT public.complete_coaching_request(
  :'request_a', 'completed', 'Lead with the validated offer', 'Send five personal invitations',
  current_date + 3, 'Offer validation training', true, NULL, true
);
SELECT public.complete_coaching_request(
  :'request_a', 'completed', 'Lead with the validated offer', 'Send five personal invitations',
  current_date + 3, 'Offer validation training', true, NULL, true
);
DO $$
DECLARE v_count integer; v_followups jsonb; v_outcome_id uuid; v_result text;
BEGIN
  SELECT count(*) INTO v_count FROM public.coaching_outcomes WHERE request_id = current_setting('fixture.request_a')::uuid;
  IF v_count <> 1 THEN RAISE EXCEPTION 'outcome replay duplicated row'; END IF;
  SELECT count(*) INTO v_count FROM public.tasks WHERE external_id = 'coaching:' || current_setting('fixture.request_a');
  IF v_count <> 1 THEN RAISE EXCEPTION 'outcome replay duplicated Planner task'; END IF;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
  v_followups := public.get_my_pending_coaching_followups();
  IF jsonb_array_length(v_followups) <> 1 OR v_followups->0->>'next_action' <> 'Send five personal invitations' THEN
    RAISE EXCEPTION 'member follow-up contract missing: %', v_followups;
  END IF;
  v_outcome_id := (v_followups->0->>'outcome_id')::uuid;
  PERFORM public.log_my_coaching_result(v_outcome_id, 'Sent all five invitations and booked two calls.');
  SELECT result_note INTO v_result FROM public.coaching_outcomes WHERE outcome_id = v_outcome_id;
  IF v_result <> 'Sent all five invitations and booked two calls.' THEN
    RAISE EXCEPTION 'member result was not recorded';
  END IF;
  IF jsonb_array_length(public.get_my_pending_coaching_followups()) <> 0 THEN
    RAISE EXCEPTION 'logged result should acknowledge the follow-up';
  END IF;
END $$;

-- A skipped member carries the original waiting date and skip count into the next call.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
SELECT public.defer_coaching_request(:'request_c', :'next_call_id') AS carried_request \gset
SELECT set_config('fixture.carried_request', :'carried_request', false);
DO $$
DECLARE v_original timestamptz; v_carried timestamptz; v_skips integer;
BEGIN
  SELECT waiting_since INTO v_original FROM public.coaching_requests WHERE request_id = current_setting('fixture.request_c')::uuid;
  SELECT waiting_since, times_skipped INTO v_carried, v_skips FROM public.coaching_requests WHERE request_id = current_setting('fixture.carried_request')::uuid;
  IF v_original <> v_carried OR v_skips <> 1 THEN RAISE EXCEPTION 'deferred request lost fairness history'; END IF;
END $$;

-- The transactional save+join rejects late arrivals without leaving a partial saved request.
INSERT INTO public.coaching_calls(call_id, title, starts_at, queue_opens_at, queue_closes_at, status, created_by)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Closed-window call', now() - interval '20 minutes', now() - interval '20 minutes', now() - interval '5 minutes', 'planned', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
DO $$
DECLARE v_count integer;
BEGIN
  BEGIN
    PERFORM public.save_and_join_my_coaching_queue(
      'ffffffff-ffff-ffff-ffff-ffffffffffff', NULL, 'Late arrival request', NULL, NULL, NULL, NULL,
      'live', false, false, false, false, NULL
    );
    RAISE EXCEPTION 'late arrival unexpectedly joined';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM NOT LIKE '%15-minute%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO v_count FROM public.coaching_requests
  WHERE call_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' AND user_id = '33333333-3333-3333-3333-333333333333';
  IF v_count <> 0 THEN RAISE EXCEPTION 'failed atomic join left a partial coaching request'; END IF;
END $$;
RESET ROLE;

-- Expired planned calls are ignored; the server-owned current/next list remains usable.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', false);
DO $$
DECLARE v_calls jsonb;
BEGIN
  v_calls := public.get_admin_coaching_calls();
  IF v_calls::text LIKE '%ffffffff-ffff-ffff-ffff-ffffffffffff%' THEN RAISE EXCEPTION 'expired planned call leaked into active list'; END IF;
  IF v_calls::text NOT LIKE '%' || current_setting('fixture.current_call_id') || '%' OR v_calls::text NOT LIKE '%' || current_setting('fixture.next_call_id') || '%' THEN
    RAISE EXCEPTION 'active/next call list omitted a valid call: %', v_calls;
  END IF;
END $$;

-- An already-joined request can safely retry after the window closes.
UPDATE public.coaching_calls
SET queue_opens_at = now() - interval '10 minutes',
    queue_closes_at = now() - interval '1 minute',
    starts_at = now() - interval '10 minutes'
WHERE call_id = :'current_call_id';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SELECT public.join_my_coaching_queue(:'request_b');
RESET ROLE;

\echo 'PASS coaching queue behavior, privacy, fairness, write-back, and 15-minute gate'
