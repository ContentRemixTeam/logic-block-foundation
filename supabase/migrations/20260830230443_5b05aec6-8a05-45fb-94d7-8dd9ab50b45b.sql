CREATE OR REPLACE FUNCTION public.mastermind_media_access_decision(
  p_user_id uuid,
  p_email text,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_surface text DEFAULT 'vault',
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
  v_surface text := lower(trim(coalesce(nullif(p_surface, ''), 'vault')));
  v_admin boolean := coalesce(public.is_admin(p_user_id), false)
    OR coalesce(public.replay_vault_preview_subject(p_user_id), false);
  v_launch_state text := 'disabled';
  v_pilot boolean := false;
  v_mastermind_active boolean := false;
  v_tier text;
  v_member_scopes text[] := ARRAY[]::text[];
  v_entitled boolean := false;
  v_vault_entitled boolean := false;
  v_preview_allowed boolean;
  v_can_enter boolean := false;
  v_resource public.mastermind_portal_resources%ROWTYPE;
  v_allowed boolean := false;
  v_internal_reason text := 'inaccessible';
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('access', 'search', 'playback') THEN
    RAISE EXCEPTION 'invalid mastermind media action';
  END IF;

  IF v_surface NOT IN ('curriculum', 'recent_replay', 'vault') THEN
    RAISE EXCEPTION 'invalid mastermind media surface';
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

  v_entitled := v_mastermind_active;
  v_vault_entitled := v_entitled AND v_tier IN ('annual', 'lifetime');

  IF v_entitled THEN
    v_member_scopes := ARRAY['core_curriculum', 'current_replay_30_day'];
    IF v_vault_entitled THEN
      v_member_scopes := v_member_scopes || 'replay_vault'::text;
    END IF;
  END IF;

  v_preview_allowed := coalesce(public.replay_vault_admin_preview_enabled(p_user_id, p_preview), false);
  v_can_enter := CASE
    WHEN v_preview_allowed THEN true
    WHEN v_surface IN ('curriculum', 'recent_replay') THEN v_entitled
    ELSE v_vault_entitled AND (
      v_launch_state = 'launched'
      OR (v_launch_state = 'pilot' AND v_pilot)
    )
  END;

  IF p_resource_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_can_enter,
      'memberEntitled', v_entitled,
      'memberTier', v_tier,
      'memberScopes', to_jsonb(v_member_scopes),
      'previewCapabilities', CASE
        WHEN v_admin THEN jsonb_build_array('preview_curriculum', 'preview_recent_replay', 'preview_vault', 'preview_unpublished')
        ELSE '[]'::jsonb
      END,
      'previewActive', v_preview_allowed,
      'launchState', v_launch_state,
      'surface', v_surface
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
  ELSIF v_surface = 'curriculum' AND v_resource.approved_access_scope <> 'core_curriculum' THEN
    v_internal_reason := 'surface_scope_mismatch';
  ELSIF v_surface = 'recent_replay' AND v_resource.approved_access_scope <> 'current_replay_30_day' THEN
    v_internal_reason := 'surface_scope_mismatch';
  ELSIF v_surface = 'vault' AND v_resource.approved_access_scope <> 'replay_vault' THEN
    v_internal_reason := 'surface_scope_mismatch';
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
    'memberTier', v_tier,
    'surface', v_surface
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_mastermind_media_playback(
  p_user_id uuid,
  p_email text,
  p_resource_id text,
  p_surface text DEFAULT 'vault',
  p_question_id uuid DEFAULT NULL,
  p_moment_id uuid DEFAULT NULL,
  p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(
  resource_uuid uuid,
  portal_resource_id text,
  title text,
  dropbox_locator text,
  access_scope text,
  authoritative_start_seconds integer,
  authoritative_end_seconds integer,
  moment_id uuid,
  question_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_resource_id uuid;
  v_transcript_version_id uuid;
  v_title text;
  v_locator text;
  v_scope text;
  v_duration integer;
  v_start integer;
  v_end integer;
  v_surface text := lower(trim(coalesce(nullif(p_surface, ''), 'vault')));
BEGIN
  IF p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'
     OR v_surface NOT IN ('curriculum', 'recent_replay', 'vault')
     OR (p_question_id IS NOT NULL AND p_moment_id IS NOT NULL) THEN
    RETURN;
  END IF;

  SELECT r.id, r.transcript_version_id, r.title,
    CASE WHEN trim(r.dropbox_file_id) LIKE 'id:%' THEN trim(r.dropbox_file_id)
         ELSE 'id:' || trim(r.dropbox_file_id) END,
    r.approved_access_scope, (r.duration_ms / 1000)::integer
  INTO v_resource_id, v_transcript_version_id, v_title, v_locator, v_scope, v_duration
  FROM public.replay_authorized_resource_projection r
  WHERE r.portal_resource_id = p_resource_id
    AND nullif(trim(r.dropbox_file_id), '') IS NOT NULL
    AND (
      r.authority_state = 'PUBLISHED'
      OR (r.authority_state = 'APPROVED'
          AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    )
    AND (public.mastermind_media_access_decision(
      p_user_id, p_email, r.portal_resource_id, 'playback', v_surface, p_preview, p_as_of
    )->>'allowed')::boolean
  LIMIT 1;

  IF v_resource_id IS NULL OR v_duration <= 0 THEN
    RETURN;
  END IF;

  IF p_moment_id IS NOT NULL THEN
    SELECT starts_at_ms / 1000, ends_at_ms / 1000
      INTO v_start, v_end
      FROM public.replay_transcript_segments
     WHERE id = p_moment_id
       AND transcript_version_id = v_transcript_version_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSIF p_question_id IS NOT NULL THEN
    SELECT answer_start_ms / 1000, answer_end_ms / 1000
      INTO v_start, v_end
      FROM public.replay_published_answers_projection
     WHERE id = p_question_id
       AND resource_id = v_resource_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSE
    v_start := 0;
    v_end := v_duration;
  END IF;

  RETURN QUERY SELECT v_resource_id, p_resource_id, v_title, v_locator, v_scope,
    v_start, v_end, p_moment_id, p_question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mastermind_media_access_decision(uuid,text,text,text,text,boolean,timestamptz),
  public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mastermind_media_access_decision(uuid,text,text,text,text,boolean,timestamptz),
  public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
TO service_role;

COMMENT ON FUNCTION public.mastermind_media_access_decision(uuid,text,text,text,text,boolean,timestamptz)
  IS 'Protected Mastermind media decision by surface: monthly-safe core curriculum and current replays remain separate from annual/lifetime Replay Vault access.';

COMMENT ON FUNCTION public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
  IS 'Shared Dropbox-backed protected media resolver (locator-normalized) for Mastermind curriculum, current replays, and annual/lifetime Replay Vault playback.';