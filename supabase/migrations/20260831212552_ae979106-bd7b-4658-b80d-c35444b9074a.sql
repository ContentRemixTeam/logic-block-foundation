DROP FUNCTION IF EXISTS public.replay_vault_saved_member(uuid, text, integer, text);

CREATE FUNCTION public.replay_vault_saved_member(p_user_id uuid, p_filter text DEFAULT 'all'::text, p_limit integer DEFAULT 61, p_cursor text DEFAULT NULL::text, p_preview boolean DEFAULT false)
RETURNS TABLE(bookmark_id uuid, portal_resource_id text, title text, category text, target_kind text, target_id uuid, cue_seconds numeric, saved_at timestamp with time zone, label text, row_cursor text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
 WITH res AS (
   SELECT r.id, r.portal_resource_id, r.title, r.category_title, r.transcript_version_id, r.playback_attempt_id, a.package_sha256
   FROM public.replay_published_resource_projection r
   JOIN public.replay_publication_authority a
     ON a.resource_id = r.id AND a.state = 'PUBLISHED'
    AND a.transcript_version_id = r.transcript_version_id
    AND a.playback_attempt_id = r.playback_attempt_id
   WHERE public.replay_vault_member_can_read(p_user_id, r.portal_resource_id)
   UNION ALL
   SELECT r.id, r.portal_resource_id, r.title, r.category_title, r.transcript_version_id, r.playback_attempt_id, a.package_sha256
   FROM public.replay_admin_preview_resource_projection r
   JOIN public.replay_publication_authority a
     ON a.resource_id = r.id AND a.state = r.authority_state
    AND a.transcript_version_id = r.transcript_version_id
    AND a.playback_attempt_id = r.playback_attempt_id
   WHERE r.authority_state IN ('DRAFT','APPROVED')
     AND public.replay_vault_admin_preview_enabled(p_user_id, p_preview)
 )
 SELECT b.id, r.portal_resource_id, left(r.title,160), left(coalesce(r.category_title,'Replay'),120), b.target_kind, b.target_id,
   CASE WHEN b.target_kind='moment' THEN s.starts_at_ms/1000.0 WHEN b.target_kind='question' THEN q.answer_start_ms/1000.0 ELSE 0 END,
   b.created_at,
   CASE WHEN b.target_kind='question' THEN left(q.member_question,400) WHEN b.target_kind='moment' THEN left(s.transcript_text_private,400) ELSE 'Full replay' END,
   jsonb_build_object('createdAt',b.created_at,'id',b.id)::text
 FROM public.replay_vault_bookmarks b
 JOIN res r ON r.id = b.resource_id AND r.transcript_version_id = b.transcript_version_id
   AND r.playback_attempt_id = b.playback_attempt_id AND r.package_sha256 = b.publication_sha256
 LEFT JOIN public.replay_transcript_segments s ON b.target_kind='moment' AND s.id=b.target_id AND s.transcript_version_id=b.transcript_version_id
 LEFT JOIN public.replay_published_answers_projection q ON b.target_kind='question' AND q.id=b.target_id AND q.resource_id=r.id
 WHERE b.user_id = p_user_id
   AND (p_filter='all' OR (p_filter='videos' AND b.target_kind='replay') OR (p_filter='moments' AND b.target_kind IN('moment','question')))
   AND ((b.target_kind='replay' AND b.target_id=r.id) OR s.id IS NOT NULL OR q.id IS NOT NULL)
   AND (p_cursor IS NULL OR (b.created_at,b.id) < (((p_cursor::jsonb->>'createdAt')::timestamptz),(p_cursor::jsonb->>'id')::uuid))
 ORDER BY b.created_at DESC, b.id DESC
 LIMIT least(greatest(coalesce(p_limit,61),2),101)
$function$;

REVOKE ALL ON FUNCTION public.replay_vault_saved_member(uuid, text, integer, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replay_vault_saved_member(uuid, text, integer, text, boolean) TO service_role;