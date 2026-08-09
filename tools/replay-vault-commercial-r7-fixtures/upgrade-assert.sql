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
  IF (SELECT count(*) FROM public.replay_vault_commercial_deliveries WHERE source_legacy_event_id IS NOT NULL)<>4 THEN
    RAISE EXCEPTION 'legacy ledger not transactionally backfilled'; END IF;
END $$;
SELECT 'PASS replay_vault_commercial_evidence_r7_exact_base_upgrade';
