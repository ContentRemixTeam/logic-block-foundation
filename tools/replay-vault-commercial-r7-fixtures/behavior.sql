\set ON_ERROR_STOP on
INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
VALUES
 ('ghl','vault','annual','annual',interval '1 year',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()),
 ('ghl','vault','lifetime','lifetime',NULL,true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()),
 ('ghl','vault','monthly','monthly',interval '1 month',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp())
ON CONFLICT(provider,product_id,price_id) DO UPDATE SET active=true,approved_by=excluded.approved_by,approved_at=excluded.approved_at;
INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at)
VALUES
 ('mixed@example.com','mastermind','active','2025-01-01','2028-01-01'),
 ('lifetime@example.com','mastermind','active','2025-01-01',NULL);

-- Prove the final R10 tier boundary under a launched Vault. The default
-- disabled state would make every tier look denied and produce a false green.
UPDATE public.replay_vault_launch_config SET launch_state='launched' WHERE singleton;
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-lifetime','lifetime-order','lifetime-charge',NULL,NULL,
  'lifetime@example.com','grant','vault','lifetime',repeat('c',64),repeat('3',64),1786291200,'2025-01-01',NULL);

-- Expired stronger tier must not elevate a newer weaker active contribution.
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-mixed-old','order-mixed','charge-mixed-old',NULL,NULL,
  'mixed@example.com','grant','vault','annual',repeat('a',64),repeat('1',64),1786291200,'2025-01-01','2026-08-15');
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-mixed-current','order-mixed','charge-mixed-current',NULL,NULL,
  'mixed@example.com','renewal','vault','monthly',repeat('b',64),repeat('2',64),1786291200,'2026-08-01','2026-09-01');
DO $$ DECLARE j jsonb;u uuid:='99999999-9999-4999-8999-999999999999';BEGIN
  j:=public.replay_vault_access_decision(u,'mixed@example.com',NULL,'access',false,'2026-08-15 03:59:59.999999Z');
  IF j->>'memberTier'<>'annual' OR NOT (j->'memberScopes' ? 'replay_vault') OR NOT (j->>'allowed')::boolean THEN
    RAISE EXCEPTION 'annual tier/scope missing before exact expiry %',j;END IF;
  j:=public.replay_vault_access_decision(u,'mixed@example.com',NULL,'access',false,'2026-08-15T04:00:00Z');
  IF j->>'memberTier'<>'monthly' OR (j->'memberScopes' ? 'replay_vault') OR (j->>'allowed')::boolean THEN
    RAISE EXCEPTION 'expired annual tier/scope crossed boundary or mixed monthly expiry %',j;END IF;
END $$;

INSERT INTO public.admin_users(user_id)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ON CONFLICT DO NOTHING;
INSERT INTO public.mastermind_portal_resources(
  portal_resource_id,product_title,title,portal_path,publication_state,privacy_state,
  pairing_state,transcript_state,media_state,approved_access_scope
) VALUES(
  'r10-preview-resource','Vault','R10 preview boundary','/mastermind/replay-vault/r10-preview-resource',
  'inventoried','unreviewed','paired','active','approved','replay_vault'
);

