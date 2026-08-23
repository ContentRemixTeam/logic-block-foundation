-- Private Mastermind portal search foundation.
-- Additive only: no member-facing UI is enabled by this migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostgreSQL 16 rejects array_to_string directly in a stored generated
-- expression because the built-in is not declared immutable. This narrow,
-- deterministic wrapper preserves the exact space-joined search semantics.
CREATE OR REPLACE FUNCTION public.mastermind_portal_search_array_text(p_values text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT pg_catalog.array_to_string(p_values, ' ')
$$;

REVOKE ALL ON FUNCTION public.mastermind_portal_search_array_text(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mastermind_portal_search_array_text(text[]) TO service_role;

CREATE TABLE IF NOT EXISTS public.mastermind_portal_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_resource_id TEXT NOT NULL UNIQUE,
  product_id TEXT,
  product_title TEXT NOT NULL,
  category_id TEXT,
  category_title TEXT,
  lesson_id TEXT,
  title TEXT NOT NULL,
  portal_path TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'video',
  access_scope TEXT NOT NULL DEFAULT 'core_curriculum',
  member_visible_default BOOLEAN NOT NULL DEFAULT false,
  is_current_replay BOOLEAN NOT NULL DEFAULT false,
  replay_date DATE,
  available_until DATE,
  success_paths TEXT[] NOT NULL DEFAULT '{}',
  stages TEXT[] NOT NULL DEFAULT '{}',
  search_summary TEXT,
  ingestion_status TEXT NOT NULL DEFAULT 'metadata_only_needs_source_review',
  transcript_evidence TEXT NOT NULL DEFAULT 'no',
  video_source_type TEXT NOT NULL DEFAULT 'no_video_url',
  metadata_search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(product_title, '') || ' ' ||
      coalesce(category_title, '') || ' ' ||
      coalesce(search_summary, '') || ' ' ||
      public.mastermind_portal_search_array_text(success_paths) || ' ' ||
      public.mastermind_portal_search_array_text(stages)
    )
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mastermind_portal_resources_access_scope_chk CHECK (
    access_scope IN (
      'core_curriculum',
      'current_replay_30_day',
      'replay_vault',
      'vault',
      'bonus_or_access_review'
    )
  ),
  CONSTRAINT mastermind_portal_resources_ingestion_status_chk CHECK (
    ingestion_status IN (
      'ready_for_search',
      'metadata_only_needs_source_review',
      'needs_transcript',
      'needs_video_source',
      'blocked_private_source',
      'do_not_index'
    )
  ),
  CONSTRAINT mastermind_portal_resources_transcript_evidence_chk CHECK (
    transcript_evidence IN ('yes', 'partial', 'no')
  )
);

