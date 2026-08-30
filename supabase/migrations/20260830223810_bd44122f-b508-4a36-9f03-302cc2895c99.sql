CREATE OR REPLACE VIEW public.replay_admin_preview_resource_projection AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title,
  CASE WHEN coalesce(r.category_title,'') LIKE '{%'
       THEN coalesce((regexp_match(r.category_title, '"text"\s*:\s*"([^"]+)"'))[1], 'Replay')
       ELSE r.category_title END AS category_title,
  r.portal_path, r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
  a.state AS authority_state,
  coalesce(a.approved_at, a.ready_at, a.created_at) AS approved_at,
  a.published_at AS authority_published_at,
  a.transcript_version_id, a.transcript_content_sha256 AS transcript_sha256,
  a.playback_attempt_id, m.dropbox_file_id, m.dropbox_content_hash, m.size_bytes, m.duration_ms
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id = a.resource_id
JOIN public.replay_transcript_versions v ON v.id = a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id = a.playback_attempt_id
WHERE a.revoked_at IS NULL AND r.revoked_at IS NULL
  AND r.publication_state NOT IN ('revoked','archived')
  AND v.resource_id = a.resource_id AND v.is_active
  AND v.normalized_sha256 = a.transcript_content_sha256
  AND m.source_asset_id = a.media_source_asset_id
  AND m.verification_evidence_sha256 = a.media_evidence_sha256
  AND a.state IN ('DRAFT','APPROVED','PUBLISHED');

REVOKE ALL ON public.replay_admin_preview_resource_projection FROM PUBLIC;
REVOKE ALL ON public.replay_admin_preview_resource_projection FROM anon;
REVOKE ALL ON public.replay_admin_preview_resource_projection FROM authenticated;
GRANT SELECT ON public.replay_admin_preview_resource_projection TO service_role;