DO $$ DECLARE
  j jsonb;
  annual_id uuid:='99999999-9999-4999-8999-999999999999';
  admin_id uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN
  j:=public.replay_vault_access_decision(annual_id,'lifetime@example.com',NULL,'access',false,'2026-08-15T00:00:00Z');
  IF j->>'memberTier'<>'lifetime' OR NOT (j->'memberScopes' ? 'replay_vault') OR NOT (j->>'allowed')::boolean THEN
    RAISE EXCEPTION 'launched lifetime Vault access missing %',j;END IF;

  BEGIN
    PERFORM public.replay_vault_access_decision(annual_id,'lifetime@example.com',NULL,NULL,false,'2026-08-15T00:00:00Z');
    RAISE EXCEPTION 'null action accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM='null action accepted' THEN RAISE; END IF;
  END;

  UPDATE public.replay_vault_launch_config SET launch_state='disabled' WHERE singleton;
  j:=public.replay_vault_access_decision(annual_id,'mixed@example.com',NULL,'access',false,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'disabled annual entered Vault %',j;END IF;
  j:=public.replay_vault_access_decision(annual_id,'mixed@example.com',NULL,'access',true,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean OR (j->>'previewActive')::boolean THEN RAISE EXCEPTION 'non-admin preview bypassed launch %',j;END IF;
  j:=public.replay_vault_access_decision(admin_id,'admin@example.com',NULL,'access',true,'2026-08-15T00:00:00Z');
  IF NOT (j->>'allowed')::boolean OR NOT (j->>'previewActive')::boolean THEN RAISE EXCEPTION 'admin preview entry missing %',j;END IF;

  j:=public.replay_vault_access_decision(admin_id,'admin@example.com','r10-preview-resource','search',true,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'admin preview bypassed privacy %',j;END IF;
  UPDATE public.mastermind_portal_resources SET privacy_state='approved',transcript_state='evidence_only'
   WHERE portal_resource_id='r10-preview-resource';
  j:=public.replay_vault_access_decision(admin_id,'admin@example.com','r10-preview-resource','search',true,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'admin preview bypassed transcript readiness %',j;END IF;
  UPDATE public.mastermind_portal_resources SET transcript_state='active'
   WHERE portal_resource_id='r10-preview-resource';
  j:=public.replay_vault_access_decision(admin_id,'admin@example.com','r10-preview-resource','search',true,'2026-08-15T00:00:00Z');
  IF NOT (j->>'allowed')::boolean THEN RAISE EXCEPTION 'admin preview could not inspect privacy-ready unpublished resource %',j;END IF;
  UPDATE public.mastermind_portal_resources SET media_state='planned'
   WHERE portal_resource_id='r10-preview-resource';
  j:=public.replay_vault_access_decision(admin_id,'admin@example.com','r10-preview-resource','playback',true,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'admin preview bypassed playback readiness %',j;END IF;
  UPDATE public.mastermind_portal_resources SET media_state='approved',available_until='2026-08-14'
   WHERE portal_resource_id='r10-preview-resource';
  j:=public.replay_vault_access_decision(admin_id,'admin@example.com','r10-preview-resource','playback',true,'2026-08-15T04:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'admin preview bypassed resource expiration %',j;END IF;
  UPDATE public.replay_vault_launch_config SET launch_state='pilot' WHERE singleton;
  j:=public.replay_vault_access_decision(annual_id,'mixed@example.com',NULL,'access',false,'2026-08-15T00:00:00Z');
  IF (j->>'allowed')::boolean THEN RAISE EXCEPTION 'non-pilot annual entered pilot %',j;END IF;
  INSERT INTO public.replay_vault_pilot_subjects(auth_user_id,enabled) VALUES(annual_id,true)
    ON CONFLICT(auth_user_id) DO UPDATE SET enabled=true;
  j:=public.replay_vault_access_decision(annual_id,'mixed@example.com',NULL,'access',false,'2026-08-15T00:00:00Z');
  IF NOT (j->>'allowed')::boolean THEN RAISE EXCEPTION 'enabled annual pilot denied %',j;END IF;

  UPDATE public.replay_vault_launch_config SET launch_state='launched' WHERE singleton;
END $$;

-- A future annual contribution must not elevate the active monthly contribution early.
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-future-annual','future-order','future-annual',NULL,NULL,
  'mixed@example.com','renewal','vault','annual',repeat('d',64),repeat('7',64),1786291200,'2026-09-01','2027-09-01');
DO $$DECLARE j jsonb;BEGIN
  j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999999','mixed@example.com',NULL,'access',false,'2026-09-01 03:59:59.999999Z');
  IF j->>'memberTier'<>'monthly' OR (j->'memberScopes' ? 'replay_vault') OR (j->>'allowed')::boolean THEN
    RAISE EXCEPTION 'future annual granted early or monthly entered Vault %',j;END IF;
END$$;

-- A lifecycle time before its exact purchase rejects generically and mutates nothing.
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-time-parent','time-order','time-charge',NULL,NULL,
  'time@example.com','grant','vault','annual',repeat('e',64),repeat('8',64),1786291200,'2026-08-10','2027-08-10');
DO $$DECLARE before_deliveries bigint;before_attempts bigint;before_lifecycle bigint;BEGIN
  SELECT count(*) INTO before_deliveries FROM public.replay_vault_commercial_deliveries;
  SELECT count(*) INTO before_attempts FROM public.replay_vault_commercial_delivery_attempts;
  SELECT count(*) INTO before_lifecycle FROM public.replay_vault_purchase_lifecycle_evidence;
  BEGIN
    PERFORM public.apply_replay_vault_commercial_event_r7('ghl','evt-time-older',NULL,NULL,'time-order','time-charge',
      'time@example.com','refund','vault','annual',repeat('f',64),repeat('9',64),1786291201,'2026-08-09',NULL);
    RAISE EXCEPTION 'older lifecycle accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM<>'invalid replay vault commercial event' THEN RAISE EXCEPTION 'non-generic lifecycle error %',SQLERRM;END IF;
  END;
  IF (SELECT count(*) FROM public.replay_vault_commercial_deliveries)<>before_deliveries
    OR (SELECT count(*) FROM public.replay_vault_commercial_delivery_attempts)<>before_attempts
    OR (SELECT count(*) FROM public.replay_vault_purchase_lifecycle_evidence)<>before_lifecycle THEN
    RAISE EXCEPTION 'older lifecycle mutated evidence';END IF;
END$$;

-- Scheduled terminal evidence is retained but takes effect only at its exact boundary.
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-time-future',NULL,NULL,'time-order','time-charge',
  'time@example.com','refund','vault','annual',repeat('0',64),repeat('1',64),1786291202,'2026-08-20',NULL);
DO $$DECLARE j jsonb;BEGIN
  j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999999','time@example.com',NULL,'access',false,'2026-08-20 03:59:59.999999Z');
  IF j->>'memberTier'<>'annual' THEN RAISE EXCEPTION 'future lifecycle revoked early %',j;END IF;
  j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999999','time@example.com',NULL,'access',false,'2026-08-20T04:00:00Z');
  IF j->>'memberTier' IS NOT NULL THEN RAISE EXCEPTION 'future lifecycle boundary not enforced %',j;END IF;
END$$;

-- Same event/raw business semantics with a refreshed valid signature is replay; every verified attempt remains append-only.
DO $$DECLARE j jsonb;delivery uuid;BEGIN
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-resigned','resign-order','resign-charge',NULL,NULL,
    'resign@example.com','grant','vault','monthly',repeat('2',64),repeat('3',64),1786291300,'2026-08-09','2026-09-09');
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-resigned','resign-order','resign-charge',NULL,NULL,
    'resign@example.com','grant','vault','monthly',repeat('2',64),repeat('4',64),1786291400,'2026-08-09','2026-09-09');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'resigned redelivery conflicted %',j;END IF;
  SELECT id INTO delivery FROM public.replay_vault_commercial_deliveries WHERE provider='ghl' AND provider_delivery_id='evt-resigned';
  IF (SELECT count(*) FROM public.replay_vault_commercial_delivery_attempts WHERE canonical_delivery_id=delivery)<>2 THEN
    RAISE EXCEPTION 'resigned attempts not retained';END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-resigned','resign-order','resign-charge',NULL,NULL,
    'resign@example.com','grant','vault','monthly',repeat('5',64),repeat('6',64),1786291500,'2026-08-09','2026-09-09');
  IF j->>'status'<>'event_id_payload_conflict' THEN RAISE EXCEPTION 'changed payload did not conflict %',j;END IF;
  IF (SELECT count(*) FROM public.replay_vault_commercial_delivery_attempts WHERE canonical_delivery_id=delivery)<>3 THEN
    RAISE EXCEPTION 'verified conflicting attempt not retained';END IF;
  BEGIN UPDATE public.replay_vault_commercial_delivery_attempts SET signature_timestamp=1 WHERE canonical_delivery_id=delivery;
    RAISE EXCEPTION 'attempt evidence mutable';EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='attempt evidence mutable' THEN RAISE;END IF;END;
