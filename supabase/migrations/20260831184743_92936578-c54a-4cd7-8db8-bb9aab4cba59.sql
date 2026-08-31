-- Fail-closed exclusion of unapproved private-source Replay Vault resources.
-- Nothing is deleted: source, import, and audit rows are preserved privately.

CREATE TABLE IF NOT EXISTS public.replay_vault_blocked_private_sources (
  resource_id uuid PRIMARY KEY REFERENCES public.mastermind_portal_resources(id) ON DELETE CASCADE,
  portal_resource_id text NOT NULL,
  provenance text NOT NULL,
  reason text NOT NULL DEFAULT 'blocked_private_source',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.replay_vault_blocked_private_sources TO service_role;
ALTER TABLE public.replay_vault_blocked_private_sources ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies and no anon/authenticated grants: this is a private
-- server-side safety registry read only through SECURITY DEFINER projections.

INSERT INTO public.replay_vault_blocked_private_sources(resource_id, portal_resource_id, provenance)
SELECT r.id, r.portal_resource_id, 'membershipio_private_inventory_unapproved'
FROM public.mastermind_portal_resources r
JOIN public.replay_publication_authority a ON a.resource_id = r.id
WHERE a.state = 'DRAFT'
  AND a.approved_at IS NULL
  AND r.editorial_approved_at IS NULL
ON CONFLICT (resource_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.replay_vault_source_blocked(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.replay_vault_blocked_private_sources b
    WHERE b.resource_id = p_resource_id
  ) OR EXISTS (
    SELECT 1 FROM public.mastermind_portal_resources r
    WHERE r.id = p_resource_id
      AND (
        r.ingestion_status IN ('blocked_private_source', 'do_not_index')
        OR (r.editorial_approved_at IS NULL AND r.publication_state = 'inventoried')
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.replay_vault_source_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replay_vault_source_blocked(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.replay_vault_source_blocked(uuid) TO authenticated;

-- Member/published projection: fail closed on blocked private sources.
CREATE OR REPLACE VIEW public.replay_published_resource_projection AS
 SELECT r.id,
    r.portal_resource_id,
    r.title,
    r.product_title,
    r.category_title,
    r.portal_path,
    r.resource_type,
    r.approved_access_scope,
    r.stages,
    r.success_paths,
    a.transcript_version_id,
    a.transcript_content_sha256 AS transcript_sha256,
    a.playback_attempt_id,
    m.dropbox_file_id,
    m.dropbox_content_hash,
    m.size_bytes,
    m.duration_ms,
    public.replay_vault_exclusive_end(r.available_until) AS availability_expires_at
   FROM (((public.replay_publication_authority a
     JOIN public.mastermind_portal_resources r ON ((r.id = a.resource_id)))
     JOIN public.replay_transcript_versions v ON ((v.id = a.transcript_version_id)))
     JOIN public.replay_media_migration_attempts m ON ((m.id = a.playback_attempt_id)))
  WHERE ((a.state = 'PUBLISHED'::text) AND (a.published_at IS NOT NULL) AND (a.revoked_at IS NULL)
    AND (v.resource_id = a.resource_id) AND v.is_active AND (v.normalized_sha256 = a.transcript_content_sha256)
    AND (m.source_asset_id = a.media_source_asset_id) AND (m.verification_evidence_sha256 = a.media_evidence_sha256)
    AND NOT public.replay_vault_source_blocked(r.id));

CREATE OR REPLACE VIEW public.replay_authorized_resource_projection AS
 SELECT r.id,
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
   FROM (((public.replay_publication_authority a
     JOIN public.mastermind_portal_resources r ON ((r.id = a.resource_id)))
     JOIN public.replay_transcript_versions v ON ((v.id = a.transcript_version_id)))
     JOIN public.replay_media_migration_attempts m ON ((m.id = a.playback_attempt_id)))
  WHERE ((a.revoked_at IS NULL) AND (v.resource_id = a.resource_id) AND v.is_active
    AND (v.normalized_sha256 = a.transcript_content_sha256)
    AND (m.source_asset_id = a.media_source_asset_id)
    AND (m.verification_evidence_sha256 = a.media_evidence_sha256)
    AND (((a.state = 'PUBLISHED'::text) AND (a.published_at IS NOT NULL) AND (r.publication_state = 'published'::text) AND (r.published_at IS NOT NULL))
      OR ((a.state = 'APPROVED'::text) AND (a.approved_at IS NOT NULL) AND (r.publication_state = 'publishable'::text)
        AND (r.privacy_state = 'approved'::text) AND (r.pairing_state = 'paired'::text)
        AND (r.transcript_state = 'active'::text) AND (r.media_state = 'approved'::text)
        AND (r.published_at IS NULL) AND (r.member_visible_default = false)))
    AND ((r.approved_access_scope IS NULL) OR (r.approved_access_scope <> 'current_replay_30_day'::text) OR (r.available_until >= CURRENT_DATE))
    AND NOT public.replay_vault_source_blocked(r.id));

CREATE OR REPLACE VIEW public.replay_admin_preview_resource_projection AS
 SELECT r.id,
    r.portal_resource_id,
    r.title,
    r.product_title,
        CASE
            WHEN (COALESCE(r.category_title, ''::text) ~~ '{%'::text) THEN COALESCE((regexp_match(r.category_title, '"text"\s*:\s*"([^"]+)"'::text))[1], 'Replay'::text)
            ELSE r.category_title
        END AS category_title,
    r.portal_path,
    r.resource_type,
    r.approved_access_scope,
    r.stages,
    r.success_paths,
    a.state AS authority_state,
    COALESCE(a.approved_at, a.ready_at, a.created_at) AS approved_at,
    a.published_at AS authority_published_at,
    a.transcript_version_id,
    a.transcript_content_sha256 AS transcript_sha256,
    a.playback_attempt_id,
    m.dropbox_file_id,
    m.dropbox_content_hash,
    m.size_bytes,
    m.duration_ms
   FROM (((public.replay_publication_authority a
     JOIN public.mastermind_portal_resources r ON ((r.id = a.resource_id)))
     JOIN public.replay_transcript_versions v ON ((v.id = a.transcript_version_id)))
     JOIN public.replay_media_migration_attempts m ON ((m.id = a.playback_attempt_id)))
  WHERE ((a.revoked_at IS NULL) AND (r.revoked_at IS NULL)
    AND (r.publication_state <> ALL (ARRAY['revoked'::text, 'archived'::text]))
    AND (v.resource_id = a.resource_id) AND v.is_active AND (v.normalized_sha256 = a.transcript_content_sha256)
    AND (m.source_asset_id = a.media_source_asset_id) AND (m.verification_evidence_sha256 = a.media_evidence_sha256)
    AND (a.state = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'PUBLISHED'::text]))
    AND NOT public.replay_vault_source_blocked(r.id));
