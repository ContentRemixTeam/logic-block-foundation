\set ON_ERROR_STOP on

CREATE FUNCTION public._questions_expect_denied(label text, statement text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RAISE EXCEPTION 'MISSED_EXPECTED_DENIAL:%',label;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'MISSED_EXPECTED_DENIAL:%' THEN RAISE; END IF;
  RAISE NOTICE 'expected denial [%]',label;
END
$$;
GRANT EXECUTE ON FUNCTION public._questions_expect_denied(text,text) TO service_role;

DO $$
BEGIN
  IF (SELECT publication_enabled FROM public.replay_question_publication_controls WHERE singleton) THEN
    RAISE EXCEPTION 'question publication defaulted on';
  END IF;
  IF has_table_privilege('service_role','public.replay_question_candidates','INSERT')
    OR has_table_privilege('service_role','public.replay_answers','UPDATE')
    OR has_table_privilege('service_role','public.replay_question_publication_controls','UPDATE')
    OR has_table_privilege('authenticated','public.replay_published_answers_projection','SELECT')
    OR has_function_privilege('anon','public.replay_questions_create_candidate(uuid,integer,bigint,bigint,bigint,text,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.replay_questions_create_candidate(uuid,integer,bigint,bigint,bigint,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'question ACL failure'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'replay_questions_%'
      AND p.prosecdef AND NOT (p.proconfig @> ARRAY['search_path=pg_catalog, public'])
  ) THEN RAISE EXCEPTION 'unsafe definer search_path'; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='replay_published_answers_projection'
      AND column_name IN ('raw_excerpt_private','proposed_question_private','sensitivity_findings','privacy_reviewer','publication_reason')
  ) THEN RAISE EXCEPTION 'private projection column leak'; END IF;
END
$$;

INSERT INTO public.mastermind_portal_resources(
  id,portal_resource_id,title,approved_access_scope,available_until
) VALUES (
  '20000000-0000-0000-0000-000000000001','question-r1','Questions fixture','mastermind_lifetime','2099-01-01'
);

SET ROLE service_role;
SELECT public.replay_import_content_package($j${
  "resource_id":"20000000-0000-0000-0000-000000000001",
  "source":{"system":"crdb","native_id":"questions-call-1","version":"v1","privacy_flag":"clear","title":"Questions fixture","event_date":"2026-08-09","metadata":{"fixture":true}},
  "transcript":{"segments":[
    {"index":0,"start_ms":0,"end_ms":10000,"text":"How do I choose the next best action?"},
    {"index":1,"start_ms":10000,"end_ms":30000,"text":"Choose the smallest useful action and verify it."},
    {"index":2,"start_ms":30000,"end_ms":60000,"text":"Then review the result before expanding the plan."}
  ]},
  "media":{"native_id":"questions-video-1","version":"v1","byte_sha256":"1111111111111111111111111111111111111111111111111111111111111111","dropbox_file_id":"db-question-1","dropbox_content_hash":"2222222222222222222222222222222222222222222222222222222222222222","size_bytes":12345,"duration_ms":60000,"decode_report_sha256":"3333333333333333333333333333333333333333333333333333333333333333","range_report_sha256":"4444444444444444444444444444444444444444444444444444444444444444","seek_report_sha256":"5555555555555555555555555555555555555555555555555555555555555555"}
}$j$,'fixture-importer');
SELECT public.replay_mark_resource_ready('20000000-0000-0000-0000-000000000001','resource-privacy','resource-privacy-v1');
SELECT public.replay_approve_resource('20000000-0000-0000-0000-000000000001','resource-editor','resource-editorial-v1');
SELECT public._questions_expect_denied('resource feature disabled',$q$SELECT public.replay_publish_resource('20000000-0000-0000-0000-000000000001','resource-publisher')$q$);
RESET ROLE;
UPDATE public.replay_publication_controls SET publication_enabled=true,changed_by='disposable-fixture';
SET ROLE service_role;
SELECT public.replay_publish_resource('20000000-0000-0000-0000-000000000001','resource-publisher');
RESET ROLE;
UPDATE public.replay_publication_controls SET publication_enabled=false,changed_by='disposable-fixture-reset';

