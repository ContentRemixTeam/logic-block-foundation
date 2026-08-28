-- Replay Vault complete authorized search: transcript moments first, metadata fallback second.
-- Additive function replacement only. No import, publication, grant broadening, or rollout change.

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
    SELECT websearch_to_tsquery('english',trim(p_query)) q,
      least(greatest(coalesce(p_limit,12),1),25) capped_limit
    WHERE length(trim(coalesce(p_query,''))) BETWEEN 2 AND 200
  ), transcript_matches AS (
    SELECT r.portal_resource_id,s.id moment_id,NULL::uuid question_id,r.title,r.product_title,r.category_title,
      r.resource_type,
      left(regexp_replace(ts_headline('english',s.transcript_text_private,i.q,'MaxWords=48, MinWords=12, MaxFragments=1'),'<[^>]+>','','g'),320) snippet,
      (s.starts_at_ms/1000)::integer starts_at_seconds,(s.ends_at_ms/1000)::integer ends_at_seconds,
      'matches transcript'::text reason,(r.duration_ms/1000)::integer duration_seconds,
      ts_rank_cd(s.search_vector,i.q) rank
    FROM public.replay_published_resource_projection r
    JOIN public.replay_transcript_segments s ON s.transcript_version_id=r.transcript_version_id
    CROSS JOIN input i
    WHERE (p_stage IS NULL OR p_stage=ANY(r.stages)) AND i.q @@ s.search_vector
      AND (public.replay_vault_access_decision(p_user_id,p_email,r.portal_resource_id,'search',p_preview,p_as_of)->>'allowed')::boolean
  ), metadata_matches AS (
    SELECT r.portal_resource_id,first_cue.id moment_id,NULL::uuid question_id,r.title,r.product_title,r.category_title,
      r.resource_type,left(r.title,320) snippet,
      (first_cue.starts_at_ms/1000)::integer starts_at_seconds,(first_cue.ends_at_ms/1000)::integer ends_at_seconds,
      'matches title or replay details'::text reason,(r.duration_ms/1000)::integer duration_seconds,
      ts_rank_cd(to_tsvector('english',coalesce(r.title,'')||' '||coalesce(r.product_title,'')||' '||coalesce(r.category_title,'')||' '||coalesce(r.resource_type,'')||' '||array_to_string(r.success_paths,' ')||' '||array_to_string(r.stages,' ')),i.q)*0.5 rank
    FROM public.replay_published_resource_projection r
    CROSS JOIN input i
    JOIN LATERAL (
      SELECT s.id,s.starts_at_ms,s.ends_at_ms
      FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id=r.transcript_version_id
      ORDER BY s.segment_index,s.id LIMIT 1
    ) first_cue ON true
    WHERE p_include_metadata_fallback
      AND (p_stage IS NULL OR p_stage=ANY(r.stages))
      AND i.q @@ to_tsvector('english',coalesce(r.title,'')||' '||coalesce(r.product_title,'')||' '||coalesce(r.category_title,'')||' '||coalesce(r.resource_type,'')||' '||array_to_string(r.success_paths,' ')||' '||array_to_string(r.stages,' '))
      AND NOT EXISTS (
        SELECT 1 FROM public.replay_transcript_segments exact
        WHERE exact.transcript_version_id=r.transcript_version_id AND i.q @@ exact.search_vector
      )
      AND (public.replay_vault_access_decision(p_user_id,p_email,r.portal_resource_id,'search',p_preview,p_as_of)->>'allowed')::boolean
  ), matches AS (
    SELECT * FROM transcript_matches UNION ALL SELECT * FROM metadata_matches
  ), bounded AS (
    SELECT m.*,row_number() OVER (PARTITION BY m.portal_resource_id ORDER BY m.rank DESC,m.starts_at_seconds,m.moment_id) replay_rank
    FROM matches m
  )
  SELECT b.portal_resource_id,b.moment_id,b.question_id,b.title,b.product_title,b.category_title,
    b.resource_type,b.snippet,b.starts_at_seconds,b.ends_at_seconds,b.reason,b.duration_seconds
  FROM bounded b WHERE b.replay_rank <= 3
  ORDER BY b.rank DESC,b.portal_resource_id,b.starts_at_seconds,b.moment_id
  LIMIT (SELECT capped_limit FROM input);
$$;

-- Keep the exclusive content-bound authority and the legacy access facets in
-- one function-only transition. The access authority reads these facets.
CREATE OR REPLACE FUNCTION public.replay_publish_resource(rid uuid,actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.replay_publication_authority%ROWTYPE;published_at_now timestamptz:=clock_timestamp();
BEGIN
  PERFORM public.replay_assert_actor(actor);a:=public.replay_assert_release_evidence(rid);
  IF a.state<>'APPROVED' THEN RAISE EXCEPTION 'expected APPROVED';END IF;
  IF NOT(SELECT publication_enabled FROM public.replay_publication_controls WHERE singleton) THEN RAISE EXCEPTION 'publication feature disabled';END IF;
  UPDATE public.replay_publication_authority SET state='PUBLISHED',published_by=actor,published_at=published_at_now,updated_at=published_at_now WHERE resource_id=rid;
  UPDATE public.mastermind_portal_resources SET publication_state='published',privacy_state='approved',pairing_state='paired',
    transcript_state='active',media_state='approved',published_at=published_at_now,revoked_at=NULL WHERE id=rid;
END $$;

CREATE OR REPLACE FUNCTION public.replay_revoke_resource(rid uuid,actor text,reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE revoked_at_now timestamptz:=clock_timestamp();
BEGIN
  PERFORM public.replay_assert_actor(actor);IF coalesce(btrim(reason),'')='' THEN RAISE EXCEPTION 'reason required';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.replay_publication_authority WHERE resource_id=rid AND state='PUBLISHED' FOR UPDATE) THEN RAISE EXCEPTION 'expected PUBLISHED';END IF;
  UPDATE public.replay_publication_authority SET state='REVOKED',revoked_by=actor,revoked_at=revoked_at_now,revocation_reason=reason,updated_at=revoked_at_now WHERE resource_id=rid;
  UPDATE public.mastermind_portal_resources SET publication_state='revoked',revoked_at=revoked_at_now WHERE id=rid;
END $$;

-- Upgrade repair for authoritative rows created before facet synchronization.
UPDATE public.mastermind_portal_resources r SET publication_state='published',privacy_state='approved',pairing_state='paired',
  transcript_state='active',media_state='approved',published_at=coalesce(r.published_at,a.published_at),revoked_at=NULL
FROM public.replay_publication_authority a WHERE a.resource_id=r.id AND a.state='PUBLISHED';
UPDATE public.mastermind_portal_resources r SET publication_state='revoked',revoked_at=coalesce(r.revoked_at,a.revoked_at)
FROM public.replay_publication_authority a WHERE a.resource_id=r.id AND a.state='REVOKED';

REVOKE ALL ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_replay_vault_resources(uuid,text,text,text,integer,boolean,boolean,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.replay_publish_resource(uuid,text),public.replay_revoke_resource(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replay_publish_resource(uuid,text),public.replay_revoke_resource(uuid,text,text) TO service_role;