\set ON_ERROR_STOP on

INSERT INTO public.mastermind_portal_resources(
  id,portal_resource_id,product_title,category_title,title,portal_path,resource_type,access_scope,
  member_visible_default,search_summary,approved_access_scope,publication_state,privacy_state,pairing_state,transcript_state,media_state
) VALUES(
  '70000000-0000-4000-8000-000000000001','metadata-only-replay','Replay Vault','Email Marketing',
  'Metadataneedle Email Workshop','/mastermind/replay-vault/metadata-only-replay','video','replay_vault',
  false,'A unique title-only search fixture','replay_vault','inventoried','unreviewed','discovered','evidence_only','planned'
);

SELECT public.replay_import_content_package(
  jsonb_build_object(
    'resource_id','70000000-0000-4000-8000-000000000001',
    'source',jsonb_build_object('system','crdb_master','native_id','fixture-transcript','version','v1','title','Fixture Replay','event_date','2026-08-01','privacy_flag','clear','metadata',jsonb_build_object('fixture',true)),
    'transcript',jsonb_build_object('segments',jsonb_build_array(
      jsonb_build_object('index',0,'start_ms',0,'end_ms',900,'text','Welcome to the workshop.'),
      jsonb_build_object('index',1,'start_ms',900,'end_ms',1900,'text','This transcript intentionally omits the unique title term.')
    )),
    'media',jsonb_build_object(
      'native_id','fixture-media','version','v1','duration_ms',2000,'size_bytes',4096,
      'dropbox_file_id','id:fixture','dropbox_content_hash',repeat('1',64),'byte_sha256',repeat('2',64),
      'decode_report_sha256',repeat('3',64),'range_report_sha256',repeat('4',64),'seek_report_sha256',repeat('5',64),
      'mime_type','video/mp4','container','mp4','codecs',jsonb_build_object('video','h264','audio','aac')
    )
  ),'fixture-importer'
);
SELECT public.replay_mark_resource_ready('70000000-0000-4000-8000-000000000001','fixture-reviewer-a','search-fixture-v1');
SELECT public.replay_approve_resource('70000000-0000-4000-8000-000000000001','fixture-reviewer-b','search-fixture-v1');
UPDATE public.replay_publication_controls SET publication_enabled=true,changed_by='fixture',changed_at=clock_timestamp() WHERE singleton;
UPDATE public.replay_vault_launch_config SET launch_state='launched',updated_at=clock_timestamp() WHERE singleton;
INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES('buyer@example.com','mastermind','active','2025-01-01','2028-09-01') ON CONFLICT DO NOTHING;
SELECT public.replay_publish_resource('70000000-0000-4000-8000-000000000001','fixture-publisher');

DO $$
DECLARE disabled_count integer; enabled_count integer; target uuid; first_cue uuid;
BEGIN
  SELECT count(*) INTO disabled_count FROM public.search_replay_vault_resources(
    '99999999-9999-4999-8999-999999999999','buyer@example.com','metadataneedle',NULL,12,false,false,'2027-09-01');
  IF disabled_count<>0 THEN RAISE EXCEPTION 'metadata fallback ignored disabled state: %',disabled_count;END IF;
  SELECT count(*) INTO enabled_count FROM public.search_replay_vault_resources(
    '99999999-9999-4999-8999-999999999999','buyer@example.com','metadataneedle',NULL,12,true,false,'2027-09-01');
  SELECT moment_id INTO target FROM public.search_replay_vault_resources(
    '99999999-9999-4999-8999-999999999999','buyer@example.com','metadataneedle',NULL,12,true,false,'2027-09-01') LIMIT 1;
  SELECT id INTO first_cue FROM public.replay_transcript_segments
    WHERE transcript_version_id=(SELECT transcript_version_id FROM public.replay_publication_authority WHERE resource_id='70000000-0000-4000-8000-000000000001')
    ORDER BY segment_index LIMIT 1;
  IF enabled_count<>1 OR target<>first_cue THEN RAISE EXCEPTION 'metadata fallback did not bind first authorized cue: count %, target %, expected %',enabled_count,target,first_cue;END IF;
END$$;
SELECT 'PASS replay_vault_complete_metadata_search';
