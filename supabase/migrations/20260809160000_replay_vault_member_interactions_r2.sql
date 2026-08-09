-- Replay Vault member interactions R2. Post-access, RPC-only, canonical-stack-bound.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Canonical target and publication bindings are immutable on interaction rows.
CREATE TABLE IF NOT EXISTS public.replay_vault_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE RESTRICT,
  target_kind text NOT NULL CHECK(target_kind IN ('moment','question')), target_id uuid NOT NULL,
  transcript_version_id uuid NOT NULL REFERENCES public.replay_transcript_versions(id) ON DELETE RESTRICT,
  playback_attempt_id uuid NOT NULL REFERENCES public.replay_media_migration_attempts(id) ON DELETE RESTRICT,
  publication_sha256 text NOT NULL CHECK(publication_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id)
);
CREATE TABLE IF NOT EXISTS public.replay_vault_watch_state (
  user_id uuid NOT NULL, resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE RESTRICT,
  target_kind text NOT NULL CHECK(target_kind IN ('moment','question')), target_id uuid NOT NULL,
  transcript_version_id uuid NOT NULL REFERENCES public.replay_transcript_versions(id) ON DELETE RESTRICT,
  playback_attempt_id uuid NOT NULL REFERENCES public.replay_media_migration_attempts(id) ON DELETE RESTRICT,
  publication_sha256 text NOT NULL CHECK(publication_sha256 ~ '^[0-9a-f]{64}$'), duration_ms bigint NOT NULL CHECK(duration_ms>0),
  watched_ranges nummultirange NOT NULL DEFAULT '{}'::nummultirange,
  last_position_ms bigint NOT NULL DEFAULT 0 CHECK(last_position_ms>=0), completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id)
);
CREATE TABLE IF NOT EXISTS public.replay_vault_playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, resource_id uuid NOT NULL,
  target_kind text NOT NULL CHECK(target_kind IN ('moment','question')), target_id uuid NOT NULL,
  transcript_version_id uuid NOT NULL, playback_attempt_id uuid NOT NULL,
  publication_sha256 text NOT NULL CHECK(publication_sha256 ~ '^[0-9a-f]{64}$'), duration_ms bigint NOT NULL CHECK(duration_ms>0),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
  last_event_at timestamptz NOT NULL DEFAULT clock_timestamp(), last_sequence bigint NOT NULL DEFAULT 0,
  last_position_ms bigint NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  FOREIGN KEY(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id)
    REFERENCES public.replay_vault_watch_state(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id) ON DELETE RESTRICT,
  CHECK(expires_at>issued_at AND expires_at<=issued_at+interval '10 minutes')
);
CREATE UNIQUE INDEX IF NOT EXISTS replay_vault_one_active_session ON public.replay_vault_playback_sessions(user_id,resource_id) WHERE active;
CREATE TABLE IF NOT EXISTS public.replay_vault_media_events (
  event_id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES public.replay_vault_playback_sessions(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL, sequence_no bigint NOT NULL CHECK(sequence_no>0), event_type text NOT NULL CHECK(event_type IN('timeupdate','pause','seeked','ended')),
  position_ms bigint NOT NULL CHECK(position_ms>=0), payload_sha256 text NOT NULL CHECK(payload_sha256~'^[0-9a-f]{64}$'),
  credited_ms bigint NOT NULL DEFAULT 0 CHECK(credited_ms>=0), receipt jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(session_id,sequence_no)
);
CREATE TABLE IF NOT EXISTS public.replay_vault_note_backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, client_request_id uuid NOT NULL,
  payload_sha256 text NOT NULL CHECK(payload_sha256~'^[0-9a-f]{64}$'), journal_page_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE RESTRICT,
  target_kind text NOT NULL CHECK(target_kind IN ('moment','question')), target_id uuid NOT NULL,
  transcript_version_id uuid NOT NULL, playback_attempt_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id,client_request_id)
);
CREATE TABLE IF NOT EXISTS public.replay_vault_rate_windows(
  user_id uuid NOT NULL, action text NOT NULL, window_start timestamptz NOT NULL, request_count integer NOT NULL CHECK(request_count>0),
  PRIMARY KEY(user_id,action,window_start)
);