SET ROLE service_role;
SELECT public._questions_expect_denied('timestamp outside transcript',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,0,1000,60001,'extractor-r1','Question?')
$q$);
SELECT public._questions_expect_denied('zero duration',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,1000,1000,1000,'extractor-zero','Question?')
$q$);
SELECT public._questions_expect_denied('empty question duration',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,1000,1000,2000,'extractor-empty-question','Question?')
$q$);
SELECT public._questions_expect_denied('empty answer duration',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,1000,2000,2000,'extractor-empty-answer','Question?')
$q$);
SELECT public._questions_expect_denied('reversed duration',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,3000,2000,1000,'extractor-reversed','Question?')
$q$);
SELECT public._questions_expect_denied('question at exact segment boundary',$q$
  SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,10000,11000,12000,'extractor-boundary-denied','Question?')
$q$);
SELECT public.replay_questions_create_candidate(
  '20000000-0000-0000-0000-000000000001',2,30000,40000,60000,'extractor-boundary-valid','Boundary question?'
) AS boundary_id \gset
SELECT public.replay_questions_create_candidate(
  '20000000-0000-0000-0000-000000000001',0,1000,10000,30000,'extractor-r1','How do I choose the next best action?'
) AS generated_id \gset
SELECT set_config('fixture.generated_id', :'generated_id', false);
RESET ROLE;

DO $$
DECLARE q public.replay_question_candidates%ROWTYPE; exact text;
BEGIN
  SELECT * INTO q FROM public.replay_question_candidates WHERE id=current_setting('fixture.generated_id')::uuid;
  exact:=public.replay_questions_excerpt(q.transcript_version_id,q.question_start_ms,q.answer_end_ms);
  IF q.origin<>'generated' OR q.state<>'extracted_private'
    OR q.raw_excerpt_sha256<>encode(digest(exact,'sha256'),'hex')
    OR exact NOT LIKE '0:0:10000:%' OR exact NOT LIKE '%1:10000:30000:%'
  THEN RAISE EXCEPTION 'bounded excerpt/hash failure'; END IF;
  IF EXISTS (SELECT 1 FROM public.replay_published_answers_projection) THEN RAISE EXCEPTION 'generated candidate leaked'; END IF;
END
$$;
SET ROLE service_role;

SELECT public._questions_expect_denied('generated cannot become answer',$q$
  SELECT public.replay_questions_make_answer_ready(current_setting('fixture.generated_id')::uuid,'safe q','safe a','safe excerpt','Coach','members','operator','reason','ready-v1')
$q$);
SELECT public.replay_questions_promote_candidate(current_setting('fixture.generated_id')::uuid,'curator','explicit human curation','promotion-v1') AS curated_id \gset
SELECT set_config('fixture.curated_id', :'curated_id', false);

SELECT public._questions_expect_denied('service direct candidate update',$q$
  UPDATE public.replay_question_candidates SET state='approved' WHERE id=current_setting('fixture.curated_id')::uuid
$q$);
SELECT public._questions_expect_denied('service direct answer insert',$q$
  INSERT INTO public.replay_answers(question_cluster_id,question_candidate_id,resource_id,transcript_version_id,playback_attempt_id,question_start_ms,answer_start_ms,answer_end_ms,member_question,safe_answer_summary,answerer_attribution,visibility_scope)
  VALUES(gen_random_uuid(),current_setting('fixture.curated_id')::uuid,'20000000-0000-0000-0000-000000000001',gen_random_uuid(),gen_random_uuid(),0,0,1,'x','x','x','x')
$q$);
SELECT public._questions_expect_denied('service enable publication',$q$
  UPDATE public.replay_question_publication_controls SET publication_enabled=true
$q$);

SELECT public.replay_questions_privacy_approve(current_setting('fixture.curated_id')::uuid,'privacy-reviewer','no private member detail','privacy-v1');
SELECT public._questions_expect_denied('privacy editorial separation',$q$
  SELECT public.replay_questions_editorial_approve(current_setting('fixture.curated_id')::uuid,'privacy-reviewer','editorial','editorial-v1')
$q$);
RESET ROLE;

UPDATE public.replay_transcript_segments SET transcript_text_private='tampered stale transcript'
WHERE transcript_version_id=(SELECT transcript_version_id FROM public.replay_question_candidates WHERE id=current_setting('fixture.curated_id')::uuid)
  AND segment_index=1;
SET ROLE service_role;
SELECT public._questions_expect_denied('stale transcript approval',$q$
  SELECT public.replay_questions_editorial_approve(current_setting('fixture.curated_id')::uuid,'editorial-reviewer','editorial pass','editorial-v1')
$q$);
RESET ROLE;
UPDATE public.replay_transcript_segments SET transcript_text_private='Choose the smallest useful action and verify it.'
WHERE transcript_version_id=(SELECT transcript_version_id FROM public.replay_question_candidates WHERE id=current_setting('fixture.curated_id')::uuid)
  AND segment_index=1;
