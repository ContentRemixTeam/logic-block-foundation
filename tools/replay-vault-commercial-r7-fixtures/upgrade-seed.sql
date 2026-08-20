\set ON_ERROR_STOP on
INSERT INTO public.replay_vault_provider_product_mappings(provider,product_id,price_id,entitlement_tier,grant_interval,active,approved_by,approved_at)
VALUES
 ('ghl','vault','annual','annual',interval '1 year',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()),
 ('ghl','vault','monthly','monthly',interval '1 month',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()),
 ('ghl','vault','lifetime','lifetime',NULL,true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp());
INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES
 ('singleton@example.com','mastermind','active','2026-01-01','2027-01-01'),
 ('upgrade-monthly@example.com','mastermind','active','2026-01-01','2027-01-01'),
 ('upgrade-lifetime@example.com','mastermind','active','2026-01-01',NULL);
INSERT INTO public.replay_vault_entitlements(normalized_email,tier,status,access_starts_at,access_expires_at,source_provider,
  source_order_id,last_paid_event_at,last_transition_at)
VALUES
 ('ambiguous@example.com','annual','active','2026-01-01','2028-01-01','ghl','dup-order','2027-01-01','2027-01-01'),
 ('singleton@example.com','annual','active','2026-01-01','2027-01-01','ghl','single-order','2026-01-01','2026-01-01'),
 ('upgrade-monthly@example.com','monthly','active','2026-01-01','2026-12-01','ghl','upgrade-monthly-order','2026-01-01','2026-01-01'),
 ('upgrade-lifetime@example.com','lifetime','active','2026-01-01',NULL,'ghl','upgrade-lifetime-order','2026-01-01','2026-01-01');
INSERT INTO public.replay_vault_webhook_events(provider,event_id,order_id,normalized_email,event_type,product_id,price_id,
  payload_sha256,signature_verified,effective_at,requested_expires_at,applied_at,status,result_tier,result_status,result_expires_at)
VALUES
 ('ghl','legacy-dup-1','dup-order','ambiguous@example.com','grant','vault','annual',repeat('1',64),true,'2026-01-01','2027-01-01',clock_timestamp(),'applied','annual','active','2027-01-01'),
 ('ghl','legacy-dup-2','dup-order','ambiguous@example.com','renewal','vault','annual',repeat('2',64),true,'2027-01-01','2028-01-01',clock_timestamp(),'applied','annual','active','2028-01-01'),
 ('ghl','legacy-single','single-order','singleton@example.com','grant','vault','annual',repeat('3',64),true,'2026-01-01','2027-01-01',clock_timestamp(),'applied','annual','active','2027-01-01'),
 ('ghl','legacy-unmapped','later-order','later@example.com','grant','later-product','later-price',repeat('4',64),true,'2026-02-01',NULL,NULL,'rejected_unmapped',NULL,NULL,NULL),
 ('ghl','legacy-monthly','upgrade-monthly-order','upgrade-monthly@example.com','grant','vault','monthly',repeat('5',64),true,'2026-01-01','2026-12-01',clock_timestamp(),'applied','monthly','active','2026-12-01'),
 ('ghl','legacy-lifetime','upgrade-lifetime-order','upgrade-lifetime@example.com','grant','vault','lifetime',repeat('6',64),true,'2026-01-01',NULL,clock_timestamp(),'applied','lifetime','active',NULL);
