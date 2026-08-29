\set ON_ERROR_STOP on

INSERT INTO public.mastermind_portal_resources(
  id, portal_resource_id, product_title, category_title, title, portal_path,
  resource_type, access_scope, member_visible_default, approved_access_scope,
  publication_state, privacy_state, pairing_state, transcript_state, media_state
) VALUES(
  '71000000-0000-4000-8000-000000000001', 'hidden-approved-replay', 'Replay Vault',
  'Preview QA', 'Hiddenneedle Admin Preview', '/mastermind/replay-vault/hidden-approved-replay',
  'video', 'replay_vault', false, 'replay_vault', 'inventoried', 'unreviewed',
  'discovered', 'evidence_only', 'planned'
);

SELECT public.replay_import_content_package(
  jsonb_build_object(
    'resource_id', '71000000-0000-4000-8000-000000000001',
    'source', jsonb_build_object(
      'system', 'crdb_master', 'native_id', 'hidden-preview-transcript', 'version', 'v1',
      'title', 'Hiddenneedle Admin Preview', 'event_date', '2026-08-29',
      'privacy_flag', 'clear', 'metadata', jsonb_build_object('fixture', true)
    ),
    'transcript', jsonb_build_object('segments', jsonb_build_array(
      jsonb_build_object('index', 0, 'start_ms', 0, 'end_ms', 1200,
        'text', 'Hiddenneedle is visible only to a verified admin preview.')
    )),
    'media', jsonb_build_object(
      'native_id', 'hidden-preview-media', 'version', 'v1', 'duration_ms', 1200,
      'size_bytes', 4096, 'dropbox_file_id', 'id:hidden-preview-fixture',
      'dropbox_content_hash', repeat('6', 64), 'byte_sha256', repeat('7', 64),
      'decode_report_sha256', repeat('8', 64), 'range_report_sha256', repeat('9', 64),
      'seek_report_sha256', repeat('a', 64), 'mime_type', 'video/mp4', 'container', 'mp4',
      'codecs', jsonb_build_object('video', 'h264', 'audio', 'aac')
    )
  ), 'hidden-preview-fixture'
);

SELECT public.replay_mark_resource_ready(
  '71000000-0000-4000-8000-000000000001', 'hidden-preview-reviewer-a', 'hidden-preview-v1'
);
SELECT public.replay_approve_resource(
  '71000000-0000-4000-8000-000000000001', 'hidden-preview-reviewer-b', 'hidden-preview-v1'
);
UPDATE public.replay_vault_launch_config SET launch_state = 'disabled' WHERE singleton;
UPDATE public.replay_publication_controls SET publication_enabled = false WHERE singleton;

DO $$
DECLARE
  admin_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  member_id uuid := '99999999-9999-4999-8999-999999999999';
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.replay_published_resource_projection
  WHERE portal_resource_id = 'hidden-approved-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'hidden preview leaked into published projection: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_authorized_resource_projection
  WHERE portal_resource_id = 'hidden-approved-replay' AND authority_state = 'APPROVED';
  IF n <> 1 THEN RAISE EXCEPTION 'approved preview projection missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.search_replay_vault_resources(
    admin_id, 'admin@example.com', 'hiddenneedle', NULL, 12, true, true, '2026-08-29'
  );
  IF n <> 1 THEN RAISE EXCEPTION 'admin hidden search missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.search_replay_vault_resources(
    member_id, 'buyer@example.com', 'hiddenneedle', NULL, 12, true, true, '2026-08-29'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin hidden search leak: %', n; END IF;

  SELECT count(*) INTO n FROM public.resolve_replay_vault_playback(
    admin_id, 'admin@example.com', 'hidden-approved-replay', NULL, NULL, true, '2026-08-29'
  );
  IF n <> 1 THEN RAISE EXCEPTION 'admin hidden playback missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.resolve_replay_vault_playback(
    member_id, 'buyer@example.com', 'hidden-approved-replay', NULL, NULL, true, '2026-08-29'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin hidden playback leak: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_browse_authorized(admin_id, NULL, 21, NULL, true)
  WHERE portal_resource_id = 'hidden-approved-replay';
  IF n <> 1 THEN RAISE EXCEPTION 'admin hidden browse missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_browse_authorized(member_id, NULL, 21, NULL, true)
  WHERE portal_resource_id = 'hidden-approved-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin hidden browse leak: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_transcript_authorized(
    admin_id, 'hidden-approved-replay', -1, 101, true
  );
  IF n <> 1 THEN RAISE EXCEPTION 'admin hidden transcript missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_transcript_authorized(
    member_id, 'hidden-approved-replay', -1, 101, true
  );
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin hidden transcript leak: %', n; END IF;

  IF (SELECT launch_state FROM public.replay_vault_launch_config WHERE singleton) <> 'disabled'
    OR (SELECT publication_enabled FROM public.replay_publication_controls WHERE singleton)
    OR EXISTS (SELECT 1 FROM public.replay_published_resource_projection WHERE portal_resource_id = 'hidden-approved-replay')
  THEN RAISE EXCEPTION 'hidden preview changed launch/publication state'; END IF;
END $$;

SELECT 'PASS replay_vault_admin_hidden_preview_catalog';
