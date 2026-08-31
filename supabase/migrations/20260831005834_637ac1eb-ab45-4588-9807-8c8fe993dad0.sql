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
  ), resources AS (
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
  ), transcript_candidates AS (
    SELECT r.portal_resource_id, h.moment_id, r.title, r.product_title, r.category_title,
      r.resource_type, h.transcript_text_private, h.starts_at_ms, h.ends_at_ms,
      (r.duration_ms / 1000)::integer duration_seconds,
      h.rank
    FROM transcript_hits h
    JOIN resources r ON r.transcript_version_id = h.transcript_version_id
    CROSS JOIN input i
    WHERE (p_stage IS NULL OR p_stage = ANY(r.stages))
  ), transcript_matches AS (
    SELECT c.portal_resource_id, c.moment_id, NULL::uuid question_id, c.title, c.product_title,
      c.category_title, c.resource_type,
      left(regexp_replace(ts_headline('english', c.transcript_text_private, i.q,
        'MaxWords=48, MinWords=12, MaxFragments=1'), '<[^>]+>', '', 'g'), 320) snippet,
      (c.starts_at_ms / 1000)::integer starts_at_seconds,
      (c.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches transcript'::text reason,
      c.duration_seconds,
      c.rank
    FROM transcript_candidates c
    CROSS JOIN input i
    WHERE i.preview_active
       OR (public.replay_vault_access_decision(p_user_id, p_email, c.portal_resource_id, 'search', p_preview, p_as_of)->>'allowed')::boolean
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
      AND (i.preview_active
        OR (public.replay_vault_access_decision(p_user_id, p_email, r.portal_resource_id, 'search', p_preview, p_as_of)->>'allowed')::boolean)
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