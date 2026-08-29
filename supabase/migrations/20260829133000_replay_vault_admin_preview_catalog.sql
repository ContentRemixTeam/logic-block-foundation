-- Let server-verified admins search, browse, play, and inspect transcripts for
-- APPROVED resources without publishing them. Member reads remain restricted to
-- the existing PUBLISHED projection and launch/entitlement decision.

CREATE OR REPLACE VIEW public.replay_authorized_resource_projection
WITH (security_invoker = false) AS
SELECT
  r.id,
  r.portal_resource_id,
  r.title,
  r.product_title,
  r.category_title,
  r.portal_path,
  r.resource_type,
  r.approved_access_scope,
  r.stages,
  r.success_paths,
  a.state AS authority_state,
  a.approved_at,
  a.published_at AS authority_published_at,
  a.transcript_version_id,
  a.transcript_content_sha256 AS transcript_sha256,
  a.playback_attempt_id,
  m.dropbox_file_id,
  m.dropbox_content_hash,
  m.size_bytes,
  m.duration_ms
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id = a.resource_id
JOIN public.replay_transcript_versions v ON v.id = a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id = a.playback_attempt_id
WHERE a.revoked_at IS NULL
  AND v.resource_id = a.resource_id
  AND v.is_active
  AND v.normalized_sha256 = a.transcript_content_sha256
  AND m.source_asset_id = a.media_source_asset_id
  AND m.verification_evidence_sha256 = a.media_evidence_sha256
  AND (
    (
      a.state = 'PUBLISHED'
      AND a.published_at IS NOT NULL
      AND r.publication_state = 'published'
      AND r.published_at IS NOT NULL
    )
    OR
    (
      a.state = 'APPROVED'
      AND a.approved_at IS NOT NULL
      AND r.publication_state = 'publishable'
      AND r.privacy_state = 'approved'
      AND r.pairing_state = 'paired'
      AND r.transcript_state = 'active'
      AND r.media_state = 'approved'
      AND r.published_at IS NULL
      AND r.member_visible_default = false
    )
  )
  AND (
    r.approved_access_scope IS NULL
    OR r.approved_access_scope <> 'current_replay_30_day'
    OR r.available_until >= CURRENT_DATE
  );

REVOKE ALL ON public.replay_authorized_resource_projection FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.replay_authorized_resource_projection TO service_role;

