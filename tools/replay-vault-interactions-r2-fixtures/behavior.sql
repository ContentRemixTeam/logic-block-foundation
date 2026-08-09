\set ON_ERROR_STOP on
DO $$DECLARE u uuid:='11111111-1111-4111-8111-111111111111';rid uuid:='10000000-0000-4000-8000-000000000001';tv uuid;attempt uuid;moment uuid;qcluster uuid;qcand uuid;question uuid;j jsonb;s uuid;ev uuid:='e0000000-0000-4000-8000-000000000001';note_req uuid:='d0000000-0000-4000-8000-000000000001';note_id uuid;i int;membership_id text:='membershipio:'||repeat('a',64);BEGIN
 INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at)VALUES('member@example.com','mastermind','active','2026-01-01','2027-01-01');
 INSERT INTO public.replay_vault_entitlements(normalized_email,auth_user_id,tier,status,access_starts_at,access_expires_at,source_provider,source_order_id,last_paid_event_at,last_transition_at)VALUES('member@example.com',u,'annual','active','2026-01-01','2027-01-01','fixture','order','2026-01-01','2026-01-01');
 UPDATE public.replay_vault_launch_config SET launch_state='launched';
 INSERT INTO public.mastermind_portal_resources(id,portal_resource_id,product_title,title,portal_path,approved_access_scope,available_until)VALUES(rid,'replay-r2','Vault','Canonical R2','/r2','replay_vault','2027-01-01');
 PERFORM public.replay_import_content_package($j${"resource_id":"10000000-0000-4000-8000-000000000001","source":{"system":"crdb","native_id":"call-r2","version":"v1","privacy_flag":"clear","title":"Canonical R2","event_date":"2026-08-01","metadata":{}},"transcript":{"segments":[{"index":0,"start_ms":0,"end_ms":60000,"text":"Current complete transcript"}]},"media":{"native_id":"video-r2","version":"v1","byte_sha256":"1111111111111111111111111111111111111111111111111111111111111111","dropbox_file_id":"db-r2","dropbox_content_hash":"2222222222222222222222222222222222222222222222222222222222222222","size_bytes":1000,"duration_ms":60000,"decode_report_sha256":"3333333333333333333333333333333333333333333333333333333333333333","range_report_sha256":"4444444444444444444444444444444444444444444444444444444444444444","seek_report_sha256":"5555555555555555555555555555555555555555555555555555555555555555"}}$j$,'fixture');
 PERFORM public.replay_mark_resource_ready(rid,'privacy','r2');PERFORM public.replay_approve_resource(rid,'editor','r2');UPDATE public.replay_publication_controls SET publication_enabled=true;PERFORM public.replay_publish_resource(rid,'publisher');
 SELECT transcript_version_id,playback_attempt_id INTO tv,attempt FROM public.replay_publication_authority WHERE resource_id=rid;SELECT id INTO moment FROM public.replay_transcript_segments WHERE transcript_version_id=tv;
 -- Access migration's accepted decision remains the capability authority; its canonical legacy flags are explicitly approved.
 UPDATE public.mastermind_portal_resources SET publication_state='published',published_at=now(),privacy_state='approved',pairing_state='paired',transcript_state='active',media_state='approved' WHERE id=rid;
 INSERT INTO public.replay_question_clusters(normalized_question_member_safe,editorial_status)VALUES('How?','approved')RETURNING id INTO qcluster;
 INSERT INTO public.replay_question_candidates(resource_id,transcript_version_id,question_segment_index,question_start_ms,answer_start_ms,answer_end_ms,raw_excerpt_sha256,extractor_version,proposed_question_private,source_privacy_flag,state,origin,content_sha256)VALUES(rid,tv,0,0,1000,5000,repeat('a',64),'fixture','How?','clear','approved','human_curated',repeat('b',64))RETURNING id INTO qcand;
 INSERT INTO public.replay_answers(question_cluster_id,question_candidate_id,resource_id,transcript_version_id,playback_attempt_id,question_start_ms,answer_start_ms,answer_end_ms,member_question,safe_answer_summary,answerer_attribution,visibility_scope,privacy_approval,editorial_approval,seek_approval,privacy_reviewer,editorial_reviewer,seek_reviewer,privacy_reviewed_at,editorial_reviewed_at,seek_reviewed_at,published_at,publication_state,content_sha256)VALUES(qcluster,qcand,rid,tv,attempt,0,1000,5000,'How?','Safely','Faith','members','approved','approved','approved','p','e','s',now(),now(),now(),now(),'PUBLISHED',repeat('c',64))RETURNING id INTO question;
 j:=public.replay_vault_get_interaction(u,'forged@example.com','replay-r2','moment',moment);IF j#>>'{target,targetId}'<>moment::text OR (j#>>'{watch,durationSeconds}')::numeric<>60 THEN RAISE EXCEPTION 'auth.users-derived email binding/real get receipt %',j;END IF;
 UPDATE public.mastermind_portal_resources SET portal_resource_id=membership_id WHERE id=rid;
 j:=public.replay_vault_get_interaction(u,'forged@example.com',membership_id,'moment',moment);IF j#>>'{target,resourceId}'<>membership_id THEN RAISE EXCEPTION 'canonical membershipio resource rejected %',j;END IF;
 BEGIN PERFORM public.replay_vault_get_interaction(u,'member@example.com','replay:r2','moment',moment);RAISE EXCEPTION 'unsafe delimiter accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 UPDATE public.mastermind_portal_resources SET portal_resource_id='replay-r2' WHERE id=rid;
 BEGIN PERFORM public.replay_vault_get_interaction(u,'member@example.com','replay-r2','moment',gen_random_uuid());RAISE EXCEPTION 'forged moment accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 j:=public.replay_vault_set_bookmark(u,'member@example.com','replay-r2','question',question,true);IF NOT(j->>'saved')::boolean OR j->>'targetId'<>question::text THEN RAISE EXCEPTION 'bookmark receipt';END IF;
 j:=public.replay_vault_begin_session(u,'member@example.com','replay-r2','moment',moment);s:=(j->>'sessionId')::uuid;IF(j->>'durationSeconds')::numeric<>60 THEN RAISE EXCEPTION 'canonical duration';END IF;
 PERFORM pg_sleep(0.1);j:=public.replay_vault_record_media_event(u,'member@example.com',s,ev,1,'timeupdate',30000,1);IF(j->>'creditedSeconds')::numeric>=2 OR(j->>'watchedSeconds')::numeric>=2 OR(j->>'durationSeconds')::numeric<>60 THEN RAISE EXCEPTION '30s jump minted client delta/caller duration %',j;END IF;
 IF NOT(public.replay_vault_record_media_event(u,'member@example.com',s,ev,1,'timeupdate',30000,1)->>'replayed')::boolean THEN RAISE EXCEPTION 'duplicate event not replayed';END IF;
 j:=public.replay_vault_record_media_event(u,'member@example.com',s,gen_random_uuid(),2,'ended',60000,1);IF(j->>'completed')::boolean OR(j->>'creditedSeconds')::numeric<>0 THEN RAISE EXCEPTION 'fresh ended shortcut minted coverage %',j;END IF;
 BEGIN PERFORM public.replay_vault_record_media_event(u,'member@example.com',s,gen_random_uuid(),2,'ended',60000,1);RAISE EXCEPTION 'duplicate sequence accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 -- Lossless 201 disjoint ranges, no silent cap.
 UPDATE public.replay_vault_watch_state SET watched_ranges=(SELECT range_agg(numrange((g.n*2)::numeric,(g.n*2+1)::numeric,'[)')) FROM generate_series(0,200) AS g(n)) WHERE user_id=u AND resource_id=rid;
 IF (SELECT count(*) FROM unnest((SELECT watched_ranges FROM public.replay_vault_watch_state WHERE user_id=u AND resource_id=rid)))<>201 THEN RAISE EXCEPTION '201 ranges lost';END IF;
 UPDATE public.mastermind_portal_resources SET portal_resource_id=membership_id WHERE id=rid;
 j:=public.replay_vault_create_note(u,'member@example.com',membership_id,'question',question,1234,note_req);note_id:=(j->>'noteId')::uuid;IF j->>'openPath'<>'/notes?page='||note_id::text THEN RAISE EXCEPTION 'note path';END IF;
 IF NOT(public.replay_vault_create_note(u,'member@example.com',membership_id,'question',question,1234,note_req)->>'replayed')::boolean THEN RAISE EXCEPTION 'note replay';END IF;
 BEGIN PERFORM public.replay_vault_create_note(u,'member@example.com',membership_id,'question',question,9999,note_req);RAISE EXCEPTION 'note conflict missed';EXCEPTION WHEN unique_violation THEN NULL;END;
 IF EXISTS(SELECT 1 FROM public.journal_pages WHERE id=note_id AND(content~*'dropbox|transcript|/Users/|PRIVATE_SENTINEL' OR content NOT LIKE '%resource='||membership_id||'%' OR content NOT LIKE '%question='||question::text||'%'))THEN RAISE EXCEPTION 'safe membershipio note locator/encoding';END IF;
 UPDATE public.mastermind_portal_resources SET portal_resource_id='replay-r2' WHERE id=rid;
 BEGIN UPDATE public.replay_vault_note_backlinks SET user_id=gen_random_uuid() WHERE journal_page_id=note_id;RAISE EXCEPTION 'same owner FK missed';EXCEPTION WHEN foreign_key_violation THEN NULL;END;
 -- Losing access hides all exact rows/counts through the only readable path.
 UPDATE public.replay_vault_entitlements SET status='revoked',revoked_at=now() WHERE auth_user_id=u;
 BEGIN PERFORM public.replay_vault_get_interaction(u,'member@example.com','replay-r2','moment',moment);RAISE EXCEPTION 'revoked rows visible';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