CREATE TABLE IF NOT EXISTS public.mastermind_portal_source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  source_ref TEXT,
  source_url TEXT,
  dropbox_path TEXT,
  ghl_video_url TEXT,
  bunny_video_id TEXT,
  youtube_video_id TEXT,
  transcript_path TEXT,
  transcript_source TEXT,
  match_confidence TEXT,
  match_score NUMERIC(8, 3) CHECK (match_score IS NULL OR match_score >= 0),
  review_status TEXT NOT NULL DEFAULT 'needs_review',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mastermind_portal_source_evidence_review_status_chk CHECK (
    review_status IN ('needs_review', 'approved', 'rejected', 'blocked')
  ),
  CONSTRAINT mastermind_portal_source_evidence_unique_idx UNIQUE (resource_id, source_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.mastermind_portal_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE CASCADE,
  source_evidence_id UUID REFERENCES public.mastermind_portal_source_evidence(id) ON DELETE SET NULL,
  segment_index INTEGER NOT NULL,
  starts_at_seconds INTEGER,
  ends_at_seconds INTEGER,
  speaker TEXT,
  transcript_text TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(transcript_text, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mastermind_portal_transcript_segments_unique_idx UNIQUE (resource_id, segment_index)
);

CREATE TABLE IF NOT EXISTS public.mastermind_portal_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_hash TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  access_scope_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mastermind_portal_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_portal_source_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_portal_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_portal_search_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mastermind_portal_resources FROM anon;
REVOKE ALL ON public.mastermind_portal_resources FROM authenticated;
REVOKE ALL ON public.mastermind_portal_source_evidence FROM anon;
REVOKE ALL ON public.mastermind_portal_source_evidence FROM authenticated;
REVOKE ALL ON public.mastermind_portal_transcript_segments FROM anon;
REVOKE ALL ON public.mastermind_portal_transcript_segments FROM authenticated;
REVOKE ALL ON public.mastermind_portal_search_events FROM anon;
REVOKE ALL ON public.mastermind_portal_search_events FROM authenticated;

GRANT ALL ON public.mastermind_portal_resources TO service_role;
GRANT ALL ON public.mastermind_portal_source_evidence TO service_role;
GRANT ALL ON public.mastermind_portal_transcript_segments TO service_role;
GRANT ALL ON public.mastermind_portal_search_events TO service_role;

CREATE POLICY "Only service_role can access mastermind portal resources"
ON public.mastermind_portal_resources
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only service_role can access mastermind portal source evidence"
ON public.mastermind_portal_source_evidence
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only service_role can access mastermind portal transcript segments"
ON public.mastermind_portal_transcript_segments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only service_role can access mastermind portal search events"
ON public.mastermind_portal_search_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_resources_access_scope
ON public.mastermind_portal_resources(access_scope);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_resources_current_replays
ON public.mastermind_portal_resources(access_scope, available_until)
WHERE access_scope = 'current_replay_30_day';

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_resources_stages
ON public.mastermind_portal_resources USING gin(stages);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_resources_success_paths
ON public.mastermind_portal_resources USING gin(success_paths);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_resources_metadata_search
ON public.mastermind_portal_resources USING gin(metadata_search_vector);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_source_evidence_resource_id
ON public.mastermind_portal_source_evidence(resource_id);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_transcript_segments_resource_id
ON public.mastermind_portal_transcript_segments(resource_id);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_transcript_segments_search
ON public.mastermind_portal_transcript_segments USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_mastermind_portal_search_events_user_created
ON public.mastermind_portal_search_events(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.search_mastermind_portal_resources(
  p_query TEXT,
  p_allowed_access TEXT[],
  p_stage TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_include_metadata_fallback BOOLEAN DEFAULT false
)
RETURNS TABLE(
  portal_resource_id TEXT,
  title TEXT,
  product_title TEXT,
  category_title TEXT,
  portal_path TEXT,
  access_scope TEXT,
  stages TEXT[],
  resource_type TEXT,
  snippet TEXT,
  starts_at_seconds INTEGER,
  reason TEXT,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT
      websearch_to_tsquery('english', coalesce(nullif(trim(p_query), ''), '')) AS q,
      LEAST(GREATEST(coalesce(p_limit, 12), 1), 25) AS capped_limit
  ),
  allowed_resources AS (
    SELECT r.*
    FROM public.mastermind_portal_resources r
    WHERE r.access_scope = ANY(p_allowed_access)
      AND (p_stage IS NULL OR p_stage = ANY(r.stages))
      AND r.ingestion_status <> 'do_not_index'
      AND (
        r.access_scope <> 'current_replay_30_day'
        OR (r.available_until IS NOT NULL AND r.available_until >= CURRENT_DATE)
      )
  ),
  transcript_matches AS (
    SELECT
      r.portal_resource_id,
      r.title,
      r.product_title,
      r.category_title,
      r.portal_path,
      r.access_scope,
      r.stages,
      r.resource_type,
      left(
        regexp_replace(
          ts_headline('english', s.transcript_text, n.q, 'MaxWords=48, MinWords=12, MaxFragments=1'),
          '<[^>]+>',
          '',
          'g'
        ),
        320
      ) AS snippet,
      s.starts_at_seconds,
      'matches transcript'::TEXT AS reason,
      (ts_rank_cd(s.search_vector, n.q) + 0.5)::REAL AS rank
    FROM allowed_resources r
    JOIN public.mastermind_portal_transcript_segments s ON s.resource_id = r.id
    CROSS JOIN normalized n
    WHERE n.q @@ s.search_vector
  ),
  metadata_matches AS (
    SELECT
      r.portal_resource_id,
      r.title,
      r.product_title,
      r.category_title,
      r.portal_path,
      r.access_scope,
      r.stages,
      r.resource_type,
      left(coalesce(r.search_summary, r.title || ' - ' || r.product_title), 320) AS snippet,
      NULL::INTEGER AS starts_at_seconds,
      'matches title/path metadata'::TEXT AS reason,
      ts_rank_cd(r.metadata_search_vector, n.q)::REAL AS rank
    FROM allowed_resources r
    CROSS JOIN normalized n
    WHERE p_include_metadata_fallback
      AND n.q @@ r.metadata_search_vector
  ),
  ranked AS (
    SELECT * FROM transcript_matches
    UNION ALL
    SELECT * FROM metadata_matches
  ),
  deduped AS (
    SELECT DISTINCT ON (portal_resource_id)
      portal_resource_id,
      title,
      product_title,
      category_title,
      portal_path,
      access_scope,
      stages,
      resource_type,
      snippet,
      starts_at_seconds,
      reason,
      rank
    FROM ranked
    ORDER BY portal_resource_id, rank DESC, starts_at_seconds NULLS LAST
  )
  SELECT
    d.portal_resource_id,
    d.title,
    d.product_title,
    d.category_title,
    d.portal_path,
    d.access_scope,
    d.stages,
    d.resource_type,
    d.snippet,
    d.starts_at_seconds,
    d.reason,
    d.rank
  FROM deduped d
  CROSS JOIN normalized n
  ORDER BY d.rank DESC, d.title ASC
  LIMIT (SELECT capped_limit FROM normalized);
$$;

REVOKE ALL ON FUNCTION public.search_mastermind_portal_resources(TEXT, TEXT[], TEXT, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_mastermind_portal_resources(TEXT, TEXT[], TEXT, INTEGER, BOOLEAN) TO service_role;

DROP TRIGGER IF EXISTS update_mastermind_portal_resources_updated_at ON public.mastermind_portal_resources;
CREATE TRIGGER update_mastermind_portal_resources_updated_at
BEFORE UPDATE ON public.mastermind_portal_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mastermind_portal_source_evidence_updated_at ON public.mastermind_portal_source_evidence;
CREATE TRIGGER update_mastermind_portal_source_evidence_updated_at
BEFORE UPDATE ON public.mastermind_portal_source_evidence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
