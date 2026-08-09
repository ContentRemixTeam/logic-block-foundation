-- Replay Vault member parity R5. Additive, hidden, RPC-only member projections.
-- 1700 is unlaunched candidate history: only exact known constraints are replaced.
ALTER TABLE public.replay_vault_bookmarks DROP CONSTRAINT IF EXISTS replay_vault_bookmarks_target_kind_check;
ALTER TABLE public.replay_vault_bookmarks DROP CONSTRAINT IF EXISTS replay_vault_bookmarks_target_kind_r4;
ALTER TABLE public.replay_vault_bookmarks ADD CONSTRAINT replay_vault_bookmarks_target_kind_r4 CHECK(target_kind IN('replay','moment','question'));
ALTER TABLE public.replay_vault_watch_state DROP CONSTRAINT IF EXISTS replay_vault_watch_state_target_kind_check;
ALTER TABLE public.replay_vault_watch_state DROP CONSTRAINT IF EXISTS replay_vault_watch_state_target_kind_r4;
ALTER TABLE public.replay_vault_watch_state ADD CONSTRAINT replay_vault_watch_state_target_kind_r4 CHECK(target_kind IN('moment','question'));
ALTER TABLE public.replay_vault_playback_sessions DROP CONSTRAINT IF EXISTS replay_vault_playback_sessions_target_kind_check;
ALTER TABLE public.replay_vault_playback_sessions DROP CONSTRAINT IF EXISTS replay_vault_playback_sessions_target_kind_r4;
ALTER TABLE public.replay_vault_playback_sessions ADD CONSTRAINT replay_vault_playback_sessions_target_kind_r4 CHECK(target_kind IN('moment','question'));
ALTER TABLE public.replay_vault_note_backlinks DROP CONSTRAINT IF EXISTS replay_vault_note_backlinks_target_kind_check;
ALTER TABLE public.replay_vault_note_backlinks DROP CONSTRAINT IF EXISTS replay_vault_note_backlinks_target_kind_r4;
ALTER TABLE public.replay_vault_note_backlinks ADD CONSTRAINT replay_vault_note_backlinks_target_kind_r4 CHECK(target_kind IN('moment','question'));
ALTER TABLE public.replay_vault_playback_events DROP CONSTRAINT IF EXISTS replay_vault_playback_events_check;
ALTER TABLE public.replay_vault_playback_events DROP CONSTRAINT IF EXISTS replay_vault_playback_events_target_r4;
ALTER TABLE public.replay_vault_playback_events ADD CONSTRAINT replay_vault_playback_events_target_r4 CHECK(NOT(moment_id IS NOT NULL AND question_id IS NOT NULL));

