-- Private Phase One test contracts. Member state only; no curriculum publication
-- or source-provider metadata is created by this migration.

CREATE TABLE IF NOT EXISTS public.mastermind_phase_one_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  phase_version TEXT NOT NULL DEFAULT 'phase-one-v1' CHECK (char_length(phase_version) BETWEEN 1 AND 80),
  current_step TEXT NOT NULL DEFAULT 'plan' CHECK (current_step IN ('plan','workspace','connector','complete')),
  plan_ready_at TIMESTAMPTZ NULL,
  workspace_provider TEXT NULL CHECK (workspace_provider IS NULL OR workspace_provider IN ('claude','codex')),
  workspace_status TEXT NOT NULL DEFAULT 'not_started' CHECK (workspace_status IN ('not_started','in_progress','ready')),
  workspace_ready_at TIMESTAMPTZ NULL,
  connector_status TEXT NOT NULL DEFAULT 'not_started' CHECK (connector_status IN ('not_started','connected','verified')),
  connector_verified_at TIMESTAMPTZ NULL,
  test_proposal_id UUID NULL REFERENCES public.ai_planner_task_proposals(proposal_id) ON DELETE SET NULL,
  test_task_id UUID NULL REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastermind_phase_one_resource_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_resource_id TEXT NOT NULL REFERENCES public.mastermind_portal_resources(portal_resource_id) ON DELETE RESTRICT,
  last_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  watched_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  completed_at TIMESTAMPTZ NULL,
  completion_source TEXT NULL CHECK (completion_source IS NULL OR completion_source IN ('playback','member_confirmed')),
  first_started_at TIMESTAMPTZ NULL,
  last_watched_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, portal_resource_id)
);

CREATE INDEX IF NOT EXISTS mastermind_phase_one_progress_user_completed_idx
  ON public.mastermind_phase_one_resource_progress(user_id, completed_at, updated_at DESC);

ALTER TABLE public.mastermind_phase_one_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_phase_one_resource_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mastermind_phase_one_state FROM anon, authenticated;
REVOKE ALL ON public.mastermind_phase_one_resource_progress FROM anon, authenticated;
GRANT SELECT ON public.mastermind_phase_one_state TO authenticated;
GRANT SELECT ON public.mastermind_phase_one_resource_progress TO authenticated;
GRANT ALL ON public.mastermind_phase_one_state TO service_role;
GRANT ALL ON public.mastermind_phase_one_resource_progress TO service_role;

