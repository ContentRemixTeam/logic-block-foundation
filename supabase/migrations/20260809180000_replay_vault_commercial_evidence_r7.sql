-- Replay Vault commercial evidence R7. Forward-only repair over exact 1300->1700 history.
-- Local/source artifact only: this migration does not deploy, publish, or enable launch state.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A single inclusive-business-date authority. Capability RPC p_as_of remains the
-- only clock used for authorization; projections expose, but do not evaluate, it.
CREATE OR REPLACE FUNCTION public.replay_vault_exclusive_end(p_inclusive_date date)
RETURNS timestamptz LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
  SELECT CASE WHEN p_inclusive_date IS NULL THEN NULL::timestamptz
    ELSE (p_inclusive_date + 1)::timestamp AT TIME ZONE 'America/New_York' END
$$;

CREATE OR REPLACE VIEW public.replay_published_resource_projection WITH(security_invoker=false) AS
SELECT r.id,r.portal_resource_id,r.title,r.product_title,r.category_title,r.portal_path,r.resource_type,
  r.approved_access_scope,r.stages,r.success_paths,a.transcript_version_id,
  a.transcript_content_sha256 transcript_sha256,a.playback_attempt_id,m.dropbox_file_id,
  m.dropbox_content_hash,m.size_bytes,m.duration_ms,
  public.replay_vault_exclusive_end(r.available_until) availability_expires_at
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id=a.resource_id
JOIN public.replay_transcript_versions v ON v.id=a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id=a.playback_attempt_id
WHERE a.state='PUBLISHED' AND a.published_at IS NOT NULL AND a.revoked_at IS NULL
  AND v.resource_id=a.resource_id AND v.is_active AND v.normalized_sha256=a.transcript_content_sha256
  AND m.source_asset_id=a.media_source_asset_id AND m.verification_evidence_sha256=a.media_evidence_sha256;
REVOKE ALL ON public.replay_published_resource_projection FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.replay_published_resource_projection TO service_role;

-- Existing aggregate rows are not commercial evidence. Existing rows are marked
-- unverified first; later transactional backfill promotes only unambiguous rows.
ALTER TABLE public.replay_vault_entitlements
  ADD COLUMN IF NOT EXISTS commercial_evidence_state text;
UPDATE public.replay_vault_entitlements SET commercial_evidence_state='legacy_unverified'
WHERE commercial_evidence_state IS NULL;
ALTER TABLE public.replay_vault_entitlements ALTER COLUMN commercial_evidence_state SET DEFAULT 'validated';
ALTER TABLE public.replay_vault_entitlements ALTER COLUMN commercial_evidence_state SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.replay_vault_entitlements ADD CONSTRAINT replay_vault_entitlements_evidence_state_r7
    CHECK (commercial_evidence_state IN ('validated','legacy_unverified','quarantined')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.replay_vault_commercial_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK(provider=lower(trim(provider)) AND provider<>''),
  provider_delivery_id text NOT NULL CHECK(trim(provider_delivery_id)<>''),
  event_type text NOT NULL CHECK(event_type IN ('grant','renewal','cancel_at_period_end','expiration','refund','chargeback','immediate_revocation')),
  order_id text,
  transaction_id text,
  lifecycle_parent_order_id text,
  lifecycle_parent_transaction_id text,
  normalized_email text NOT NULL CHECK(normalized_email=lower(trim(normalized_email)) AND position('@' in normalized_email)>1),
  product_id text NOT NULL CHECK(trim(product_id)<>''),
  price_id text NOT NULL CHECK(trim(price_id)<>''),
  payload_sha256 text NOT NULL CHECK(payload_sha256~'^[0-9a-f]{64}$'),
  signature_sha256 text CHECK(signature_sha256 IS NULL OR signature_sha256~'^[0-9a-f]{64}$'),
  signature_verified boolean NOT NULL CHECK(signature_verified),
  effective_at timestamptz NOT NULL,
  requested_expires_at timestamptz,
  outcome text NOT NULL CHECK(outcome IN ('applied','replayed_purchase','rejected_unmapped','rejected_transition','delivery_conflict','commercial_conflict','legacy_backfill','quarantined')),
  error_class text,
  receipt jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_legacy_event_id uuid,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(provider,provider_delivery_id),
  CHECK ((event_type IN ('grant','renewal') AND order_id IS NOT NULL AND trim(order_id)<>'' AND transaction_id IS NOT NULL AND trim(transaction_id)<>'' AND lifecycle_parent_transaction_id IS NULL)
    OR (event_type NOT IN ('grant','renewal') AND lifecycle_parent_order_id IS NOT NULL AND trim(lifecycle_parent_order_id)<>'' AND lifecycle_parent_transaction_id IS NOT NULL AND trim(lifecycle_parent_transaction_id)<>''))
);

