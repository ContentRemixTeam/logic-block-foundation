\set ON_ERROR_STOP on
DO $$
DECLARE
  u uuid := '11111111-1111-4111-8111-111111111111';
  admin_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  r1 uuid; r2 uuid; hidden uuid; m1 uuid; j jsonb; c integer;
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

  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,
    publication_state,privacy_state,pairing_state,transcript_state,media_state,published_at,stages)
  VALUES('replay-1','Vault','Pricing replay','/r1','bonus_or_access_review','replay_vault','published','approved','paired','active','approved',now(),ARRAY['sell']) RETURNING id INTO r1;
  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,
    publication_state,privacy_state,pairing_state,transcript_state,media_state,published_at,stages)
  VALUES('replay-2','Vault','More pricing','/r2','core_curriculum','replay_vault','published','approved','paired','active','approved',now(),ARRAY['sell']) RETURNING id INTO r2;
  INSERT INTO public.mastermind_portal_resources(portal_resource_id,product_title,title,portal_path,access_scope,approved_access_scope,stages)
  VALUES('hidden-sentinel','Vault','Hidden pricing sentinel','/hidden','replay_vault','replay_vault',ARRAY['sell']) RETURNING id INTO hidden;
  INSERT INTO public.mastermind_portal_source_evidence(resource_id,source_system,source_fingerprint,dropbox_path,review_status)
  VALUES(r1,'portal_playback_source','r1','/vault/private-r1.mp4','approved'),(r2,'portal_playback_source','r2','/vault/private-r2.mp4','approved');
  FOR i IN 0..4 LOOP
    INSERT INTO public.mastermind_portal_transcript_segments(resource_id,segment_index,starts_at_seconds,ends_at_seconds,transcript_text)
    VALUES(r1,i,i*60,i*60+45,'pricing strategy durable moment '||i) RETURNING id INTO m1;
  END LOOP;
  INSERT INTO public.mastermind_portal_transcript_segments(resource_id,segment_index,starts_at_seconds,ends_at_seconds,transcript_text)
  VALUES(r2,0,10,40,'pricing plan second replay'),(r2,1,50,80,'pricing model second replay'),
    (hidden,0,1,2,'pricing hidden sentinel must never leak');

  -- Exact entitlement boundary: active immediately before, denied exactly at expiry.
  IF NOT (public.replay_vault_access_decision(u,'annual@example.com',NULL,'access',false,expiry-'1 microsecond'::interval)->>'allowed')::boolean THEN RAISE EXCEPTION 'pre-expiry denied'; END IF;
  IF (public.replay_vault_access_decision(u,'annual@example.com',NULL,'access',false,expiry)->>'allowed')::boolean THEN RAISE EXCEPTION 'exact expiry allowed'; END IF;

  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09');
  IF c <> 5 THEN RAISE EXCEPTION 'expected five bounded moments, got %',c; END IF;
  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09') x WHERE x.portal_resource_id='replay-1';
  IF c <> 3 THEN RAISE EXCEPTION 'per-replay bound failed: %',c; END IF;
  SELECT count(*) INTO c FROM public.search_replay_vault_resources(u,'annual@example.com','pricing','sell',25,false,false,'2026-08-09') x WHERE x.moment_id IS NULL OR x.starts_at_seconds IS NULL OR x.ends_at_seconds IS NULL OR x.portal_resource_id='hidden-sentinel';
  IF c <> 0 THEN RAISE EXCEPTION 'durable id/timing/hidden sentinel failure'; END IF;

  SELECT id INTO m1 FROM public.mastermind_portal_transcript_segments WHERE resource_id=r1 AND segment_index=2;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-1',NULL,m1,false,'2026-08-09') x WHERE x.authoritative_start_seconds=120 AND x.authoritative_end_seconds=165;
  IF c <> 1 THEN RAISE EXCEPTION 'authoritative moment playback failed'; END IF;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-2',NULL,m1,false,'2026-08-09');
  IF c <> 0 THEN RAISE EXCEPTION 'mismatched moment was authorized'; END IF;
  SELECT count(*) INTO c FROM public.resolve_replay_vault_playback(u,'annual@example.com','replay-1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',NULL,false,'2026-08-09');
  IF c <> 0 THEN RAISE EXCEPTION 'unknown question was authorized'; END IF;

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

-- ACL probes: direct service-role table access denied; RPC execute allowed; PUBLIC denied on every created function.
DO $$ BEGIN
  IF has_table_privilege('service_role','public.replay_vault_entitlements','SELECT') THEN RAISE EXCEPTION 'service_role direct entitlement SELECT granted'; END IF;
  IF has_table_privilege('service_role','public.replay_vault_webhook_events','INSERT') THEN RAISE EXCEPTION 'service_role direct ledger INSERT granted'; END IF;
  IF has_function_privilege('public','public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamp with time zone)','EXECUTE') THEN RAISE EXCEPTION 'PUBLIC access decision execute'; END IF;
  IF has_function_privilege('public','public.replay_vault_ledger_append_only()','EXECUTE') THEN RAISE EXCEPTION 'PUBLIC trigger function execute'; END IF;
  IF NOT has_function_privilege('service_role','public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamp with time zone,timestamp with time zone)','EXECUTE') THEN RAISE EXCEPTION 'service_role RPC missing'; END IF;
END $$;
\echo PASS replay_vault_access_sql_behavior
