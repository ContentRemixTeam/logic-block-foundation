\set ON_ERROR_STOP on

-- Owner-only fixture scaffolding. All producer, review, publication and member
-- mutations below cross the real SECURITY DEFINER RPC boundary as service_role.
INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at)
VALUES('member@example.com','mastermind','active','2026-01-01','2027-01-01');
INSERT INTO public.replay_vault_entitlements(
  normalized_email,auth_user_id,tier,status,access_starts_at,access_expires_at,
  source_provider,source_order_id,last_paid_event_at,last_transition_at)
VALUES(
  'member@example.com','11111111-1111-4111-8111-111111111111','annual','active',
  '2026-01-01','2027-01-01','fixture','order','2026-01-01','2026-01-01');
INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
VALUES('fixture','vault','annual','annual',interval '1 year',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp());
SET ROLE service_role;
SELECT public.apply_replay_vault_commercial_event_r7('fixture','member-commercial','member-order','member-charge',NULL,NULL,
  'member@example.com','grant','vault','annual',repeat('a',64),repeat('b',64),1786291200,'2026-01-01','2027-01-01');
RESET ROLE;
UPDATE public.replay_vault_launch_config SET launch_state='launched';
INSERT INTO public.mastermind_portal_resources(
  id,portal_resource_id,product_title,title,portal_path,approved_access_scope,available_until)
VALUES(
  '10000000-0000-4000-8000-000000000001','replay-r2','Vault','Canonical R2','/r2','replay_vault','2027-01-01');

SET ROLE service_role;
SELECT public.replay_import_content_package($j$
{
  "resource_id":"10000000-0000-4000-8000-000000000001",
  "source":{"system":"crdb","native_id":"call-r2","version":"v1","privacy_flag":"clear","title":"Canonical R2","event_date":"2026-08-01","metadata":{}},
  "transcript":{"segments":[{"index":0,"start_ms":0,"end_ms":60000,"text":"Current complete transcript. Choose the smallest useful action and verify it."}]},
  "media":{"native_id":"video-r2","version":"v1","byte_sha256":"1111111111111111111111111111111111111111111111111111111111111111","dropbox_file_id":"db-r2","dropbox_content_hash":"2222222222222222222222222222222222222222222222222222222222222222","size_bytes":1000,"duration_ms":60000,"decode_report_sha256":"3333333333333333333333333333333333333333333333333333333333333333","range_report_sha256":"4444444444444444444444444444444444444444444444444444444444444444","seek_report_sha256":"5555555555555555555555555555555555555555555555555555555555555555"}
}
$j$,'fixture');
SELECT public.replay_mark_resource_ready('10000000-0000-4000-8000-000000000001','privacy-reviewer','resource-ready-v1');
SELECT public.replay_approve_resource('10000000-0000-4000-8000-000000000001','editorial-reviewer','resource-approved-v1');
RESET ROLE;
UPDATE public.replay_publication_controls SET publication_enabled=true,changed_by='integrated-fixture';
SET ROLE service_role;
SELECT public.replay_publish_resource('10000000-0000-4000-8000-000000000001','resource-publisher');
RESET ROLE;
UPDATE public.replay_publication_controls SET publication_enabled=false,changed_by='integrated-fixture-reset';
UPDATE public.mastermind_portal_resources SET
  publication_state='published',published_at=now(),privacy_state='approved',pairing_state='paired',
  transcript_state='active',media_state='approved'
WHERE id='10000000-0000-4000-8000-000000000001';

SELECT transcript_version_id AS transcript_version_id,playback_attempt_id AS playback_attempt_id
FROM public.replay_publication_authority
WHERE resource_id='10000000-0000-4000-8000-000000000001' \gset
SELECT id AS moment_id FROM public.replay_transcript_segments
WHERE transcript_version_id=:'transcript_version_id'::uuid AND segment_index=0 \gset

-- Exact private Questions producer -> human curation -> three independent
-- reviews -> answer-ready -> publication workflow. No forged question rows.
SET ROLE service_role;
SELECT public.replay_questions_create_candidate(
  '10000000-0000-4000-8000-000000000001',0,0,1000,5000,
  'integrated-extractor-v1','How do I choose the next useful action?') AS generated_id \gset
SELECT public.replay_questions_promote_candidate(
  :'generated_id'::uuid,'question-curator','explicit human curation','promotion-v1') AS curated_id \gset
SELECT public.replay_questions_privacy_approve(
  :'curated_id'::uuid,'privacy-reviewer','no private member detail','privacy-v1');
SELECT public.replay_questions_editorial_approve(
  :'curated_id'::uuid,'editorial-reviewer','member-safe and useful','editorial-v1');