SET ROLE service_role;
SELECT public.replay_questions_editorial_approve(current_setting('fixture.curated_id')::uuid,'editorial-reviewer','editorial pass','editorial-v1');
RESET ROLE;

UPDATE public.mastermind_portal_resources SET active_playback_attempt_id=NULL
WHERE id='20000000-0000-0000-0000-000000000001';
SET ROLE service_role;
SELECT public._questions_expect_denied('stale media seek approval',$q$
  SELECT public.replay_questions_seek_approve(current_setting('fixture.curated_id')::uuid,'seek-reviewer','seek verified','seek-v1')
$q$);
RESET ROLE;
UPDATE public.mastermind_portal_resources SET active_playback_attempt_id=(
  SELECT playback_attempt_id FROM public.replay_question_candidates WHERE id=current_setting('fixture.curated_id')::uuid
) WHERE id='20000000-0000-0000-0000-000000000001';
SET ROLE service_role;
SELECT public._questions_expect_denied('seek reuses privacy reviewer',$q$
  SELECT public.replay_questions_seek_approve(current_setting('fixture.curated_id')::uuid,'privacy-reviewer','seek verified','seek-v1')
$q$);
SELECT public._questions_expect_denied('seek reuses editorial reviewer',$q$
  SELECT public.replay_questions_seek_approve(current_setting('fixture.curated_id')::uuid,'editorial-reviewer','seek verified','seek-v1')
$q$);
SELECT public.replay_questions_seek_approve(current_setting('fixture.curated_id')::uuid,'seek-reviewer','seek verified','seek-v1');
SELECT public._questions_expect_denied('visibility scope sentinel',$q$
  SELECT public.replay_questions_make_answer_ready(
    current_setting('fixture.curated_id')::uuid,'safe q','safe a','safe excerpt','Coach','PRIVATE_SENTINEL_VISIBILITY','operator','reason','ready-v1')
$q$);
RESET ROLE;
UPDATE public.replay_question_candidates SET seek_reviewer=privacy_reviewer
WHERE id=current_setting('fixture.curated_id')::uuid;
SET ROLE service_role;
SELECT public._questions_expect_denied('answer creation reviewer topology',$q$
  SELECT public.replay_questions_make_answer_ready(
    current_setting('fixture.curated_id')::uuid,'safe q','safe a','safe excerpt','Coach','members','operator','reason','ready-v1')
$q$);
RESET ROLE;
UPDATE public.replay_question_candidates SET seek_reviewer='seek-reviewer'
WHERE id=current_setting('fixture.curated_id')::uuid;
SET ROLE service_role;
SELECT public.replay_questions_make_answer_ready(
  current_setting('fixture.curated_id')::uuid,'How do I choose my next action?','Choose the smallest useful action, then review the result.',
  'Choose the smallest useful action and verify it.','Coach','members','answer-editor','safe member copy','answer-ready-v1'
) AS answer_id \gset
SELECT set_config('fixture.answer_id', :'answer_id', false);

RESET ROLE;
DO $$
BEGIN
  BEGIN
    UPDATE public.replay_answers SET seek_reviewer=privacy_reviewer,publication_state='PUBLISHED',published_at=now()
    WHERE id=current_setting('fixture.answer_id')::uuid;
    RAISE EXCEPTION 'MISSED_LIFECYCLE_REVIEWER_CONSTRAINT';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'expected lifecycle reviewer constraint denial';
  END;
