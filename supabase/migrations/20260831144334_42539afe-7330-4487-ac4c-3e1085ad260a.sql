CREATE OR REPLACE FUNCTION public.search_replay_vault_resources(p_user_id uuid, p_email text, p_query text, p_stage text DEFAULT NULL::text, p_limit integer DEFAULT 12, p_include_metadata_fallback boolean DEFAULT false, p_preview boolean DEFAULT false, p_as_of timestamp with time zone DEFAULT clock_timestamp())
 RETURNS TABLE(portal_resource_id text, moment_id uuid, question_id uuid, title text, product_title text, category_title text, resource_type text, snippet text, starts_at_seconds integer, ends_at_seconds integer, reason text, duration_seconds integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH input AS (
    SELECT websearch_to_tsquery('english', trim(p_query)) q,
      least(greatest(coalesce(p_limit, 12), 1), 25) capped_limit,
      public.replay_vault_admin_preview_enabled(p_user_id, p_preview) preview_active
    WHERE length(trim(coalesce(p_query, ''))) BETWEEN 2 AND 200
  ), resources AS MATERIALIZED (
    SELECT r.* FROM public.replay_authorized_resource_projection r, input i
    WHERE r.authority_state = 'PUBLISHED'
       OR (r.authority_state = 'APPROVED' AND i.preview_active)
    UNION ALL
    SELECT r.* FROM public.replay_admin_preview_resource_projection r, input i
    WHERE r.authority_state = 'DRAFT' AND i.preview_active
  ), transcript_hits AS MATERIALIZED (
    SELECT s.id moment_id, s.transcript_version_id, s.transcript_text_private,
      s.starts_at_ms, s.ends_at_ms,
      ts_rank_cd(s.search_vector, i.q) rank
    FROM public.replay_transcript_segments s, input i
    WHERE i.q @@ s.search_vector
    ORDER BY ts_rank_cd(s.search_vector, i.q) DESC
    LIMIT 400
  ), transcript_matches AS (
    SELECT r.portal_resource_id, h.moment_id, NULL::uuid question_id, r.title, r.product_title,
      r.category_title, r.resource_type,
      h.transcript_text_private snippet_source,
      (h.starts_at_ms / 1000)::integer starts_at_seconds,
      (h.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches transcript'::text reason,
      (r.duration_ms / 1000)::integer duration_seconds,
      h.rank
    FROM transcript_hits h
    JOIN resources r ON r.transcript_version_id = h.transcript_version_id
    WHERE p_stage IS NULL OR p_stage = ANY(r.stages)
  ), metadata_candidates AS MATERIALIZED (
    SELECT r.portal_resource_id, r.transcript_version_id, r.title, r.product_title,
      r.category_title, r.resource_type, r.duration_ms,
      ts_rank_cd(mv.v, i.q) * 0.5 rank
    FROM resources r
    CROSS JOIN input i
    CROSS JOIN LATERAL (
      SELECT to_tsvector('english', coalesce(r.title, '') || ' ' ||
        coalesce(r.product_title, '') || ' ' || coalesce(r.category_title, '') || ' ' ||
        coalesce(r.resource_type, '') || ' ' || array_to_string(r.success_paths, ' ') || ' ' ||
        array_to_string(r.stages, ' ')) v) mv
    WHERE p_include_metadata_fallback
      AND (p_stage IS NULL OR p_stage = ANY(r.stages))
      AND i.q @@ mv.v
  ), metadata_matches AS (
    SELECT c.portal_resource_id, first_cue.id moment_id, NULL::uuid question_id, c.title,
      c.product_title, c.category_title, c.resource_type,
      c.title snippet_source,
      (first_cue.starts_at_ms / 1000)::integer starts_at_seconds,
      (first_cue.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches title or replay details'::text reason,
      (c.duration_ms / 1000)::integer duration_seconds,
      c.rank
    FROM metadata_candidates c
    CROSS JOIN input i
    JOIN LATERAL (
      SELECT s.id, s.starts_at_ms, s.ends_at_ms FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = c.transcript_version_id
      ORDER BY s.segment_index, s.id LIMIT 1) first_cue ON true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.replay_transcript_segments exact
      WHERE exact.transcript_version_id = c.transcript_version_id AND i.q @@ exact.search_vector)
  ), matches AS (
    SELECT * FROM transcript_matches UNION ALL SELECT * FROM metadata_matches
  ), authorized_resources AS MATERIALIZED (
    SELECT DISTINCT m.portal_resource_id
    FROM (SELECT DISTINCT portal_resource_id FROM matches) m
    CROSS JOIN input i
    WHERE i.preview_active
       OR (public.replay_vault_access_decision(p_user_id, p_email, m.portal_resource_id, 'search', p_preview, p_as_of)->>'allowed')::boolean
  ), bounded AS (
    SELECT m.*, row_number() OVER (PARTITION BY m.portal_resource_id ORDER BY m.rank DESC, m.starts_at_seconds, m.moment_id) replay_rank
    FROM matches m
    JOIN authorized_resources a ON a.portal_resource_id = m.portal_resource_id
  ), page AS (
    SELECT b.* FROM bounded b WHERE b.replay_rank <= 3
    ORDER BY b.rank DESC, b.portal_resource_id, b.starts_at_seconds, b.moment_id
    LIMIT (SELECT capped_limit FROM input)
  )
  SELECT p.portal_resource_id, p.moment_id, p.question_id, p.title, p.product_title,
    p.category_title, p.resource_type,
    CASE WHEN p.reason = 'matches transcript'
      THEN left(regexp_replace(ts_headline('english', p.snippet_source, i.q,
        'MaxWords=48, MinWords=12, MaxFragments=1'), '<[^>]+>', '', 'g'), 320)
      ELSE left(p.snippet_source, 320) END snippet,
    p.starts_at_seconds, p.ends_at_seconds, p.reason, p.duration_seconds
  FROM page p CROSS JOIN input i
  ORDER BY p.rank DESC, p.portal_resource_id, p.starts_at_seconds, p.moment_id;
$function$;

CREATE OR REPLACE FUNCTION public.replay_vault_interaction_binding(p_user_id uuid, p_email text, p_portal_resource_id text, p_target_kind text, p_target_id uuid, p_as_of timestamptz DEFAULT clock_timestamp())
RETURNS public.replay_vault_target_binding
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE b public.replay_vault_target_binding; canonical_email text; preview_active boolean;
BEGIN
  IF p_user_id IS NULL OR p_target_kind NOT IN ('replay','moment','question') OR p_portal_resource_id IS NULL
     OR p_portal_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'
     OR (p_target_kind <> 'replay' AND p_target_id IS NULL) THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE = '22023';
  END IF;
  canonical_email := public.replay_vault_member_email(p_user_id);
  IF canonical_email IS NULL THEN RAISE EXCEPTION 'inaccessible' USING ERRCODE = '42501'; END IF;

  SELECT r.id, r.portal_resource_id, p_target_kind, CASE WHEN p_target_kind='replay' THEN r.id ELSE p_target_id END,
    r.transcript_version_id, r.playback_attempt_id, a.package_sha256, r.duration_ms,
    CASE WHEN p_target_kind='replay' THEN 0 WHEN p_target_kind='moment' THEN s.starts_at_ms ELSE q.answer_start_ms END,
    CASE WHEN p_target_kind='replay' THEN r.duration_ms WHEN p_target_kind='moment' THEN s.ends_at_ms ELSE q.answer_end_ms END,
    r.title
  INTO b
  FROM public.replay_published_resource_projection r
  JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
  LEFT JOIN public.replay_transcript_segments s ON p_target_kind='moment' AND s.id=p_target_id AND s.transcript_version_id=r.transcript_version_id
  LEFT JOIN public.replay_published_answers_projection q ON p_target_kind='question' AND q.id=p_target_id AND q.resource_id=r.id
  WHERE r.portal_resource_id=p_portal_resource_id AND r.duration_ms>0
    AND (public.replay_vault_access_decision(p_user_id, canonical_email, r.portal_resource_id, 'playback', false, p_as_of)->>'allowed')::boolean
    AND (p_target_kind='replay' OR (p_target_kind='moment' AND s.id IS NOT NULL) OR (p_target_kind='question' AND q.id IS NOT NULL));

  IF b.resource_id IS NULL THEN
    preview_active := public.replay_vault_admin_preview_enabled(p_user_id, true);
    IF preview_active THEN
      SELECT r.id, r.portal_resource_id, p_target_kind, CASE WHEN p_target_kind='replay' THEN r.id ELSE p_target_id END,
        r.transcript_version_id, r.playback_attempt_id, a.package_sha256, r.duration_ms,
        CASE WHEN p_target_kind='replay' THEN 0 WHEN p_target_kind='moment' THEN s.starts_at_ms ELSE q.answer_start_ms END,
        CASE WHEN p_target_kind='replay' THEN r.duration_ms WHEN p_target_kind='moment' THEN s.ends_at_ms ELSE q.answer_end_ms END,
        r.title
      INTO b
      FROM (
        SELECT * FROM public.replay_authorized_resource_projection
        UNION ALL
        SELECT * FROM public.replay_admin_preview_resource_projection
      ) r
      JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.revoked_at IS NULL
        AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
      LEFT JOIN public.replay_transcript_segments s ON p_target_kind='moment' AND s.id=p_target_id AND s.transcript_version_id=r.transcript_version_id
      LEFT JOIN public.replay_published_answers_projection q ON p_target_kind='question' AND q.id=p_target_id AND q.resource_id=r.id
      WHERE r.portal_resource_id=p_portal_resource_id AND r.duration_ms>0
        AND (public.replay_vault_access_decision(p_user_id, canonical_email, r.portal_resource_id, 'playback', true, p_as_of)->>'allowed')::boolean
        AND (p_target_kind='replay' OR (p_target_kind='moment' AND s.id IS NOT NULL) OR (p_target_kind='question' AND q.id IS NOT NULL))
      LIMIT 1;
    END IF;
  END IF;

  IF b.resource_id IS NULL THEN RAISE EXCEPTION 'inaccessible' USING ERRCODE = '42501'; END IF;
  RETURN b;
END$$;