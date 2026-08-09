\set ON_ERROR_STOP on
INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
VALUES
 ('ghl','vault','annual','annual',interval '1 year',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()),
 ('ghl','vault','monthly','monthly',interval '1 month',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp())
ON CONFLICT(provider,product_id,price_id) DO UPDATE SET active=true,approved_by=excluded.approved_by,approved_at=excluded.approved_at;

-- Expired stronger tier must not elevate a newer weaker active contribution.
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-mixed-old','order-mixed','charge-mixed-old',NULL,NULL,
  'mixed@example.com','grant','vault','annual',repeat('a',64),repeat('1',64),'2025-01-01','2026-01-01');
SELECT public.apply_replay_vault_commercial_event_r7('ghl','evt-mixed-current','order-mixed','charge-mixed-current',NULL,NULL,
  'mixed@example.com','renewal','vault','monthly',repeat('b',64),repeat('2',64),'2026-08-01','2026-09-01');
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.replay_vault_entitlements WHERE normalized_email='mixed@example.com'
    AND tier='monthly' AND status='active' AND access_expires_at='2026-09-01'::timestamptz) THEN
    RAISE EXCEPTION 'expired annual contribution elevated active monthly aggregate';
  END IF;
END $$;

DO $$ DECLARE j jsonb; old_expiry timestamptz; BEGIN
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c1','same-order','charge-1',NULL,NULL,
    'buyer@example.com','grant','vault','annual',repeat('1',64),repeat('a',64),'2026-08-09','2027-08-09');
  IF NOT (j->>'success')::boolean OR (j->>'replayed')::boolean THEN RAISE EXCEPTION 'first charge failed %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c1-redelivery','same-order','charge-1',NULL,NULL,
    'buyer@example.com','grant','vault','annual',repeat('2',64),repeat('b',64),'2026-08-09','2027-08-09');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'charge redelivery did not replay %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-c2','same-order','charge-2',NULL,NULL,
    'buyer@example.com','renewal','vault','annual',repeat('3',64),repeat('c',64),'2027-08-09','2028-08-09');
  IF (j->>'replayed')::boolean THEN RAISE EXCEPTION 'distinct same-order charge replayed %',j; END IF;
  IF (SELECT count(*) FROM public.replay_vault_purchase_contributions WHERE provider='ghl' AND order_id='same-order')<>2 THEN
    RAISE EXCEPTION 'same-order distinct charges not independent'; END IF;

  -- Old contribution refund must preserve the newer contribution aggregate.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-refund-c1',NULL,NULL,'same-order','charge-1',
    'buyer@example.com','refund','vault','annual',repeat('4',64),repeat('d',64),'2027-09-01',NULL);
  IF j->>'entitlementStatus'<>'active' OR (j->>'accessExpiresAt') NOT LIKE '2028-08-09%' THEN
    RAISE EXCEPTION 'old refund erased newer contribution %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-chargeback-c1',NULL,NULL,'same-order','charge-1',
    'buyer@example.com','chargeback','vault','annual',repeat('5',64),repeat('e',64),'2027-09-02',NULL);
  IF j->>'entitlementStatus'<>'active' THEN RAISE EXCEPTION 'refund to chargeback aggregate unsafe %',j; END IF;

  -- Unrelated lifecycle evidence never revokes.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-cross-buyer',NULL,NULL,'same-order','charge-2',
    'other@example.com','refund','vault','annual',repeat('6',64),repeat('f',64),'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'cross-buyer refund applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-cross-product',NULL,NULL,'same-order','charge-2',
    'buyer@example.com','refund','other-product','annual',repeat('7',64),repeat('1',64),'2027-09-03',NULL);
  IF j->>'status'<>'rejected_unmapped' THEN RAISE EXCEPTION 'cross-product refund not fail closed %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-old-order',NULL,NULL,'wrong-order','charge-2',
    'buyer@example.com','refund','vault','annual',repeat('8',64),repeat('2',64),'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'wrong-order refund applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-never',NULL,NULL,'never-order','never-charge',
    'buyer@example.com','refund','vault','annual',repeat('9',64),repeat('3',64),'2027-09-03',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'never-purchased refund applied %',j; END IF;

  -- Rejected unmapped evidence is retained, then explicitly reconciled after activation.
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-unmapped','map-order','map-charge',NULL,NULL,
    'mapped@example.com','grant','later-product','later-price',repeat('a',64),repeat('4',64),'2026-08-09',NULL);
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
    'early@example.com','refund','vault','annual',repeat('b',64),repeat('5',64),'2026-01-01',NULL);
  IF j->>'status'<>'rejected_transition' THEN RAISE EXCEPTION 'out-of-order lifecycle applied %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-late-purchase','early-order','early-charge',NULL,NULL,
    'early@example.com','grant','vault','annual',repeat('c',64),repeat('6',64),'2026-01-02','2027-01-02');
  IF NOT (j->>'success')::boolean OR j->>'entitlementStatus'<>'active' THEN RAISE EXCEPTION 'later purchase poisoned %',j; END IF;
  j:=public.apply_replay_vault_commercial_event_r7('ghl','evt-late-purchase','early-order','early-charge',NULL,NULL,
    'early@example.com','grant','vault','annual',repeat('c',64),repeat('6',64),'2026-01-02','2027-01-02');
  IF NOT (j->>'replayed')::boolean THEN RAISE EXCEPTION 'exact delivery duplicate not replayed %',j; END IF;

  BEGIN UPDATE public.replay_vault_purchase_contributions SET order_id='mutated' WHERE transaction_id='charge-2';
    RAISE EXCEPTION 'purchase contribution mutable'; EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='purchase contribution mutable' THEN RAISE; END IF; END;
END $$;

DO $$ DECLARE sig text:='public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz)'; BEGIN
  IF NOT has_function_privilege('service_role',sig,'EXECUTE')
    OR has_function_privilege('authenticated',sig,'EXECUTE') OR has_function_privilege('anon',sig,'EXECUTE') THEN
    RAISE EXCEPTION 'R7 RPC ACL mismatch'; END IF;
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