CREATE OR REPLACE FUNCTION public.replay_vault_admin_preview_enabled(p_user_id uuid, p_preview boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$ SELECT coalesce(p_preview,false) AND coalesce(public.is_admin(p_user_id),false); $function$;
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

  v_preview_allowed := v_admin AND p_preview;
  v_can_enter := v_preview_allowed OR (v_vault_entitled AND (v_launch_state = 'launched' OR (v_launch_state = 'pilot' AND v_pilot)));

  IF p_resource_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_can_enter, 'memberEntitled', v_entitled, 'memberTier', v_tier,
      'memberScopes', to_jsonb(v_member_scopes),
      'previewCapabilities', CASE WHEN v_admin THEN jsonb_build_array('preview_vault', 'preview_unpublished') ELSE '[]'::jsonb END,
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

CREATE OR REPLACE FUNCTION public.search_replay_vault_resources(p_user_id uuid, p_email text, p_query text, p_stage text DEFAULT NULL::text, p_limit integer DEFAULT 12, p_include_metadata_fallback boolean DEFAULT false, p_preview boolean DEFAULT false, p_as_of timestamp with time zone DEFAULT clock_timestamp())
RETURNS TABLE(portal_resource_id text, moment_id uuid, question_id uuid, title text, product_title text, category_title text, resource_type text, snippet text, starts_at_seconds integer, ends_at_seconds integer, reason text, duration_seconds integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH input AS (
    SELECT websearch_to_tsquery('english', trim(p_query)) q,
      least(greatest(coalesce(p_limit, 12), 1), 25) capped_limit
    WHERE length(trim(coalesce(p_query, ''))) BETWEEN 2 AND 200
  ), resources AS (
    SELECT r.* FROM public.replay_authorized_resource_projection r
    WHERE r.authority_state = 'PUBLISHED'
       OR (r.authority_state = 'APPROVED' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    UNION ALL
    SELECT r.* FROM public.replay_admin_preview_resource_projection r
    WHERE r.authority_state = 'DRAFT' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview)
  ), transcript_matches AS (
    SELECT r.portal_resource_id, s.id moment_id, NULL::uuid question_id, r.title, r.product_title,
      r.category_title, r.resource_type,
      left(regexp_replace(ts_headline('english', s.transcript_text_private, i.q,
        'MaxWords=48, MinWords=12, MaxFragments=1'), '<[^>]+>', '', 'g'), 320) snippet,
      (s.starts_at_ms / 1000)::integer starts_at_seconds,
      (s.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches transcript'::text reason,
      (r.duration_ms / 1000)::integer duration_seconds,
      ts_rank_cd(s.search_vector, i.q) rank
    FROM resources r
    JOIN public.replay_transcript_segments s ON s.transcript_version_id = r.transcript_version_id
    CROSS JOIN input i
    WHERE (p_stage IS NULL OR p_stage = ANY(r.stages))
      AND i.q @@ s.search_vector
      AND (public.replay_vault_access_decision(p_user_id, p_email, r.portal_resource_id, 'search', p_preview, p_as_of)->>'allowed')::boolean
  ), metadata_matches AS (
    SELECT r.portal_resource_id, first_cue.id moment_id, NULL::uuid question_id, r.title,
      r.product_title, r.category_title, r.resource_type, left(r.title, 320) snippet,
      (first_cue.starts_at_ms / 1000)::integer starts_at_seconds,
      (first_cue.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches title or replay details'::text reason,
      (r.duration_ms / 1000)::integer duration_seconds,
      ts_rank_cd(to_tsvector('english', coalesce(r.title, '') || ' ' ||
        coalesce(r.product_title, '') || ' ' || coalesce(r.category_title, '') || ' ' ||
        coalesce(r.resource_type, '') || ' ' || array_to_string(r.success_paths, ' ') || ' ' ||
        array_to_string(r.stages, ' ')), i.q) * 0.5 rank
    FROM resources r
    CROSS JOIN input i
    JOIN LATERAL (
      SELECT s.id, s.starts_at_ms, s.ends_at_ms FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = r.transcript_version_id
      ORDER BY s.segment_index, s.id LIMIT 1) first_cue ON true
    WHERE p_include_metadata_fallback
      AND (p_stage IS NULL OR p_stage = ANY(r.stages))
      AND i.q @@ to_tsvector('english', coalesce(r.title, '') || ' ' ||
        coalesce(r.product_title, '') || ' ' || coalesce(r.category_title, '') || ' ' ||
        coalesce(r.resource_type, '') || ' ' || array_to_string(r.success_paths, ' ') || ' ' ||
        array_to_string(r.stages, ' '))
      AND NOT EXISTS (
        SELECT 1 FROM public.replay_transcript_segments exact
        WHERE exact.transcript_version_id = r.transcript_version_id AND i.q @@ exact.search_vector)
      AND (public.replay_vault_access_decision(p_user_id, p_email, r.portal_resource_id, 'search', p_preview, p_as_of)->>'allowed')::boolean
  ), matches AS (
    SELECT * FROM transcript_matches UNION ALL SELECT * FROM metadata_matches
  ), bounded AS (
    SELECT m.*, row_number() OVER (PARTITION BY m.portal_resource_id ORDER BY m.rank DESC, m.starts_at_seconds, m.moment_id) replay_rank
    FROM matches m)
  SELECT b.portal_resource_id, b.moment_id, b.question_id, b.title, b.product_title,
    b.category_title, b.resource_type, b.snippet, b.starts_at_seconds, b.ends_at_seconds,
    b.reason, b.duration_seconds
  FROM bounded b WHERE b.replay_rank <= 3
  ORDER BY b.rank DESC, b.portal_resource_id, b.starts_at_seconds, b.moment_id
  LIMIT (SELECT capped_limit FROM input);
$function$;

CREATE OR REPLACE FUNCTION public.resolve_replay_vault_playback(p_user_id uuid, p_email text, p_resource_id text, p_question_id uuid DEFAULT NULL::uuid, p_moment_id uuid DEFAULT NULL::uuid, p_preview boolean DEFAULT false, p_as_of timestamp with time zone DEFAULT clock_timestamp())
RETURNS TABLE(resource_uuid uuid, portal_resource_id text, title text, dropbox_locator text, access_scope text, authoritative_start_seconds integer, authoritative_end_seconds integer, moment_id uuid, question_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_resource_id uuid; v_transcript_version_id uuid; v_title text; v_locator text;
  v_scope text; v_duration integer; v_start integer; v_end integer;
BEGIN
  IF p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'
     OR (p_question_id IS NOT NULL AND p_moment_id IS NOT NULL) THEN RETURN; END IF;
  SELECT r.id, r.transcript_version_id, r.title,
    CASE WHEN trim(r.dropbox_file_id) LIKE 'id:%' THEN trim(r.dropbox_file_id)
         ELSE 'id:' || trim(r.dropbox_file_id) END,
    r.approved_access_scope, (r.duration_ms / 1000)::integer
  INTO v_resource_id, v_transcript_version_id, v_title, v_locator, v_scope, v_duration
  FROM (
    SELECT * FROM public.replay_authorized_resource_projection
     WHERE authority_state = 'PUBLISHED'
        OR (authority_state = 'APPROVED' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    UNION ALL
    SELECT * FROM public.replay_admin_preview_resource_projection
     WHERE authority_state = 'DRAFT' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview)
  ) r
  WHERE r.portal_resource_id = p_resource_id
    AND nullif(trim(r.dropbox_file_id), '') IS NOT NULL
    AND (public.replay_vault_access_decision(p_user_id, p_email, r.portal_resource_id, 'playback', p_preview, p_as_of)->>'allowed')::boolean
  LIMIT 1;
  IF v_resource_id IS NULL OR v_duration <= 0 THEN RETURN; END IF;
  IF p_moment_id IS NOT NULL THEN
    SELECT starts_at_ms / 1000, ends_at_ms / 1000 INTO v_start, v_end
    FROM public.replay_transcript_segments
    WHERE id = p_moment_id AND transcript_version_id = v_transcript_version_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSIF p_question_id IS NOT NULL THEN
    SELECT answer_start_ms / 1000, answer_end_ms / 1000 INTO v_start, v_end
    FROM public.replay_published_answers_projection
    WHERE id = p_question_id AND resource_id = v_resource_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSE
    v_start := 0; v_end := v_duration;
  END IF;
  RETURN QUERY SELECT v_resource_id, p_resource_id, v_title, v_locator, v_scope, v_start, v_end, p_moment_id, p_question_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.replay_vault_browse_authorized(p_user_id uuid, p_category text DEFAULT NULL::text, p_limit integer DEFAULT 21, p_cursor text DEFAULT NULL::text, p_preview boolean DEFAULT false)
RETURNS TABLE(portal_resource_id text, title text, category text, duration_seconds numeric, published_at timestamp with time zone, question_count bigint, row_cursor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH resources AS (
    SELECT r.* FROM public.replay_authorized_resource_projection r
     WHERE (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
        OR (r.authority_state = 'APPROVED' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    UNION ALL
    SELECT r.* FROM public.replay_admin_preview_resource_projection r
     WHERE r.authority_state = 'DRAFT' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
  SELECT r.portal_resource_id, left(r.title, 160), left(coalesce(r.category_title, 'Replay'), 120),
    r.duration_ms / 1000.0, r.authority_published_at,
    (SELECT count(*) FROM public.replay_published_answers_projection q WHERE q.resource_id = r.id),
    jsonb_build_object('sortAt', coalesce(r.authority_published_at, r.approved_at), 'id', r.id)::text
  FROM resources r
  WHERE (p_category IS NULL OR lower(coalesce(r.category_title, 'Replay')) = lower(left(p_category, 120)))
    AND (p_cursor IS NULL OR (coalesce(r.authority_published_at, r.approved_at), r.id) <
      (((p_cursor::jsonb->>'sortAt')::timestamptz), (p_cursor::jsonb->>'id')::uuid))
  ORDER BY coalesce(r.authority_published_at, r.approved_at) DESC, r.id DESC
  LIMIT least(greatest(coalesce(p_limit, 21), 2), 101);
$function$;

CREATE OR REPLACE FUNCTION public.replay_vault_categories_authorized(p_user_id uuid, p_limit integer DEFAULT 61, p_cursor text DEFAULT NULL::text, p_preview boolean DEFAULT false)
RETURNS TABLE(category text, resource_count bigint, row_cursor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH resources AS (
    SELECT r.* FROM public.replay_authorized_resource_projection r
     WHERE (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
        OR (r.authority_state = 'APPROVED' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    UNION ALL
    SELECT r.* FROM public.replay_admin_preview_resource_projection r
     WHERE r.authority_state = 'DRAFT' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
  SELECT left(coalesce(r.category_title, 'Replay'), 120) c, count(*),
    jsonb_build_object('category', left(coalesce(r.category_title, 'Replay'), 120))::text
  FROM resources r
  WHERE (p_cursor IS NULL OR left(coalesce(r.category_title, 'Replay'), 120) > (p_cursor::jsonb->>'category'))
  GROUP BY 1 ORDER BY 1
  LIMIT least(greatest(coalesce(p_limit, 61), 2), 101);
$function$;

CREATE OR REPLACE FUNCTION public.replay_vault_transcript_authorized(p_user_id uuid, p_portal_resource_id text, p_after_index integer DEFAULT '-1'::integer, p_limit integer DEFAULT 101, p_preview boolean DEFAULT false)
RETURNS TABLE(cue_id uuid, cue_index integer, start_seconds numeric, end_seconds numeric, cue_text text, row_cursor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH resources AS (
    SELECT r.* FROM public.replay_authorized_resource_projection r
     WHERE (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
        OR (r.authority_state = 'APPROVED' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
    UNION ALL
    SELECT r.* FROM public.replay_admin_preview_resource_projection r
     WHERE r.authority_state = 'DRAFT' AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview))
  SELECT s.id, s.segment_index, s.starts_at_ms / 1000.0, s.ends_at_ms / 1000.0,
    left(regexp_replace(s.transcript_text_private, '[[:cntrl:]]', ' ', 'g'), 1000),
    jsonb_build_object('afterIndex', s.segment_index)::text
  FROM resources r
  JOIN public.replay_transcript_segments s ON s.transcript_version_id = r.transcript_version_id
  WHERE r.portal_resource_id = p_portal_resource_id
    AND s.segment_index > greatest(coalesce(p_after_index, -1), -1)
  ORDER BY s.segment_index
  LIMIT least(greatest(coalesce(p_limit, 101), 2), 101);
$function$;