\set ON_ERROR_STOP on

-- Two resources are prepared identically. One is later recorded as an unapproved
-- private-source import (blocked_private_source); the other stays a verified
-- approved replay. The blocked one must be invisible everywhere, including the
-- private admin preview, while the approved one remains fully available.

INSERT INTO public.mastermind_portal_resources(
  id, portal_resource_id, product_title, category_title, title, portal_path,
  resource_type, access_scope, member_visible_default, approved_access_scope,
  publication_state, privacy_state, pairing_state, transcript_state, media_state
) VALUES
  ('72000000-0000-4000-8000-000000000001', 'blocked-thirdparty-replay', 'Replay Vault',
   'Membership.io Full Video Catalog', 'Thirdpartyneedle Unapproved Import',
   '/mastermind/replay-vault/blocked-thirdparty-replay', 'video', 'replay_vault', false,
   'replay_vault', 'inventoried', 'unreviewed', 'discovered', 'evidence_only', 'planned'),
  ('72000000-0000-4000-8000-000000000002', 'approved-coaching-replay', 'Replay Vault',
   'Coaching Calls', 'Approvedneedle Coaching Call',
   '/mastermind/replay-vault/approved-coaching-replay', 'video', 'replay_vault', false,
   'replay_vault', 'inventoried', 'unreviewed', 'discovered', 'evidence_only', 'planned');

SELECT public.replay_import_content_package(
  jsonb_build_object(
    'resource_id', '72000000-0000-4000-8000-000000000001',
    'source', jsonb_build_object(
      'system', 'membershipio', 'native_id', 'blocked-thirdparty-transcript', 'version', 'v1',
      'title', 'Thirdpartyneedle Unapproved Import', 'event_date', '2026-08-31',
      'privacy_flag', 'clear', 'metadata', jsonb_build_object('fixture', true)
    ),
    'transcript', jsonb_build_object('segments', jsonb_build_array(
      jsonb_build_object('index', 0, 'start_ms', 0, 'end_ms', 1200,
        'text', 'Thirdpartyneedle belongs to an unrelated third party course.')
    )),
    'media', jsonb_build_object(
      'native_id', 'blocked-thirdparty-media', 'version', 'v1', 'duration_ms', 1200,
      'size_bytes', 4096, 'dropbox_file_id', 'id:blocked-thirdparty-fixture',
      'dropbox_content_hash', repeat('1', 64), 'byte_sha256', repeat('2', 64),
      'decode_report_sha256', repeat('3', 64), 'range_report_sha256', repeat('4', 64),
      'seek_report_sha256', repeat('5', 64), 'mime_type', 'video/mp4', 'container', 'mp4',
      'codecs', jsonb_build_object('video', 'h264', 'audio', 'aac')
    )
  ), 'blocked-private-fixture'
);

SELECT public.replay_import_content_package(
  jsonb_build_object(
    'resource_id', '72000000-0000-4000-8000-000000000002',
    'source', jsonb_build_object(
      'system', 'crdb_master', 'native_id', 'approved-coaching-transcript', 'version', 'v1',
      'title', 'Approvedneedle Coaching Call', 'event_date', '2026-08-31',
      'privacy_flag', 'clear', 'metadata', jsonb_build_object('fixture', true)
    ),
    'transcript', jsonb_build_object('segments', jsonb_build_array(
      jsonb_build_object('index', 0, 'start_ms', 0, 'end_ms', 1200,
        'text', 'Approvedneedle is a verified approved coaching replay.')
    )),
    'media', jsonb_build_object(
      'native_id', 'approved-coaching-media', 'version', 'v1', 'duration_ms', 1200,
      'size_bytes', 4096, 'dropbox_file_id', 'id:approved-coaching-fixture',
      'dropbox_content_hash', repeat('6', 64), 'byte_sha256', repeat('7', 64),
      'decode_report_sha256', repeat('8', 64), 'range_report_sha256', repeat('9', 64),
      'seek_report_sha256', repeat('a', 64), 'mime_type', 'video/mp4', 'container', 'mp4',
      'codecs', jsonb_build_object('video', 'h264', 'audio', 'aac')
    )
  ), 'approved-coaching-fixture'
);

-- Only the coaching replay earns editorial approval.
SELECT public.replay_mark_resource_ready(
  '72000000-0000-4000-8000-000000000002', 'blocked-fixture-reviewer-a', 'approved-coaching-v1'
);
SELECT public.replay_approve_resource(
  '72000000-0000-4000-8000-000000000002', 'blocked-fixture-reviewer-b', 'approved-coaching-v1'
);

