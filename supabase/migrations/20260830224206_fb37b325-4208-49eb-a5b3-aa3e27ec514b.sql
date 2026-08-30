CREATE TABLE IF NOT EXISTS public.replay_vault_preview_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  reason text NOT NULL,
  authorized_by text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.replay_vault_preview_allowlist FROM PUBLIC;
REVOKE ALL ON public.replay_vault_preview_allowlist FROM anon;
REVOKE ALL ON public.replay_vault_preview_allowlist FROM authenticated;
GRANT ALL ON public.replay_vault_preview_allowlist TO service_role;
ALTER TABLE public.replay_vault_preview_allowlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.replay_vault_preview_allowlist_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  operation text NOT NULL,
  before_row jsonb,
  after_row jsonb
);
REVOKE ALL ON public.replay_vault_preview_allowlist_audit FROM PUBLIC;
REVOKE ALL ON public.replay_vault_preview_allowlist_audit FROM anon;
REVOKE ALL ON public.replay_vault_preview_allowlist_audit FROM authenticated;
GRANT SELECT, INSERT ON public.replay_vault_preview_allowlist_audit TO service_role;
ALTER TABLE public.replay_vault_preview_allowlist_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.replay_vault_preview_allowlist_audit_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
BEGIN
  INSERT INTO public.replay_vault_preview_allowlist_audit(operation, before_row, after_row)
  VALUES (TG_OP, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
                 CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

DROP TRIGGER IF EXISTS replay_vault_preview_allowlist_audit_trg ON public.replay_vault_preview_allowlist;
CREATE TRIGGER replay_vault_preview_allowlist_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON public.replay_vault_preview_allowlist
FOR EACH ROW EXECUTE FUNCTION public.replay_vault_preview_allowlist_audit_fn();

INSERT INTO public.replay_vault_preview_allowlist (email, reason, authorized_by)
VALUES
  ('info@faithmariah.com', 'hidden_vault_preview_test_access', 'faith_explicit_authorization_2026-08-30'),
  ('faithhawks@gmail.com', 'hidden_vault_preview_test_access', 'faith_explicit_authorization_2026-08-30')
ON CONFLICT (email) DO UPDATE SET enabled = true, updated_at = now();

CREATE OR REPLACE FUNCTION public.replay_vault_preview_subject(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','auth'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.replay_vault_preview_allowlist a
    JOIN auth.users u ON lower(btrim(u.email)) = a.email
    WHERE a.enabled AND u.id = p_user_id
  );
$function$;
REVOKE ALL ON FUNCTION public.replay_vault_preview_subject(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replay_vault_preview_subject(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.replay_vault_preview_subject(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_preview_subject(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.replay_vault_admin_preview_enabled(p_user_id uuid, p_preview boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
  SELECT coalesce(p_preview, false)
     AND (coalesce(public.is_admin(p_user_id), false)
          OR coalesce(public.replay_vault_preview_subject(p_user_id), false));
$function$;
REVOKE ALL ON FUNCTION public.replay_vault_admin_preview_enabled(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replay_vault_admin_preview_enabled(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.replay_vault_admin_preview_enabled(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_admin_preview_enabled(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.replay_vault_access_decision(p_user_id uuid, p_email text, p_resource_id text DEFAULT NULL::text, p_action text DEFAULT 'access'::text, p_preview boolean DEFAULT false, p_as_of timestamp with time zone DEFAULT clock_timestamp())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_admin boolean := coalesce(public.is_admin(p_user_id), false);
  v_preview_subject boolean := v_admin OR coalesce(public.replay_vault_preview_subject(p_user_id), false);
  v_launch_state text := 'disabled';
  v_pilot boolean := false;
  v_mastermind_active boolean := false;
  v_tier text;
  v_member_scopes text[] := ARRAY[]::text[];
  v_entitled boolean := false;
  v_vault_entitled boolean := false;
  v_preview_allowed boolean;
  v_can_enter boolean;
  v_resource public.mastermind_portal_resources%ROWTYPE;
  v_allowed boolean := false;
  v_internal_reason text := 'inaccessible';
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('access', 'search', 'playback') THEN
    RAISE EXCEPTION 'invalid replay vault action';
  END IF;

  SELECT launch_state INTO v_launch_state FROM public.replay_vault_launch_config WHERE singleton;
  v_launch_state := coalesce(v_launch_state, 'disabled');

  SELECT EXISTS (SELECT 1 FROM public.replay_vault_pilot_subjects WHERE auth_user_id = p_user_id AND enabled) INTO v_pilot;

  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e
     WHERE lower(trim(e.email)) = v_email AND e.tier = 'mastermind' AND e.status = 'active'
       AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York') <= p_as_of)
       AND (e.ends_at IS NULL OR public.replay_vault_exclusive_end(e.ends_at) > p_as_of)
  ) INTO v_mastermind_active;

  SELECT c.entitlement_tier INTO v_tier
    FROM public.replay_vault_purchase_contributions c
   WHERE c.normalized_email = v_email
     AND c.contribution_starts_at <= p_as_of
     AND (c.contribution_expires_at IS NULL OR p_as_of < c.contribution_expires_at)
     AND NOT EXISTS (
       SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l
        WHERE l.purchase_contribution_id = c.id
          AND l.lifecycle_type IN ('expiration', 'refund', 'chargeback', 'immediate_revocation')
          AND l.effective_at <= p_as_of)
   ORDER BY CASE c.entitlement_tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC,
            c.contribution_starts_at DESC, c.created_at DESC, c.id DESC
   LIMIT 1;

  v_entitled := v_mastermind_active AND v_tier IS NOT NULL;
  v_vault_entitled := v_entitled AND v_tier IN ('annual', 'lifetime');

  IF v_entitled THEN
    v_member_scopes := ARRAY['core_curriculum', 'current_replay_30_day'];
    IF v_vault_entitled THEN v_member_scopes := v_member_scopes || 'replay_vault'::text; END IF;
  END IF;

  v_preview_allowed := v_preview_subject AND p_preview;
  v_can_enter := v_preview_allowed OR (v_vault_entitled AND (v_launch_state = 'launched' OR (v_launch_state = 'pilot' AND v_pilot)));

  IF p_resource_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_can_enter, 'memberEntitled', v_entitled, 'memberTier', v_tier,
      'memberScopes', to_jsonb(v_member_scopes),
      'previewCapabilities', CASE WHEN v_preview_subject THEN jsonb_build_array('preview_vault', 'preview_unpublished') ELSE '[]'::jsonb END,
      'previewActive', v_preview_allowed, 'launchState', v_launch_state);
  END IF;

  SELECT * INTO v_resource FROM public.mastermind_portal_resources WHERE portal_resource_id = p_resource_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'publicReason', 'inaccessible');
  END IF;

  IF NOT v_can_enter THEN
    v_internal_reason := 'subject_or_launch_denied';
  ELSIF v_resource.revoked_at IS NOT NULL OR v_resource.publication_state IN ('revoked', 'archived') THEN
    v_internal_reason := 'revoked';
  ELSIF v_preview_allowed THEN
    v_allowed := true;
    v_internal_reason := 'allowed_admin_preview';
  ELSIF v_resource.publication_state <> 'published' OR v_resource.published_at IS NULL THEN
    v_internal_reason := 'not_published';
  ELSIF v_resource.privacy_state <> 'approved' THEN
    v_internal_reason := 'privacy_not_approved';
  ELSIF p_action = 'search' AND (v_resource.pairing_state <> 'paired' OR v_resource.transcript_state <> 'active') THEN
    v_internal_reason := 'transcript_not_active';
  ELSIF p_action = 'playback' AND (v_resource.pairing_state <> 'paired' OR v_resource.media_state <> 'approved') THEN
    v_internal_reason := 'playback_not_approved';
  ELSIF v_resource.available_until IS NOT NULL AND public.replay_vault_exclusive_end(v_resource.available_until) <= p_as_of THEN
    v_internal_reason := 'availability_expired';
  ELSIF NOT (v_resource.approved_access_scope = ANY(v_member_scopes)) THEN
    v_internal_reason := 'scope_denied';
  ELSE
    v_allowed := true;
    v_internal_reason := 'allowed';
  END IF;

  RETURN jsonb_build_object('allowed', v_allowed,
    'publicReason', CASE WHEN v_allowed THEN 'allowed' ELSE 'inaccessible' END,
    'internalReason', v_internal_reason, 'previewActive', v_preview_allowed, 'memberTier', v_tier);
END;
$function$;