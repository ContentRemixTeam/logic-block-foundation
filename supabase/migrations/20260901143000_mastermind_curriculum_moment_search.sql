-- Hidden-QA-only curriculum timestamp search.
--
-- This reuses the approved Replay Vault transcript tables but only returns
-- moments from resources explicitly published as core_curriculum to the
-- server allowlisted preview accounts. It never returns Dropbox locators,
-- provider IDs, source paths, or Vault-only records.
CREATE OR REPLACE FUNCTION public.search_my_mastermind_curriculum_moments(
  p_query TEXT,
  p_stage TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_preview BOOLEAN DEFAULT false
) RETURNS TABLE(
  portal_resource_id TEXT,
  title TEXT,
  category_title TEXT,
  start_seconds INTEGER,
  end_seconds INTEGER,
  moment_id UUID,
  snippet TEXT,
  duration_seconds INTEGER,
  completed BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH input AS (
    SELECT
      auth.uid() user_id,
      lower(trim(coalesce(auth.jwt()->>'email', ''))) email,
      websearch_to_tsquery('english', left(trim(p_query), 160)) q,
      least(greatest(coalesce(p_limit, 12), 1), 25) capped_limit,
      public.replay_vault_admin_preview_enabled(auth.uid(), p_preview) preview_active
    WHERE auth.uid() IS NOT NULL
      AND public.replay_vault_admin_preview_enabled(auth.uid(), p_preview)
      AND length(trim(coalesce(p_query, ''))) BETWEEN 2 AND 160
  ), resources AS MATERIALIZED (
    SELECT r.*
    FROM public.replay_authorized_resource_projection r
    CROSS JOIN input i
    WHERE r.approved_access_scope = 'core_curriculum'
      AND r.portal_resource_id IS NOT NULL
      AND r.transcript_version_id IS NOT NULL
      AND i.preview_active
      AND r.authority_state IN ('PUBLISHED', 'APPROVED')
      AND (
        p_stage IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(r.stages, ARRAY[]::TEXT[])) AS stage_name(stage_value)
          WHERE lower(stage_value) = lower(p_stage)
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
    CROSS JOIN input i
    WHERE i.q @@ s.search_vector
    ORDER BY ts_rank_cd(s.search_vector, i.q) DESC, s.starts_at_ms, s.id
    LIMIT 400
  ), authorized_matches AS (
    SELECT
      r.portal_resource_id::TEXT,
      left(r.title, 180) title,
      left(r.category_title, 120) category_title,
      (h.starts_at_ms / 1000)::INTEGER start_seconds,
      (h.ends_at_ms / 1000)::INTEGER end_seconds,
      h.moment_id,
      h.transcript_text_private snippet_source,
      CASE WHEN r.duration_ms IS NULL THEN NULL ELSE (r.duration_ms / 1000)::INTEGER END duration_seconds,
      coalesce(p.completed_at IS NOT NULL, false) completed,
      h.rank
    FROM transcript_hits h
    JOIN resources r ON r.transcript_version_id = h.transcript_version_id
    CROSS JOIN input i
    LEFT JOIN public.mastermind_phase_one_resource_progress p
      ON p.user_id = i.user_id
     AND p.portal_resource_id = r.portal_resource_id
    WHERE coalesce((public.mastermind_media_access_decision(
      i.user_id,
      i.email,
      r.portal_resource_id,
      'search',
      'curriculum',
      i.preview_active
    )->>'allowed')::BOOLEAN, false)
  ), bounded AS (
    SELECT
      m.*,
      row_number() OVER (
        PARTITION BY m.portal_resource_id
        ORDER BY m.rank DESC, m.start_seconds, m.moment_id
      ) resource_rank
    FROM authorized_matches m
  ), page AS (
    SELECT b.*
    FROM bounded b
    WHERE b.resource_rank <= 2
    ORDER BY b.rank DESC, b.portal_resource_id, b.start_seconds, b.moment_id
    LIMIT (SELECT capped_limit FROM input)
  )
  SELECT
    p.portal_resource_id,
    p.title,
    p.category_title,
    p.start_seconds,
    p.end_seconds,
    p.moment_id,
    left(regexp_replace(ts_headline(
      'english',
      p.snippet_source,
      i.q,
      'MaxWords=42, MinWords=10, MaxFragments=1'
    ), '<[^>]+>', '', 'g'), 320) snippet,
    p.duration_seconds,
    p.completed
  FROM page p
  CROSS JOIN input i
  ORDER BY p.rank DESC, p.portal_resource_id, p.start_seconds, p.moment_id;
$function$;

REVOKE ALL ON FUNCTION public.search_my_mastermind_curriculum_moments(TEXT,TEXT,INTEGER,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_my_mastermind_curriculum_moments(TEXT,TEXT,INTEGER,BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_my_mastermind_curriculum_moments(TEXT,TEXT,INTEGER,BOOLEAN) TO authenticated;