DO $$DECLARE n text;BEGIN FOREACH n IN ARRAY ARRAY['replay_vault_bookmarks','replay_vault_watch_state','replay_vault_playback_sessions','replay_vault_media_events','replay_vault_note_backlinks']LOOP IF has_table_privilege('service_role','public.'||n,'SELECT')OR has_table_privilege('authenticated','public.'||n,'SELECT')THEN RAISE EXCEPTION 'direct read granted %',n;END IF;END LOOP;
 IF NOT has_function_privilege('service_role','public.replay_vault_begin_session(uuid,text,text,text,uuid)','EXECUTE') OR has_function_privilege('authenticated','public.replay_vault_begin_session(uuid,text,text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC ACL';END IF;END$$;
-- Migration 1600 must preserve every Edge-facing RPC accepted by migration 1400.
DO $$DECLARE sig text;BEGIN FOREACH sig IN ARRAY ARRAY[
 'public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)',
 'public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz)',
 'public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz)',
 'public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid)',
 'public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamptz,timestamptz)',
 'public.get_mastermind_portal_access_scopes(text)'] LOOP
 IF NOT has_function_privilege('service_role',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') THEN RAISE EXCEPTION 'inherited Edge RPC ACL regression %',sig;END IF;
 END LOOP;END$$;
UPDATE public.replay_vault_entitlements SET status='active',revoked_at=NULL WHERE auth_user_id='11111111-1111-4111-8111-111111111111';
SELECT s.id AS acl_moment_id FROM public.replay_transcript_segments s JOIN public.replay_publication_authority a ON a.transcript_version_id=s.transcript_version_id WHERE a.resource_id='10000000-0000-4000-8000-000000000001'::uuid LIMIT 1 \gset
SET ROLE service_role;
SELECT public.replay_vault_access_decision('11111111-1111-4111-8111-111111111111','member@example.com','replay-r2','playback',false,clock_timestamp()) IS NOT NULL AS access_rpc_invoked;
SELECT count(*)>=0 AS search_rpc_invoked FROM public.search_replay_vault_resources('11111111-1111-4111-8111-111111111111','member@example.com','Current',NULL,12,true,false,clock_timestamp());
SELECT count(*)>=0 AS playback_rpc_invoked FROM public.resolve_replay_vault_playback('11111111-1111-4111-8111-111111111111','member@example.com','replay-r2',NULL,:'acl_moment_id'::uuid,false,clock_timestamp());
SELECT public.record_replay_vault_playback_event('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000001','allowed','dropbox',:'acl_moment_id'::uuid,NULL) IS NULL AS playback_event_rpc_invoked;
SELECT public.apply_replay_vault_webhook_event('acl-probe','event-1600','order-1600','member@example.com','grant','unmapped','unmapped',repeat('f',64),clock_timestamp(),NULL)->>'status'='rejected_unmapped' AS webhook_rpc_invoked;
SELECT public.get_mastermind_portal_access_scopes('member@example.com') IS NOT NULL AS scopes_rpc_invoked;
RESET ROLE;
\echo PASS replay_vault_interactions_r2_real_stack_behavior
