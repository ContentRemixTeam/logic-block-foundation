\set ON_ERROR_STOP on

DO $$
BEGIN
  IF has_function_privilege('anon','public.replay_import_launch_batch(jsonb,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.replay_import_launch_batch(jsonb,text)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.replay_import_launch_batch(jsonb,text)','EXECUTE')
     OR has_table_privilege('anon','public.replay_launch_batch_receipts','SELECT')
     OR has_table_privilege('authenticated','public.replay_launch_batch_exclusions','SELECT') THEN
    RAISE EXCEPTION 'launch batch ACL failure';
  END IF;
END$$;

INSERT INTO public.replay_launch_batch_exclusions(portal_resource_id,reason,created_by)
VALUES('membershipio:excluded','Faith exclusion','fixture');

SET ROLE service_role;
DO $$
DECLARE
  package jsonb;
  payload jsonb;
  result jsonb;
  manifest_hash text;
BEGIN
  package := jsonb_build_object(
    'metadata', jsonb_build_object('portal_resource_id','membershipio:test1'),
    'package', jsonb_build_object(
      'source', jsonb_build_object(
        'system','membershipio_vault_migration','native_id','test1','version','v1',
        'privacy_flag','clear','title','Private test replay','event_date','2026-08-30',
        'metadata',jsonb_build_object('category','Coaching Call')),
      'transcript',jsonb_build_object('segments',jsonb_build_array(
        jsonb_build_object('index',0,'start_ms',0,'end_ms',60000,'text','Safe transcript text'))),
      'media',jsonb_build_object(
        'native_id','test1:video','version','v1','byte_sha256',repeat('1',64),
        'dropbox_file_id','id:private','dropbox_content_hash',repeat('2',64),
        'size_bytes',1000,'duration_ms',60000,'mime_type','video/mp4','container','mp4',
        'decode_report_sha256',repeat('3',64),'range_report_sha256',repeat('4',64),
        'seek_report_sha256',repeat('5',64))));
  manifest_hash := '9c23b8cf5e99e52783d67f7f9a73887974960e7bedfaee0aaa717902cda1c3c0';
  payload := jsonb_build_object(
    'batch_key','vault-launch-2026-08-30-0001','batch_sha256',manifest_hash,
    'records',jsonb_build_array(package));

  result := public.replay_import_launch_batch(payload,'fixture-importer');
  IF result->>'state' <> 'accepted' OR (result->>'imported')::int <> 1 THEN
    RAISE EXCEPTION 'first import receipt mismatch %', result;
  END IF;
  result := public.replay_import_launch_batch(payload,'fixture-importer');
  IF result->>'state' <> 'already_accepted' OR (result->>'record_count')::int <> 1 THEN
    RAISE EXCEPTION 'idempotent replay mismatch %', result;
  END IF;

  BEGIN
    PERFORM public.replay_import_launch_batch(
      jsonb_set(payload,'{batch_sha256}',to_jsonb(repeat('f',64)),true),'fixture-importer');
    RAISE EXCEPTION 'different hash was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'different hash was accepted' THEN RAISE; END IF;
  END;

  package := jsonb_set(package,'{metadata,portal_resource_id}',to_jsonb('membershipio:excluded'::text),true);
  manifest_hash := 'ceb1673be7aa39e6dfa8b4af205411cd5dbde5981fd2abb18f0c5d9e53c536bc';
  BEGIN
    PERFORM public.replay_import_launch_batch(
      jsonb_build_object('batch_key','vault-launch-2026-08-30-0002',
        'batch_sha256',manifest_hash,'records',jsonb_build_array(package)),
      'fixture-importer');
    RAISE EXCEPTION 'excluded resource was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'excluded resource was accepted' THEN RAISE; END IF;
  END;
END$$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.replay_launch_batch_receipts) <> 1
     OR (SELECT count(*) FROM public.replay_publication_authority WHERE state='DRAFT') <> 1
     OR (SELECT count(*) FROM public.replay_transcript_segments) <> 1
     OR EXISTS (SELECT 1 FROM public.replay_published_resource_projection)
     OR EXISTS (SELECT 1 FROM public.mastermind_portal_resources WHERE member_visible_default)
     OR EXISTS (SELECT 1 FROM public.replay_vault_launch_config WHERE launch_state <> 'disabled')
     OR EXISTS (SELECT 1 FROM public.replay_publication_controls WHERE publication_enabled) THEN
    RAISE EXCEPTION 'post-import hidden-state mismatch';
  END IF;
END$$;

SELECT 'PASS replay_vault_launch_batch_private_idempotent' result;
