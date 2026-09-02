-- Resource-first transcript search for Mastermind media.
--
-- Problem: search_mastermind_media_resources ranked every matching cue in the
-- 2.5M-row transcript corpus before narrowing to the caller's surface. Rare
-- words were fast; everyday words ("business", "email") exceeded the 8s
-- statement timeout, and the 500-hit cap was applied before the surface
-- filter, so curriculum searches could be starved by Vault cues.
--
-- Fix:
--   1. A small per-transcript-version search index (one row per version,
--      metadata weighted A, transcript text weighted D) picks the best
--      resources first. It is kept fresh by a statement-level trigger on
--      replay_transcript_segments and can be rebuilt in batches.
--   2. Cue ranking then runs only inside the top resources, using the
--      existing (transcript_version_id, starts_at_ms) index.
--   3. Resource-level authorization is evaluated set-based inside the
--      resources CTE instead of one plpgsql call per hit. The rules are the
--      same ones mastermind_media_access_decision applies per resource.
--   4. The function carries a 6s statement_timeout so a pathological query
--      returns an error the edge function can map to "narrow your search".

CREATE TABLE IF NOT EXISTS public.replay_resource_search_index (
  transcript_version_id uuid PRIMARY KEY REFERENCES public.replay_transcript_versions(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL,
  search_vector tsvector NOT NULL,
  cue_count integer NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS replay_resource_search_index_vector_idx
  ON public.replay_resource_search_index USING gin (search_vector);

ALTER TABLE public.replay_resource_search_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.replay_resource_search_index FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.replay_resource_search_index TO service_role;

CREATE OR REPLACE FUNCTION public.replay_refresh_resource_search_index(
  p_limit integer DEFAULT 50,
  p_transcript_version_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_done integer := 0;
BEGIN
  WITH targets AS (
    SELECT v.id, v.resource_id
    FROM public.replay_transcript_versions v
    WHERE (p_transcript_version_id IS NOT NULL AND v.id = p_transcript_version_id)
       OR (p_transcript_version_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM public.replay_resource_search_index x WHERE x.transcript_version_id = v.id))
    ORDER BY v.created_at
    LIMIT CASE WHEN p_transcript_version_id IS NULL THEN greatest(coalesce(p_limit, 50), 1) ELSE 1 END
  ), built AS (
    SELECT
      t.id transcript_version_id,
      t.resource_id,
      setweight(to_tsvector('english',
        coalesce(r.title, '') || ' ' || coalesce(r.product_title, '') || ' ' ||
        coalesce(r.category_title, '') || ' ' || coalesce(r.search_summary, '')), 'A')
      || setweight(to_tsvector('english', coalesce(agg.body, '')), 'D') search_vector,
      coalesce(agg.n, 0) cue_count
    FROM targets t
    LEFT JOIN public.mastermind_portal_resources r ON r.id = t.resource_id
    LEFT JOIN LATERAL (
      SELECT string_agg(s.transcript_text_private, ' ' ORDER BY s.segment_index) body, count(*)::integer n
      FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = t.id
    ) agg ON true
  ), upserted AS (
    INSERT INTO public.replay_resource_search_index (transcript_version_id, resource_id, search_vector, cue_count, refreshed_at)
    SELECT b.transcript_version_id, b.resource_id, b.search_vector, b.cue_count, now()
    FROM built b
    ON CONFLICT (transcript_version_id) DO UPDATE
      SET resource_id = EXCLUDED.resource_id,
          search_vector = EXCLUDED.search_vector,
          cue_count = EXCLUDED.cue_count,
          refreshed_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_done FROM upserted;
  RETURN v_done;
END;
$function$;

REVOKE ALL ON FUNCTION public.replay_refresh_resource_search_index(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_refresh_resource_search_index(integer, uuid) TO service_role;

-- Keep the per-version index current when transcript cues are written.
CREATE OR REPLACE FUNCTION public.replay_resource_search_index_on_segments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_version uuid;
BEGIN
  FOR v_version IN SELECT DISTINCT transcript_version_id FROM changed_segments LOOP
    PERFORM public.replay_refresh_resource_search_index(1, v_version);
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS replay_resource_search_index_after_segment_insert ON public.replay_transcript_segments;
CREATE TRIGGER replay_resource_search_index_after_segment_insert
  AFTER INSERT ON public.replay_transcript_segments
  REFERENCING NEW TABLE AS changed_segments
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.replay_resource_search_index_on_segments();

DROP TRIGGER IF EXISTS replay_resource_search_index_after_segment_delete ON public.replay_transcript_segments;
CREATE TRIGGER replay_resource_search_index_after_segment_delete
  AFTER DELETE ON public.replay_transcript_segments
  REFERENCING OLD TABLE AS changed_segments
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.replay_resource_search_index_on_segments();

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
SET statement_timeout TO '6s'
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
  ), surface_access AS MATERIALIZED (
    SELECT
      i.*,
      coalesce((d.decision->>'allowed')::boolean, false) allowed,
      coalesce(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(coalesce(d.decision->'memberScopes', '[]'::jsonb))),
        ARRAY[]::text[]
      ) member_scopes
    FROM input i
    CROSS JOIN LATERAL (
      SELECT public.mastermind_media_access_decision(p_user_id, p_email, NULL, 'access', i.surface, p_preview, p_as_of) decision
    ) d
  ), resources AS MATERIALIZED (
    -- Same per-resource rules as mastermind_media_access_decision(action => 'search'),
    -- evaluated once as a set instead of once per transcript hit.
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
      AND source_resource.revoked_at IS NULL
      AND source_resource.publication_state NOT IN ('revoked', 'archived')
      AND (i.preview_active OR (source_resource.publication_state = 'published' AND source_resource.published_at IS NOT NULL))
      AND source_resource.privacy_state = 'approved'
      AND source_resource.pairing_state = 'paired'
      AND source_resource.transcript_state = 'active'
      AND (source_resource.available_until IS NULL
           OR public.replay_vault_exclusive_end(source_resource.available_until) > p_as_of)
      AND (i.preview_active OR source_resource.approved_access_scope = ANY(i.member_scopes))
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
      AND source_resource.revoked_at IS NULL
      AND source_resource.publication_state NOT IN ('revoked', 'archived')
      AND source_resource.privacy_state = 'approved'
      AND source_resource.pairing_state = 'paired'
      AND source_resource.transcript_state = 'active'
      AND (source_resource.available_until IS NULL
           OR public.replay_vault_exclusive_end(source_resource.available_until) > p_as_of)
      AND (
        i.normalized_stage = ''
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(r.stages, ARRAY[]::text[])) AS stage_name(stage_value)
          WHERE lower(stage_name.stage_value) = i.normalized_stage
        )
      )
  ), resource_hits AS MATERIALIZED (
    -- Resource-first: pick the best-matching allowed resources before touching cues.
    -- Resources not yet in the index (fresh imports before the trigger ran) are kept
    -- so they are never silently hidden; they sort last.
    SELECT
      r.transcript_version_id,
      coalesce(ts_rank(x.search_vector, i.q), 0) resource_rank
    FROM resources r
    CROSS JOIN surface_access i
    LEFT JOIN public.replay_resource_search_index x ON x.transcript_version_id = r.transcript_version_id
    WHERE x.transcript_version_id IS NULL OR i.q @@ x.search_vector
    ORDER BY coalesce(ts_rank(x.search_vector, i.q), 0) DESC, r.portal_resource_id
    LIMIT 40
  ), transcript_hits AS MATERIALIZED (
    SELECT
      s.id moment_id,
      s.transcript_version_id,
      s.transcript_text_private,
      s.starts_at_ms,
      s.ends_at_ms,
      ts_rank(s.search_vector, i.q) rank
    FROM resource_hits h
    JOIN public.replay_transcript_segments s ON s.transcript_version_id = h.transcript_version_id
    CROSS JOIN surface_access i
    WHERE i.q @@ s.search_vector
    ORDER BY ts_rank(s.search_vector, i.q) DESC, s.starts_at_ms, s.id
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
      ts_rank(mv.v, i.q) * 0.5 rank
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
      AND NOT EXISTS (SELECT 1 FROM transcript_hits h WHERE h.transcript_version_id = r.transcript_version_id)
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
    JOIN LATERAL (
      SELECT s.id, s.starts_at_ms, s.ends_at_ms
      FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id = c.transcript_version_id
      ORDER BY s.segment_index, s.id
      LIMIT 1
    ) first_cue ON true
  ), matches AS (
    SELECT * FROM transcript_matches
    UNION ALL
    SELECT * FROM metadata_matches
  ), bounded AS (
    SELECT
      m.*,
      row_number() OVER (
        PARTITION BY m.portal_resource_id
        ORDER BY m.rank DESC, m.starts_at_seconds, m.moment_id
      ) replay_rank
    FROM matches m
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
  IS 'Surface-aware protected media search: resource-first ranking through replay_resource_search_index, cue ranking only inside the top allowed resources, set-based per-resource authorization, and a 6s statement timeout.';
