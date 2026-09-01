-- Keep the hidden Mastermind curriculum catalog from silently clipping ready
-- lessons as the approved core curriculum expands beyond the first launch set.
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
  v_preview := coalesce(public.replay_vault_admin_preview_enabled(v_user_id, true), false);
  RETURN QUERY
  SELECT r.portal_resource_id, left(r.title,160), left(r.product_title,160),
         left(r.category_title,120), r.resource_type,
         CASE WHEN a.duration_ms IS NULL THEN NULL ELSE (a.duration_ms / 1000)::INTEGER END,
         r.stages, r.success_paths, (p.completed_at IS NOT NULL), coalesce(p.last_position_seconds,0)
  FROM public.mastermind_portal_resources r
  LEFT JOIN public.replay_authorized_resource_projection a
    ON a.portal_resource_id = r.portal_resource_id
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
  LIMIT least(greatest(coalesce(p_limit,20),1),200);
END;
$$;

REVOKE ALL ON FUNCTION public.search_my_mastermind_phase_one_resources(TEXT,TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_my_mastermind_phase_one_resources(TEXT,TEXT,INTEGER) TO authenticated;