CREATE OR REPLACE FUNCTION public.search_replay_vault_resources(
  p_user_id uuid, p_email text, p_query text, p_stage text DEFAULT NULL,
  p_limit integer DEFAULT 12, p_include_metadata_fallback boolean DEFAULT false,
  p_preview boolean DEFAULT false, p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(
  portal_resource_id text, moment_id uuid, question_id uuid, title text, product_title text,
  category_title text, resource_type text, snippet text,
  starts_at_seconds integer, ends_at_seconds integer, reason text, duration_seconds integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH input AS (
    SELECT websearch_to_tsquery('english', trim(p_query)) q,
      least(greatest(coalesce(p_limit, 12), 1), 25) capped_limit
    WHERE length(trim(coalesce(p_query, ''))) BETWEEN 2 AND 200
  ), resources AS (
    SELECT r.*
    FROM public.replay_authorized_resource_projection r
    WHERE r.authority_state = 'PUBLISHED'
       OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
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
      AND (public.replay_vault_access_decision(
        p_user_id, p_email, r.portal_resource_id, 'search', p_preview, p_as_of
      )->>'allowed')::boolean
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
      SELECT s.id, s.starts_at_ms, s.ends_at_ms
      FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = r.transcript_version_id
      ORDER BY s.segment_index, s.id LIMIT 1
    ) first_cue ON true
    WHERE p_include_metadata_fallback
      AND (p_stage IS NULL OR p_stage = ANY(r.stages))
      AND i.q @@ to_tsvector('english', coalesce(r.title, '') || ' ' ||
        coalesce(r.product_title, '') || ' ' || coalesce(r.category_title, '') || ' ' ||
        coalesce(r.resource_type, '') || ' ' || array_to_string(r.success_paths, ' ') || ' ' ||
        array_to_string(r.stages, ' '))
      AND NOT EXISTS (
        SELECT 1 FROM public.replay_transcript_segments exact
        WHERE exact.transcript_version_id = r.transcript_version_id AND i.q @@ exact.search_vector
      )
      AND (public.replay_vault_access_decision(
        p_user_id, p_email, r.portal_resource_id, 'search', p_preview, p_as_of
      )->>'allowed')::boolean
  ), matches AS (
    SELECT * FROM transcript_matches UNION ALL SELECT * FROM metadata_matches
  ), bounded AS (
    SELECT m.*, row_number() OVER (
      PARTITION BY m.portal_resource_id ORDER BY m.rank DESC, m.starts_at_seconds, m.moment_id
    ) replay_rank
    FROM matches m
  )
  SELECT b.portal_resource_id, b.moment_id, b.question_id, b.title, b.product_title,
    b.category_title, b.resource_type, b.snippet, b.starts_at_seconds, b.ends_at_seconds,
    b.reason, b.duration_seconds
  FROM bounded b
  WHERE b.replay_rank <= 3
  ORDER BY b.rank DESC, b.portal_resource_id, b.starts_at_seconds, b.moment_id
  LIMIT (SELECT capped_limit FROM input);
$$;

CREATE OR REPLACE FUNCTION public.resolve_replay_vault_playback(
  p_user_id uuid, p_email text, p_resource_id text, p_question_id uuid DEFAULT NULL,
  p_moment_id uuid DEFAULT NULL, p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(
  resource_uuid uuid, portal_resource_id text, title text, dropbox_locator text,
  access_scope text, authoritative_start_seconds integer, authoritative_end_seconds integer,
  moment_id uuid, question_id uuid
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_resource_id uuid; v_transcript_version_id uuid; v_title text; v_locator text;
  v_scope text; v_duration integer; v_start integer; v_end integer;
BEGIN
  IF p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'
     OR (p_question_id IS NOT NULL AND p_moment_id IS NOT NULL) THEN RETURN; END IF;
  SELECT r.id, r.transcript_version_id, r.title, 'id:' || r.dropbox_file_id,
    r.approved_access_scope, (r.duration_ms / 1000)::integer
  INTO v_resource_id, v_transcript_version_id, v_title, v_locator, v_scope, v_duration
  FROM public.replay_authorized_resource_projection r
  WHERE r.portal_resource_id = p_resource_id
    AND nullif(trim(r.dropbox_file_id), '') IS NOT NULL
    AND (
      r.authority_state = 'PUBLISHED'
      OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
    )
    AND (public.replay_vault_access_decision(
      p_user_id, p_email, r.portal_resource_id, 'playback', p_preview, p_as_of
    )->>'allowed')::boolean;
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
  RETURN QUERY SELECT v_resource_id, p_resource_id, v_title, v_locator, v_scope,
    v_start, v_end, p_moment_id, p_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_vault_browse_authorized(
  p_user_id uuid, p_category text DEFAULT NULL, p_limit integer DEFAULT 21,
  p_cursor text DEFAULT NULL, p_preview boolean DEFAULT false
) RETURNS TABLE(
  portal_resource_id text, title text, category text, duration_seconds numeric,
  published_at timestamptz, question_count bigint, row_cursor text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT r.portal_resource_id, left(r.title, 160), left(coalesce(r.category_title, 'Replay'), 120),
    r.duration_ms / 1000.0, r.authority_published_at,
    (SELECT count(*) FROM public.replay_published_answers_projection q WHERE q.resource_id = r.id),
    jsonb_build_object('sortAt', coalesce(r.authority_published_at, r.approved_at), 'id', r.id)::text
  FROM public.replay_authorized_resource_projection r
  WHERE (
      (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
      OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
    )
    AND (p_category IS NULL OR lower(r.category_title) = lower(left(p_category, 120)))
    AND (p_cursor IS NULL OR (coalesce(r.authority_published_at, r.approved_at), r.id) <
      (((p_cursor::jsonb->>'sortAt')::timestamptz), (p_cursor::jsonb->>'id')::uuid))
  ORDER BY coalesce(r.authority_published_at, r.approved_at) DESC, r.id DESC
  LIMIT least(greatest(coalesce(p_limit, 21), 2), 101);
$$;

CREATE OR REPLACE FUNCTION public.replay_vault_categories_authorized(
  p_user_id uuid, p_limit integer DEFAULT 61, p_cursor text DEFAULT NULL,
  p_preview boolean DEFAULT false
) RETURNS TABLE(category text, resource_count bigint, row_cursor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT left(coalesce(r.category_title, 'Replay'), 120) c, count(*),
    jsonb_build_object('category', left(coalesce(r.category_title, 'Replay'), 120))::text
  FROM public.replay_authorized_resource_projection r
  WHERE (
      (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
      OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
    )
    AND (p_cursor IS NULL OR left(coalesce(r.category_title, 'Replay'), 120) >
      (p_cursor::jsonb->>'category'))
  GROUP BY 1 ORDER BY 1
  LIMIT least(greatest(coalesce(p_limit, 61), 2), 101);
$$;

CREATE OR REPLACE FUNCTION public.replay_vault_transcript_authorized(
  p_user_id uuid, p_portal_resource_id text, p_after_index integer DEFAULT -1,
  p_limit integer DEFAULT 101, p_preview boolean DEFAULT false
) RETURNS TABLE(
  cue_id uuid, cue_index integer, start_seconds numeric, end_seconds numeric,
  cue_text text, row_cursor text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT s.id, s.segment_index, s.starts_at_ms / 1000.0, s.ends_at_ms / 1000.0,
    left(regexp_replace(s.transcript_text_private, '[[:cntrl:]]', ' ', 'g'), 1000),
    jsonb_build_object('afterIndex', s.segment_index)::text
  FROM public.replay_authorized_resource_projection r
  JOIN public.replay_transcript_segments s ON s.transcript_version_id = r.transcript_version_id
  WHERE r.portal_resource_id = p_portal_resource_id
    AND (
      (r.authority_state = 'PUBLISHED' AND public.replay_vault_member_can_read(p_user_id, r.portal_resource_id))
      OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
    )
    AND s.segment_index > greatest(coalesce(p_after_index, -1), -1)
  ORDER BY s.segment_index
  LIMIT least(greatest(coalesce(p_limit, 101), 2), 101);
$$;

REVOKE ALL ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz),
  public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz),
  public.replay_vault_browse_authorized(uuid,text,integer,text,boolean),
  public.replay_vault_categories_authorized(uuid,integer,text,boolean),
  public.replay_vault_transcript_authorized(uuid,text,integer,integer,boolean)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz),
  public.resolve_replay_vault_playback(uuid,text,text,uuid,uuid,boolean,timestamptz),
  public.replay_vault_browse_authorized(uuid,text,integer,text,boolean),
  public.replay_vault_categories_authorized(uuid,integer,text,boolean),
  public.replay_vault_transcript_authorized(uuid,text,integer,integer,boolean)
TO service_role;