DO $$ BEGIN ALTER TABLE public.journal_pages ADD CONSTRAINT journal_pages_id_user_unique UNIQUE(id,user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.replay_vault_note_backlinks ADD CONSTRAINT replay_note_same_owner_fk
  FOREIGN KEY(journal_page_id,user_id) REFERENCES public.journal_pages(id,user_id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$DECLARE n text;BEGIN FOREACH n IN ARRAY ARRAY['replay_vault_bookmarks','replay_vault_watch_state','replay_vault_playback_sessions','replay_vault_media_events','replay_vault_note_backlinks','replay_vault_rate_windows'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',n);
END LOOP;END$$;

DO $$ BEGIN CREATE TYPE public.replay_vault_target_binding AS (
 resource_id uuid,portal_resource_id text,target_kind text,target_id uuid,transcript_version_id uuid,playback_attempt_id uuid,
 publication_sha256 text,duration_ms bigint,canonical_start_ms bigint,canonical_end_ms bigint,title text
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.replay_vault_interaction_binding(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid,p_as_of timestamptz DEFAULT clock_timestamp())
RETURNS public.replay_vault_target_binding LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.replay_vault_target_binding;canonical_email text;BEGIN
 IF p_user_id IS NULL OR p_target_id IS NULL OR p_target_kind NOT IN('moment','question') OR p_portal_resource_id IS NULL OR NOT (p_portal_resource_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$' OR p_portal_resource_id ~ '^membershipio:[0-9a-f]{64}$') THEN RAISE EXCEPTION 'invalid_target' USING ERRCODE='22023'; END IF;
 SELECT lower(trim(u.email)) INTO canonical_email FROM auth.users u WHERE u.id=p_user_id;
 IF canonical_email IS NULL THEN RAISE EXCEPTION 'auth_identity_unbound' USING ERRCODE='42501'; END IF;
 SELECT r.id,r.portal_resource_id,p_target_kind,p_target_id,r.transcript_version_id,r.playback_attempt_id,a.package_sha256,r.duration_ms,
   CASE WHEN p_target_kind='moment' THEN s.starts_at_ms ELSE q.answer_start_ms END,
   CASE WHEN p_target_kind='moment' THEN s.ends_at_ms ELSE q.answer_end_ms END,r.title
 INTO b
 FROM public.replay_published_resource_projection r
 JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 LEFT JOIN public.replay_transcript_segments s ON p_target_kind='moment' AND s.id=p_target_id AND s.transcript_version_id=r.transcript_version_id
 LEFT JOIN public.replay_published_answers_projection q ON p_target_kind='question' AND q.id=p_target_id AND q.resource_id=r.id
 WHERE r.portal_resource_id=p_portal_resource_id AND r.duration_ms>0
   AND (public.replay_vault_access_decision(p_user_id,canonical_email,r.portal_resource_id,'playback',false,p_as_of)->>'allowed')::boolean
   AND ((p_target_kind='moment' AND s.id IS NOT NULL) OR (p_target_kind='question' AND q.id IS NOT NULL));
 IF b.resource_id IS NULL THEN RAISE EXCEPTION 'inaccessible' USING ERRCODE='42501'; END IF; RETURN b;
END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_rate_limit(p_user_id uuid,p_action text,p_limit integer)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE n integer;w timestamptz:=date_trunc('minute',clock_timestamp());BEGIN
 INSERT INTO public.replay_vault_rate_windows VALUES(p_user_id,p_action,w,1) ON CONFLICT(user_id,action,window_start) DO UPDATE SET request_count=replay_vault_rate_windows.request_count+1 RETURNING request_count INTO n;
 IF n>p_limit THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001'; END IF;
END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_get_interaction(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE b public.replay_vault_target_binding;x public.replay_vault_bookmarks;w public.replay_vault_watch_state;BEGIN
 b:=public.replay_vault_interaction_binding(p_user_id,p_email,p_portal_resource_id,p_target_kind,p_target_id);
 SELECT * INTO x FROM public.replay_vault_bookmarks WHERE user_id=p_user_id AND resource_id=b.resource_id AND target_kind=b.target_kind AND target_id=b.target_id AND transcript_version_id=b.transcript_version_id AND playback_attempt_id=b.playback_attempt_id;
 SELECT * INTO w FROM public.replay_vault_watch_state WHERE user_id=p_user_id AND resource_id=b.resource_id AND target_kind=b.target_kind AND target_id=b.target_id AND transcript_version_id=b.transcript_version_id AND playback_attempt_id=b.playback_attempt_id;
 RETURN jsonb_build_object('target',jsonb_build_object('resourceId',b.portal_resource_id,'targetKind',b.target_kind,'targetId',b.target_id,'playbackAttemptId',b.playback_attempt_id),
 'bookmark',CASE WHEN x.id IS NULL THEN NULL ELSE jsonb_build_object('bookmarkId',x.id,'resourceId',b.portal_resource_id,'targetKind',x.target_kind,'targetId',x.target_id) END,
 'watch',jsonb_build_object('watchedSeconds',coalesce((SELECT sum(upper(v)-lower(v)) FROM unnest(coalesce(w.watched_ranges,'{}'::nummultirange)) v),0)/1000.0,'durationSeconds',b.duration_ms/1000.0,'lastPositionSeconds',coalesce(w.last_position_ms,0)/1000.0,'completed',w.completed_at IS NOT NULL));
END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_set_bookmark(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid,p_saved boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE b public.replay_vault_target_binding;x public.replay_vault_bookmarks;c integer;BEGIN
 PERFORM public.replay_vault_rate_limit(p_user_id,'bookmark',30); b:=public.replay_vault_interaction_binding(p_user_id,p_email,p_portal_resource_id,p_target_kind,p_target_id);
 IF p_saved THEN SELECT count(*) INTO c FROM public.replay_vault_bookmarks WHERE user_id=p_user_id;IF c>=500 THEN RAISE EXCEPTION 'storage_cap';END IF;
  INSERT INTO public.replay_vault_bookmarks(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id,publication_sha256) VALUES(p_user_id,b.resource_id,b.target_kind,b.target_id,b.transcript_version_id,b.playback_attempt_id,b.publication_sha256)
  ON CONFLICT(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id) DO UPDATE SET publication_sha256=excluded.publication_sha256 RETURNING * INTO x;
 ELSE DELETE FROM public.replay_vault_bookmarks WHERE user_id=p_user_id AND resource_id=b.resource_id AND target_kind=b.target_kind AND target_id=b.target_id AND transcript_version_id=b.transcript_version_id AND playback_attempt_id=b.playback_attempt_id RETURNING * INTO x;END IF;
 RETURN jsonb_build_object('saved',p_saved AND x.id IS NOT NULL,'changed',x.id IS NOT NULL,'bookmarkId',x.id,'resourceId',b.portal_resource_id,'targetKind',b.target_kind,'targetId',b.target_id);
END$$;

-- Owner deletion remains possible after access loss without exposing protected metadata.
CREATE OR REPLACE FUNCTION public.replay_vault_delete_bookmark_by_id(p_user_id uuid,p_bookmark_id uuid) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE n integer;BEGIN
 DELETE FROM public.replay_vault_bookmarks WHERE id=p_bookmark_id AND user_id=p_user_id;GET DIAGNOSTICS n=ROW_COUNT;RETURN jsonb_build_object('deleted',n=1,'bookmarkId',p_bookmark_id);END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_begin_session(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE b public.replay_vault_target_binding;s public.replay_vault_playback_sessions;w public.replay_vault_watch_state;BEGIN
 PERFORM public.replay_vault_rate_limit(p_user_id,'session',12); b:=public.replay_vault_interaction_binding(p_user_id,p_email,p_portal_resource_id,p_target_kind,p_target_id);PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||b.resource_id::text,0));
 UPDATE public.replay_vault_playback_sessions SET active=false WHERE user_id=p_user_id AND resource_id=b.resource_id AND active;
 INSERT INTO public.replay_vault_watch_state(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id,publication_sha256,duration_ms)
 VALUES(p_user_id,b.resource_id,b.target_kind,b.target_id,b.transcript_version_id,b.playback_attempt_id,b.publication_sha256,b.duration_ms) ON CONFLICT DO NOTHING;
 SELECT * INTO w FROM public.replay_vault_watch_state WHERE user_id=p_user_id AND resource_id=b.resource_id AND target_kind=b.target_kind AND target_id=b.target_id AND transcript_version_id=b.transcript_version_id AND playback_attempt_id=b.playback_attempt_id;
 INSERT INTO public.replay_vault_playback_sessions(user_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id,publication_sha256,duration_ms,expires_at,last_position_ms)
 VALUES(p_user_id,b.resource_id,b.target_kind,b.target_id,b.transcript_version_id,b.playback_attempt_id,b.publication_sha256,b.duration_ms,clock_timestamp()+interval '5 minutes',w.last_position_ms) RETURNING * INTO s;
 RETURN jsonb_build_object('sessionId',s.id,'nextSequence',1,'expiresAt',s.expires_at,'playbackAttemptId',b.playback_attempt_id,'targetKind',b.target_kind,'targetId',b.target_id,'durationSeconds',b.duration_ms/1000.0,'watchedSeconds',coalesce((SELECT sum(upper(v)-lower(v)) FROM unnest(w.watched_ranges)v),0)/1000.0,'lastPositionSeconds',w.last_position_ms/1000.0,'completed',w.completed_at IS NOT NULL);
END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_record_media_event(p_user_id uuid,p_email text,p_session_id uuid,p_event_id uuid,p_sequence bigint,p_event_type text,p_position_ms bigint,p_client_duration_ms bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.replay_vault_playback_sessions;e public.replay_vault_media_events;w public.replay_vault_watch_state;b public.replay_vault_target_binding;h text;now_at timestamptz:=clock_timestamp();elapsed bigint;delta bigint;credit bigint:=0;covered numeric;receipt jsonb;BEGIN
 IF p_event_id IS NULL OR p_sequence<1 OR p_event_type NOT IN('timeupdate','pause','seeked','ended') OR p_position_ms<0 THEN RAISE EXCEPTION 'invalid_event' USING ERRCODE='22023';END IF;
 h:=encode(digest(concat_ws('|',p_session_id,p_sequence,p_event_type,p_position_ms,coalesce(p_client_duration_ms,-1)),'sha256'),'hex');PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
 SELECT * INTO e FROM public.replay_vault_media_events WHERE event_id=p_event_id;IF FOUND THEN IF e.payload_sha256<>h OR e.user_id<>p_user_id THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505';END IF;RETURN e.receipt||jsonb_build_object('replayed',true);END IF;
 SELECT * INTO s FROM public.replay_vault_playback_sessions WHERE id=p_session_id FOR UPDATE;
 IF NOT FOUND OR s.user_id<>p_user_id OR NOT s.active OR s.expires_at<=now_at OR p_sequence<>s.last_sequence+1 THEN RAISE EXCEPTION 'invalid_session_or_sequence' USING ERRCODE='22023';END IF;
 -- Recheck exact current capability/publication/attempt; revoked access returns no state.
 b:=public.replay_vault_interaction_binding(p_user_id,p_email,(SELECT portal_resource_id FROM public.mastermind_portal_resources WHERE id=s.resource_id),s.target_kind,s.target_id,now_at);
 IF b.resource_id<>s.resource_id OR b.transcript_version_id<>s.transcript_version_id OR b.playback_attempt_id<>s.playback_attempt_id OR b.publication_sha256<>s.publication_sha256 OR s.publication_sha256<>(SELECT package_sha256 FROM public.replay_publication_authority WHERE resource_id=s.resource_id AND state='PUBLISHED') THEN RAISE EXCEPTION 'stale_publication' USING ERRCODE='42501';END IF;
 elapsed:=greatest(0,floor(extract(epoch FROM now_at-s.last_event_at)*1000));delta:=p_position_ms-s.last_position_ms;
 IF p_event_type IN('timeupdate','pause') AND delta>0 AND delta<=30000 THEN credit:=least(delta,elapsed+500);END IF;
 SELECT * INTO w FROM public.replay_vault_watch_state WHERE user_id=s.user_id AND resource_id=s.resource_id AND target_kind=s.target_kind AND target_id=s.target_id AND transcript_version_id=s.transcript_version_id AND playback_attempt_id=s.playback_attempt_id FOR UPDATE;
 IF credit>0 THEN w.watched_ranges:=w.watched_ranges+nummultirange(numrange(greatest(0,s.last_position_ms)::numeric,least(s.duration_ms,s.last_position_ms+credit)::numeric,'[)'));END IF;
 SELECT coalesce(sum(upper(v)-lower(v)),0) INTO covered FROM unnest(w.watched_ranges)v;
 UPDATE public.replay_vault_watch_state SET watched_ranges=w.watched_ranges,last_position_ms=least(s.duration_ms,p_position_ms),completed_at=CASE WHEN covered>=s.duration_ms*.95 THEN coalesce(completed_at,now_at) ELSE completed_at END,updated_at=now_at
 WHERE user_id=s.user_id AND resource_id=s.resource_id AND target_kind=s.target_kind AND target_id=s.target_id AND transcript_version_id=s.transcript_version_id AND playback_attempt_id=s.playback_attempt_id;
 receipt:=jsonb_build_object('eventId',p_event_id,'acceptedSequence',p_sequence,'nextSequence',p_sequence+1,'replayed',false,'creditedSeconds',credit/1000.0,'watchedSeconds',covered/1000.0,'durationSeconds',s.duration_ms/1000.0,'lastPositionSeconds',least(s.duration_ms,p_position_ms)/1000.0,'completed',covered>=s.duration_ms*.95,'durationMismatch',p_client_duration_ms IS NOT NULL AND abs(p_client_duration_ms-s.duration_ms)>2000);
 INSERT INTO public.replay_vault_media_events(event_id,session_id,user_id,sequence_no,event_type,position_ms,payload_sha256,credited_ms,receipt) VALUES(p_event_id,s.id,p_user_id,p_sequence,p_event_type,p_position_ms,h,credit,receipt);
 UPDATE public.replay_vault_playback_sessions SET last_sequence=p_sequence,last_event_at=now_at,last_position_ms=least(s.duration_ms,p_position_ms),active=(p_event_type<>'ended') WHERE id=s.id;
 RETURN receipt;
END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_create_note(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid,p_position_ms bigint,p_client_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE b public.replay_vault_target_binding;x public.replay_vault_note_backlinks;h text;page_id uuid;safe_ms bigint;c integer;link text;BEGIN
 IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023';END IF;b:=public.replay_vault_interaction_binding(p_user_id,p_email,p_portal_resource_id,p_target_kind,p_target_id);safe_ms:=least(b.duration_ms,greatest(0,coalesce(p_position_ms,b.canonical_start_ms)));
 h:=encode(digest(concat_ws('|',b.resource_id,b.target_kind,b.target_id,b.transcript_version_id,b.playback_attempt_id,safe_ms),'sha256'),'hex');PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_client_request_id::text,0));
 SELECT * INTO x FROM public.replay_vault_note_backlinks WHERE user_id=p_user_id AND client_request_id=p_client_request_id;IF FOUND THEN IF x.payload_sha256<>h THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505';END IF;RETURN jsonb_build_object('replayed',true,'noteId',x.journal_page_id,'openPath','/notes?page='||x.journal_page_id::text,'resourceId',p_portal_resource_id,'targetKind',b.target_kind,'targetId',b.target_id);END IF;
 PERFORM public.replay_vault_rate_limit(p_user_id,'note',10);SELECT count(*) INTO c FROM public.replay_vault_note_backlinks WHERE user_id=p_user_id;IF c>=1000 THEN RAISE EXCEPTION 'storage_cap';END IF;
 link:='/mastermind/replay-vault?resource='||p_portal_resource_id||'&'||b.target_kind||'='||b.target_id::text;
 INSERT INTO public.journal_pages(user_id,title,content,tags) VALUES(p_user_id,'Replay note: '||left(b.title,120),'Protected replay link: '||link||E'\nPosition: '||round(safe_ms/1000.0,1)||' seconds','["replay-vault"]'::jsonb) RETURNING id INTO page_id;
 INSERT INTO public.replay_vault_note_backlinks(user_id,client_request_id,payload_sha256,journal_page_id,resource_id,target_kind,target_id,transcript_version_id,playback_attempt_id) VALUES(p_user_id,p_client_request_id,h,page_id,b.resource_id,b.target_kind,b.target_id,b.transcript_version_id,b.playback_attempt_id) RETURNING * INTO x;
 RETURN jsonb_build_object('replayed',false,'noteId',page_id,'openPath','/notes?page='||page_id::text,'resourceId',p_portal_resource_id,'targetKind',b.target_kind,'targetId',b.target_id);
END$$;

-- Trigger/helper functions are not callable by runtimes. Edge uses only the six RPCs below.
DO $$DECLARE f regprocedure;BEGIN FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('replay_vault_interaction_binding','replay_vault_rate_limit','replay_vault_get_interaction','replay_vault_set_bookmark','replay_vault_delete_bookmark_by_id','replay_vault_begin_session','replay_vault_record_media_event','replay_vault_create_note') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);END LOOP;END$$;
GRANT EXECUTE ON FUNCTION public.replay_vault_get_interaction(uuid,text,text,text,uuid),public.replay_vault_set_bookmark(uuid,text,text,text,uuid,boolean),public.replay_vault_delete_bookmark_by_id(uuid,uuid),public.replay_vault_begin_session(uuid,text,text,text,uuid),public.replay_vault_record_media_event(uuid,text,uuid,uuid,bigint,text,bigint,bigint),public.replay_vault_create_note(uuid,text,text,text,uuid,bigint,uuid) TO service_role;
COMMENT ON TABLE public.replay_vault_media_events IS 'Idempotent exact-sequence event ledger; canonical coverage is lossless nummultirange.';