END$$;

DO $$ DECLARE j jsonb; old_expiry timestamptz; BEGIN
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c1','same-order','charge-1',NULL,NULL,
    'buyer@example.com','grant','vault','annual',repeat('1',64),repeat('a',64),1786291200,'2026-08-09','2027-08-09');
  IF NOT (j->>'success')::boolean OR (j->>'replayed')::boolean THEN RAISE EXCEPTION 'first charge failed %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c1-redelivery','same-order','charge-1',NULL,NULL,
    'buyer@example.com','grant','vault','annual',repeat('2',64),repeat('b',64),1786291200,'2026-08-09','2027-08-09');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'charge redelivery did not replay %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c2','same-order','charge-2',NULL,NULL,
    'buyer@example.com','renewal','vault','annual',repeat('3',64),repeat('c',64),1786291200,'2027-08-09','2028-08-09');
  IF (j->>'replayed')::boolean THEN RAISE EXCEPTION 'distinct same-order charge replayed %',j; END IF;
  IF (SELECT count(*) FROM public.replay_vault_purchase_contributions WHERE provider='ghl' AND order_id='same-order')<>2 THEN
    RAISE EXCEPTION 'same-order distinct charges not independent'; END IF;

  -- Old contribution refund must preserve the newer contribution aggregate.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-refund-c1',NULL,NULL,'same-order','charge-1',
    'buyer@example.com','refund','vault','annual',repeat('4',64),repeat('d',64),1786291200,'2027-09-01',NULL);
  j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999999','buyer@example.com',NULL,'access',false,'2027-09-01');
  IF j->>'memberTier'<>'annual' THEN RAISE EXCEPTION 'old refund erased newer contribution %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-chargeback-c1',NULL,NULL,'same-order','charge-1',
    'buyer@example.com','chargeback','vault','annual',repeat('5',64),repeat('e',64),1786291200,'2027-09-02',NULL);
  IF j->>'entitlementStatus'<>'active' THEN RAISE EXCEPTION 'refund to chargeback aggregate unsafe %',j; END IF;

  -- Unrelated lifecycle evidence never revokes.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-cross-buyer',NULL,NULL,'same-order','charge-2',
    'other@example.com','refund','vault','annual',repeat('6',64),repeat('f',64),1786291200,'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'cross-buyer refund applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-cross-product',NULL,NULL,'same-order','charge-2',
    'buyer@example.com','refund','other-product','annual',repeat('7',64),repeat('1',64),1786291200,'2027-09-03',NULL);
  IF j->>'status'<>'rejected_unmapped' THEN RAISE EXCEPTION 'cross-product refund not fail closed %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-old-order',NULL,NULL,'wrong-order','charge-2',
    'buyer@example.com','refund','vault','annual',repeat('8',64),repeat('2',64),1786291200,'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'wrong-order refund applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-never',NULL,NULL,'never-order','never-charge',
    'buyer@example.com','refund','vault','annual',repeat('9',64),repeat('3',64),1786291200,'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'never-purchased refund applied %',j; END IF;

  -- Rejected unmapped evidence is retained, then explicitly reconciled after activation.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-unmapped','map-order','map-charge',NULL,NULL,
    'mapped@example.com','grant','later-product','later-price',repeat('a',64),repeat('4',64),1786291200,'2026-08-09',NULL);
  IF j->>'status'<>'rejected_unmapped' THEN RAISE EXCEPTION 'unmapped fixture failed'; END IF;
  INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
  VALUES('ghl','later-product','later-price','monthly',interval '1 month',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp());
  SELECT public.reconcile_replay_vault_unmapped_event_r7(
    (SELECT id FROM public.replay_vault_commercial_deliveries WHERE provider_delivery_id='evt-unmapped'),'mapping-reviewer') INTO j;
  IF NOT (j->>'success')::boolean OR NOT (j->>'reconciled')::boolean THEN RAISE EXCEPTION 'unmapped reconciliation failed %',j; END IF;
  IF (SELECT count(*) FROM public.replay_vault_commercial_resolutions WHERE original_delivery_id=(SELECT id FROM public.replay_vault_commercial_deliveries WHERE provider_delivery_id='evt-unmapped'))<>1 THEN
    RAISE EXCEPTION 'resolution evidence missing'; END IF;
  IF (SELECT outcome FROM public.replay_vault_commercial_deliveries WHERE provider_delivery_id='evt-unmapped')<>'rejected_unmapped' THEN
    RAISE EXCEPTION 'original rejected evidence mutated'; END IF;

  -- Out-of-order lifecycle evidence cannot manufacture a revocation or poison a later exact purchase.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-early-refund',NULL,NULL,'early-order','early-charge',
    'early@example.com','refund','vault','annual',repeat('b',64),repeat('5',64),1786291200,'2026-01-01',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'out-of-order lifecycle applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-late-purchase','early-order','early-charge',NULL,NULL,
    'early@example.com','grant','vault','annual',repeat('c',64),repeat('6',64),1786291200,'2026-01-02','2027-01-02');
  IF NOT (j->>'success')::boolean OR j->>'entitlementStatus'<>'active' THEN RAISE EXCEPTION 'later purchase poisoned %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-late-purchase','early-order','early-charge',NULL,NULL,
    'early@example.com','grant','vault','annual',repeat('c',64),repeat('6',64),1786291200,'2026-01-02','2027-01-02');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'exact delivery duplicate not replayed %',j; END IF;

  BEGIN UPDATE public.replay_vault_purchase_contributions SET order_id='mutated' WHERE transaction_id='charge-2';
    RAISE EXCEPTION 'purchase contribution mutable'; EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='purchase contribution mutable' THEN RAISE; END IF; END;
