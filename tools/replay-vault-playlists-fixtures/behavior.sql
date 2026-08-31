DO $$
DECLARE
  v_good uuid := '10000000-0000-4000-8000-000000000001';
  v_bad uuid := '10000000-0000-4000-8000-000000000002';
  v_playlist uuid;
BEGIN
  IF (SELECT count(*) FROM public.replay_vault_playlists WHERE playlist_kind = 'source') <> 17 THEN
    RAISE EXCEPTION 'source playlist manifest count drift';
  END IF;
  IF (SELECT count(*) FROM public.replay_vault_playlists WHERE playlist_kind = 'curated') <> 10 THEN
    RAISE EXCEPTION 'curated draft count drift';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.replay_vault_playlists
    WHERE published_at IS NOT NULL OR editorial_status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'migration published or approved seeded playlists';
  END IF;
  IF (SELECT array_agg(source_playlist_id ORDER BY source_position)
      FROM public.replay_vault_playlists WHERE playlist_kind = 'source')
     <> ARRAY['qQLjKy5dOB','yYON8wNwbD','qQLjKG2xOB','nrOZDYv8bP','ZWLGYzRZoy','WwO9lpN3L2','QRLa59PPLM','5Eoq7n6nL0','y4b14kdPoX','nrOZD1KlbP','Y0bkn7vYo1','K8oyGpzMLj','4mOQjdxPo1','PdODz7BDby','QRLajmZeOM','8moXEkq0bj','JBopnqlvLa']::text[] THEN
    RAISE EXCEPTION 'source playlist order or IDs drifted';
  END IF;

  INSERT INTO public.mastermind_portal_resources VALUES
    (v_good, 'good-resource', 'Good Replay', 'Vault', 'Offer', 'published', now(), NULL,
     'approved', 'paired', 'active', 'approved', 'replay_vault'),
    (v_bad, 'blocked-resource', 'Blocked Replay', 'Vault', 'Offer', 'published', now(), NULL,
     'approved', 'paired', 'active', 'approved', 'replay_vault');

  INSERT INTO public.replay_vault_playlists(
    slug,title,description,playlist_kind,primary_stage,editorial_status,is_featured
  ) VALUES ('fixture-playlist','Fixture Playlist','Fixture outcome.','curated','Offer','draft',true)
  RETURNING id INTO v_playlist;

  INSERT INTO public.replay_vault_playlist_items(
    playlist_id,resource_id,position,why_this_resource,match_status,editorial_status,rights_status
  ) VALUES
    (v_playlist,v_good,1,'The approved starting point.','exact','approved','not_required'),
    (v_playlist,v_bad,2,'A server-denied resource.','exact','approved','not_required');

  UPDATE public.replay_vault_playlists
  SET editorial_status = 'approved', published_at = now()
  WHERE id = v_playlist;

  IF (SELECT count(*) FROM public.replay_vault_playlists_authorized(
      '11111111-1111-4111-8111-111111111111','monthly@example.com',false)) <> 0 THEN
    RAISE EXCEPTION 'unauthorized caller inferred playlist';
  END IF;
  IF (SELECT item_count FROM public.replay_vault_playlists_authorized(
      '11111111-1111-4111-8111-111111111111','annual@example.com',false)
      WHERE slug='fixture-playlist') <> 1 THEN
    RAISE EXCEPTION 'authorized playlist count included denied resource';
  END IF;
  IF (SELECT count(*) FROM public.replay_vault_playlist_items_authorized(
      '11111111-1111-4111-8111-111111111111','annual@example.com','fixture-playlist',false)) <> 1 THEN
    RAISE EXCEPTION 'authorized playlist items did not filter denied resource';
  END IF;
  IF has_table_privilege('authenticated','public.replay_vault_playlists','SELECT')
     OR has_table_privilege('authenticated','public.replay_vault_playlist_items','SELECT') THEN
    RAISE EXCEPTION 'authenticated received direct table access';
  END IF;

  BEGIN
    UPDATE public.replay_vault_playlist_items
    SET position = 3 WHERE playlist_id = v_playlist AND resource_id = v_good;
    RAISE EXCEPTION 'published playlist item mutation was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'published playlist item mutation was allowed' THEN RAISE; END IF;
  END;
END $$;

SELECT 'replay_vault_playlists_pg16_ok';

