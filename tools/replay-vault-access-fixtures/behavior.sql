\set ON_ERROR_STOP on
DO $$
DECLARE
  u uuid := '11111111-1111-4111-8111-111111111111';
  admin_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  run_id uuid := '10000000-0000-4000-8000-000000000001';
  r1 uuid; r2 uuid; forged uuid; m1 uuid; q1 uuid; j jsonb; c integer;
  r1_media uuid; r1_transcript uuid; r1_tv uuid; r1_attempt uuid;
  r2_media uuid; r2_transcript uuid; r2_tv uuid; r2_attempt uuid;
  question_cluster uuid; question_candidate uuid;
  expiry timestamptz := '2026-09-01 00:00:00+00';
BEGIN
  INSERT INTO public.admin_users VALUES(admin_id);
  INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES
    ('annual@example.com','mastermind','active','2026-01-01','2027-01-01'),
    ('transition@example.com','mastermind','active','2026-01-01','2027-01-01'),
    ('concurrent@example.com','mastermind','active','2026-01-01','2027-01-01');
  UPDATE public.replay_vault_launch_config SET launch_state='launched' WHERE singleton;
  INSERT INTO public.replay_vault_entitlements(normalized_email,auth_user_id,tier,status,access_starts_at,access_expires_at,
    source_provider,source_order_id,last_paid_event_at,last_transition_at)
  VALUES('annual@example.com',u,'annual','active','2026-01-01',expiry,'seed','seed','2026-01-01','2026-01-01');

  INSERT INTO public.replay_ingestion_runs(id,run_kind,source_system,collector_version_sha256,source_snapshot_sha256,
    record_manifest_sha256,record_count,status,completed_at,created_by)
  VALUES(run_id,'fixture','fixture',repeat('1',64),repeat('2',64),repeat('3',64),4,'accepted',now(),admin_id);

  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,stages)
  VALUES('replay-1','Vault','Pricing replay','/r1','bonus_or_access_review','replay_vault',ARRAY['sell']) RETURNING id INTO r1;
  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,stages)
  VALUES('replay-2','Vault','More pricing','/r2','core_curriculum','replay_vault',ARRAY['sell']) RETURNING id INTO r2;
  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,stages)
  VALUES('forged-legacy','Vault','Forged pricing sentinel','/forged','replay_vault','replay_vault',ARRAY['sell']) RETURNING id INTO forged;

  INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,source_locator_private,
    duration_ms,first_seen_run_id,last_seen_run_id,metadata_sha256)
  VALUES('fixture','r1-media','1','media_file','/private/r1.mp4',3600000,run_id,run_id,repeat('4',64)) RETURNING id INTO r1_media;
  INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,source_locator_private,
    first_seen_run_id,last_seen_run_id,metadata_sha256)
  VALUES('fixture','r1-transcript','1','canonical_transcript','/private/r1.json',run_id,run_id,repeat('5',64)) RETURNING id INTO r1_transcript;
  INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,source_locator_private,
    duration_ms,first_seen_run_id,last_seen_run_id,metadata_sha256)
  VALUES('fixture','r2-media','1','media_file','/private/r2.mp4',2400000,run_id,run_id,repeat('6',64)) RETURNING id INTO r2_media;
  INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,source_locator_private,
    first_seen_run_id,last_seen_run_id,metadata_sha256)
  VALUES('fixture','r2-transcript','1','canonical_transcript','/private/r2.json',run_id,run_id,repeat('7',64)) RETURNING id INTO r2_transcript;

  INSERT INTO public.replay_transcript_versions(resource_id,source_asset_id,authority,source_record_id,source_version,
    raw_sha256,normalized_sha256,normalizer_version,cue_count,text_chars,first_ms,last_ms,coverage_ratio,
    quality_status,privacy_status,review_status,is_active,activated_at)
  VALUES(r1,r1_transcript,'crdb_master','r1','1',repeat('8',64),repeat('9',64),'fixture',5,180,0,285000,1,
    'pass','pass','approved',true,now()) RETURNING id INTO r1_tv;
  INSERT INTO public.replay_transcript_versions(resource_id,source_asset_id,authority,source_record_id,source_version,
    raw_sha256,normalized_sha256,normalizer_version,cue_count,text_chars,first_ms,last_ms,coverage_ratio,
    quality_status,privacy_status,review_status,is_active,activated_at)
  VALUES(r2,r2_transcript,'crdb_master','r2','1',repeat('a',64),repeat('b',64),'fixture',2,90,10000,80000,1,
    'pass','pass','approved',true,now()) RETURNING id INTO r2_tv;

  FOR i IN 0..4 LOOP
    INSERT INTO public.replay_transcript_segments(transcript_version_id,segment_index,starts_at_ms,ends_at_ms,transcript_text_private)
    VALUES(r1_tv,i,i*60000,i*60000+45000,'pricing strategy durable moment '||i) RETURNING id INTO m1;
  END LOOP;
  INSERT INTO public.replay_transcript_segments(transcript_version_id,segment_index,starts_at_ms,ends_at_ms,transcript_text_private)
  VALUES(r2_tv,0,10000,40000,'pricing plan second replay'),(r2_tv,1,50000,80000,'pricing model second replay');

  INSERT INTO public.replay_pairing_candidates(resource_id,media_asset_id,transcript_asset_id,transcript_version_id,run_id,
    stable_bridge_id,stable_bridge_exact,media_duration_ms,duration_delta_ms,transcript_coverage_ratio,rule_version,
    candidate_rank,candidate_count_at_key,decision,decision_reason)
  VALUES(r1,r1_media,r1_transcript,r1_tv,run_id,'r1',true,3600000,0,1,'fixture',1,1,'auto_approved','fixture'),
        (r2,r2_media,r2_transcript,r2_tv,run_id,'r2',true,2400000,0,1,'fixture',1,1,'auto_approved','fixture');

  INSERT INTO public.replay_media_migration_attempts(run_id,source_asset_id,manifest_sha256,run_sha256,worker_sha256,
    source_native_id,source_metadata_sha256,source_url_fingerprint,destination_policy_version,stable_destination_key,
    dropbox_file_id,dropbox_path_private,dropbox_content_hash,size_bytes,duration_ms,full_decode_ok,range_request_ok,
    sample_seek_ok,status,attempt_number,started_at,completed_at,receipt_sha256)
  VALUES(run_id,r1_media,repeat('c',64),repeat('d',64),repeat('e',64),'r1-media',repeat('4',64),repeat('f',64),
    'fixture','r1','id-r1','/vault/private-r1.mp4','hash-r1',1000,3600000,true,true,true,'verified',1,now(),now(),repeat('1',64)) RETURNING id INTO r1_attempt;
  INSERT INTO public.replay_media_migration_attempts(run_id,source_asset_id,manifest_sha256,run_sha256,worker_sha256,
    source_native_id,source_metadata_sha256,source_url_fingerprint,destination_policy_version,stable_destination_key,
    dropbox_file_id,dropbox_path_private,dropbox_content_hash,size_bytes,duration_ms,full_decode_ok,range_request_ok,
    sample_seek_ok,status,attempt_number,started_at,completed_at,receipt_sha256)
  VALUES(run_id,r2_media,repeat('2',64),repeat('3',64),repeat('4',64),'r2-media',repeat('6',64),repeat('5',64),
    'fixture','r2','id-r2','/vault/private-r2.mp4','hash-r2',1000,2400000,true,true,true,'verified',1,now(),now(),repeat('6',64)) RETURNING id INTO r2_attempt;

  UPDATE public.mastermind_portal_resources SET publication_state='published',privacy_state='approved',pairing_state='paired',
    transcript_state='active',media_state='approved',published_at=now(),active_transcript_version_id=r1_tv,
    active_playback_attempt_id=r1_attempt WHERE id=r1;
  UPDATE public.mastermind_portal_resources SET publication_state='published',privacy_state='approved',pairing_state='paired',
    transcript_state='active',media_state='approved',published_at=now(),active_transcript_version_id=r2_tv,
    active_playback_attempt_id=r2_attempt WHERE id=r2;

  -- Forged legacy rows and self-declared labels have no canonical active version/attempt and must never cross the boundary.
  UPDATE public.mastermind_portal_resources SET publication_state='published',privacy_state='approved',pairing_state='paired',
    transcript_state='active',media_state='approved',published_at=now() WHERE id=forged;
  INSERT INTO public.mastermind_portal_source_evidence(resource_id,source_system,source_fingerprint,dropbox_path,review_status)
  VALUES(forged,'portal_playback_source','forged','/vault/unverified-old.mp4','approved');
  INSERT INTO public.mastermind_portal_transcript_segments(resource_id,segment_index,starts_at_seconds,ends_at_seconds,transcript_text)
  VALUES(forged,0,1,2,'pricing forged legacy sentinel must never leak');

  INSERT INTO public.replay_question_clusters(normalized_question_member_safe,editorial_status)
  VALUES('How should I price this?','approved') RETURNING id INTO question_cluster;
  INSERT INTO public.replay_question_candidates(resource_id,transcript_version_id,question_segment_index,question_start_ms,
    answer_start_ms,answer_end_ms,raw_excerpt_sha256,extractor_version,proposed_question_private,state)
  VALUES(r1,r1_tv,2,110000,120000,165000,repeat('7',64),'fixture','How should I price this?','approved') RETURNING id INTO question_candidate;
  INSERT INTO public.replay_answers(question_cluster_id,question_candidate_id,resource_id,transcript_version_id,playback_attempt_id,
    question_start_ms,answer_start_ms,answer_end_ms,member_question,safe_answer_summary,answerer_attribution,visibility_scope,
    is_best_answer,privacy_approval,editorial_approval,seek_approval,privacy_reviewer,editorial_reviewer,seek_reviewer,
    privacy_reviewed_at,editorial_reviewed_at,seek_reviewed_at,published_at)
  VALUES(question_cluster,question_candidate,r1,r1_tv,r1_attempt,110000,120000,165000,'How should I price this?',
    'Use a durable pricing strategy.','Faith','replay_vault',true,'approved','approved','approved','privacy','editor','seek',now(),now(),now(),now()) RETURNING id INTO q1;

  IF NOT (public.replay_vault_access_decision(u,'annual@example.com',NULL,'access',false,expiry-'1 microsecond'::interval)->>'allowed')::boolean THEN RAISE EXCEPTION 'pre-expiry denied'; END IF;
  IF (public.replay_vault_access_decision(u,'annual@example.com',NULL,'access',false,expiry)->>'allowed')::boolean THEN RAISE EXCEPTION 'exact expiry allowed'; END IF;

  RAISE NOTICE 'projection rows %, search vectors %, access %',
    (SELECT count(*) FROM public.replay_published_resource_projection),
    (SELECT count(*) FROM public.replay_transcript_segments WHERE search_vector @@ websearch_to_tsquery('english','pricing')),
    public.replay_vault_access_decision(u,'annual@example.com','replay-1','search',false,'2026-08-09');
  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09');
  IF c <> 5 THEN RAISE EXCEPTION 'expected five bounded moments, got %',c; END IF;
  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09') x WHERE x.portal_resource_id='replay-1';
  IF c <> 3 THEN RAISE EXCEPTION 'per-replay bound failed: %',c; END IF;
  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09') x WHERE x.moment_id IS NULL OR x.starts_at_seconds IS NULL OR x.ends_at_seconds IS NULL OR x.portal_resource_id='forged-legacy';
  IF c <> 0 THEN RAISE EXCEPTION 'durable id/timing/projection boundary failure'; END IF;

  SELECT id INTO m1 FROM public.replay_transcript_segments WHERE transcript_version_id=r1_tv AND segment_index=2;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-1',NULL,m1,false,'2026-08-09') x WHERE x.authoritative_start_seconds=120 AND x.authoritative_end_seconds=165 AND x.dropbox_locator='id:id-r1';
  IF c <> 1 THEN RAISE EXCEPTION 'authoritative projected moment playback failed'; END IF;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-2',NULL,m1,false,'2026-08-09');
  IF c <> 0 THEN RAISE EXCEPTION 'mismatched moment was authorized'; END IF;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-1',q1,NULL,false,'2026-08-09') x WHERE x.authoritative_start_seconds=120 AND x.question_id=q1;
  IF c <> 1 THEN RAISE EXCEPTION 'active projected question playback failed'; END IF;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','forged-legacy',NULL,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false,'2026-08-09');
  IF c <> 0 THEN RAISE EXCEPTION 'forged legacy resource was playable'; END IF;

  INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
  VALUES('ghl','annual-product','annual-price','annual',interval '1 year',true,admin_id,now());
  j:=public.apply_replay_vault_webhook_event('ghl','evt-grant','ord-1','transition@example.com','grant','annual-product','annual-price',repeat('a',64),'2026-08-09','2027-08-09');
  IF j->>'status'<>'applied' OR j->>'accessExpiresAt' NOT LIKE '2027-08-09%' THEN RAISE EXCEPTION 'exact grant expiry failed: %',j; END IF;
  j:=public.apply_replay_vault_webhook_event('ghl','evt-grant','ord-1','transition@example.com','grant','annual-product','annual-price',repeat('a',64),'2026-08-09','2027-08-09');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'exact duplicate not replayed'; END IF;
  j:=public.apply_replay_vault_webhook_event('ghl','evt-grant','ord-1','transition@example.com','grant','annual-product','annual-price',repeat('b',64),'2026-08-09','2027-08-09');
  IF j->>'status'<>'event_id_payload_conflict' THEN RAISE EXCEPTION 'payload conflict not denied'; END IF;
  IF (SELECT count(*) FROM public.replay_vault_webhook_events WHERE provider='ghl' AND event_id='evt-grant')<>1 THEN RAISE EXCEPTION 'duplicate ledger row'; END IF;

  j:=public.apply_replay_vault_webhook_event('ghl','evt-cancel','ord-1','transition@example.com','cancel_at_period_end','annual-product','annual-price',repeat('c',64),'2026-08-10','2027-07-31');
  IF j->>'entitlementStatus'<>'cancel_at_period_end' OR j->>'accessExpiresAt' NOT LIKE '2027-07-31%' THEN RAISE EXCEPTION 'cancel exact period end failed: %',j; END IF;
  j:=public.apply_replay_vault_webhook_event('ghl','evt-expire','ord-1','transition@example.com','expiration','annual-product','annual-price',repeat('d',64),'2027-07-31',NULL);
  IF j->>'entitlementStatus'<>'expired' THEN RAISE EXCEPTION 'expiration failed: %',j; END IF;
  j:=public.apply_replay_vault_webhook_event('ghl','evt-new','ord-2','transition@example.com','grant','annual-product','annual-price',repeat('e',64),'2027-08-01','2028-08-01');
  IF j->>'entitlementStatus'<>'active' THEN RAISE EXCEPTION 'regrant failed: %',j; END IF;
  j:=public.apply_replay_vault_webhook_event('ghl','evt-refund','ord-2','transition@example.com','refund','annual-product','annual-price',repeat('f',64),'2027-08-02',NULL);
  IF j->>'entitlementStatus'<>'revoked' THEN RAISE EXCEPTION 'immediate revocation failed: %',j; END IF;

  BEGIN
    INSERT INTO public.replay_vault_webhook_events(provider,event_id,order_id,normalized_email,event_type,product_id,price_id,payload_sha256,signature_verified,effective_at,status)
    VALUES('ghl','invalid-signature','x','x@example.com','grant','x','x',repeat('0',64),false,now(),'applied');
    RAISE EXCEPTION 'invalid signature persisted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$ BEGIN
  IF has_table_privilege('service_role','public.replay_vault_entitlements','SELECT') THEN RAISE EXCEPTION 'service_role direct entitlement SELECT granted'; END IF;
  IF has_table_privilege('service_role','public.replay_vault_webhook_events','INSERT') THEN RAISE EXCEPTION 'service_role direct ledger INSERT granted'; END IF;
  IF has_function_privilege('public','public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamp with time zone)','EXECUTE') THEN RAISE EXCEPTION 'PUBLIC access decision execute'; END IF;
  IF has_function_privilege('public','public.replay_vault_ledger_append_only()','EXECUTE') THEN RAISE EXCEPTION 'PUBLIC trigger function execute'; END IF;
  IF NOT has_function_privilege('service_role','public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamp with time zone,timestamp with time zone)','EXECUTE') THEN RAISE EXCEPTION 'service_role RPC missing'; END IF;
END $$;
\echo PASS replay_vault_access_sql_behavior_and_projection_boundary