CREATE TABLE IF NOT EXISTS public.replay_vault_purchase_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK(provider=lower(trim(provider)) AND provider<>''),
  transaction_id text NOT NULL CHECK(trim(transaction_id)<>''),
  order_id text NOT NULL CHECK(trim(order_id)<>''),
  normalized_email text NOT NULL CHECK(normalized_email=lower(trim(normalized_email)) AND position('@' in normalized_email)>1),
  product_id text NOT NULL CHECK(trim(product_id)<>''),
  price_id text NOT NULL CHECK(trim(price_id)<>''),
  entitlement_tier text NOT NULL CHECK(entitlement_tier IN ('monthly','annual','lifetime')),
  purchase_effective_at timestamptz NOT NULL,
  requested_expires_at timestamptz,
  contribution_starts_at timestamptz NOT NULL,
  contribution_expires_at timestamptz,
  purchase_delivery_id uuid NOT NULL REFERENCES public.replay_vault_commercial_deliveries(id) ON DELETE RESTRICT,
  evidence_quality text NOT NULL DEFAULT 'exact_provider_transaction' CHECK(evidence_quality IN ('exact_provider_transaction','legacy_singleton_inferred')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(provider,transaction_id),
  CHECK((entitlement_tier='lifetime' AND contribution_expires_at IS NULL)
    OR (entitlement_tier IN ('monthly','annual') AND contribution_expires_at>contribution_starts_at))
);

CREATE TABLE IF NOT EXISTS public.replay_vault_purchase_lifecycle_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  parent_transaction_id text NOT NULL,
  parent_order_id text NOT NULL,
  lifecycle_type text NOT NULL CHECK(lifecycle_type IN ('cancel_at_period_end','expiration','refund','chargeback','immediate_revocation')),
  lifecycle_delivery_id uuid NOT NULL UNIQUE REFERENCES public.replay_vault_commercial_deliveries(id) ON DELETE RESTRICT,
  purchase_contribution_id uuid NOT NULL REFERENCES public.replay_vault_purchase_contributions(id) ON DELETE RESTRICT,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS replay_vault_lifecycle_purchase_idx
  ON public.replay_vault_purchase_lifecycle_evidence(purchase_contribution_id,lifecycle_type,effective_at);

CREATE TABLE IF NOT EXISTS public.replay_vault_commercial_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  order_id text,
  legacy_event_ids uuid[] NOT NULL,
  reason text NOT NULL,
  evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(provider,evidence_sha256)
);

CREATE TABLE IF NOT EXISTS public.replay_vault_commercial_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_delivery_id uuid NOT NULL REFERENCES public.replay_vault_commercial_deliveries(id) ON DELETE RESTRICT,
  resolution_type text NOT NULL CHECK(resolution_type IN ('mapping_activated_reconciliation','manual_quarantine_resolution')),
  resolved_by text NOT NULL CHECK(trim(resolved_by)<>''),
  replay_delivery_id uuid REFERENCES public.replay_vault_commercial_deliveries(id) ON DELETE RESTRICT,
  result_receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(original_delivery_id,resolution_type)
);

CREATE OR REPLACE FUNCTION public.replay_vault_r7_forbid_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION '% is append-only',TG_TABLE_NAME; END $$;
DO $$ DECLARE n text; BEGIN
  FOREACH n IN ARRAY ARRAY['replay_vault_commercial_deliveries','replay_vault_purchase_contributions',
    'replay_vault_purchase_lifecycle_evidence','replay_vault_commercial_quarantine','replay_vault_commercial_resolutions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',n||'_append_only_r7',n);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.replay_vault_r7_forbid_mutation()',n||'_append_only_r7',n);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',n);
  END LOOP;
END $$;

-- Transactional historical repair. A singleton old purchase can be represented
-- with an explicit legacy-inferred transaction. Same-order purchase duplicates
-- cannot be distinguished from redelivery and are quarantined, never guessed.
INSERT INTO public.replay_vault_commercial_quarantine(provider,order_id,legacy_event_ids,reason,evidence_sha256)
SELECT provider,order_id,array_agg(id ORDER BY received_at,id),'ambiguous_legacy_same_order_purchase',
  encode(digest(provider||'|'||order_id||'|'||array_to_string(array_agg(id ORDER BY received_at,id),','),'sha256'),'hex')
FROM public.replay_vault_webhook_events
WHERE status='applied' AND event_type IN ('grant','renewal')
GROUP BY provider,order_id HAVING count(*)>1
ON CONFLICT(provider,evidence_sha256) DO NOTHING;

