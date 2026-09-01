CREATE OR REPLACE FUNCTION public.search_mastermind_media_resources(
  p_user_id uuid,
  p_email text,
  p_query text,
  p_stage text DEFAULT NULL::text,
  p_limit integer DEFAULT 12,
  p_moments_per_replay integer DEFAULT 3,
  p_include_metadata_fallback boolean DEFAULT false,
  p_surface text DEFAULT 'vault'::text,
  p_preview boolean DEFAULT false,
  p_as_of timestamp with time zone DEFAULT clock_timestamp()
) RETURNS TABLE(
  portal_resource_id text,
  moment_id uuid,
  question_id uuid,
  title text,
  product_title text,
  category_title text,
  resource_type text,
  snippet text,
  starts_at_seconds integer,
  ends_at_seconds integer,
  reason text,
  duration_seconds integer,
  access_scope text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH input AS (
    SELECT
      websearch_to_tsquery('english', trim(p_query)) q,
      lower(trim(coalesce(nullif(p_stage, ''), ''))) normalized_stage,
      lower(trim(coalesce(nullif(p_surface, ''), 'vault'))) surface,
      CASE lower(trim(coalesce(nullif(p_surface, ''), 'vault')))
        WHEN 'curriculum' THEN 'core_curriculum'
        WHEN 'recent_replay' THEN 'current_replay_30_day'
        ELSE 'replay_vault'
      END access_scope,
      least(greatest(coalesce(p_limit, 12), 1), 25) capped_limit,
      least(greatest(coalesce(p_moments_per_replay, 3), 1), 8) capped_moments_per_replay,
      public.replay_vault_admin_preview_enabled(p_user_id, p_preview) preview_active
    WHERE p_user_id IS NOT NULL
      AND lower(trim(coalesce(nullif(p_surface, ''), 'vault'))) IN ('curriculum', 'recent_replay', 'vault')
      AND length(trim(coalesce(p_query, ''))) BETWEEN 2 AND 200
  ), surface_access AS (
    SELECT
      i.*,
      coalesce((public.mastermind_media_access_decision(
        p_user_id,
        p_email,
        NULL,
        'access',
        i.surface,
        p_preview,
        p_as_of
      )->>'allowed')::boolean, false) allowed
    FROM input i
  ), resources AS MATERIALIZED (
    SELECT r.*
    FROM public.replay_authorized_resource_projection r
    CROSS JOIN surface_access i
    JOIN public.mastermind_portal_resources source_resource ON source_resource.id = r.id
    WHERE i.allowed
      AND r.approved_access_scope = i.access_scope
      AND r.portal_resource_id IS NOT NULL
      AND r.transcript_version_id IS NOT NULL
      AND (
        i.surface <> 'recent_replay'
        OR source_resource.available_until >= p_as_of::date
        OR source_resource.replay_date >= (p_as_of::date - integer '30')
      )
      AND (
        r.authority_state = 'PUBLISHED'
        OR (r.authority_state = 'APPROVED' AND i.preview_active)
      )
      AND (
        i.normalized_stage = ''
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(r.stages, ARRAY[]::text[])) AS stage_name(stage_value)
          WHERE lower(stage_name.stage_value) = i.normalized_stage
        )
      )
    UNION ALL
    SELECT r.*
    FROM public.replay_admin_preview_resource_projection r
    CROSS JOIN surface_access i
    JOIN public.mastermind_portal_resources source_resource ON source_resource.id = r.id
    WHERE i.allowed
      AND i.preview_active
      AND r.authority_state = 'DRAFT'
      AND r.approved_access_scope = i.access_scope
      AND r.portal_resource_id IS NOT NULL
      AND r.transcript_version_id IS NOT NULL
      AND (
        i.surface <> 'recent_replay'
        OR source_resource.available_until >= p_as_of::date
        OR source_resource.replay_date >= (p_as_of::date - integer '30')
      )
      AND (
        i.normalized_stage = ''
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(r.stages, ARRAY[]::text[])) AS stage_name(stage_value)
          WHERE lower(stage_name.stage_value) = i.normalized_stage
        )
      )
  ), transcript_hits AS MATERIALIZED (
    SELECT
      s.id moment_id,
      s.transcript_version_id,
      s.transcript_text_private,
      s.starts_at_ms,
      s.ends_at_ms,
      ts_rank_cd(s.search_vector, i.q) rank
    FROM public.replay_transcript_segments s
    CROSS JOIN surface_access i
    WHERE i.allowed
      AND i.q @@ s.search_vector
    ORDER BY ts_rank_cd(s.search_vector, i.q) DESC, s.starts_at_ms, s.id
    LIMIT 500
  ), transcript_matches AS (
    SELECT
      r.portal_resource_id,
      h.moment_id,
      NULL::uuid question_id,
      r.title,
      r.product_title,
      r.category_title,
      r.resource_type,
      r.approved_access_scope access_scope,
      h.transcript_text_private snippet_source,
      (h.starts_at_ms / 1000)::integer starts_at_seconds,
      (h.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches transcript'::text reason,
      (r.duration_ms / 1000)::integer duration_seconds,
      h.rank
    FROM transcript_hits h
    JOIN resources r ON r.transcript_version_id = h.transcript_version_id
  ), metadata_candidates AS MATERIALIZED (
    SELECT
      r.portal_resource_id,
      r.transcript_version_id,
      r.title,
      r.product_title,
      r.category_title,
      r.resource_type,
      r.approved_access_scope access_scope,
      r.duration_ms,
      ts_rank_cd(mv.v, i.q) * 0.5 rank
    FROM resources r
    CROSS JOIN surface_access i
    CROSS JOIN LATERAL (
      SELECT to_tsvector('english', coalesce(r.title, '') || ' ' ||
        coalesce(r.product_title, '') || ' ' ||
        coalesce(r.category_title, '') || ' ' ||
        coalesce(r.resource_type, '') || ' ' ||
        array_to_string(r.success_paths, ' ') || ' ' ||
        array_to_string(r.stages, ' ')) v
    ) mv
    WHERE i.allowed
      AND p_include_metadata_fallback
      AND i.q @@ mv.v
  ), metadata_matches AS (
    SELECT
      c.portal_resource_id,
      first_cue.id moment_id,
      NULL::uuid question_id,
      c.title,
      c.product_title,
      c.category_title,
      c.resource_type,
      c.access_scope,
      c.title snippet_source,
      (first_cue.starts_at_ms / 1000)::integer starts_at_seconds,
      (first_cue.ends_at_ms / 1000)::integer ends_at_seconds,
      'matches title or replay details'::text reason,
      (c.duration_ms / 1000)::integer duration_seconds,
      c.rank
    FROM metadata_candidates c
    CROSS JOIN surface_access i
    JOIN LATERAL (
      SELECT s.id, s.starts_at_ms, s.ends_at_ms
      FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = c.transcript_version_id
      ORDER BY s.segment_index, s.id
      LIMIT 1
    ) first_cue ON true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.replay_transcript_segments exact
      WHERE exact.transcript_version_id = c.transcript_version_id
        AND i.q @@ exact.search_vector
    )
  ), matches AS (
    SELECT * FROM transcript_matches
    UNION ALL
    SELECT * FROM metadata_matches
  ), authorized_matches AS MATERIALIZED (
    SELECT m.*
    FROM matches m
    CROSS JOIN surface_access i
    WHERE coalesce((public.mastermind_media_access_decision(
      p_user_id,
      p_email,
      m.portal_resource_id,
      'search',
      i.surface,
      p_preview,
      p_as_of
    )->>'allowed')::boolean, false)
  ), bounded AS (
    SELECT
      m.*,
      row_number() OVER (
        PARTITION BY m.portal_resource_id
        ORDER BY m.rank DESC, m.starts_at_seconds, m.moment_id
      ) replay_rank
    FROM authorized_matches m
  ), page AS (
    SELECT b.*
    FROM bounded b
    CROSS JOIN surface_access i
    WHERE b.replay_rank <= i.capped_moments_per_replay
    ORDER BY b.rank DESC, b.portal_resource_id, b.starts_at_seconds, b.moment_id
    LIMIT (SELECT capped_limit FROM surface_access)
  )
  SELECT
    p.portal_resource_id,
    p.moment_id,
    p.question_id,
    p.title,
    p.product_title,
    p.category_title,
    p.resource_type,
    CASE WHEN p.reason = 'matches transcript'
      THEN left(regexp_replace(ts_headline(
        'english',
        p.snippet_source,
        i.q,
        'MaxWords=48, MinWords=12, MaxFragments=1'
      ), '<[^>]+>', '', 'g'), 320)
      ELSE left(p.snippet_source, 320)
    END snippet,
    p.starts_at_seconds,
    p.ends_at_seconds,
    p.reason,
    p.duration_seconds,
    p.access_scope
  FROM page p
  CROSS JOIN surface_access i
  ORDER BY p.rank DESC, p.portal_resource_id, p.starts_at_seconds, p.moment_id;
$function$;

REVOKE ALL ON FUNCTION public.search_mastermind_media_resources(uuid,text,text,text,integer,integer,boolean,text,boolean,timestamp with time zone)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_mastermind_media_resources(uuid,text,text,text,integer,integer,boolean,text,boolean,timestamp with time zone)
  TO service_role;

COMMENT ON FUNCTION public.search_mastermind_media_resources(uuid,text,text,text,integer,integer,boolean,text,boolean,timestamp with time zone)
  IS 'Surface-aware protected media search for core curriculum, current 30-day replays, and annual/lifetime Replay Vault without leaking private source fields; current-replay preview is date-windowed server-side.';