END $$;

DO $$ DECLARE
  sig text:='public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,bigint,timestamptz,timestamptz)';
  fn record;
  allowed_service_names text[]:=ARRAY[
    'activate_replay_transcript_version','replay_import_content_package','replay_mark_resource_ready','replay_approve_resource','replay_publish_resource','replay_revoke_resource',
    'replay_vault_access_decision','search_replay_vault_resources','resolve_replay_vault_playback','record_replay_vault_playback_event','get_mastermind_portal_access_scopes',
    'replay_questions_create_candidate','replay_questions_promote_candidate','replay_questions_privacy_approve','replay_questions_editorial_approve','replay_questions_seek_approve','replay_questions_make_answer_ready','replay_questions_publish','replay_questions_revoke',
    'replay_vault_get_interaction','replay_vault_set_bookmark','replay_vault_delete_bookmark_by_id','replay_vault_begin_session','replay_vault_record_media_event','replay_vault_create_note',
    'replay_vault_browse_member','replay_vault_categories_member','replay_vault_transcript_member','replay_vault_questions_member','replay_vault_saved_member',
    'apply_replay_vault_commercial_event_r7','reconcile_replay_vault_unmapped_event_r7'
  ];
BEGIN
  IF NOT has_function_privilege('service_role',sig,'EXECUTE')
    OR has_function_privilege('authenticated',sig,'EXECUTE') OR has_function_privilege('anon',sig,'EXECUTE') THEN
    RAISE EXCEPTION 'R7 RPC ACL mismatch'; END IF;
  IF has_table_privilege('service_role','public.replay_vault_commercial_delivery_attempts','SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated','public.replay_vault_commercial_delivery_attempts','SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'delivery attempt table direct ACL';END IF;
  IF has_function_privilege('service_role','public.replay_forbid_generated_question_publish()','EXECUTE')
    OR has_function_privilege('authenticated','public.replay_forbid_generated_question_publish()','EXECUTE')
    OR has_function_privilege('anon','public.replay_forbid_generated_question_publish()','EXECUTE') THEN
    RAISE EXCEPTION 'generated question trigger helper is not owner-only';END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND (p.proname LIKE 'replay_%' OR p.proname='activate_replay_transcript_version')
      AND l.lanname IN ('sql','plpgsql') AND NOT EXISTS(SELECT 1 FROM unnest(coalesce(p.proconfig,'{}'::text[])) cfg WHERE cfg LIKE 'search_path=%')) THEN
    RAISE EXCEPTION 'final replay function lacks fixed search_path: %',(SELECT string_agg(p.proname,',') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND (p.proname LIKE 'replay_%' OR p.proname='activate_replay_transcript_version') AND l.lanname IN ('sql','plpgsql') AND NOT EXISTS(SELECT 1 FROM unnest(coalesce(p.proconfig,'{}'::text[])) cfg WHERE cfg LIKE 'search_path=%'));END IF;
  -- Exhaustive final-stack catalog ACL: every present Replay Vault function is
  -- denied to PUBLIC/client roles; service_role may invoke only named Edge RPCs.
  FOR fn IN
    SELECT p.oid,p.proname,p.oid::regprocedure::text AS identity
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND l.lanname IN ('sql','plpgsql')
      AND (p.proname LIKE '%replay%' OR p.proname='get_mastermind_portal_access_scopes')
  LOOP
    IF has_function_privilege('public',fn.oid,'EXECUTE')
      OR has_function_privilege('anon',fn.oid,'EXECUTE')
      OR has_function_privilege('authenticated',fn.oid,'EXECUTE') THEN
      RAISE EXCEPTION 'final replay function client/PUBLIC execute leak %',fn.identity;
    END IF;
    IF has_function_privilege('service_role',fn.oid,'EXECUTE') AND NOT (fn.proname=ANY(allowed_service_names)) THEN
      RAISE EXCEPTION 'unexpected direct service_role helper execute %',fn.identity;
    END IF;
  END LOOP;
  IF has_function_privilege('service_role','public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamptz,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION 'unsafe old webhook RPC remains executable'; END IF;
  IF pg_get_viewdef('public.replay_published_resource_projection'::regclass,true)~*'current_date' THEN
    RAISE EXCEPTION 'projection retained independent wall clock'; END IF;
  IF public.replay_vault_exclusive_end('2026-03-08')<>'2026-03-09 04:00:00+00'::timestamptz
    OR public.replay_vault_exclusive_end('2026-11-01')<>'2026-11-02 05:00:00+00'::timestamptz
    OR public.replay_vault_exclusive_end('2028-02-29')<>'2028-03-01 05:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'B1 time authority boundary mismatch'; END IF;
  IF pg_get_viewdef('public.replay_published_answers_projection'::regclass,true)!~'replay_questions_candidate_hash'
    OR pg_get_viewdef('public.replay_published_answers_projection'::regclass,true)!~'transcript_snapshot_sha256' THEN
    RAISE EXCEPTION '1500 publication predicates regressed'; END IF;
END $$;
SELECT 'PASS replay_vault_commercial_evidence_r7_behavior';
