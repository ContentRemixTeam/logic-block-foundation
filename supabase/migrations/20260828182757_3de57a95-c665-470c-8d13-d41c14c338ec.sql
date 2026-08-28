-- Replay Vault R10: align the Vault entry decision with the canonical
-- Membership and Access Authority. Active monthly members retain their
-- non-Vault Mastermind capabilities but receive no Replay Vault entry,
-- search, transcript, playback, or resource metadata.

CREATE OR REPLACE FUNCTION public.replay_vault_access_decision(
  p_user_id uuid,
  p_email text,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_admin boolean := coalesce(public.is_admin(p_user_id), false);
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

  SELECT launch_state
    INTO v_launch_state
    FROM public.replay_vault_launch_config
   WHERE singleton;
  v_launch_state := coalesce(v_launch_state, 'disabled');

  SELECT EXISTS (
    SELECT 1
      FROM public.replay_vault_pilot_subjects
     WHERE auth_user_id = p_user_id
       AND enabled
  ) INTO v_pilot;

  SELECT EXISTS (
    SELECT 1
      FROM public.entitlements e
     WHERE lower(trim(e.email)) = v_email
       AND e.tier = 'mastermind'
       AND e.status = 'active'
       AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York') <= p_as_of)
       AND (e.ends_at IS NULL OR public.replay_vault_exclusive_end(e.ends_at) > p_as_of)
  ) INTO v_mastermind_active;

  SELECT c.entitlement_tier
    INTO v_tier
    FROM public.replay_vault_purchase_contributions c
   WHERE c.normalized_email = v_email
     AND c.contribution_starts_at <= p_as_of
     AND (c.contribution_expires_at IS NULL OR p_as_of < c.contribution_expires_at)
     AND NOT EXISTS (
       SELECT 1
         FROM public.replay_vault_purchase_lifecycle_evidence l
        WHERE l.purchase_contribution_id = c.id
          AND l.lifecycle_type IN ('expiration', 'refund', 'chargeback', 'immediate_revocation')
          AND l.effective_at <= p_as_of
     )
   ORDER BY CASE c.entitlement_tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC,
            c.contribution_starts_at DESC,
            c.created_at DESC,
            c.id DESC
   LIMIT 1;

  v_entitled := v_mastermind_active AND v_tier IS NOT NULL;
  v_vault_entitled := v_entitled AND v_tier IN ('annual', 'lifetime');

  IF v_entitled THEN
    v_member_scopes := ARRAY['core_curriculum', 'current_replay_30_day'];
    IF v_vault_entitled THEN
      v_member_scopes := v_member_scopes || 'replay_vault'::text;
    END IF;
  END IF;

  v_preview_allowed := v_admin AND p_preview;
  v_can_enter := v_preview_allowed OR (
    v_vault_entitled
    AND (
      v_launch_state = 'launched'
      OR (v_launch_state = 'pilot' AND v_pilot)
    )
  );

  IF p_resource_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_can_enter,
      'memberEntitled', v_entitled,
      'memberTier', v_tier,
      'memberScopes', to_jsonb(v_member_scopes),
      'previewCapabilities', CASE
        WHEN v_admin THEN jsonb_build_array('preview_vault', 'preview_unpublished')
        ELSE '[]'::jsonb
      END,
      'previewActive', v_preview_allowed,
      'launchState', v_launch_state
    );
  END IF;

  SELECT *
    INTO v_resource
    FROM public.mastermind_portal_resources
   WHERE portal_resource_id = p_resource_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'publicReason', 'inaccessible');
  END IF;

  IF NOT v_can_enter THEN
    v_internal_reason := 'subject_or_launch_denied';
  ELSIF v_resource.revoked_at IS NOT NULL OR v_resource.publication_state IN ('revoked', 'archived') THEN
    v_internal_reason := 'revoked';
  ELSIF NOT v_preview_allowed AND (v_resource.publication_state <> 'published' OR v_resource.published_at IS NULL) THEN
    v_internal_reason := 'not_published';
  ELSIF v_resource.privacy_state <> 'approved' THEN
    v_internal_reason := 'privacy_not_approved';
  ELSIF p_action = 'search' AND (v_resource.pairing_state <> 'paired' OR v_resource.transcript_state <> 'active') THEN
    v_internal_reason := 'transcript_not_active';
  ELSIF p_action = 'playback' AND (v_resource.pairing_state <> 'paired' OR v_resource.media_state <> 'approved') THEN
    v_internal_reason := 'playback_not_approved';
  ELSIF v_resource.available_until IS NOT NULL
    AND public.replay_vault_exclusive_end(v_resource.available_until) <= p_as_of THEN
    v_internal_reason := 'availability_expired';
  ELSIF NOT v_preview_allowed AND NOT (v_resource.approved_access_scope = ANY(v_member_scopes)) THEN
    v_internal_reason := 'scope_denied';
  ELSE
    v_allowed := true;
    v_internal_reason := 'allowed';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'publicReason', CASE WHEN v_allowed THEN 'allowed' ELSE 'inaccessible' END,
    'internalReason', v_internal_reason,
    'previewActive', v_preview_allowed,
    'memberTier', v_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)
  IS 'R10 canonical Replay Vault decision: annual/lifetime only; monthly receives no Vault surface or resource authorization; admin preview remains server-verified.';