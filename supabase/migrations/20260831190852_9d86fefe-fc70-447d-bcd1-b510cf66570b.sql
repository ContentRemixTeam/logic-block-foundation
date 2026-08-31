-- 1) Neutralize the blanket registry backfill (keep the table for future auditable per-row decisions)
DELETE FROM public.replay_vault_blocked_private_sources;

-- 2) Restore the three projections to their exact pre-20260831184743 definitions
CREATE OR REPLACE VIEW public.replay_published_resource_projection WITH(security_invoker=false) AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title, r.category_title, r.portal_path,
  r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
  a.transcript_version_id, a.transcript_content_sha256 AS transcript_sha256, a.playback_attempt_id,
  m.dropbox_file_id, m.dropbox_content_hash, m.size_bytes, m.duration_ms,
  public.replay_vault_exclusive_end(r.available_until) AS availability_expires_at
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id = a.resource_id
JOIN public.replay_transcript_versions v ON v.id = a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id = a.playback_attempt_id
WHERE a.state = 'PUBLISHED' AND a.published_at IS NOT NULL AND a.revoked_at IS NULL
  AND v.resource_id = a.resource_id AND v.is_active
  AND v.normalized_sha256 = a.transcript_content_sha256
  AND m.source_asset_id = a.media_source_asset_id
  AND m.verification_evidence_sha256 = a.media_evidence_sha256;

CREATE OR REPLACE VIEW public.replay_authorized_resource_projection WITH(security_invoker=false) AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title, r.category_title, r.portal_path,
  r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
  a.state AS authority_state, a.approved_at, a.published_at AS authority_published_at,
  a.transcript_version_id, a.transcript_content_sha256 AS transcript_sha256, a.playback_attempt_id,
  m.dropbox_file_id, m.dropbox_content_hash, m.size_bytes, m.duration_ms
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id = a.resource_id
JOIN public.replay_transcript_versions v ON v.id = a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id = a.playback_attempt_id
WHERE a.revoked_at IS NULL AND v.resource_id = a.resource_id AND v.is_active
  AND v.normalized_sha256 = a.transcript_content_sha256
  AND m.source_asset_id = a.media_source_asset_id
  AND m.verification_evidence_sha256 = a.media_evidence_sha256
  AND (
    (a.state = 'PUBLISHED' AND a.published_at IS NOT NULL AND r.publication_state = 'published' AND r.published_at IS NOT NULL)
    OR (a.state = 'APPROVED' AND a.approved_at IS NOT NULL AND r.publication_state = 'publishable'
        AND r.privacy_state = 'approved' AND r.pairing_state = 'paired' AND r.transcript_state = 'active'
        AND r.media_state = 'approved' AND r.published_at IS NULL AND r.member_visible_default = false)
  )
  AND (r.approved_access_scope IS NULL OR r.approved_access_scope <> 'current_replay_30_day' OR r.available_until >= CURRENT_DATE);

CREATE OR REPLACE VIEW public.replay_admin_preview_resource_projection AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title,
  CASE WHEN coalesce(r.category_title,'') LIKE '{%'
       THEN coalesce((regexp_match(r.category_title, '"text"\s*:\s*"([^"]+)"'))[1], 'Replay')
       ELSE r.category_title END AS category_title,
  r.portal_path, r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
  a.state AS authority_state,
  coalesce(a.approved_at, a.ready_at, a.created_at) AS approved_at,
  a.published_at AS authority_published_at,
  a.transcript_version_id, a.transcript_content_sha256 AS transcript_sha256,
  a.playback_attempt_id, m.dropbox_file_id, m.dropbox_content_hash, m.size_bytes, m.duration_ms
FROM public.replay_publication_authority a
JOIN public.mastermind_portal_resources r ON r.id = a.resource_id
JOIN public.replay_transcript_versions v ON v.id = a.transcript_version_id
JOIN public.replay_media_migration_attempts m ON m.id = a.playback_attempt_id
WHERE a.revoked_at IS NULL AND r.revoked_at IS NULL
  AND r.publication_state NOT IN ('revoked','archived')
  AND v.resource_id = a.resource_id AND v.is_active
  AND v.normalized_sha256 = a.transcript_content_sha256
  AND m.source_asset_id = a.media_source_asset_id
  AND m.verification_evidence_sha256 = a.media_evidence_sha256
  AND a.state IN ('DRAFT','APPROVED','PUBLISHED');

REVOKE ALL ON public.replay_published_resource_projection FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.replay_authorized_resource_projection FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.replay_admin_preview_resource_projection FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.replay_published_resource_projection TO service_role;
GRANT SELECT ON public.replay_authorized_resource_projection TO service_role;
GRANT SELECT ON public.replay_admin_preview_resource_projection TO service_role;

COMMENT ON TABLE public.replay_vault_blocked_private_sources IS
  'Audit-only registry. Emptied 2026-08-31: DRAFT/unapproved state is NOT evidence of third-party provenance. Rows may only be added from a trustworthy per-row editorial review decision.';