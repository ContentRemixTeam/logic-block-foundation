\set ON_ERROR_STOP on
DO $$ BEGIN
  IF (SELECT count(*) FROM public.replay_vault_commercial_quarantine WHERE provider='ghl' AND order_id='dup-order')<>1 THEN
    RAISE EXCEPTION 'ambiguous same-order legacy duplicates not quarantined'; END IF;
  IF (SELECT commercial_evidence_state FROM public.replay_vault_entitlements WHERE normalized_email='ambiguous@example.com')<>'quarantined' THEN
    RAISE EXCEPTION 'ambiguous entitlement not fail-closed'; END IF;
  IF EXISTS(SELECT 1 FROM public.replay_vault_purchase_contributions WHERE normalized_email='ambiguous@example.com') THEN
    RAISE EXCEPTION 'ambiguous duplicate silently selected'; END IF;
  IF (SELECT count(*) FROM public.replay_vault_purchase_contributions WHERE normalized_email='singleton@example.com'
      AND evidence_quality='legacy_singleton_inferred')<>1 THEN
    RAISE EXCEPTION 'singleton legacy purchase not backfilled'; END IF;
  IF (SELECT commercial_evidence_state FROM public.replay_vault_entitlements WHERE normalized_email='singleton@example.com')<>'validated' THEN
    RAISE EXCEPTION 'singleton aggregate not validated'; END IF;
  IF (SELECT outcome FROM public.replay_vault_commercial_deliveries WHERE provider_delivery_id='legacy-unmapped')<>'rejected_unmapped' THEN
    RAISE EXCEPTION 'legacy rejected evidence disposition lost'; END IF;
  IF (SELECT count(*) FROM public.replay_vault_commercial_deliveries WHERE source_legacy_event_id IS NOT NULL)<>6 THEN
    RAISE EXCEPTION 'legacy ledger not transactionally backfilled'; END IF;
END $$;
UPDATE public.replay_vault_launch_config SET launch_state='launched' WHERE singleton;
DO $$ DECLARE annual_j jsonb; monthly_j jsonb; lifetime_j jsonb; BEGIN
  annual_j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999991','singleton@example.com',NULL,'access',false,'2026-06-01');
  monthly_j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999992','upgrade-monthly@example.com',NULL,'access',false,'2026-06-01');
  lifetime_j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999993','upgrade-lifetime@example.com',NULL,'access',false,'2026-06-01');
  IF annual_j->>'memberTier'<>'annual' OR NOT (annual_j->>'allowed')::boolean OR NOT (annual_j->'memberScopes' ? 'replay_vault') THEN
    RAISE EXCEPTION 'R10 upgrade annual access missing %',annual_j;END IF;
  IF monthly_j->>'memberTier'<>'monthly' OR (monthly_j->>'allowed')::boolean OR (monthly_j->'memberScopes' ? 'replay_vault') THEN
    RAISE EXCEPTION 'R10 upgrade monthly denial missing %',monthly_j;END IF;
  IF lifetime_j->>'memberTier'<>'lifetime' OR NOT (lifetime_j->>'allowed')::boolean OR NOT (lifetime_j->'memberScopes' ? 'replay_vault') THEN
    RAISE EXCEPTION 'R10 upgrade lifetime access missing %',lifetime_j;END IF;
END $$;
SELECT 'PASS replay_vault_commercial_evidence_r7_exact_base_upgrade';
