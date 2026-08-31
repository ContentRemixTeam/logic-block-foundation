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
    AND NOT EXISTS (SELECT 1 FROM public.replay_vault_blocked_private_sources b WHERE b.resource_id = r.id)
    AND r.ingestion_status <> ALL (ARRAY['blocked_private_source'::text, 'do_not_index'::text])
    AND NOT (r.editorial_approved_at IS NULL AND r.publication_state = 'inventoried'::text));

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
    AND NOT EXISTS (SELECT 1 FROM public.replay_vault_blocked_private_sources b WHERE b.resource_id = r.id)
    AND r.ingestion_status <> ALL (ARRAY['blocked_private_source'::text, 'do_not_index'::text])
    AND NOT (r.editorial_approved_at IS NULL AND r.publication_state = 'inventoried'::text));

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
    AND NOT EXISTS (SELECT 1 FROM public.replay_vault_blocked_private_sources b WHERE b.resource_id = r.id)
    AND r.ingestion_status <> ALL (ARRAY['blocked_private_source'::text, 'do_not_index'::text])
    AND NOT (r.editorial_approved_at IS NULL AND r.publication_state = 'inventoried'::text));