END
$$;
SET ROLE service_role;
SELECT public._questions_expect_denied('question publication feature disabled',$q$
  SELECT public.replay_questions_publish(current_setting('fixture.answer_id')::uuid,'publisher','approved release')
$q$);
RESET ROLE;
UPDATE public.replay_answers SET safe_answer_summary='tampered answer' WHERE id=current_setting('fixture.answer_id')::uuid;
UPDATE public.replay_question_publication_controls SET publication_enabled=true,changed_by='disposable-fixture';
SET ROLE service_role;
SELECT public._questions_expect_denied('stale answer content',$q$
  SELECT public.replay_questions_publish(current_setting('fixture.answer_id')::uuid,'publisher','approved release')
$q$);
RESET ROLE;
UPDATE public.replay_answers SET safe_answer_summary='Choose the smallest useful action, then review the result.' WHERE id=current_setting('fixture.answer_id')::uuid;
UPDATE public.replay_answers SET seek_reviewer=privacy_reviewer WHERE id=current_setting('fixture.answer_id')::uuid;
SET ROLE service_role;
SELECT public._questions_expect_denied('publication assertion reviewer topology',$q$
  SELECT public.replay_questions_publish(current_setting('fixture.answer_id')::uuid,'publisher','approved release')
$q$);
RESET ROLE;
UPDATE public.replay_answers SET seek_reviewer='seek-reviewer' WHERE id=current_setting('fixture.answer_id')::uuid;
SET ROLE service_role;
SELECT public.replay_questions_publish(current_setting('fixture.answer_id')::uuid,'publisher','approved release');
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.replay_published_answers_projection)<>1 THEN RAISE EXCEPTION 'safe projection missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.replay_published_answers_projection p WHERE row_to_json(p)::text ~* 'PRIVATE_SENTINEL')
  THEN RAISE EXCEPTION 'serialized projection sentinel leak'; END IF;
  IF EXISTS (SELECT 1 FROM public.replay_published_answers_projection WHERE safe_answer_summary LIKE '%PRIVATE_SENTINEL%') THEN RAISE EXCEPTION 'private projection leak'; END IF;
  IF (SELECT count(*) FROM public.replay_editorial_review_events WHERE subject_id=current_setting('fixture.curated_id')::uuid
      AND decision IN ('privacy_approved','editorial_approved','seek_approved'))<>3 THEN RAISE EXCEPTION 'approval events missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.replay_editorial_review_events WHERE subject_id=current_setting('fixture.curated_id')::uuid
      AND (btrim(actor)='' OR btrim(reason)='' OR btrim(review_checklist_version)='')) THEN RAISE EXCEPTION 'approval evidence incomplete'; END IF;
END
$$;

DO $$
DECLARE
  answer_id uuid:=current_setting('fixture.answer_id')::uuid;
  column_name text;
  original_value text;
BEGIN
  FOREACH column_name IN ARRAY ARRAY[
    'member_question','safe_answer_summary','safe_excerpt','answerer_attribution','situation_context_safe','visibility_scope'
  ] LOOP
    EXECUTE format('SELECT %I FROM public.replay_answers WHERE id=$1',column_name) INTO original_value USING answer_id;
    EXECUTE format('UPDATE public.replay_answers SET %I=$1 WHERE id=$2',column_name)
      USING 'PRIVATE_SENTINEL_'||upper(column_name),answer_id;
    UPDATE public.replay_answers SET content_sha256=public.replay_questions_answer_hash(answer_id) WHERE id=answer_id;
    IF EXISTS (SELECT 1 FROM public.replay_published_answers_projection)
      OR EXISTS (SELECT 1 FROM public.replay_published_answers_projection p WHERE row_to_json(p)::text ~* 'PRIVATE_SENTINEL')
    THEN RAISE EXCEPTION 'serialized projection sentinel leak in %',column_name; END IF;
    EXECUTE format('UPDATE public.replay_answers SET %I=$1 WHERE id=$2',column_name) USING original_value,answer_id;
    UPDATE public.replay_answers SET content_sha256=public.replay_questions_answer_hash(answer_id) WHERE id=answer_id;
    IF (SELECT count(*) FROM public.replay_published_answers_projection)<>1
    THEN RAISE EXCEPTION 'projection did not recover after % sentinel test',column_name; END IF;
  END LOOP;
END
$$;
RESET ROLE;

SELECT public._questions_expect_denied('append-only event update',$q$
  UPDATE public.replay_editorial_review_events SET reason='rewrite' WHERE subject_id=current_setting('fixture.curated_id')::uuid
$q$);
SELECT public._questions_expect_denied('append-only event delete',$q$
  DELETE FROM public.replay_editorial_review_events WHERE subject_id=current_setting('fixture.curated_id')::uuid
$q$);

SET ROLE service_role;
SELECT public.replay_questions_revoke(current_setting('fixture.answer_id')::uuid,'revoker','superseded answer');
RESET ROLE;
UPDATE public.replay_question_publication_controls SET publication_enabled=false,changed_by='disposable-fixture-reset';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.replay_published_answers_projection) THEN RAISE EXCEPTION 'revoked answer still projected'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.replay_answers WHERE id=current_setting('fixture.answer_id')::uuid
    AND publication_state='REVOKED' AND published_at IS NOT NULL AND revoked_at IS NOT NULL
    AND revoked_by='revoker' AND revocation_reason='superseded answer') THEN RAISE EXCEPTION 'revoke history missing'; END IF;
  IF (SELECT publication_enabled FROM public.replay_question_publication_controls WHERE singleton) THEN RAISE EXCEPTION 'question publication left enabled'; END IF;
END
$$;

SELECT 'replay_vault_questions_answered_r2_pg16_ok' AS result;