CREATE POLICY "Members can view own Phase One state"
  ON public.mastermind_phase_one_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members can view own Phase One resource progress"
  ON public.mastermind_phase_one_resource_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER mastermind_phase_one_state_updated_at
  BEFORE UPDATE ON public.mastermind_phase_one_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mastermind_phase_one_resource_progress_updated_at
  BEFORE UPDATE ON public.mastermind_phase_one_resource_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.save_my_mastermind_phase_one_state(
  p_cycle_id UUID DEFAULT NULL,
  p_current_step TEXT DEFAULT NULL,
  p_plan_ready BOOLEAN DEFAULT NULL,
  p_workspace_provider TEXT DEFAULT NULL,
  p_workspace_status TEXT DEFAULT NULL,
  p_connector_status TEXT DEFAULT NULL,
  p_test_proposal_id UUID DEFAULT NULL,
  p_test_task_id UUID DEFAULT NULL
) RETURNS public.mastermind_phase_one_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.mastermind_phase_one_state;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  IF p_cycle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cycles_90_day WHERE cycle_id = p_cycle_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'cycle not found'; END IF;
  IF p_test_proposal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ai_planner_task_proposals WHERE proposal_id = p_test_proposal_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF p_test_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tasks WHERE task_id = p_test_task_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'task not found'; END IF;

  INSERT INTO public.mastermind_phase_one_state(user_id, cycle_id)
  VALUES (v_user_id, p_cycle_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.mastermind_phase_one_state SET
    cycle_id = coalesce(p_cycle_id, cycle_id),
    current_step = coalesce(p_current_step, current_step),
    plan_ready_at = CASE WHEN p_plan_ready IS TRUE THEN coalesce(plan_ready_at, now())
                         WHEN p_plan_ready IS FALSE THEN NULL ELSE plan_ready_at END,
    workspace_provider = coalesce(p_workspace_provider, workspace_provider),
    workspace_status = coalesce(p_workspace_status, workspace_status),
    workspace_ready_at = CASE WHEN p_workspace_status = 'ready' THEN coalesce(workspace_ready_at, now())
                              WHEN p_workspace_status IN ('not_started','in_progress') THEN NULL ELSE workspace_ready_at END,
    connector_status = coalesce(p_connector_status, connector_status),
    connector_verified_at = CASE WHEN p_connector_status = 'verified' THEN coalesce(connector_verified_at, now())
                                 WHEN p_connector_status IN ('not_started','connected') THEN NULL ELSE connector_verified_at END,
    test_proposal_id = coalesce(p_test_proposal_id, test_proposal_id),
    test_task_id = coalesce(p_test_task_id, test_task_id),
    completed_at = CASE
      WHEN coalesce(p_plan_ready, plan_ready_at IS NOT NULL)
       AND coalesce(p_workspace_status, workspace_status) = 'ready'
       AND coalesce(p_connector_status, connector_status) = 'verified'
      THEN coalesce(completed_at, now()) ELSE NULL END
  WHERE user_id = v_user_id
  RETURNING * INTO v_row;

  IF v_row.connector_status = 'verified' AND NOT EXISTS (
    SELECT 1 FROM public.ai_planner_task_proposals proposal
    WHERE proposal.proposal_id = v_row.test_proposal_id
      AND proposal.user_id = v_user_id
      AND proposal.status = 'approved'
      AND proposal.approved_task_id = v_row.test_task_id
  ) THEN
    RAISE EXCEPTION 'connector verification requires one member-approved test proposal task';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_my_mastermind_phase_one_video_progress(
  p_portal_resource_id TEXT,
  p_last_position_seconds INTEGER DEFAULT 0,
  p_watched_seconds INTEGER DEFAULT 0,
  p_completed BOOLEAN DEFAULT false,
  p_completion_source TEXT DEFAULT 'playback'
) RETURNS public.mastermind_phase_one_resource_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_preview BOOLEAN;
  v_allowed BOOLEAN;
  v_row public.mastermind_phase_one_resource_progress;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  IF p_portal_resource_id IS NULL OR p_portal_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$' THEN
    RAISE EXCEPTION 'invalid resource';
  END IF;
  IF p_last_position_seconds < 0 OR p_watched_seconds < 0 THEN RAISE EXCEPTION 'invalid progress'; END IF;
  IF p_completion_source NOT IN ('playback','member_confirmed') THEN RAISE EXCEPTION 'invalid completion source'; END IF;
  v_preview := coalesce(public.is_admin(v_user_id), false);
  v_allowed := coalesce((public.mastermind_media_access_decision(
    v_user_id, v_email, p_portal_resource_id, 'playback', 'curriculum', v_preview
  )->>'allowed')::boolean, false);
  IF NOT v_allowed THEN RAISE EXCEPTION 'resource inaccessible'; END IF;

  INSERT INTO public.mastermind_phase_one_resource_progress(
    user_id, portal_resource_id, last_position_seconds, watched_seconds,
    completed_at, completion_source, first_started_at, last_watched_at
  ) VALUES (
    v_user_id, p_portal_resource_id, p_last_position_seconds, p_watched_seconds,
    CASE WHEN p_completed THEN now() END,
    CASE WHEN p_completed THEN p_completion_source END, now(), now()
  )
  ON CONFLICT (user_id, portal_resource_id) DO UPDATE SET
    last_position_seconds = greatest(mastermind_phase_one_resource_progress.last_position_seconds, excluded.last_position_seconds),
    watched_seconds = greatest(mastermind_phase_one_resource_progress.watched_seconds, excluded.watched_seconds),
    completed_at = CASE WHEN p_completed THEN coalesce(mastermind_phase_one_resource_progress.completed_at, now())
                        ELSE mastermind_phase_one_resource_progress.completed_at END,
    completion_source = CASE WHEN p_completed THEN coalesce(mastermind_phase_one_resource_progress.completion_source, p_completion_source)
                             ELSE mastermind_phase_one_resource_progress.completion_source END,
    last_watched_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Safe Phase One catalog. It never returns source paths, provider IDs,
-- transcripts, Vault metadata, or resources outside core_curriculum.
CREATE OR REPLACE FUNCTION public.search_my_mastermind_phase_one_resources(
  p_query TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  portal_resource_id TEXT,
  title TEXT,
  product_title TEXT,
  category_title TEXT,
  resource_type TEXT,
  duration_seconds INTEGER,
  stages TEXT[],
  success_paths TEXT[],
  completed BOOLEAN,
  last_position_seconds INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_preview BOOLEAN;
  v_query TEXT := left(nullif(trim(coalesce(p_query,'')),''), 160);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  v_preview := coalesce(public.is_admin(v_user_id), false);
  RETURN QUERY
  SELECT r.portal_resource_id, left(r.title,160), left(r.product_title,160),
         left(r.category_title,120), r.resource_type,
         CASE WHEN r.duration_ms IS NULL THEN NULL ELSE (r.duration_ms / 1000)::INTEGER END,
         r.stages, r.success_paths, (p.completed_at IS NOT NULL), coalesce(p.last_position_seconds,0)
  FROM public.mastermind_portal_resources r
  LEFT JOIN public.mastermind_phase_one_resource_progress p
    ON p.user_id = v_user_id AND p.portal_resource_id = r.portal_resource_id
  WHERE r.approved_access_scope = 'core_curriculum'
    AND (p_stage IS NULL OR lower(p_stage) = ANY(SELECT lower(s) FROM unnest(r.stages) s))
    AND (v_query IS NULL OR r.metadata_search_vector @@ websearch_to_tsquery('english', v_query))
    AND coalesce((public.mastermind_media_access_decision(
      v_user_id, v_email, r.portal_resource_id, 'playback', 'curriculum', v_preview
    )->>'allowed')::boolean, false)
  ORDER BY coalesce(array_position(r.stages, lower(p_stage)), 9999), lower(r.product_title),
           lower(coalesce(r.category_title,'')), lower(r.title), r.portal_resource_id
  LIMIT least(greatest(coalesce(p_limit,20),1),50);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_mastermind_phase_one_coaching_context()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cycle public.cycles_90_day%ROWTYPE;
  v_phase public.mastermind_phase_one_state%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'member authentication required'; END IF;
  SELECT * INTO v_phase FROM public.mastermind_phase_one_state WHERE user_id = v_user_id;
  SELECT * INTO v_cycle FROM public.cycles_90_day
   WHERE user_id = v_user_id ORDER BY end_date DESC, created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'phase', jsonb_build_object(
      'currentStep', coalesce(v_phase.current_step,'plan'),
      'planReady', v_phase.plan_ready_at IS NOT NULL,
      'workspaceProvider', v_phase.workspace_provider,
      'workspaceStatus', coalesce(v_phase.workspace_status,'not_started'),
      'connectorStatus', coalesce(v_phase.connector_status,'not_started'),
      'completed', v_phase.completed_at IS NOT NULL
    ),
    'plan', CASE WHEN v_cycle.cycle_id IS NULL THEN NULL ELSE jsonb_build_object(
      'cycleId', v_cycle.cycle_id, 'result', v_cycle.goal, 'outcome', v_cycle.outcome,
      'focus', v_cycle.focus_area, 'bottleneck', v_cycle.biggest_bottleneck,
      'startDate', v_cycle.start_date, 'endDate', v_cycle.end_date,
      'minimumMove', v_cycle.minimum_viable_version,
      'evidenceTargets', jsonb_strip_nulls(jsonb_build_object(
        'metric1', CASE WHEN v_cycle.metric_1_name IS NULL THEN NULL ELSE jsonb_build_object('name',v_cycle.metric_1_name,'goal',v_cycle.metric_1_goal) END,
        'metric2', CASE WHEN v_cycle.metric_2_name IS NULL THEN NULL ELSE jsonb_build_object('name',v_cycle.metric_2_name,'goal',v_cycle.metric_2_goal) END
      ))
    ) END,
    'videos', jsonb_build_object(
      'started', (SELECT count(*) FROM public.mastermind_phase_one_resource_progress WHERE user_id=v_user_id),
      'completed', (SELECT count(*) FROM public.mastermind_phase_one_resource_progress WHERE user_id=v_user_id AND completed_at IS NOT NULL)
    ),
    'pendingTaskProposals', (SELECT count(*) FROM public.ai_planner_task_proposals WHERE user_id=v_user_id AND status='pending')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_mastermind_phase_one_state(UUID,TEXT,BOOLEAN,TEXT,TEXT,TEXT,UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_my_mastermind_phase_one_video_progress(TEXT,INTEGER,INTEGER,BOOLEAN,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_my_mastermind_phase_one_resources(TEXT,TEXT,INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_mastermind_phase_one_coaching_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_my_mastermind_phase_one_state(UUID,TEXT,BOOLEAN,TEXT,TEXT,TEXT,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_mastermind_phase_one_video_progress(TEXT,INTEGER,INTEGER,BOOLEAN,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_my_mastermind_phase_one_resources(TEXT,TEXT,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_mastermind_phase_one_coaching_context() TO authenticated;
