-- Durable Phase One coaching, feedback, activity, admin summaries, and a real
-- approval-gated Planner connection test. No provider secrets or source paths.

CREATE TABLE IF NOT EXISTS public.mastermind_coaching_conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL DEFAULT 'phase_one' CHECK (surface IN ('phase_one','mastermind')),
  topic TEXT NOT NULL DEFAULT 'next_move' CHECK (char_length(topic) BETWEEN 1 AND 80),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','needs_human','deleted')),
  latest_response_version TEXT NULL CHECK (latest_response_version IS NULL OR char_length(latest_response_version) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.mastermind_coaching_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.mastermind_coaching_conversations(conversation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  response_version TEXT NULL CHECK (response_version IS NULL OR char_length(response_version) <= 80),
  provider TEXT NULL CHECK (provider IS NULL OR provider IN ('deterministic','openai','anthropic')),
  resource_id TEXT NULL CHECK (resource_id IS NULL OR resource_id ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastermind_coaching_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.mastermind_coaching_conversations(conversation_id) ON DELETE CASCADE,
  assistant_message_id UUID NOT NULL UNIQUE REFERENCES public.mastermind_coaching_messages(message_id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('helpful','not_helpful')),
  reason_code TEXT NULL CHECK (reason_code IS NULL OR reason_code IN ('inaccurate','not_faith_voice','too_much','not_useful','wrong_resource','other')),
  note TEXT NULL CHECK (note IS NULL OR char_length(note) <= 500),
  needs_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastermind_member_activity_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'phase_one_opened','plan_ready','workspace_ready','connector_verified',
    'video_started','video_completed','coaching_used','coaching_feedback',
    'resource_searched','task_proposed','task_approved','human_help_requested'
  )),
  portal_resource_id TEXT NULL,
  conversation_id UUID NULL REFERENCES public.mastermind_coaching_conversations(conversation_id) ON DELETE SET NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mastermind_coaching_conversations_user_idx
  ON public.mastermind_coaching_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS mastermind_coaching_messages_conversation_idx
  ON public.mastermind_coaching_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS mastermind_member_activity_user_idx
  ON public.mastermind_member_activity_events(user_id, created_at DESC);

ALTER TABLE public.mastermind_coaching_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_coaching_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_coaching_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_member_activity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mastermind_coaching_conversations, public.mastermind_coaching_messages, public.mastermind_coaching_feedback, public.mastermind_member_activity_events FROM anon, authenticated;
GRANT SELECT ON public.mastermind_coaching_conversations, public.mastermind_coaching_messages, public.mastermind_coaching_feedback TO authenticated;
GRANT SELECT ON public.mastermind_member_activity_events TO authenticated;
GRANT ALL ON public.mastermind_coaching_conversations, public.mastermind_coaching_messages, public.mastermind_coaching_feedback, public.mastermind_member_activity_events TO service_role;

CREATE POLICY "Members can view own coaching conversations" ON public.mastermind_coaching_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Members can view own coaching messages" ON public.mastermind_coaching_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can view own coaching feedback" ON public.mastermind_coaching_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can review coaching conversations" ON public.mastermind_coaching_conversations
  FOR SELECT TO authenticated USING (coalesce(public.is_admin(auth.uid()), false));
CREATE POLICY "Admins can review coaching messages" ON public.mastermind_coaching_messages
  FOR SELECT TO authenticated USING (coalesce(public.is_admin(auth.uid()), false));
CREATE POLICY "Admins can review coaching feedback" ON public.mastermind_coaching_feedback
  FOR SELECT TO authenticated USING (coalesce(public.is_admin(auth.uid()), false));
CREATE POLICY "Admins can review member activity" ON public.mastermind_member_activity_events
  FOR SELECT TO authenticated USING (coalesce(public.is_admin(auth.uid()), false));

CREATE TRIGGER mastermind_coaching_conversations_updated_at BEFORE UPDATE ON public.mastermind_coaching_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mastermind_coaching_feedback_updated_at BEFORE UPDATE ON public.mastermind_coaching_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_my_mastermind_activity(
  p_event_type TEXT,
  p_portal_resource_id TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_safe_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user_id UUID := auth.uid(); v_event_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  IF p_event_type NOT IN ('phase_one_opened','plan_ready','workspace_ready','connector_verified','video_started','video_completed','coaching_used','coaching_feedback','resource_searched','task_proposed','task_approved','human_help_requested') THEN RAISE EXCEPTION 'invalid event'; END IF;
  IF p_conversation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.mastermind_coaching_conversations WHERE conversation_id=p_conversation_id AND user_id=v_user_id) THEN RAISE EXCEPTION 'conversation not found'; END IF;
  INSERT INTO public.mastermind_member_activity_events(user_id,event_type,portal_resource_id,conversation_id,safe_metadata)
  VALUES(v_user_id,p_event_type,p_portal_resource_id,p_conversation_id,coalesce(p_safe_metadata,'{}'::jsonb) - ARRAY['api_key','prompt','transcript','provider_id','path'])
  RETURNING event_id INTO v_event_id;
  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.save_my_mastermind_coaching_exchange(
  p_topic TEXT,
  p_user_message TEXT,
  p_assistant_message TEXT,
  p_response_version TEXT,
  p_provider TEXT DEFAULT 'deterministic',
  p_resource_id TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user_id UUID := auth.uid(); v_conversation_id UUID; v_user_message_id UUID; v_assistant_message_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  IF char_length(trim(p_user_message)) NOT BETWEEN 1 AND 8000 OR char_length(trim(p_assistant_message)) NOT BETWEEN 1 AND 8000 THEN RAISE EXCEPTION 'invalid message'; END IF;
  IF p_provider NOT IN ('deterministic','openai','anthropic') THEN RAISE EXCEPTION 'invalid provider'; END IF;
  IF p_conversation_id IS NULL THEN
    INSERT INTO public.mastermind_coaching_conversations(user_id,topic,latest_response_version)
    VALUES(v_user_id,left(coalesce(nullif(trim(p_topic),''),'next_move'),80),left(p_response_version,80)) RETURNING conversation_id INTO v_conversation_id;
  ELSE
    SELECT conversation_id INTO v_conversation_id FROM public.mastermind_coaching_conversations
    WHERE conversation_id=p_conversation_id AND user_id=v_user_id AND deleted_at IS NULL;
    IF v_conversation_id IS NULL THEN RAISE EXCEPTION 'conversation not found'; END IF;
    UPDATE public.mastermind_coaching_conversations SET latest_response_version=left(p_response_version,80) WHERE conversation_id=v_conversation_id;
  END IF;
  INSERT INTO public.mastermind_coaching_messages(conversation_id,user_id,role,content)
  VALUES(v_conversation_id,v_user_id,'user',trim(p_user_message)) RETURNING message_id INTO v_user_message_id;
  INSERT INTO public.mastermind_coaching_messages(conversation_id,user_id,role,content,response_version,provider,resource_id)
  VALUES(v_conversation_id,v_user_id,'assistant',trim(p_assistant_message),left(p_response_version,80),p_provider,p_resource_id)
  RETURNING message_id INTO v_assistant_message_id;
  PERFORM public.record_my_mastermind_activity('coaching_used',p_resource_id,v_conversation_id,jsonb_build_object('topic',left(p_topic,80),'provider',p_provider,'responseVersion',left(p_response_version,80)));
  RETURN jsonb_build_object('conversation_id',v_conversation_id,'user_message_id',v_user_message_id,'assistant_message_id',v_assistant_message_id);
END; $$;

CREATE OR REPLACE FUNCTION public.rate_my_mastermind_coaching_answer(
  p_assistant_message_id UUID,
  p_rating TEXT,
  p_reason_code TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_needs_human BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user_id UUID := auth.uid(); v_conversation_id UUID; v_feedback_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  IF p_rating NOT IN ('helpful','not_helpful') THEN RAISE EXCEPTION 'invalid rating'; END IF;
  IF p_reason_code IS NOT NULL AND p_reason_code NOT IN ('inaccurate','not_faith_voice','too_much','not_useful','wrong_resource','other') THEN RAISE EXCEPTION 'invalid reason'; END IF;
  SELECT conversation_id INTO v_conversation_id FROM public.mastermind_coaching_messages WHERE message_id=p_assistant_message_id AND user_id=v_user_id AND role='assistant';
  IF v_conversation_id IS NULL THEN RAISE EXCEPTION 'answer not found'; END IF;
  INSERT INTO public.mastermind_coaching_feedback(user_id,conversation_id,assistant_message_id,rating,reason_code,note,needs_human)
  VALUES(v_user_id,v_conversation_id,p_assistant_message_id,p_rating,p_reason_code,left(nullif(trim(p_note),''),500),p_needs_human)
  ON CONFLICT(assistant_message_id) DO UPDATE SET rating=excluded.rating,reason_code=excluded.reason_code,note=excluded.note,needs_human=excluded.needs_human
  RETURNING feedback_id INTO v_feedback_id;
  IF p_needs_human THEN UPDATE public.mastermind_coaching_conversations SET status='needs_human' WHERE conversation_id=v_conversation_id; END IF;
  PERFORM public.record_my_mastermind_activity(CASE WHEN p_needs_human THEN 'human_help_requested' ELSE 'coaching_feedback' END,NULL,v_conversation_id,jsonb_build_object('rating',p_rating,'reason',p_reason_code));
  RETURN jsonb_build_object('feedback_id',v_feedback_id,'conversation_id',v_conversation_id,'needs_human',p_needs_human);
END; $$;

CREATE OR REPLACE FUNCTION public.delete_my_mastermind_coaching_conversation(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  UPDATE public.mastermind_coaching_conversations SET status='deleted',deleted_at=now() WHERE conversation_id=p_conversation_id AND user_id=v_user_id;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.propose_my_phase_one_connection_test_task(p_cycle_id UUID)
RETURNS public.ai_planner_task_proposals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user_id UUID := auth.uid(); v_cycle public.cycles_90_day%ROWTYPE; v_row public.ai_planner_task_proposals%ROWTYPE; v_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  SELECT * INTO v_cycle FROM public.cycles_90_day WHERE cycle_id=p_cycle_id AND user_id=v_user_id;
  IF v_cycle.cycle_id IS NULL THEN RAISE EXCEPTION 'cycle not found'; END IF;
  v_key := 'phase-one-connection-test:' || p_cycle_id::text;
  INSERT INTO public.ai_planner_task_proposals(user_id,idempotency_key,task_text,task_description,why_this_task,done_enough,evidence_target,suggested_date,priority,source_context)
  VALUES(v_user_id,v_key,'Complete my first 20-minute move',coalesce(nullif(v_cycle.minimum_viable_version,''),'Take the smallest real-world action that moves this 90-day result forward.'),'This proves your AI workspace can read the correct plan and propose a task without changing it.','One 20-minute attempt is complete.','Record what you tried and what happened.',current_date,'medium',jsonb_build_object('surface','phase_one','cycle_id',p_cycle_id,'result',left(v_cycle.goal,200)))
  ON CONFLICT(user_id,idempotency_key) DO UPDATE SET updated_at=now()
  RETURNING * INTO v_row;
  PERFORM public.record_my_mastermind_activity('task_proposed',NULL,NULL,jsonb_build_object('surface','phase_one','proposalId',v_row.proposal_id));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_mastermind_member_engagement()
RETURNS TABLE(user_id UUID,email TEXT,last_sign_in_at TIMESTAMPTZ,last_meaningful_activity TIMESTAMPTZ,phase_status TEXT,videos_started BIGINT,videos_completed BIGINT,coaching_conversations BIGINT,needs_human BIGINT,engagement_state TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, auth AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'admin required'; END IF;
  RETURN QUERY
  SELECT u.id,u.email,u.last_sign_in_at,max(a.created_at),
    CASE WHEN s.completed_at IS NOT NULL THEN 'complete' WHEN s.user_id IS NOT NULL THEN 'in_progress' ELSE 'not_started' END,
    (SELECT count(*) FROM public.mastermind_phase_one_resource_progress p WHERE p.user_id=u.id),
    (SELECT count(*) FROM public.mastermind_phase_one_resource_progress p WHERE p.user_id=u.id AND p.completed_at IS NOT NULL),
    (SELECT count(*) FROM public.mastermind_coaching_conversations c WHERE c.user_id=u.id AND c.deleted_at IS NULL),
    (SELECT count(*) FROM public.mastermind_coaching_conversations c WHERE c.user_id=u.id AND c.status='needs_human' AND c.deleted_at IS NULL),
    CASE WHEN max(a.created_at) >= now()-interval '7 days' THEN 'active' WHEN max(a.created_at) >= now()-interval '14 days' THEN 'slipping' WHEN max(a.created_at) IS NOT NULL THEN 'dormant' ELSE 'new' END
  FROM auth.users u LEFT JOIN public.mastermind_phase_one_state s ON s.user_id=u.id LEFT JOIN public.mastermind_member_activity_events a ON a.user_id=u.id
  GROUP BY u.id,u.email,u.last_sign_in_at,s.user_id,s.completed_at ORDER BY max(a.created_at) DESC NULLS LAST,u.last_sign_in_at DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_mastermind_recent_coaching(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(conversation_id UUID,email TEXT,topic TEXT,status TEXT,member_question TEXT,assistant_answer TEXT,rating TEXT,reason_code TEXT,needs_human BOOLEAN,created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, auth AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'admin required'; END IF;
  RETURN QUERY
  SELECT c.conversation_id,u.email,c.topic,c.status,
    left(coalesce((SELECT m.content FROM public.mastermind_coaching_messages m WHERE m.conversation_id=c.conversation_id AND m.role='user' ORDER BY m.created_at DESC LIMIT 1),''),2000),
    left(coalesce((SELECT m.content FROM public.mastermind_coaching_messages m WHERE m.conversation_id=c.conversation_id AND m.role='assistant' ORDER BY m.created_at DESC LIMIT 1),''),4000),
    f.rating,f.reason_code,coalesce(f.needs_human,false),c.created_at
  FROM public.mastermind_coaching_conversations c JOIN auth.users u ON u.id=c.user_id
  LEFT JOIN LATERAL (SELECT x.rating,x.reason_code,x.needs_human FROM public.mastermind_coaching_feedback x WHERE x.conversation_id=c.conversation_id ORDER BY x.updated_at DESC LIMIT 1) f ON true
  WHERE c.deleted_at IS NULL ORDER BY (c.status='needs_human') DESC,c.updated_at DESC
  LIMIT least(greatest(coalesce(p_limit,50),1),200);
END; $$;

REVOKE ALL ON FUNCTION public.record_my_mastermind_activity(TEXT,TEXT,UUID,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_my_mastermind_coaching_exchange(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_my_mastermind_coaching_answer(UUID,TEXT,TEXT,TEXT,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_mastermind_coaching_conversation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.propose_my_phase_one_connection_test_task(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_mastermind_member_engagement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_mastermind_recent_coaching(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_my_mastermind_activity(TEXT,TEXT,UUID,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_mastermind_coaching_exchange(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rate_my_mastermind_coaching_answer(UUID,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_mastermind_coaching_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_my_phase_one_connection_test_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mastermind_member_engagement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mastermind_recent_coaching(INTEGER) TO authenticated;
