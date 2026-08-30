CREATE TABLE IF NOT EXISTS public.replay_launch_batch_exclusions (
  portal_resource_id text PRIMARY KEY,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);
ALTER TABLE public.replay_launch_batch_exclusions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.replay_launch_batch_exclusions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.replay_launch_batch_exclusions TO service_role;

CREATE TABLE IF NOT EXISTS public.replay_launch_batch_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key text NOT NULL UNIQUE,
  batch_sha256 text NOT NULL CHECK (batch_sha256 ~ '^[0-9a-f]{64}$'),
  record_count integer NOT NULL CHECK (record_count >= 0),
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  cue_count bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','failed')),
  actor text NOT NULL,
  receipt jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.replay_launch_batch_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.replay_launch_batch_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.replay_launch_batch_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.replay_import_launch_batch(j jsonb, actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  bkey text; bsha text; rec jsonb; pid text; rid uuid; runid uuid;
  computed text; ident text := ''; imported int := 0; skipped int := 0;
  cues bigint := 0; total int; items jsonb; results jsonb := '[]'::jsonb; n int;
BEGIN
  PERFORM public.replay_assert_actor(actor);
  bkey := btrim(coalesce(j->>'batch_key',''));
  bsha := lower(btrim(coalesce(j->>'batch_sha256','')));
  items := j->'records';
  IF bkey = '' OR bsha !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'batch_key and batch_sha256 required'; END IF;
  IF jsonb_typeof(items) <> 'array' OR jsonb_array_length(items) = 0 THEN RAISE EXCEPTION 'nonempty records array required'; END IF;
  IF EXISTS (SELECT 1 FROM public.replay_launch_batch_receipts WHERE batch_key = bkey) THEN
    RAISE EXCEPTION 'batch_key already recorded';
  END IF;
  total := jsonb_array_length(items);

  SELECT string_agg(x.v, E'\n' ORDER BY x.v) INTO ident
  FROM (SELECT (r->'metadata'->>'portal_resource_id') || '|' || (r->'package'->'media'->>'byte_sha256') AS v
        FROM jsonb_array_elements(items) r) x;
  computed := encode(extensions.digest(ident, 'sha256'), 'hex');
  IF computed <> bsha THEN RAISE EXCEPTION 'batch manifest hash mismatch'; END IF;

  IF (SELECT count(DISTINCT r->'metadata'->>'portal_resource_id') FROM jsonb_array_elements(items) r) <> total THEN
    RAISE EXCEPTION 'duplicate portal_resource_id in batch';
  END IF;

  FOR rec IN SELECT value FROM jsonb_array_elements(items) LOOP
    pid := btrim(coalesce(rec->'metadata'->>'portal_resource_id',''));
    IF pid = '' THEN RAISE EXCEPTION 'portal_resource_id required'; END IF;
    IF EXISTS (SELECT 1 FROM public.replay_launch_batch_exclusions WHERE portal_resource_id = pid) THEN
      RAISE EXCEPTION 'excluded resource present in batch: %', pid;
    END IF;

    SELECT id INTO rid FROM public.mastermind_portal_resources WHERE portal_resource_id = pid;
    IF rid IS NOT NULL AND EXISTS (SELECT 1 FROM public.replay_publication_authority WHERE resource_id = rid) THEN
      skipped := skipped + 1;
      results := results || jsonb_build_object('portal_resource_id', pid, 'state', 'already_imported');
      CONTINUE;
    END IF;

    IF rid IS NULL THEN
      INSERT INTO public.mastermind_portal_resources(
        portal_resource_id, product_title, category_title, title, portal_path, resource_type,
        access_scope, member_visible_default, replay_date, success_paths, stages,
        ingestion_status, transcript_evidence, video_source_type)
      VALUES (
        pid, 'Replay Vault',
        nullif(btrim(coalesce(rec->'package'->'source'->'metadata'->>'category','')), ''),
        coalesce(nullif(btrim(coalesce(rec->'package'->'source'->>'title','')), ''), pid),
        '/mastermind/replay-vault/' || split_part(pid, ':', 2),
        'video', 'replay_vault', false,
        nullif(rec->'package'->'source'->>'event_date','')::date,
        '{}'::text[], '{}'::text[],
        'ready_for_search', 'yes', 'dropbox_private')
      RETURNING id INTO rid;
    END IF;

    IF (SELECT member_visible_default FROM public.mastermind_portal_resources WHERE id = rid) THEN
      RAISE EXCEPTION 'refusing to import member-visible resource: %', pid;
    END IF;

    runid := public.replay_import_content_package(
      jsonb_set(rec->'package', '{resource_id}', to_jsonb(rid::text), true), actor);

    SELECT cue_count INTO n FROM public.replay_transcript_versions
      WHERE resource_id = rid AND is_active ORDER BY created_at DESC LIMIT 1;
    cues := cues + coalesce(n, 0);
    imported := imported + 1;
    results := results || jsonb_build_object(
      'portal_resource_id', pid, 'resource_id', rid, 'run_id', runid,
      'cue_count', coalesce(n, 0), 'state', 'imported');
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.replay_vault_launch_config WHERE launch_state <> 'disabled'
  ) OR EXISTS (
    SELECT 1 FROM public.replay_publication_controls WHERE publication_enabled
  ) THEN
    RAISE EXCEPTION 'launch or publication controls are not disabled';
  END IF;

  INSERT INTO public.replay_launch_batch_receipts(
    batch_key, batch_sha256, record_count, imported_count, skipped_count, cue_count, status, actor, receipt)
  VALUES (bkey, bsha, total, imported, skipped, cues, 'accepted', actor,
          jsonb_build_object('records', results));

  RETURN jsonb_build_object(
    'batch_key', bkey, 'record_count', total, 'imported', imported,
    'skipped', skipped, 'cue_count', cues, 'records', results);
END
$function$;

REVOKE ALL ON FUNCTION public.replay_import_launch_batch(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_import_launch_batch(jsonb, text) TO service_role;