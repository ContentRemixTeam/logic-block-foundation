-- Keep curriculum playback compatible with Dropbox file IDs stored either with
-- or without the Dropbox `id:` prefix.

CREATE OR REPLACE FUNCTION public.resolve_mastermind_media_playback(
  p_user_id uuid,
  p_email text,
  p_resource_id text,
  p_surface text DEFAULT 'vault',
  p_question_id uuid DEFAULT NULL,
  p_moment_id uuid DEFAULT NULL,
  p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS TABLE(
  resource_uuid uuid,
  portal_resource_id text,
  title text,
  dropbox_locator text,
  access_scope text,
  authoritative_start_seconds integer,
  authoritative_end_seconds integer,
  moment_id uuid,
  question_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_resource_id uuid;
  v_transcript_version_id uuid;
  v_title text;
  v_locator text;
  v_scope text;
  v_duration integer;
  v_start integer;
  v_end integer;
  v_surface text := lower(trim(coalesce(nullif(p_surface, ''), 'vault')));
BEGIN
  IF p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'
     OR v_surface NOT IN ('curriculum', 'recent_replay', 'vault')
     OR (p_question_id IS NOT NULL AND p_moment_id IS NOT NULL) THEN
    RETURN;
  END IF;

  SELECT r.id, r.transcript_version_id, r.title,
    CASE
      WHEN trim(r.dropbox_file_id) LIKE 'id:%' THEN trim(r.dropbox_file_id)
      ELSE 'id:' || trim(r.dropbox_file_id)
    END,
    r.approved_access_scope, (r.duration_ms / 1000)::integer
  INTO v_resource_id, v_transcript_version_id, v_title, v_locator, v_scope, v_duration
  FROM public.replay_authorized_resource_projection r
  WHERE r.portal_resource_id = p_resource_id
    AND nullif(trim(r.dropbox_file_id), '') IS NOT NULL
    AND (
      r.authority_state = 'PUBLISHED'
      OR (r.authority_state = 'APPROVED' AND p_preview AND public.is_admin(p_user_id))
    )
    AND (public.mastermind_media_access_decision(
      p_user_id, p_email, r.portal_resource_id, 'playback', v_surface, p_preview, p_as_of
    )->>'allowed')::boolean;

  IF v_resource_id IS NULL OR v_duration <= 0 THEN
    RETURN;
  END IF;

  IF p_moment_id IS NOT NULL THEN
    SELECT starts_at_ms / 1000, ends_at_ms / 1000
      INTO v_start, v_end
      FROM public.replay_transcript_segments
     WHERE id = p_moment_id
       AND transcript_version_id = v_transcript_version_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSIF p_question_id IS NOT NULL THEN
    SELECT answer_start_ms / 1000, answer_end_ms / 1000
      INTO v_start, v_end
      FROM public.replay_published_answers_projection
     WHERE id = p_question_id
       AND resource_id = v_resource_id;
    IF NOT FOUND THEN RETURN; END IF;
  ELSE
    v_start := 0;
    v_end := v_duration;
  END IF;

  RETURN QUERY SELECT v_resource_id, p_resource_id, v_title, v_locator, v_scope,
    v_start, v_end, p_moment_id, p_question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
TO service_role;

COMMENT ON FUNCTION public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamptz)
  IS 'Shared Dropbox-backed protected media resolver with normalized Dropbox ID handling for curriculum, current replays, and Vault playback.';