SELECT public.replay_questions_seek_approve(
  :'curated_id'::uuid,'seek-reviewer','cue verified against canonical media','seek-v1');
SELECT public.replay_questions_make_answer_ready(
  :'curated_id'::uuid,'How do I choose my next action?',
  'Choose the smallest useful action, then review the result.',
  'Choose the smallest useful action and verify it.','Coach','members',
  'answer-editor','safe member copy','answer-ready-v1') AS question_id \gset
RESET ROLE;
UPDATE public.replay_question_publication_controls
SET publication_enabled=true,changed_by='integrated-fixture';
SET ROLE service_role;
SELECT public.replay_questions_publish(:'question_id'::uuid,'question-publisher','approved release');

-- Real member interaction RPCs, including auth.users-derived email, question
-- bookmark, session, media idempotency, note idempotency, and inherited RPCs.
SELECT public.replay_vault_get_interaction(
  '11111111-1111-4111-8111-111111111111','forged@example.com','replay-r2','moment',:'moment_id'::uuid) AS initial_interaction \gset
SELECT public.replay_vault_set_bookmark(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','question',:'question_id'::uuid,true) AS bookmark_receipt \gset
SELECT (:'bookmark_receipt'::jsonb->>'bookmarkId') AS bookmark_id \gset
SELECT public.replay_vault_begin_session(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','moment',:'moment_id'::uuid) AS session_receipt \gset
SELECT (:'session_receipt'::jsonb->>'sessionId') AS session_id \gset
SELECT pg_sleep(0.1);
SELECT public.replay_vault_record_media_event(
  '11111111-1111-4111-8111-111111111111','member@example.com',:'session_id'::uuid,
  'e0000000-0000-4000-8000-000000000001',1,'timeupdate',30000,1) AS media_receipt \gset
SELECT public.replay_vault_record_media_event(
  '11111111-1111-4111-8111-111111111111','member@example.com',:'session_id'::uuid,
  'e0000000-0000-4000-8000-000000000001',1,'timeupdate',30000,1) AS media_replay \gset
SELECT public.replay_vault_create_note(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','question',:'question_id'::uuid,
  1234,'d0000000-0000-4000-8000-000000000001') AS note_receipt \gset
SELECT public.replay_vault_create_note(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','question',:'question_id'::uuid,
  1234,'d0000000-0000-4000-8000-000000000001') AS note_replay \gset
SELECT public.replay_vault_access_decision(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','playback',false,clock_timestamp()) AS access_receipt \gset
SELECT count(*) AS search_count FROM public.search_replay_vault_resources(
  '11111111-1111-4111-8111-111111111111','member@example.com','Current',NULL,12,true,false,clock_timestamp()) \gset
SELECT count(*) AS playback_count FROM public.resolve_replay_vault_playback(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2',:'question_id'::uuid,NULL,false,clock_timestamp()) \gset
SELECT count(*) AS full_playback_count FROM public.resolve_replay_vault_playback(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2',NULL,NULL,false,clock_timestamp()) \gset
SELECT count(*) AS dual_playback_count FROM public.resolve_replay_vault_playback(
  '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2',:'question_id'::uuid,:'moment_id'::uuid,false,clock_timestamp()) \gset
SELECT public.record_replay_vault_playback_event(
  '11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000001',
  'allowed','dropbox',NULL,NULL);
SELECT public.record_replay_vault_playback_event(
  '11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000001',
  'allowed','dropbox',NULL,:'question_id'::uuid);
SELECT public.apply_replay_vault_commercial_event_r7(
  'acl-probe','event-1800','order-1800','transaction-1800',NULL,NULL,'member@example.com','grant','unmapped','unmapped',
  repeat('f',64),repeat('e',64),1786291200,clock_timestamp(),NULL) AS webhook_receipt \gset
SELECT public.get_mastermind_portal_access_scopes('member@example.com') AS scope_receipt \gset
RESET ROLE;
SELECT set_config('fixture.moment_id', :'moment_id', false);
SELECT set_config('fixture.question_id', :'question_id', false);
SELECT set_config('fixture.initial_interaction', :'initial_interaction', false);
SELECT set_config('fixture.bookmark_receipt', :'bookmark_receipt', false);
SELECT set_config('fixture.session_receipt', :'session_receipt', false);
SELECT set_config('fixture.media_receipt', :'media_receipt', false);
SELECT set_config('fixture.media_replay', :'media_replay', false);
SELECT set_config('fixture.note_receipt', :'note_receipt', false);
SELECT set_config('fixture.note_replay', :'note_replay', false);
SELECT set_config('fixture.access_receipt', :'access_receipt', false);
SELECT set_config('fixture.playback_count', :'playback_count', false);
SELECT set_config('fixture.full_playback_count', :'full_playback_count', false);
SELECT set_config('fixture.dual_playback_count', :'dual_playback_count', false);
SELECT set_config('fixture.webhook_receipt', :'webhook_receipt', false);
SELECT set_config('fixture.scope_receipt', :'scope_receipt', false);

DO $$
BEGIN
  IF (current_setting('fixture.initial_interaction')::jsonb#>>'{target,targetId}') IS DISTINCT FROM current_setting('fixture.moment_id')
    THEN RAISE EXCEPTION 'auth.users-derived interaction binding failed'; END IF;
  IF NOT (current_setting('fixture.bookmark_receipt')::jsonb->>'saved')::boolean THEN RAISE EXCEPTION 'question bookmark failed'; END IF;
  IF (current_setting('fixture.session_receipt')::jsonb->>'durationSeconds')::numeric<>60 THEN RAISE EXCEPTION 'canonical session duration failed'; END IF;
  IF (current_setting('fixture.media_receipt')::jsonb->>'creditedSeconds')::numeric>=2
    OR (current_setting('fixture.media_receipt')::jsonb->>'watchedSeconds')::numeric>=2 THEN RAISE EXCEPTION 'client jump minted coverage'; END IF;
  IF NOT (current_setting('fixture.media_replay')::jsonb->>'replayed')::boolean THEN RAISE EXCEPTION 'media duplicate not replayed'; END IF;
  IF (current_setting('fixture.note_receipt')::jsonb->>'replayed')::boolean
    OR NOT (current_setting('fixture.note_replay')::jsonb->>'replayed')::boolean THEN RAISE EXCEPTION 'note idempotency failed'; END IF;
  IF NOT (current_setting('fixture.access_receipt')::jsonb->>'allowed')::boolean
    OR current_setting('fixture.playback_count')::integer<>1 THEN RAISE EXCEPTION 'inherited access/playback invocation failed'; END IF;
  IF current_setting('fixture.full_playback_count')::integer<>1
    OR current_setting('fixture.dual_playback_count')::integer<>0 THEN RAISE EXCEPTION 'resource-only or dual-target playback contract failed'; END IF;
  IF (SELECT count(*) FROM public.replay_vault_playback_events
      WHERE resource_id='10000000-0000-4000-8000-000000000001' AND moment_id IS NULL AND question_id IS NULL)<>1
    THEN RAISE EXCEPTION 'full replay audit row missing'; END IF;
  IF current_setting('fixture.webhook_receipt')::jsonb->>'status'<>'rejected_unmapped' THEN RAISE EXCEPTION 'webhook invocation failed'; END IF;
  IF current_setting('fixture.scope_receipt') IS NULL THEN RAISE EXCEPTION 'scope invocation failed'; END IF;
  IF (SELECT count(*) FROM public.replay_published_answers_projection WHERE id=current_setting('fixture.question_id')::uuid)<>1
    THEN RAISE EXCEPTION 'workflow-created question not projected'; END IF;
  IF EXISTS(SELECT 1 FROM public.journal_pages WHERE id=(current_setting('fixture.note_receipt')::jsonb->>'noteId')::uuid
    AND (content~*'dropbox|transcript|/Users/|PRIVATE_SENTINEL' OR content NOT LIKE '%question='||current_setting('fixture.question_id')||'%'))
    THEN RAISE EXCEPTION 'note leaked protected locator'; END IF;
END$$;

-- Lossless range storage and same-owner relational integrity.
UPDATE public.replay_vault_watch_state SET watched_ranges=(
  SELECT range_agg(numrange((g.n*2)::numeric,(g.n*2+1)::numeric,'[)')) FROM generate_series(0,200) AS g(n))
WHERE user_id='11111111-1111-4111-8111-111111111111';
DO $$BEGIN
  IF (SELECT count(*) FROM unnest((SELECT watched_ranges FROM public.replay_vault_watch_state
      WHERE user_id='11111111-1111-4111-8111-111111111111' LIMIT 1)))<>201 THEN RAISE EXCEPTION '201 ranges lost';END IF;
  BEGIN
    UPDATE public.replay_vault_note_backlinks SET user_id=gen_random_uuid()
    WHERE journal_page_id=(current_setting('fixture.note_receipt')::jsonb->>'noteId')::uuid;
    RAISE EXCEPTION 'same-owner FK missed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END$$;

-- Final function ACL matrix: every public RPC is service_role-only.
DO $$DECLARE sig text; runtime_role text;BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)',
    'public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz)',
    'public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz)',
    'public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid)',
    'public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,bigint,timestamptz,timestamptz)',
    'public.get_mastermind_portal_access_scopes(text)',
    'public.replay_questions_create_candidate(uuid,integer,bigint,bigint,bigint,text,text)',
    'public.replay_questions_promote_candidate(uuid,text,text,text)',
    'public.replay_questions_privacy_approve(uuid,text,text,text)',
    'public.replay_questions_editorial_approve(uuid,text,text,text)',
    'public.replay_questions_seek_approve(uuid,text,text,text)',
    'public.replay_questions_make_answer_ready(uuid,text,text,text,text,text,text,text,text)',
    'public.replay_questions_publish(uuid,text,text)',
    'public.replay_questions_revoke(uuid,text,text)',
    'public.replay_vault_get_interaction(uuid,text,text,text,uuid)',
    'public.replay_vault_set_bookmark(uuid,text,text,text,uuid,boolean)',
    'public.replay_vault_delete_bookmark_by_id(uuid,uuid)',
    'public.replay_vault_begin_session(uuid,text,text,text,uuid)',
    'public.replay_vault_record_media_event(uuid,text,uuid,uuid,bigint,text,bigint,bigint)',
    'public.replay_vault_create_note(uuid,text,text,text,uuid,bigint,uuid)'
  ] LOOP
    IF NOT has_function_privilege('service_role',sig,'EXECUTE') THEN RAISE EXCEPTION 'service_role RPC missing %',sig;END IF;
    FOREACH runtime_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
      IF has_function_privilege(runtime_role,sig,'EXECUTE') THEN RAISE EXCEPTION 'runtime RPC leak % %',runtime_role,sig;END IF;
    END LOOP;
  END LOOP;
END$$;

-- Final direct-table ACL matrix across inherited and interaction data.
DO $$DECLARE n text; runtime_role text;BEGIN
  FOREACH n IN ARRAY ARRAY[
    'replay_vault_entitlements','replay_vault_webhook_events','replay_vault_playback_events',
    'replay_vault_commercial_deliveries','replay_vault_purchase_contributions','replay_vault_purchase_lifecycle_evidence','replay_vault_commercial_quarantine','replay_vault_commercial_resolutions',
    'replay_question_candidates','replay_answers','replay_editorial_review_events','replay_question_publication_controls',
    'replay_vault_bookmarks','replay_vault_watch_state','replay_vault_playback_sessions',
    'replay_vault_media_events','replay_vault_note_backlinks'
  ] LOOP
    FOREACH runtime_role IN ARRAY ARRAY['public','anon','authenticated','service_role'] LOOP
      IF has_table_privilege(runtime_role,'public.'||n,'SELECT')
        OR has_table_privilege(runtime_role,'public.'||n,'INSERT')
        OR has_table_privilege(runtime_role,'public.'||n,'UPDATE')
        OR has_table_privilege(runtime_role,'public.'||n,'DELETE')
      THEN RAISE EXCEPTION 'direct table privilege leak % %',runtime_role,n;END IF;
    END LOOP;
  END LOOP;
END$$;

DO $$DECLARE n text;BEGIN FOREACH n IN ARRAY ARRAY['replay_vault_bookmarks','replay_vault_watch_state','replay_vault_playback_sessions','replay_vault_media_events','replay_vault_note_backlinks']LOOP IF has_table_privilege('service_role','public.'||n,'SELECT')OR has_table_privilege('authenticated','public.'||n,'SELECT')THEN RAISE EXCEPTION 'direct read granted %',n;END IF;END LOOP;
 IF NOT has_function_privilege('service_role','public.replay_vault_begin_session(uuid,text,text,text,uuid)','EXECUTE') OR has_function_privilege('authenticated','public.replay_vault_begin_session(uuid,text,text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC ACL';END IF;END$$;
-- Migration 1600 must preserve every Edge-facing RPC accepted by migration 1400.
DO $$DECLARE sig text;BEGIN FOREACH sig IN ARRAY ARRAY[
 'public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)',
 'public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz)',
 'public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz)',
 'public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid)',
 'public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,bigint,timestamptz,timestamptz)',
 'public.get_mastermind_portal_access_scopes(text)'] LOOP
 IF NOT has_function_privilege('service_role',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') THEN RAISE EXCEPTION 'inherited Edge RPC ACL regression %',sig;END IF;
 END LOOP;END$$;
UPDATE public.replay_vault_entitlements SET status='active',revoked_at=NULL WHERE auth_user_id='11111111-1111-4111-8111-111111111111';
DO $$DECLARE u uuid:='11111111-1111-4111-8111-111111111111';j jsonb;BEGIN
 j:=public.replay_vault_set_bookmark(u,'forged@example.com','replay-r2','replay',NULL,true);
 IF NOT (j->>'saved')::boolean OR j->>'targetKind'<>'replay' THEN RAISE EXCEPTION 'full replay bookmark receipt %',j;END IF;
 IF (SELECT count(*) FROM public.replay_vault_browse_member(u,NULL,20,NULL))<>1 THEN RAISE EXCEPTION 'authorized browse projection';END IF;
 IF (SELECT count(*) FROM public.replay_vault_categories_member(u))<>1 THEN RAISE EXCEPTION 'authorized categories projection';END IF;
 IF (SELECT count(*) FROM public.replay_vault_transcript_member(u,'replay-r2',-1,100))<>1 THEN RAISE EXCEPTION 'authorized transcript projection';END IF;
 IF (SELECT count(*) FROM public.replay_vault_questions_member(u,'replay-r2',40,NULL))<>1 THEN RAISE EXCEPTION 'authorized call questions projection';END IF;
 IF (SELECT count(*) FROM public.replay_vault_questions_member(u,NULL,40,NULL))<>1 THEN RAISE EXCEPTION 'authorized questions directory';END IF;
 IF (SELECT count(*) FROM public.replay_vault_saved_member(u,'all',40,NULL))<2 THEN RAISE EXCEPTION 'combined saved projection';END IF;
 IF (SELECT count(*) FROM public.replay_vault_saved_member(u,'videos',40,NULL))<>1 THEN RAISE EXCEPTION 'saved video filter';END IF;
 IF (SELECT count(*) FROM public.replay_vault_saved_member(u,'moments',40,NULL))<1 THEN RAISE EXCEPTION 'saved moments filter';END IF;
END$$;
DO $$DECLARE sig text;BEGIN FOREACH sig IN ARRAY ARRAY[
 'public.replay_vault_browse_member(uuid,text,integer,text)','public.replay_vault_categories_member(uuid,integer,text)',
 'public.replay_vault_transcript_member(uuid,text,integer,integer)','public.replay_vault_questions_member(uuid,text,integer,text)',
 'public.replay_vault_saved_member(uuid,text,integer,text)'] LOOP
 IF NOT has_function_privilege('service_role',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') OR has_function_privilege('anon',sig,'EXECUTE') THEN RAISE EXCEPTION 'R4 RPC ACL %',sig;END IF;END LOOP;END$$;


-- Revoke the workflow-created Question via the real RPC, then prove its
-- interaction disappears. Revoke entitlement and prove all moment state hides;
-- metadata-free bookmark deletion remains possible after access loss.
SET ROLE service_role;
SELECT public.replay_questions_revoke(:'question_id'::uuid,'question-revoker','integrated revoke proof');
DO $$BEGIN
  BEGIN
    PERFORM public.replay_vault_get_interaction(
      '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','question',current_setting('fixture.question_id')::uuid);
    RAISE EXCEPTION 'revoked question interaction visible';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
UPDATE public.replay_question_publication_controls SET publication_enabled=false,changed_by='integrated-fixture-reset';
SET ROLE service_role;
SELECT public.apply_replay_vault_commercial_event_r7('fixture','member-revoke',NULL,NULL,'member-order','member-charge',
  'member@example.com','immediate_revocation','vault','annual',repeat('e',64),repeat('f',64),1786291600,clock_timestamp(),NULL);
DO $$BEGIN
  BEGIN
    PERFORM public.replay_vault_get_interaction(
      '11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','moment',current_setting('fixture.moment_id')::uuid);
    RAISE EXCEPTION 'revoked entitlement state visible';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
SELECT public.replay_vault_delete_bookmark_by_id(
  '11111111-1111-4111-8111-111111111111',:'bookmark_id'::uuid) AS bookmark_delete_receipt \gset
RESET ROLE;
SELECT set_config('fixture.bookmark_delete_receipt', :'bookmark_delete_receipt', false);
DO $$BEGIN
  IF NOT (current_setting('fixture.bookmark_delete_receipt')::jsonb->>'deleted')::boolean THEN RAISE EXCEPTION 'post-revoke owner bookmark delete failed';END IF;
  IF EXISTS(SELECT 1 FROM public.replay_published_answers_projection WHERE id=current_setting('fixture.question_id')::uuid)
    THEN RAISE EXCEPTION 'revoked question still projected';END IF;
END$$;

\echo PASS replay_vault_interactions_r2_exact_1300_1400_1500_1600_behavior