INSERT INTO public.replay_vault_commercial_deliveries(provider,provider_delivery_id,event_type,order_id,transaction_id,
  lifecycle_parent_order_id,lifecycle_parent_transaction_id,normalized_email,product_id,price_id,payload_sha256,
  signature_sha256,signature_verified,effective_at,requested_expires_at,outcome,error_class,source_legacy_event_id,receipt)
SELECT w.provider,w.event_id,w.event_type,
  CASE WHEN w.event_type IN ('grant','renewal') THEN w.order_id END,
  CASE WHEN w.event_type IN ('grant','renewal') THEN 'legacy-event:'||w.event_id END,
  CASE WHEN w.event_type NOT IN ('grant','renewal') THEN w.order_id END,
  CASE WHEN w.event_type NOT IN ('grant','renewal') THEN 'legacy-missing-parent:'||w.event_id END,
  w.normalized_email,w.product_id,w.price_id,w.payload_sha256,NULL,true,w.effective_at,w.requested_expires_at,
  CASE WHEN w.status='rejected_unmapped' THEN 'rejected_unmapped'
       WHEN q.id IS NOT NULL OR w.event_type NOT IN ('grant','renewal') OR w.status<>'applied' THEN 'quarantined'
       ELSE 'legacy_backfill' END,
  CASE WHEN w.status='rejected_unmapped' THEN 'unmapped_product'
       WHEN q.id IS NOT NULL THEN 'ambiguous_legacy_same_order_purchase'
       WHEN w.event_type NOT IN ('grant','renewal') THEN 'legacy_lifecycle_missing_parent'
       WHEN w.status<>'applied' THEN coalesce(w.error_class,'legacy_rejected_transition') END,
  w.id,jsonb_build_object('legacyWebhookEventId',w.id,'status',w.status)
FROM public.replay_vault_webhook_events w
LEFT JOIN public.replay_vault_commercial_quarantine q ON q.provider=w.provider AND q.order_id=w.order_id
ON CONFLICT(provider,provider_delivery_id) DO NOTHING;

INSERT INTO public.replay_vault_purchase_contributions(provider,transaction_id,order_id,normalized_email,product_id,price_id,
  entitlement_tier,purchase_effective_at,requested_expires_at,contribution_starts_at,contribution_expires_at,purchase_delivery_id,evidence_quality)
SELECT d.provider,d.transaction_id,d.order_id,d.normalized_email,d.product_id,d.price_id,w.result_tier,w.effective_at,w.requested_expires_at,w.effective_at,
  CASE WHEN w.result_tier='lifetime' THEN NULL ELSE w.result_expires_at END,d.id,'legacy_singleton_inferred'
FROM public.replay_vault_commercial_deliveries d
JOIN public.replay_vault_webhook_events w ON w.id=d.source_legacy_event_id
WHERE d.outcome='legacy_backfill' AND w.status='applied' AND w.event_type IN ('grant','renewal')
  AND w.result_tier IS NOT NULL AND (w.result_tier='lifetime' OR w.result_expires_at>w.effective_at)
ON CONFLICT(provider,transaction_id) DO NOTHING;

UPDATE public.replay_vault_entitlements e SET commercial_evidence_state='quarantined'
WHERE EXISTS(SELECT 1 FROM public.replay_vault_commercial_quarantine q
  JOIN public.replay_vault_webhook_events w ON w.id=ANY(q.legacy_event_ids)
  WHERE w.normalized_email=e.normalized_email);
UPDATE public.replay_vault_entitlements e SET commercial_evidence_state='validated'
WHERE commercial_evidence_state='legacy_unverified' AND EXISTS(
  SELECT 1 FROM public.replay_vault_purchase_contributions c WHERE c.normalized_email=e.normalized_email);
ALTER TABLE public.replay_vault_entitlements VALIDATE CONSTRAINT replay_vault_entitlements_evidence_state_r7;