-- The unapproved private-source import is recorded in the private safety registry.
INSERT INTO public.replay_vault_blocked_private_sources(resource_id, portal_resource_id, provenance)
VALUES ('72000000-0000-4000-8000-000000000001', 'blocked-thirdparty-replay',
        'membershipio_private_inventory_unapproved')
ON CONFLICT (resource_id) DO NOTHING;

DO $$
DECLARE
  admin_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  member_id uuid := '99999999-9999-4999-8999-999999999999';
  n integer;
BEGIN
  -- Source rows and audit evidence remain preserved privately.
  IF NOT EXISTS (SELECT 1 FROM public.mastermind_portal_resources
                 WHERE portal_resource_id = 'blocked-thirdparty-replay')
    OR NOT EXISTS (SELECT 1 FROM public.replay_publication_authority
                   WHERE resource_id = '72000000-0000-4000-8000-000000000001')
  THEN RAISE EXCEPTION 'blocked private source rows were not preserved'; END IF;

  -- Invisible in every projection, including admin preview.
  SELECT count(*) INTO n FROM public.replay_admin_preview_resource_projection
  WHERE portal_resource_id = 'blocked-thirdparty-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin preview projection: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_authorized_resource_projection
  WHERE portal_resource_id = 'blocked-thirdparty-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into authorized projection: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_published_resource_projection
  WHERE portal_resource_id = 'blocked-thirdparty-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into published projection: %', n; END IF;

  -- Browse and categories.
  SELECT count(*) INTO n FROM public.replay_vault_browse_authorized(admin_id, NULL, 50, NULL, true)
  WHERE portal_resource_id = 'blocked-thirdparty-replay';
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin browse: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_categories_authorized(admin_id, 50, NULL, true)
  WHERE category = 'Membership.io Full Video Catalog';
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin categories: %', n; END IF;

  -- Search and transcript snippets.
  SELECT count(*) INTO n FROM public.search_replay_vault_resources(
    admin_id, 'admin@example.com', 'thirdpartyneedle', NULL, 12, true, true, '2026-08-31'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin search: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_transcript_authorized(
    admin_id, 'blocked-thirdparty-replay', -1, 101, true
  );
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin transcript: %', n; END IF;

  -- Playback resolution.
  SELECT count(*) INTO n FROM public.resolve_replay_vault_playback(
    admin_id, 'admin@example.com', 'blocked-thirdparty-replay', NULL, NULL, true, '2026-08-31'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into admin playback: %', n; END IF;

  SELECT count(*) INTO n FROM public.resolve_replay_vault_playback(
    member_id, 'buyer@example.com', 'blocked-thirdparty-replay', NULL, NULL, true, '2026-08-31'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'blocked private source leaked into member playback: %', n; END IF;

  -- The verified approved replay stays available in preview.
  SELECT count(*) INTO n FROM public.replay_authorized_resource_projection
  WHERE portal_resource_id = 'approved-coaching-replay' AND authority_state = 'APPROVED';
  IF n <> 1 THEN RAISE EXCEPTION 'approved coaching replay missing from authorized projection: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_browse_authorized(admin_id, NULL, 50, NULL, true)
  WHERE portal_resource_id = 'approved-coaching-replay';
  IF n <> 1 THEN RAISE EXCEPTION 'approved coaching replay missing from admin browse: %', n; END IF;

  SELECT count(*) INTO n FROM public.search_replay_vault_resources(
    admin_id, 'admin@example.com', 'approvedneedle', NULL, 12, true, true, '2026-08-31'
  );
  IF n <> 1 THEN RAISE EXCEPTION 'approved coaching replay missing from admin search: %', n; END IF;

  SELECT count(*) INTO n FROM public.replay_vault_transcript_authorized(
    admin_id, 'approved-coaching-replay', -1, 101, true
  );
  IF n <> 1 THEN RAISE EXCEPTION 'approved coaching replay transcript missing: %', n; END IF;

  SELECT count(*) INTO n FROM public.resolve_replay_vault_playback(
    admin_id, 'admin@example.com', 'approved-coaching-replay', NULL, NULL, true, '2026-08-31'
  );
  IF n <> 1 THEN RAISE EXCEPTION 'approved coaching replay playback missing: %', n; END IF;
END $$;

SELECT 'PASS replay_vault_blocked_private_source_safety';
