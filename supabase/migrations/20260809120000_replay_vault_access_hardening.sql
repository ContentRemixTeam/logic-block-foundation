-- Replay Vault access/security foundation. Additive, fail-closed, and not deployed by this branch.
-- Canonical publication model: the deterministic-ingestion branch's *_state columns.
-- Merge mapping: publication_status -> publication_state; privacy_status -> privacy_state;
-- transcript_pairing_status -> pairing_state; playback_status -> media_state;
-- withdrawn_at -> revoked_at; access_scope (source claim) -> approved_access_scope (reviewed authority).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Declare the ingestion target interface early so either branch can be reviewed in isolation.
-- Defaults intentionally deny publication, transcript search, and playback.
ALTER TABLE public.mastermind_portal_resources
  ADD COLUMN IF NOT EXISTS canonical_resource_key uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS publication_state text NOT NULL DEFAULT 'inventoried',
  ADD COLUMN IF NOT EXISTS privacy_state text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS pairing_state text NOT NULL DEFAULT 'discovered',
  ADD COLUMN IF NOT EXISTS transcript_state text NOT NULL DEFAULT 'evidence_only',
  ADD COLUMN IF NOT EXISTS media_state text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS approved_access_scope text,
  ADD COLUMN IF NOT EXISTS editorial_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS editorial_approved_by text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.mastermind_portal_resources(id);
CREATE UNIQUE INDEX IF NOT EXISTS mastermind_portal_resources_canonical_key_idx
  ON public.mastermind_portal_resources(canonical_resource_key);

DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_publication_state_chk
    CHECK (publication_state IN ('inventoried','quarantined','building','validated','editorial_ready','publishable','published','revoked','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_privacy_state_chk
    CHECK (privacy_state IN ('unreviewed','review_required','approved','blocked','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_pairing_state_chk
    CHECK (pairing_state IN ('discovered','fingerprinted','candidates_built','paired','quarantined','unmatched','source_revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_transcript_state_chk
    CHECK (transcript_state IN ('evidence_only','canonical_linked','parsed_staging','quality_validated','privacy_validated','active','quality_blocked','privacy_blocked','superseded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_media_state_chk
    CHECK (media_state IN ('planned','downloading','download_validated','uploading','remote_verified','playback_tested','approved','failed_retryable','dead_letter','remote_drift','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_approved_scope_chk
    CHECK (approved_access_scope IS NULL OR approved_access_scope IN ('core_curriculum','current_replay_30_day','replay_vault'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_published_binding_chk
    CHECK (
      (publication_state <> 'published' AND published_at IS NULL)
      OR (publication_state = 'published' AND published_at IS NOT NULL AND revoked_at IS NULL
          AND privacy_state = 'approved' AND pairing_state = 'paired'
          AND transcript_state = 'active' AND media_state = 'approved'
          AND approved_access_scope IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.replay_vault_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL CHECK (normalized_email = lower(trim(normalized_email)) AND position('@' in normalized_email) > 1),
  auth_user_id uuid,
  tier text NOT NULL CHECK (tier IN ('monthly', 'annual', 'lifetime')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancel_at_period_end', 'expired', 'revoked')),
  access_starts_at timestamptz NOT NULL,
  access_expires_at timestamptz,
  source_provider text NOT NULL,
  source_order_id text NOT NULL,
  last_paid_event_at timestamptz NOT NULL,
  last_transition_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT replay_vault_entitlements_email_unique UNIQUE (normalized_email),
  CONSTRAINT replay_vault_entitlements_term_chk CHECK (
    (tier = 'lifetime' AND access_expires_at IS NULL)
    OR (tier IN ('monthly', 'annual') AND access_expires_at IS NOT NULL AND access_expires_at > access_starts_at)
  ),
  CONSTRAINT replay_vault_entitlements_revocation_chk CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX replay_vault_entitlements_auth_user_unique
  ON public.replay_vault_entitlements(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Intentionally empty. Exact provider/product/price mappings require explicit approval.
CREATE TABLE public.replay_vault_provider_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider = lower(trim(provider)) AND provider <> ''),
  product_id text NOT NULL CHECK (trim(product_id) <> ''),
  price_id text NOT NULL CHECK (trim(price_id) <> ''),
  entitlement_tier text NOT NULL CHECK (entitlement_tier IN ('monthly', 'annual', 'lifetime')),
  grant_interval interval,
  active boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT replay_vault_provider_product_mapping_unique UNIQUE (provider, product_id, price_id),
  CONSTRAINT replay_vault_provider_product_mapping_term_chk CHECK (
    (entitlement_tier = 'lifetime' AND grant_interval IS NULL)
    OR (entitlement_tier = 'annual' AND grant_interval = interval '1 year')
    OR (entitlement_tier = 'monthly' AND grant_interval = interval '1 month')
  ),
  CONSTRAINT replay_vault_provider_product_mapping_approval_chk CHECK (
    NOT active OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- Only verified attempts reach this immutable ledger. Invalid signatures are rejected before this RPC.
CREATE TABLE public.replay_vault_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL CHECK (trim(event_id) <> ''),
  order_id text NOT NULL CHECK (trim(order_id) <> ''),
  normalized_email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('grant','renewal','cancel_at_period_end','expiration','refund','chargeback','immediate_revocation')),
  product_id text NOT NULL,
  price_id text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified boolean NOT NULL CHECK (signature_verified),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  effective_at timestamptz NOT NULL,
  requested_expires_at timestamptz,
  applied_at timestamptz,
  status text NOT NULL CHECK (status IN ('applied','rejected_unmapped','rejected_transition')),
  error_class text CHECK (error_class IS NULL OR error_class IN ('unmapped_product','illegal_transition','stale_event')),
  result_tier text CHECK (result_tier IS NULL OR result_tier IN ('monthly','annual','lifetime')),
  result_status text CHECK (result_status IS NULL OR result_status IN ('active','cancel_at_period_end','expired','revoked')),
  result_expires_at timestamptz,
  CONSTRAINT replay_vault_webhook_events_unique UNIQUE (provider, event_id)
);

CREATE OR REPLACE FUNCTION public.replay_vault_ledger_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN RAISE EXCEPTION 'replay_vault_webhook_events is append-only'; END;
$$;
CREATE TRIGGER replay_vault_webhook_events_append_only
BEFORE UPDATE OR DELETE ON public.replay_vault_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.replay_vault_ledger_append_only();

CREATE OR REPLACE FUNCTION public.replay_vault_enforce_entitlement_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.last_transition_at < OLD.last_transition_at OR NEW.last_paid_event_at < OLD.last_paid_event_at THEN
    RAISE EXCEPTION 'replay vault event clocks cannot move backward';
  END IF;
  IF OLD.tier = 'lifetime' AND NEW.tier <> 'lifetime' THEN
    RAISE EXCEPTION 'lifetime entitlement cannot be downgraded';
  END IF;
  IF NOT ((OLD.status = NEW.status)
    OR (OLD.status = 'active' AND NEW.status IN ('cancel_at_period_end','expired','revoked'))
    OR (OLD.status = 'cancel_at_period_end' AND NEW.status IN ('active','expired','revoked'))
    OR (OLD.status IN ('expired','revoked') AND NEW.status = 'active')) THEN
    RAISE EXCEPTION 'illegal replay vault entitlement transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER replay_vault_entitlements_legal_transition
BEFORE UPDATE ON public.replay_vault_entitlements
FOR EACH ROW EXECUTE FUNCTION public.replay_vault_enforce_entitlement_transition();

CREATE TABLE public.replay_vault_launch_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  launch_state text NOT NULL DEFAULT 'disabled' CHECK (launch_state IN ('disabled','pilot','launched')),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid
);
INSERT INTO public.replay_vault_launch_config(singleton, launch_state)
VALUES (true, 'disabled') ON CONFLICT (singleton) DO NOTHING;
CREATE TABLE public.replay_vault_pilot_subjects (
  auth_user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.replay_vault_playback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE RESTRICT,
  moment_id uuid,
  question_id uuid,
  decision text NOT NULL CHECK (decision IN ('allowed','inaccessible')),
  provider text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((moment_id IS NULL) <> (question_id IS NULL))
);

ALTER TABLE public.replay_vault_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_provider_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_launch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_pilot_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_playback_events ENABLE ROW LEVEL SECURITY;

-- Edge functions use SECURITY DEFINER RPCs only; no role gets direct ledger/config/table access.
REVOKE ALL ON public.replay_vault_entitlements FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.replay_vault_provider_product_mappings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.replay_vault_webhook_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.replay_vault_launch_config FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.replay_vault_pilot_subjects FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.replay_vault_playback_events FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replay_vault_access_decision(
  p_user_id uuid, p_email text, p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'access', p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_admin boolean := coalesce(public.is_admin(p_user_id), false);
  v_launch_state text := 'disabled';
  v_pilot boolean := false;
  v_mastermind_active boolean := false;
  v_tier text;
  v_member_scopes text[] := ARRAY[]::text[];
  v_entitled boolean := false;
  v_preview_allowed boolean;
  v_can_enter boolean;
  v_resource public.mastermind_portal_resources%ROWTYPE;
  v_allowed boolean := false;
  v_internal_reason text := 'inaccessible';
BEGIN
  IF p_action NOT IN ('access','search','playback') THEN RAISE EXCEPTION 'invalid replay vault action'; END IF;
  SELECT launch_state INTO v_launch_state FROM public.replay_vault_launch_config WHERE singleton;
  v_launch_state := coalesce(v_launch_state,'disabled');
  SELECT EXISTS (SELECT 1 FROM public.replay_vault_pilot_subjects WHERE auth_user_id=p_user_id AND enabled) INTO v_pilot;

  -- Legacy paid-through DATE is inclusive in America/New_York; next local midnight is exclusive.
  SELECT EXISTS (SELECT 1 FROM public.entitlements e
    WHERE lower(trim(e.email))=v_email AND e.tier='mastermind' AND e.status='active'
      AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York') <= p_as_of)
      AND (e.ends_at IS NULL OR ((e.ends_at + 1)::timestamp AT TIME ZONE 'America/New_York') > p_as_of)
  ) INTO v_mastermind_active;
  SELECT r.tier INTO v_tier FROM public.replay_vault_entitlements r
   WHERE (r.auth_user_id=p_user_id OR (r.auth_user_id IS NULL AND r.normalized_email=v_email))
     AND r.status IN ('active','cancel_at_period_end') AND r.access_starts_at <= p_as_of
     AND (r.tier='lifetime' OR r.access_expires_at > p_as_of)
   ORDER BY CASE r.tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC LIMIT 1;
  v_entitled := v_mastermind_active AND v_tier IS NOT NULL;
  IF v_entitled THEN
    v_member_scopes := ARRAY['core_curriculum','current_replay_30_day'];
    IF v_tier IN ('annual','lifetime') THEN v_member_scopes := v_member_scopes || 'replay_vault'::text; END IF;
  END IF;
  v_preview_allowed := v_admin AND p_preview;
  v_can_enter := v_preview_allowed OR (v_entitled AND (v_launch_state='launched' OR (v_launch_state='pilot' AND v_pilot)));
  IF p_resource_id IS NULL THEN
    RETURN jsonb_build_object('allowed',v_can_enter,'memberEntitled',v_entitled,'memberTier',v_tier,
      'memberScopes',to_jsonb(v_member_scopes),
      'previewCapabilities',CASE WHEN v_admin THEN jsonb_build_array('preview_vault','preview_unpublished') ELSE '[]'::jsonb END,
      'previewActive',v_preview_allowed,'launchState',v_launch_state);
  END IF;

  SELECT * INTO v_resource FROM public.mastermind_portal_resources WHERE portal_resource_id=p_resource_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'publicReason','inaccessible'); END IF;
  IF NOT v_can_enter THEN v_internal_reason := 'subject_or_launch_denied';
  ELSIF v_resource.revoked_at IS NOT NULL OR v_resource.publication_state IN ('revoked','archived') THEN v_internal_reason := 'revoked';
  ELSIF NOT v_preview_allowed AND (v_resource.publication_state <> 'published' OR v_resource.published_at IS NULL) THEN v_internal_reason := 'not_published';
  ELSIF v_resource.privacy_state <> 'approved' THEN v_internal_reason := 'privacy_not_approved';
  ELSIF p_action='search' AND (v_resource.pairing_state <> 'paired' OR v_resource.transcript_state <> 'active') THEN v_internal_reason := 'transcript_not_active';
  ELSIF p_action='playback' AND (v_resource.pairing_state <> 'paired' OR v_resource.media_state <> 'approved') THEN v_internal_reason := 'playback_not_approved';
  ELSIF v_resource.available_until IS NOT NULL
    AND (((v_resource.available_until + 1)::timestamp AT TIME ZONE 'America/New_York') <= p_as_of) THEN v_internal_reason := 'availability_expired';
  ELSIF NOT v_preview_allowed AND NOT (v_resource.approved_access_scope = ANY(v_member_scopes)) THEN v_internal_reason := 'scope_denied';
  ELSE v_allowed := true; v_internal_reason := 'allowed'; END IF;
  RETURN jsonb_build_object('allowed',v_allowed,'publicReason',CASE WHEN v_allowed THEN 'allowed' ELSE 'inaccessible' END,
    'internalReason',v_internal_reason,'previewActive',v_preview_allowed,'memberTier',v_tier);
END;
$$;

DROP FUNCTION IF EXISTS public.search_mastermind_portal_resources(text,text[],text,integer,boolean);
CREATE OR REPLACE FUNCTION public.search_replay_vault_resources(
  p_user_id uuid, p_email text, p_query text, p_stage text DEFAULT NULL,
  p_limit integer DEFAULT 12, p_include_metadata_fallback boolean DEFAULT false,
  p_preview boolean DEFAULT false, p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(
  portal_resource_id text, moment_id uuid, question_id uuid, title text, product_title text,
  category_title text, portal_path text, resource_type text, snippet text,
  starts_at_seconds integer, ends_at_seconds integer, reason text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH input AS (
    SELECT websearch_to_tsquery('english',trim(p_query)) q,
      least(greatest(coalesce(p_limit,12),1),25) capped_limit
    WHERE length(trim(coalesce(p_query,''))) BETWEEN 2 AND 200
  ), matches AS (
    SELECT r.portal_resource_id,s.id moment_id,NULL::uuid question_id,r.title,r.product_title,r.category_title,
      r.portal_path,r.resource_type,
      left(regexp_replace(ts_headline('english',s.transcript_text,i.q,'MaxWords=48, MinWords=12, MaxFragments=1'),'<[^>]+>','','g'),320) snippet,
      s.starts_at_seconds,s.ends_at_seconds,'matches transcript'::text reason,
      ts_rank_cd(s.search_vector,i.q) rank
    FROM public.mastermind_portal_resources r
    JOIN public.mastermind_portal_transcript_segments s ON s.resource_id=r.id CROSS JOIN input i
    WHERE (p_stage IS NULL OR p_stage=ANY(r.stages)) AND i.q @@ s.search_vector
      AND (public.replay_vault_access_decision(p_user_id,p_email,r.portal_resource_id,'search',p_preview,p_as_of)->>'allowed')::boolean
  ), bounded AS (
    SELECT m.*,row_number() OVER (PARTITION BY m.portal_resource_id ORDER BY m.rank DESC,m.starts_at_seconds,m.moment_id) replay_rank
    FROM matches m
  )
  SELECT b.portal_resource_id,b.moment_id,b.question_id,b.title,b.product_title,b.category_title,b.portal_path,
    b.resource_type,b.snippet,b.starts_at_seconds,b.ends_at_seconds,b.reason
  FROM bounded b WHERE b.replay_rank <= 3
  ORDER BY b.rank DESC,b.portal_resource_id,b.starts_at_seconds,b.moment_id
  LIMIT (SELECT capped_limit FROM input);
$$;

CREATE OR REPLACE FUNCTION public.resolve_replay_vault_playback(
  p_user_id uuid, p_email text, p_resource_id text,
  p_question_id uuid DEFAULT NULL, p_moment_id uuid DEFAULT NULL,
  p_preview boolean DEFAULT false, p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(resource_uuid uuid,portal_resource_id text,title text,dropbox_path text,
  authoritative_start_seconds integer,authoritative_end_seconds integer,moment_id uuid,question_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_resource_id uuid; v_start integer; v_end integer; v_path text;
BEGIN
  IF (p_question_id IS NULL) = (p_moment_id IS NULL) THEN RETURN; END IF;
  SELECT id INTO v_resource_id FROM public.mastermind_portal_resources r
   WHERE r.portal_resource_id=p_resource_id
     AND (public.replay_vault_access_decision(p_user_id,p_email,r.portal_resource_id,'playback',p_preview,p_as_of)->>'allowed')::boolean;
  IF v_resource_id IS NULL THEN RETURN; END IF;

  IF p_moment_id IS NOT NULL THEN
    SELECT s.starts_at_seconds,s.ends_at_seconds INTO v_start,v_end
      FROM public.mastermind_portal_transcript_segments s
      WHERE s.id=p_moment_id AND s.resource_id=v_resource_id;
    IF NOT FOUND OR v_start IS NULL OR v_end IS NULL THEN RETURN; END IF;
  ELSE
    -- replay_answers is introduced by deterministic ingestion. Dynamic SQL keeps this migration independently applicable.
    IF to_regclass('public.replay_answers') IS NULL THEN RETURN; END IF;
    EXECUTE 'SELECT (answer_start_ms/1000)::integer,(answer_end_ms/1000)::integer FROM public.replay_answers
      WHERE id=$1 AND resource_id=$2 AND published_at IS NOT NULL AND revoked_at IS NULL
        AND privacy_approval=''approved'' AND editorial_approval=''approved'' AND seek_approval=''approved'''
      INTO v_start,v_end USING p_question_id,v_resource_id;
    IF NOT FOUND OR v_start IS NULL OR v_end IS NULL THEN RETURN; END IF;
  END IF;

  SELECT e.dropbox_path INTO v_path FROM public.mastermind_portal_source_evidence e
   WHERE e.resource_id=v_resource_id AND e.source_system='portal_playback_source'
     AND e.review_status='approved' AND e.dropbox_path IS NOT NULL
     AND e.source_url IS NULL AND e.ghl_video_url IS NULL AND e.bunny_video_id IS NULL AND e.youtube_video_id IS NULL
   ORDER BY e.created_at DESC LIMIT 1;
  IF v_path IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT v_resource_id,p_resource_id,r.title,v_path,v_start,v_end,p_moment_id,p_question_id
    FROM public.mastermind_portal_resources r WHERE r.id=v_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_replay_vault_playback_event(
  p_user_id uuid,p_resource_id uuid,p_decision text,p_provider text DEFAULT NULL,
  p_moment_id uuid DEFAULT NULL,p_question_id uuid DEFAULT NULL
) RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  INSERT INTO public.replay_vault_playback_events(auth_user_id,resource_id,moment_id,question_id,decision,provider)
  VALUES(p_user_id,p_resource_id,p_moment_id,p_question_id,p_decision,p_provider);
$$;

CREATE OR REPLACE FUNCTION public.apply_replay_vault_webhook_event(
  p_provider text,p_event_id text,p_order_id text,p_email text,p_event_type text,
  p_product_id text,p_price_id text,p_payload_sha256 text,p_effective_at timestamptz,
  p_access_expires_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_provider text:=lower(trim(p_provider)); v_email text:=lower(trim(p_email));
  v_mapping public.replay_vault_provider_product_mappings%ROWTYPE;
  v_event public.replay_vault_webhook_events%ROWTYPE;
  v_ent public.replay_vault_entitlements%ROWTYPE;
  v_tier text; v_status text; v_expiry timestamptz; v_error text;
  v_paid_at timestamptz; v_revoked_at timestamptz;
BEGIN
  IF trim(coalesce(p_event_id,''))='' OR trim(coalesce(p_order_id,''))='' OR position('@' in v_email)<=1
    OR p_event_type NOT IN ('grant','renewal','cancel_at_period_end','expiration','refund','chargeback','immediate_revocation')
    OR p_payload_sha256 !~ '^[0-9a-f]{64}$' OR p_effective_at IS NULL THEN
    RAISE EXCEPTION 'invalid replay vault event';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_provider||':'||p_event_id,0));
  SELECT * INTO v_event FROM public.replay_vault_webhook_events WHERE provider=v_provider AND event_id=p_event_id;
  IF FOUND THEN
    IF v_event.payload_sha256 <> p_payload_sha256 THEN
      RETURN jsonb_build_object('success',false,'replayed',false,'status','event_id_payload_conflict');
    END IF;
    RETURN jsonb_build_object('success',v_event.status='applied','replayed',true,'status',v_event.status,
      'tier',v_event.result_tier,'entitlementStatus',v_event.result_status,'accessExpiresAt',v_event.result_expires_at);
  END IF;

  SELECT * INTO v_mapping FROM public.replay_vault_provider_product_mappings
   WHERE provider=v_provider AND product_id=p_product_id AND price_id=p_price_id AND active;
  IF NOT FOUND THEN
    INSERT INTO public.replay_vault_webhook_events(provider,event_id,order_id,normalized_email,event_type,product_id,price_id,
      payload_sha256,signature_verified,effective_at,requested_expires_at,status,error_class)
    VALUES(v_provider,p_event_id,p_order_id,v_email,p_event_type,p_product_id,p_price_id,p_payload_sha256,true,
      p_effective_at,p_access_expires_at,'rejected_unmapped','unmapped_product');
    RETURN jsonb_build_object('success',false,'replayed',false,'status','rejected_unmapped');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_email,0));
  SELECT * INTO v_ent FROM public.replay_vault_entitlements WHERE normalized_email=v_email FOR UPDATE;
  IF v_ent.id IS NOT NULL AND p_effective_at < v_ent.last_transition_at THEN v_error:='stale_event'; END IF;

  IF v_error IS NULL AND p_event_type IN ('grant','renewal') THEN
    v_tier:=CASE WHEN v_ent.tier='lifetime' OR v_mapping.entitlement_tier='lifetime' THEN 'lifetime'
      WHEN v_ent.tier='annual' OR v_mapping.entitlement_tier='annual' THEN 'annual' ELSE 'monthly' END;
    v_status:='active'; v_revoked_at:=NULL;
    IF v_tier='lifetime' THEN v_expiry:=NULL;
    ELSIF p_access_expires_at IS NOT NULL THEN
      IF p_access_expires_at <= p_effective_at THEN v_error:='illegal_transition';
      ELSE v_expiry:=greatest(coalesce(v_ent.access_expires_at,p_access_expires_at),p_access_expires_at); END IF;
    ELSE v_expiry:=greatest(coalesce(v_ent.access_expires_at,p_effective_at),p_effective_at)+v_mapping.grant_interval; END IF;
    v_paid_at:=greatest(coalesce(v_ent.last_paid_event_at,p_effective_at),p_effective_at);
  ELSIF v_error IS NULL AND p_event_type='cancel_at_period_end' THEN
    IF v_ent.id IS NULL OR v_ent.tier='lifetime' OR coalesce(p_access_expires_at,v_ent.access_expires_at) <= p_effective_at THEN v_error:='illegal_transition';
    ELSE v_tier:=v_ent.tier;v_status:='cancel_at_period_end';v_expiry:=coalesce(p_access_expires_at,v_ent.access_expires_at);
      v_paid_at:=v_ent.last_paid_event_at;v_revoked_at:=NULL; END IF;
  ELSIF v_error IS NULL AND p_event_type='expiration' THEN
    IF v_ent.id IS NULL OR v_ent.tier='lifetime' THEN v_error:='illegal_transition';
    ELSE v_tier:=v_ent.tier;v_status:='expired';v_expiry:=least(v_ent.access_expires_at,p_effective_at);
      v_paid_at:=v_ent.last_paid_event_at;v_revoked_at:=NULL;
      IF v_expiry <= v_ent.access_starts_at THEN v_error:='illegal_transition'; END IF; END IF;
  ELSIF v_error IS NULL AND p_event_type IN ('refund','chargeback','immediate_revocation') THEN
    IF v_ent.id IS NULL THEN v_error:='illegal_transition';
    ELSE v_tier:=v_ent.tier;v_status:='revoked';v_expiry:=v_ent.access_expires_at;
      v_paid_at:=v_ent.last_paid_event_at;v_revoked_at:=p_effective_at; END IF;
  END IF;

  IF v_error IS NOT NULL THEN
    INSERT INTO public.replay_vault_webhook_events(provider,event_id,order_id,normalized_email,event_type,product_id,price_id,
      payload_sha256,signature_verified,effective_at,requested_expires_at,status,error_class,result_tier,result_status,result_expires_at)
    VALUES(v_provider,p_event_id,p_order_id,v_email,p_event_type,p_product_id,p_price_id,p_payload_sha256,true,p_effective_at,
      p_access_expires_at,'rejected_transition',v_error,v_ent.tier,v_ent.status,v_ent.access_expires_at);
    RETURN jsonb_build_object('success',false,'replayed',false,'status','rejected_transition');
  END IF;

  IF v_ent.id IS NULL THEN
    INSERT INTO public.replay_vault_entitlements(normalized_email,tier,status,access_starts_at,access_expires_at,source_provider,
      source_order_id,last_paid_event_at,last_transition_at,revoked_at)
    VALUES(v_email,v_tier,v_status,p_effective_at,v_expiry,v_provider,p_order_id,v_paid_at,p_effective_at,v_revoked_at);
  ELSE
    UPDATE public.replay_vault_entitlements SET tier=v_tier,status=v_status,access_expires_at=v_expiry,
      source_provider=v_provider,source_order_id=p_order_id,last_paid_event_at=v_paid_at,last_transition_at=p_effective_at,
      revoked_at=v_revoked_at,updated_at=clock_timestamp() WHERE id=v_ent.id;
  END IF;
  INSERT INTO public.replay_vault_webhook_events(provider,event_id,order_id,normalized_email,event_type,product_id,price_id,
    payload_sha256,signature_verified,effective_at,requested_expires_at,status,applied_at,result_tier,result_status,result_expires_at)
  VALUES(v_provider,p_event_id,p_order_id,v_email,p_event_type,p_product_id,p_price_id,p_payload_sha256,true,p_effective_at,
    p_access_expires_at,'applied',clock_timestamp(),v_tier,v_status,v_expiry);
  RETURN jsonb_build_object('success',true,'replayed',false,'status','applied','tier',v_tier,
    'entitlementStatus',v_status,'accessExpiresAt',v_expiry);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mastermind_portal_access_scopes(user_email text)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT ARRAY(SELECT jsonb_array_elements_text(public.replay_vault_access_decision(NULL,user_email,NULL,'access',false,clock_timestamp())->'memberScopes'));
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default: revoke every function explicitly.
REVOKE ALL ON FUNCTION public.replay_vault_ledger_append_only() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.replay_vault_enforce_entitlement_transition() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_mastermind_portal_access_scopes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_replay_vault_playback_event(uuid,uuid,text,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_replay_vault_webhook_event(text,text,text,text,text,text,text,text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_mastermind_portal_access_scopes(text) TO service_role;