CREATE OR REPLACE FUNCTION public.replay_vault_enforce_entitlement_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF current_setting('replay_vault.aggregate_recompute',true)='on' THEN RETURN NEW; END IF;
  IF NEW.last_transition_at<OLD.last_transition_at OR NEW.last_paid_event_at<OLD.last_paid_event_at THEN
    RAISE EXCEPTION 'replay vault event clocks cannot move backward';
  END IF;
  IF OLD.tier='lifetime' AND NEW.tier<>'lifetime' THEN RAISE EXCEPTION 'lifetime entitlement cannot be downgraded'; END IF;
  IF NOT ((OLD.status=NEW.status) OR (OLD.status='active' AND NEW.status IN ('cancel_at_period_end','expired','revoked'))
    OR (OLD.status='cancel_at_period_end' AND NEW.status IN ('active','expired','revoked'))
    OR (OLD.status IN ('expired','revoked') AND NEW.status='active')) THEN
    RAISE EXCEPTION 'illegal replay vault entitlement transition: % -> %',OLD.status,NEW.status;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.replay_vault_recompute_entitlement_r7(p_email text,p_transition_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.replay_vault_entitlements%ROWTYPE; c record; latest record; life boolean; tier text; expires timestamptz;
  starts timestamptz; paid timestamptz; active_count bigint; transition_at timestamptz:=coalesce(p_transition_at,clock_timestamp());
BEGIN
  PERFORM set_config('replay_vault.aggregate_recompute','on',true);
  SELECT * INTO e FROM public.replay_vault_entitlements WHERE normalized_email=p_email FOR UPDATE;
  SELECT count(*),bool_or(x.entitlement_tier='lifetime'),min(x.contribution_starts_at),
    max(x.contribution_expires_at),max(x.contribution_starts_at)
    INTO active_count,life,starts,expires,paid
  FROM public.replay_vault_purchase_contributions x
  WHERE x.normalized_email=p_email
    AND (x.contribution_expires_at IS NULL OR x.contribution_expires_at>transition_at)
    AND NOT EXISTS(
    SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l
    WHERE l.purchase_contribution_id=x.id AND l.lifecycle_type IN ('expiration','refund','chargeback','immediate_revocation'));
  IF active_count>0 THEN
    SELECT x.* INTO latest FROM public.replay_vault_purchase_contributions x
    WHERE x.normalized_email=p_email
      AND (x.contribution_expires_at IS NULL OR x.contribution_expires_at>transition_at)
      AND NOT EXISTS(SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l
      WHERE l.purchase_contribution_id=x.id AND l.lifecycle_type IN ('expiration','refund','chargeback','immediate_revocation'))
    ORDER BY x.contribution_starts_at DESC,x.created_at DESC,x.id DESC LIMIT 1;
    SELECT CASE WHEN life THEN 'lifetime' WHEN EXISTS(SELECT 1 FROM public.replay_vault_purchase_contributions x
      WHERE x.normalized_email=p_email AND x.entitlement_tier='annual'
        AND (x.contribution_expires_at IS NULL OR x.contribution_expires_at>transition_at)
        AND NOT EXISTS(SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l WHERE l.purchase_contribution_id=x.id AND l.lifecycle_type IN ('expiration','refund','chargeback','immediate_revocation'))) THEN 'annual' ELSE 'monthly' END INTO tier;
    IF life THEN expires:=NULL; END IF;
    INSERT INTO public.replay_vault_entitlements(normalized_email,tier,status,access_starts_at,access_expires_at,
      source_provider,source_order_id,last_paid_event_at,last_transition_at,revoked_at,commercial_evidence_state)
    VALUES(p_email,tier,'active',starts,expires,latest.provider,latest.order_id,paid,transition_at,NULL,'validated')
    ON CONFLICT(normalized_email) DO UPDATE SET tier=excluded.tier,status='active',access_starts_at=excluded.access_starts_at,
      access_expires_at=excluded.access_expires_at,source_provider=excluded.source_provider,source_order_id=excluded.source_order_id,
      last_paid_event_at=greatest(public.replay_vault_entitlements.last_paid_event_at,excluded.last_paid_event_at),
      last_transition_at=greatest(public.replay_vault_entitlements.last_transition_at,excluded.last_transition_at),
      revoked_at=NULL,commercial_evidence_state='validated',updated_at=clock_timestamp();
  ELSIF e.id IS NOT NULL THEN
    UPDATE public.replay_vault_entitlements SET status='revoked',revoked_at=transition_at,
      last_transition_at=greatest(last_transition_at,transition_at),commercial_evidence_state='validated',updated_at=clock_timestamp()
    WHERE id=e.id;
  END IF;
  SELECT * INTO e FROM public.replay_vault_entitlements WHERE normalized_email=p_email;
  RETURN jsonb_build_object('tier',e.tier,'entitlementStatus',e.status,'accessExpiresAt',e.access_expires_at,
    'commercialEvidenceState',e.commercial_evidence_state);
END $$;

CREATE OR REPLACE FUNCTION public.apply_replay_vault_commercial_event_r7(
  p_provider text,p_event_id text,p_order_id text,p_transaction_id text,p_parent_order_id text,
  p_parent_transaction_id text,p_email text,p_event_type text,p_product_id text,p_price_id text,
  p_payload_sha256 text,p_signature_sha256 text,p_effective_at timestamptz,p_access_expires_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  v_provider text:=lower(trim(coalesce(p_provider,''))); v_email text:=lower(trim(coalesce(p_email,'')));
  v_event_id text:=trim(coalesce(p_event_id,'')); v_order_id text:=nullif(trim(coalesce(p_order_id,'')),'');
  v_transaction_id text:=nullif(trim(coalesce(p_transaction_id,'')),'');
  v_parent_order text:=nullif(trim(coalesce(p_parent_order_id,'')),'');
  v_parent_transaction text:=nullif(trim(coalesce(p_parent_transaction_id,'')),'');
  v_mapping public.replay_vault_provider_product_mappings%ROWTYPE;
  v_delivery public.replay_vault_commercial_deliveries%ROWTYPE;
  v_purchase public.replay_vault_purchase_contributions%ROWTYPE;
  v_existing public.replay_vault_purchase_contributions%ROWTYPE;
  v_start timestamptz; v_end timestamptz; v_receipt jsonb;
  v_delivery_id uuid; v_contribution_id uuid; v_semantic_equal boolean;
  v_is_purchase boolean:=p_event_type IN ('grant','renewal');
BEGIN
  IF v_provider='' OR v_event_id='' OR position('@' in v_email)<=1
    OR trim(coalesce(p_product_id,''))='' OR trim(coalesce(p_price_id,''))=''
    OR p_event_type NOT IN ('grant','renewal','cancel_at_period_end','expiration','refund','chargeback','immediate_revocation')
    OR p_payload_sha256!~'^[0-9a-f]{64}$' OR p_signature_sha256!~'^[0-9a-f]{64}$' OR p_effective_at IS NULL
    OR (v_is_purchase AND (v_order_id IS NULL OR v_transaction_id IS NULL OR v_parent_transaction IS NOT NULL))
    OR (NOT v_is_purchase AND (v_parent_order IS NULL OR v_parent_transaction IS NULL))
    OR (p_access_expires_at IS NOT NULL AND p_access_expires_at<=p_effective_at) THEN
    RAISE EXCEPTION 'invalid replay vault commercial event' USING ERRCODE='22023';
  END IF;

  -- Commercial identity, delivery identity, then buyer aggregate: fixed lock order.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_provider||':commercial:'||coalesce(v_transaction_id,v_parent_transaction),0));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_provider||':delivery:'||v_event_id,0));
  SELECT * INTO v_delivery FROM public.replay_vault_commercial_deliveries d
    WHERE d.provider=v_provider AND d.provider_delivery_id=v_event_id;
  IF FOUND THEN
    IF v_delivery.payload_sha256<>p_payload_sha256 OR v_delivery.signature_sha256<>p_signature_sha256 THEN
      RETURN jsonb_build_object('success',false,'replayed',false,'status','event_id_payload_conflict');
    END IF;
    RETURN v_delivery.receipt||jsonb_build_object('replayed',true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('email:'||v_email,0));

  SELECT * INTO v_mapping FROM public.replay_vault_provider_product_mappings m
    WHERE m.provider=v_provider AND m.product_id=p_product_id AND m.price_id=p_price_id AND m.active;
  IF NOT FOUND THEN
    v_receipt:=jsonb_build_object('success',false,'replayed',false,'status','rejected_unmapped');
    INSERT INTO public.replay_vault_commercial_deliveries(provider,provider_delivery_id,event_type,order_id,transaction_id,
      lifecycle_parent_order_id,lifecycle_parent_transaction_id,normalized_email,product_id,price_id,payload_sha256,signature_sha256,
      signature_verified,effective_at,requested_expires_at,outcome,error_class,receipt)
    VALUES(v_provider,v_event_id,p_event_type,v_order_id,v_transaction_id,v_parent_order,v_parent_transaction,v_email,
      p_product_id,p_price_id,p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,
      'rejected_unmapped','unmapped_product',v_receipt);
    RETURN v_receipt;
  END IF;

  IF v_is_purchase THEN
    SELECT * INTO v_existing FROM public.replay_vault_purchase_contributions c
      WHERE c.provider=v_provider AND c.transaction_id=v_transaction_id;
    IF FOUND THEN
      v_semantic_equal:=v_existing.order_id=v_order_id AND v_existing.normalized_email=v_email
        AND v_existing.product_id=p_product_id AND v_existing.price_id=p_price_id
        AND v_existing.entitlement_tier=v_mapping.entitlement_tier
        AND v_existing.purchase_effective_at=p_effective_at
        AND v_existing.requested_expires_at IS NOT DISTINCT FROM p_access_expires_at;
      IF NOT v_semantic_equal THEN
        v_receipt:=jsonb_build_object('success',false,'replayed',false,'status','commercial_transaction_conflict');
        INSERT INTO public.replay_vault_commercial_deliveries(provider,provider_delivery_id,event_type,order_id,transaction_id,
          normalized_email,product_id,price_id,payload_sha256,signature_sha256,signature_verified,effective_at,requested_expires_at,
          outcome,error_class,receipt)
        VALUES(v_provider,v_event_id,p_event_type,v_order_id,v_transaction_id,v_email,p_product_id,p_price_id,
          p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,
          'commercial_conflict','transaction_evidence_conflict',v_receipt);
        RETURN v_receipt;
      END IF;
      v_receipt:=jsonb_build_object('success',true,'replayed',true,'status','applied','purchaseContributionId',v_existing.id)
        ||public.replay_vault_recompute_entitlement_r7(v_email,p_effective_at);
      INSERT INTO public.replay_vault_commercial_deliveries(provider,provider_delivery_id,event_type,order_id,transaction_id,
        normalized_email,product_id,price_id,payload_sha256,signature_sha256,signature_verified,effective_at,requested_expires_at,
        outcome,receipt)
      VALUES(v_provider,v_event_id,p_event_type,v_order_id,v_transaction_id,v_email,p_product_id,p_price_id,
        p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,'replayed_purchase',v_receipt);
      RETURN v_receipt;
    END IF;

    v_start:=p_effective_at;
    IF v_mapping.entitlement_tier='lifetime' THEN v_end:=NULL;
    ELSIF p_access_expires_at IS NOT NULL THEN v_end:=p_access_expires_at;
    ELSE
      SELECT greatest(p_effective_at,coalesce(max(c.contribution_expires_at),p_effective_at)) INTO v_start
      FROM public.replay_vault_purchase_contributions c
      WHERE c.normalized_email=v_email AND c.entitlement_tier<>'lifetime'
        AND NOT EXISTS(SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l
          WHERE l.purchase_contribution_id=c.id AND l.lifecycle_type IN ('expiration','refund','chargeback','immediate_revocation'));
      v_end:=v_start+v_mapping.grant_interval;
    END IF;
    v_delivery_id:=gen_random_uuid(); v_contribution_id:=gen_random_uuid();
    v_receipt:=jsonb_build_object('success',true,'replayed',false,'status','applied','purchaseContributionId',v_contribution_id);
    INSERT INTO public.replay_vault_commercial_deliveries(id,provider,provider_delivery_id,event_type,order_id,transaction_id,
      normalized_email,product_id,price_id,payload_sha256,signature_sha256,signature_verified,effective_at,requested_expires_at,
      outcome,receipt)
    VALUES(v_delivery_id,v_provider,v_event_id,p_event_type,v_order_id,v_transaction_id,v_email,p_product_id,p_price_id,
      p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,'applied',v_receipt);
    INSERT INTO public.replay_vault_purchase_contributions(id,provider,transaction_id,order_id,normalized_email,product_id,price_id,
      entitlement_tier,purchase_effective_at,requested_expires_at,contribution_starts_at,contribution_expires_at,purchase_delivery_id)
    VALUES(v_contribution_id,v_provider,v_transaction_id,v_order_id,v_email,p_product_id,p_price_id,v_mapping.entitlement_tier,
      p_effective_at,p_access_expires_at,v_start,v_end,v_delivery_id) RETURNING * INTO v_purchase;
    RETURN v_receipt||public.replay_vault_recompute_entitlement_r7(v_email,p_effective_at);
  END IF;

  SELECT * INTO v_purchase FROM public.replay_vault_purchase_contributions c
    WHERE c.provider=v_provider AND c.transaction_id=v_parent_transaction;
  IF NOT FOUND OR v_purchase.order_id<>v_parent_order OR v_purchase.normalized_email<>v_email
    OR v_purchase.product_id<>p_product_id OR v_purchase.price_id<>p_price_id THEN
    v_receipt:=jsonb_build_object('success',false,'replayed',false,'status','rejected_transition');
    INSERT INTO public.replay_vault_commercial_deliveries(provider,provider_delivery_id,event_type,
      lifecycle_parent_order_id,lifecycle_parent_transaction_id,normalized_email,product_id,price_id,payload_sha256,
      signature_sha256,signature_verified,effective_at,requested_expires_at,outcome,error_class,receipt)
    VALUES(v_provider,v_event_id,p_event_type,v_parent_order,v_parent_transaction,v_email,p_product_id,p_price_id,
      p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,
      'rejected_transition','exact_parent_purchase_not_found',v_receipt);
    RETURN v_receipt;
  END IF;

  v_delivery_id:=gen_random_uuid();
  v_receipt:=jsonb_build_object('success',true,'replayed',false,'status','applied','purchaseContributionId',v_purchase.id);
  INSERT INTO public.replay_vault_commercial_deliveries(id,provider,provider_delivery_id,event_type,
    lifecycle_parent_order_id,lifecycle_parent_transaction_id,normalized_email,product_id,price_id,payload_sha256,
    signature_sha256,signature_verified,effective_at,requested_expires_at,outcome,receipt)
  VALUES(v_delivery_id,v_provider,v_event_id,p_event_type,v_parent_order,v_parent_transaction,v_email,p_product_id,p_price_id,
    p_payload_sha256,p_signature_sha256,true,p_effective_at,p_access_expires_at,'applied',v_receipt);
  INSERT INTO public.replay_vault_purchase_lifecycle_evidence(provider,parent_transaction_id,parent_order_id,lifecycle_type,
    lifecycle_delivery_id,purchase_contribution_id,effective_at)
  VALUES(v_provider,v_parent_transaction,v_parent_order,p_event_type,v_delivery_id,v_purchase.id,p_effective_at);
  RETURN v_receipt||public.replay_vault_recompute_entitlement_r7(v_email,p_effective_at);
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_replay_vault_unmapped_event_r7(p_original_delivery_id uuid,p_actor text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE d public.replay_vault_commercial_deliveries%ROWTYPE; result jsonb; replay_id uuid;
BEGIN
  IF trim(coalesce(p_actor,''))='' THEN RAISE EXCEPTION 'actor required'; END IF;
  SELECT * INTO d FROM public.replay_vault_commercial_deliveries WHERE id=p_original_delivery_id FOR SHARE;
  IF NOT FOUND OR d.outcome<>'rejected_unmapped' THEN RAISE EXCEPTION 'unmapped delivery required'; END IF;
  IF EXISTS(SELECT 1 FROM public.replay_vault_commercial_resolutions WHERE original_delivery_id=d.id AND resolution_type='mapping_activated_reconciliation') THEN
    SELECT result_receipt INTO result FROM public.replay_vault_commercial_resolutions
      WHERE original_delivery_id=d.id AND resolution_type='mapping_activated_reconciliation';
    RETURN result||jsonb_build_object('replayed',true);
  END IF;
  result:=public.apply_replay_vault_commercial_event_r7(d.provider,'reconcile:'||d.id::text,d.order_id,d.transaction_id,
    d.lifecycle_parent_order_id,d.lifecycle_parent_transaction_id,d.normalized_email,d.event_type,d.product_id,d.price_id,
    d.payload_sha256,coalesce(d.signature_sha256,encode(digest(d.payload_sha256,'sha256'),'hex')),d.effective_at,d.requested_expires_at);
  SELECT id INTO replay_id FROM public.replay_vault_commercial_deliveries
    WHERE provider=d.provider AND provider_delivery_id='reconcile:'||d.id::text;
  INSERT INTO public.replay_vault_commercial_resolutions(original_delivery_id,resolution_type,resolved_by,replay_delivery_id,result_receipt)
  VALUES(d.id,'mapping_activated_reconciliation',p_actor,replay_id,result);
  RETURN result||jsonb_build_object('reconciled',true);
END $$;

-- Replace B1 access authority forward-only. It consumes validated commercial
-- evidence and the same explicit p_as_of used by search/playback callers.
CREATE OR REPLACE FUNCTION public.replay_vault_access_decision(
  p_user_id uuid,p_email text,p_resource_id text DEFAULT NULL,p_action text DEFAULT 'access',
  p_preview boolean DEFAULT false,p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_email text:=lower(trim(coalesce(p_email,'')));v_admin boolean:=coalesce(public.is_admin(p_user_id),false);
  v_launch_state text:='disabled';v_pilot boolean:=false;v_mastermind_active boolean:=false;v_tier text;
  v_member_scopes text[]:=ARRAY[]::text[];v_entitled boolean:=false;v_preview_allowed boolean;v_can_enter boolean;
  v_resource public.mastermind_portal_resources%ROWTYPE;v_allowed boolean:=false;v_internal_reason text:='inaccessible';
BEGIN
  IF p_action NOT IN ('access','search','playback') THEN RAISE EXCEPTION 'invalid replay vault action'; END IF;
  SELECT launch_state INTO v_launch_state FROM public.replay_vault_launch_config WHERE singleton;
  v_launch_state:=coalesce(v_launch_state,'disabled');
  SELECT EXISTS(SELECT 1 FROM public.replay_vault_pilot_subjects WHERE auth_user_id=p_user_id AND enabled) INTO v_pilot;
  SELECT EXISTS(SELECT 1 FROM public.entitlements e WHERE lower(trim(e.email))=v_email AND e.tier='mastermind' AND e.status='active'
    AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York')<=p_as_of)
    AND (e.ends_at IS NULL OR public.replay_vault_exclusive_end(e.ends_at)>p_as_of)) INTO v_mastermind_active;
  SELECT r.tier INTO v_tier FROM public.replay_vault_entitlements r
   WHERE (r.auth_user_id=p_user_id OR (r.auth_user_id IS NULL AND r.normalized_email=v_email))
    AND r.commercial_evidence_state='validated' AND r.status IN ('active','cancel_at_period_end')
    AND r.access_starts_at<=p_as_of AND (r.tier='lifetime' OR r.access_expires_at>p_as_of)
   ORDER BY CASE r.tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC LIMIT 1;
  v_entitled:=v_mastermind_active AND v_tier IS NOT NULL;
  IF v_entitled THEN v_member_scopes:=ARRAY['core_curriculum','current_replay_30_day'];
    IF v_tier IN ('annual','lifetime') THEN v_member_scopes:=v_member_scopes||'replay_vault'::text; END IF; END IF;
  v_preview_allowed:=v_admin AND p_preview;
  v_can_enter:=v_preview_allowed OR (v_entitled AND (v_launch_state='launched' OR (v_launch_state='pilot' AND v_pilot)));
  IF p_resource_id IS NULL THEN RETURN jsonb_build_object('allowed',v_can_enter,'memberEntitled',v_entitled,'memberTier',v_tier,
    'memberScopes',to_jsonb(v_member_scopes),'previewCapabilities',CASE WHEN v_admin THEN jsonb_build_array('preview_vault','preview_unpublished') ELSE '[]'::jsonb END,
    'previewActive',v_preview_allowed,'launchState',v_launch_state); END IF;
  SELECT * INTO v_resource FROM public.mastermind_portal_resources WHERE portal_resource_id=p_resource_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'publicReason','inaccessible'); END IF;
  IF NOT v_can_enter THEN v_internal_reason:='subject_or_launch_denied';
  ELSIF v_resource.revoked_at IS NOT NULL OR v_resource.publication_state IN ('revoked','archived') THEN v_internal_reason:='revoked';
  ELSIF NOT v_preview_allowed AND (v_resource.publication_state<>'published' OR v_resource.published_at IS NULL) THEN v_internal_reason:='not_published';
  ELSIF v_resource.privacy_state<>'approved' THEN v_internal_reason:='privacy_not_approved';
  ELSIF p_action='search' AND (v_resource.pairing_state<>'paired' OR v_resource.transcript_state<>'active') THEN v_internal_reason:='transcript_not_active';
  ELSIF p_action='playback' AND (v_resource.pairing_state<>'paired' OR v_resource.media_state<>'approved') THEN v_internal_reason:='playback_not_approved';
  ELSIF v_resource.available_until IS NOT NULL AND public.replay_vault_exclusive_end(v_resource.available_until)<=p_as_of THEN v_internal_reason:='availability_expired';
  ELSIF NOT v_preview_allowed AND NOT(v_resource.approved_access_scope=ANY(v_member_scopes)) THEN v_internal_reason:='scope_denied';
  ELSE v_allowed:=true;v_internal_reason:='allowed';END IF;
  RETURN jsonb_build_object('allowed',v_allowed,'publicReason',CASE WHEN v_allowed THEN 'allowed' ELSE 'inaccessible' END,
    'internalReason',v_internal_reason,'previewActive',v_preview_allowed,'memberTier',v_tier);
END $$;

-- Retire the unsafe order-only producer while preserving the accepted function
-- for historical schema compatibility. Runtime may execute only R7.
REVOKE ALL ON FUNCTION public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamptz,timestamptz)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.replay_vault_r7_forbid_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.replay_vault_recompute_entitlement_r7(text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconcile_replay_vault_unmapped_event_r7(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_replay_vault_commercial_event_r7(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_replay_vault_unmapped_event_r7(uuid,text) TO service_role;
-- Reassert inherited Edge-facing ACLs exactly; 1500 publication predicates and
-- question RPC grants are untouched by this migration.
GRANT EXECUTE ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_mastermind_portal_access_scopes(text) TO service_role;

COMMENT ON TABLE public.replay_vault_purchase_contributions IS 'Immutable purchase contributions keyed by exact provider transaction/charge; order/subscription identity retained separately.';
COMMENT ON TABLE public.replay_vault_commercial_deliveries IS 'Append-only verified webhook delivery evidence; rejected evidence never reserves a purchase transaction key.';
COMMENT ON TABLE public.replay_vault_commercial_resolutions IS 'Append-only explicit reconciliation evidence after mapping activation.';