CREATE OR REPLACE FUNCTION public.replay_vault_member_email(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT lower(trim(email)) FROM auth.users WHERE id=p_user_id $$;
CREATE OR REPLACE FUNCTION public.replay_vault_member_can_read(p_user_id uuid,p_portal_resource_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE e text;BEGIN e:=public.replay_vault_member_email(p_user_id);RETURN e IS NOT NULL AND coalesce((public.replay_vault_access_decision(p_user_id,e,p_portal_resource_id,'playback',false)->>'allowed')::boolean,false);END$$;

CREATE OR REPLACE FUNCTION public.replay_vault_interaction_binding(p_user_id uuid,p_email text,p_portal_resource_id text,p_target_kind text,p_target_id uuid,p_as_of timestamptz DEFAULT clock_timestamp())
RETURNS public.replay_vault_target_binding LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.replay_vault_target_binding; canonical_email text;BEGIN
 IF p_user_id IS NULL OR p_target_kind NOT IN('replay','moment','question') OR p_portal_resource_id IS NULL OR p_portal_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$' OR (p_target_kind<>'replay' AND p_target_id IS NULL) THEN RAISE EXCEPTION 'invalid_target' USING ERRCODE='22023';END IF;
 canonical_email:=public.replay_vault_member_email(p_user_id);IF canonical_email IS NULL THEN RAISE EXCEPTION 'inaccessible' USING ERRCODE='42501';END IF;
 SELECT r.id,r.portal_resource_id,p_target_kind,CASE WHEN p_target_kind='replay' THEN r.id ELSE p_target_id END,r.transcript_version_id,r.playback_attempt_id,a.package_sha256,r.duration_ms,
   CASE WHEN p_target_kind='replay' THEN 0 WHEN p_target_kind='moment' THEN s.starts_at_ms ELSE q.answer_start_ms END,
   CASE WHEN p_target_kind='replay' THEN r.duration_ms WHEN p_target_kind='moment' THEN s.ends_at_ms ELSE q.answer_end_ms END,r.title
 INTO b FROM public.replay_published_resource_projection r
 JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 LEFT JOIN public.replay_transcript_segments s ON p_target_kind='moment' AND s.id=p_target_id AND s.transcript_version_id=r.transcript_version_id
 LEFT JOIN public.replay_published_answers_projection q ON p_target_kind='question' AND q.id=p_target_id AND q.resource_id=r.id
 WHERE r.portal_resource_id=p_portal_resource_id AND r.duration_ms>0 AND (public.replay_vault_access_decision(p_user_id,canonical_email,r.portal_resource_id,'playback',false,p_as_of)->>'allowed')::boolean
 AND (p_target_kind='replay' OR (p_target_kind='moment' AND s.id IS NOT NULL) OR (p_target_kind='question' AND q.id IS NOT NULL));
 IF b.resource_id IS NULL THEN RAISE EXCEPTION 'inaccessible' USING ERRCODE='42501';END IF;RETURN b;
END$$;

CREATE OR REPLACE FUNCTION public.resolve_replay_vault_playback(p_user_id uuid,p_email text,p_resource_id text,p_question_id uuid DEFAULT NULL,p_moment_id uuid DEFAULT NULL,p_preview boolean DEFAULT false,p_as_of timestamptz DEFAULT clock_timestamp())
RETURNS TABLE(resource_uuid uuid,portal_resource_id text,title text,dropbox_locator text,access_scope text,authoritative_start_seconds integer,authoritative_end_seconds integer,moment_id uuid,question_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE v_resource_id uuid;v_transcript_version_id uuid;v_title text;v_locator text;v_scope text;v_duration integer;v_start integer;v_end integer;BEGIN
 IF p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$' OR (p_question_id IS NOT NULL AND p_moment_id IS NOT NULL) THEN RETURN;END IF;
 SELECT r.id,r.transcript_version_id,r.title,'id:'||r.dropbox_file_id,r.approved_access_scope,(r.duration_ms/1000)::integer INTO v_resource_id,v_transcript_version_id,v_title,v_locator,v_scope,v_duration FROM public.replay_published_resource_projection r
 JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 WHERE r.portal_resource_id=p_resource_id AND nullif(trim(r.dropbox_file_id),'') IS NOT NULL AND (public.replay_vault_access_decision(p_user_id,p_email,r.portal_resource_id,'playback',p_preview,p_as_of)->>'allowed')::boolean;
 IF v_resource_id IS NULL OR v_duration<=0 THEN RETURN;END IF;
 IF p_moment_id IS NOT NULL THEN SELECT starts_at_ms/1000,ends_at_ms/1000 INTO v_start,v_end FROM public.replay_transcript_segments WHERE id=p_moment_id AND transcript_version_id=v_transcript_version_id;IF NOT FOUND THEN RETURN;END IF;
 ELSIF p_question_id IS NOT NULL THEN SELECT answer_start_ms/1000,answer_end_ms/1000 INTO v_start,v_end FROM public.replay_published_answers_projection WHERE id=p_question_id AND resource_id=v_resource_id;IF NOT FOUND THEN RETURN;END IF;
 ELSE v_start:=0;v_end:=v_duration;END IF;
 RETURN QUERY SELECT v_resource_id,p_resource_id,v_title,v_locator,v_scope,v_start,v_end,p_moment_id,p_question_id;
END$$;

-- Keyset RPCs return limit+1 rows and an opaque row_cursor. Edge strips row_cursor and emits nextCursor only when the extra row exists.
CREATE OR REPLACE FUNCTION public.replay_vault_browse_member(p_user_id uuid,p_category text DEFAULT NULL,p_limit integer DEFAULT 21,p_cursor text DEFAULT NULL)
RETURNS TABLE(portal_resource_id text,title text,category text,duration_seconds numeric,published_at timestamptz,question_count bigint,row_cursor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT r.portal_resource_id,left(r.title,160),left(coalesce(r.category_title,'Replay'),120),r.duration_ms/1000.0,a.published_at,(SELECT count(*) FROM public.replay_published_answers_projection q WHERE q.resource_id=r.id),jsonb_build_object('publishedAt',a.published_at,'id',r.id)::text
 FROM public.replay_published_resource_projection r JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 WHERE public.replay_vault_member_can_read(p_user_id,r.portal_resource_id) AND (p_category IS NULL OR lower(r.category_title)=lower(left(p_category,120)))
 AND (p_cursor IS NULL OR (a.published_at,r.id)<(((p_cursor::jsonb->>'publishedAt')::timestamptz),(p_cursor::jsonb->>'id')::uuid))
 ORDER BY a.published_at DESC,r.id DESC LIMIT least(greatest(coalesce(p_limit,21),2),101)
$$;
CREATE OR REPLACE FUNCTION public.replay_vault_categories_member(p_user_id uuid,p_limit integer DEFAULT 61,p_cursor text DEFAULT NULL)
RETURNS TABLE(category text,resource_count bigint,row_cursor text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT left(coalesce(r.category_title,'Replay'),120) c,count(*),jsonb_build_object('category',left(coalesce(r.category_title,'Replay'),120))::text FROM public.replay_published_resource_projection r
 JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 WHERE public.replay_vault_member_can_read(p_user_id,r.portal_resource_id) AND (p_cursor IS NULL OR left(coalesce(r.category_title,'Replay'),120)>(p_cursor::jsonb->>'category')) GROUP BY 1 ORDER BY 1 LIMIT least(greatest(coalesce(p_limit,61),2),101)
$$;
CREATE OR REPLACE FUNCTION public.replay_vault_transcript_member(p_user_id uuid,p_portal_resource_id text,p_after_index integer DEFAULT -1,p_limit integer DEFAULT 101)
RETURNS TABLE(cue_id uuid,cue_index integer,start_seconds numeric,end_seconds numeric,cue_text text,row_cursor text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT s.id,s.segment_index,s.starts_at_ms/1000.0,s.ends_at_ms/1000.0,left(regexp_replace(s.transcript_text_private,'[[:cntrl:]]',' ','g'),1000),jsonb_build_object('afterIndex',s.segment_index)::text
 FROM public.replay_published_resource_projection r JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id JOIN public.replay_transcript_segments s ON s.transcript_version_id=r.transcript_version_id
 WHERE r.portal_resource_id=p_portal_resource_id AND public.replay_vault_member_can_read(p_user_id,r.portal_resource_id) AND s.segment_index>greatest(coalesce(p_after_index,-1),-1) ORDER BY s.segment_index LIMIT least(greatest(coalesce(p_limit,101),2),101)
$$;
CREATE OR REPLACE FUNCTION public.replay_vault_questions_member(p_user_id uuid,p_portal_resource_id text DEFAULT NULL,p_limit integer DEFAULT 61,p_cursor text DEFAULT NULL)
RETURNS TABLE(question_id uuid,portal_resource_id text,title text,category text,question text,answer_summary text,answerer text,start_seconds numeric,end_seconds numeric,row_cursor text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT q.id,r.portal_resource_id,left(r.title,160),left(coalesce(r.category_title,'Replay'),120),left(q.member_question,400),left(q.safe_answer_summary,600),left(q.answerer_attribution,120),q.answer_start_ms/1000.0,q.answer_end_ms/1000.0,jsonb_build_object('best',q.is_best_answer,'rank',q.related_answer_rank,'id',q.id)::text
 FROM public.replay_published_answers_projection q JOIN public.replay_published_resource_projection r ON r.id=q.resource_id JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=r.transcript_version_id AND a.playback_attempt_id=r.playback_attempt_id
 WHERE public.replay_vault_member_can_read(p_user_id,r.portal_resource_id) AND (p_portal_resource_id IS NULL OR r.portal_resource_id=p_portal_resource_id) AND (p_cursor IS NULL OR (q.is_best_answer<(p_cursor::jsonb->>'best')::boolean) OR (q.is_best_answer=(p_cursor::jsonb->>'best')::boolean AND q.related_answer_rank>(p_cursor::jsonb->>'rank')::integer) OR (q.is_best_answer=(p_cursor::jsonb->>'best')::boolean AND q.related_answer_rank=(p_cursor::jsonb->>'rank')::integer AND q.id>(p_cursor::jsonb->>'id')::uuid))
 ORDER BY q.is_best_answer DESC,q.related_answer_rank,q.id LIMIT least(greatest(coalesce(p_limit,61),2),101)
$$;
CREATE OR REPLACE FUNCTION public.replay_vault_saved_member(p_user_id uuid,p_filter text DEFAULT 'all',p_limit integer DEFAULT 61,p_cursor text DEFAULT NULL)
RETURNS TABLE(bookmark_id uuid,portal_resource_id text,title text,category text,target_kind text,target_id uuid,cue_seconds numeric,saved_at timestamptz,label text,row_cursor text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT b.id,r.portal_resource_id,left(r.title,160),left(coalesce(r.category_title,'Replay'),120),b.target_kind,b.target_id,CASE WHEN b.target_kind='moment' THEN s.starts_at_ms/1000.0 WHEN b.target_kind='question' THEN q.answer_start_ms/1000.0 ELSE 0 END,b.created_at,CASE WHEN b.target_kind='question' THEN left(q.member_question,400) WHEN b.target_kind='moment' THEN left(s.transcript_text_private,400) ELSE 'Full replay' END,jsonb_build_object('createdAt',b.created_at,'id',b.id)::text
 FROM public.replay_vault_bookmarks b JOIN public.replay_published_resource_projection r ON r.id=b.resource_id AND r.transcript_version_id=b.transcript_version_id AND r.playback_attempt_id=b.playback_attempt_id
 JOIN public.replay_publication_authority a ON a.resource_id=r.id AND a.state='PUBLISHED' AND a.transcript_version_id=b.transcript_version_id AND a.playback_attempt_id=b.playback_attempt_id AND a.package_sha256=b.publication_sha256
 LEFT JOIN public.replay_transcript_segments s ON b.target_kind='moment' AND s.id=b.target_id AND s.transcript_version_id=b.transcript_version_id
 LEFT JOIN public.replay_published_answers_projection q ON b.target_kind='question' AND q.id=b.target_id AND q.resource_id=r.id
 WHERE b.user_id=p_user_id AND public.replay_vault_member_can_read(p_user_id,r.portal_resource_id) AND (p_filter='all' OR (p_filter='videos' AND b.target_kind='replay') OR (p_filter='moments' AND b.target_kind IN('moment','question'))) AND ((b.target_kind='replay' AND b.target_id=r.id) OR s.id IS NOT NULL OR q.id IS NOT NULL)
 AND (p_cursor IS NULL OR (b.created_at,b.id)<(((p_cursor::jsonb->>'createdAt')::timestamptz),(p_cursor::jsonb->>'id')::uuid)) ORDER BY b.created_at DESC,b.id DESC LIMIT least(greatest(coalesce(p_limit,61),2),101)
$$;

DO $$DECLARE f regprocedure;BEGIN FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('replay_vault_member_email','replay_vault_member_can_read','replay_vault_interaction_binding','replay_vault_browse_member','replay_vault_categories_member','replay_vault_transcript_member','replay_vault_questions_member','replay_vault_saved_member') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);END LOOP;END$$;
GRANT EXECUTE ON FUNCTION public.replay_vault_browse_member(uuid,text,integer,text),public.replay_vault_categories_member(uuid,integer,text),public.replay_vault_transcript_member(uuid,text,integer,integer),public.replay_vault_questions_member(uuid,text,integer,text),public.replay_vault_saved_member(uuid,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.replay_vault_get_interaction(uuid,text,text,text,uuid),public.replay_vault_set_bookmark(uuid,text,text,text,uuid,boolean),public.replay_vault_delete_bookmark_by_id(uuid,uuid) TO service_role;
