
-- Update completion function to also award a badge
CREATE OR REPLACE FUNCTION public.complete_monthly_challenge_if_ready(p_user_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress JSONB;
  v_user_id UUID;
  v_status TEXT;
  v_reward_theme_id UUID;
  v_template_title TEXT;
  v_month_start DATE;
  v_theme_emoji TEXT;
  v_theme_name TEXT;
  v_badge_config JSONB;
  v_badge_key TEXT;
BEGIN
  SELECT uc.user_id, uc.status INTO v_user_id, v_status
  FROM public.user_monthly_challenges uc
  WHERE uc.id = p_user_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('completed', false, 'error', 'Challenge not found');
  END IF;

  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('completed', false, 'error', 'Access denied');
  END IF;

  IF v_status = 'completed' THEN
    SELECT theme_id INTO v_reward_theme_id
    FROM public.user_theme_unlocks
    WHERE user_id = v_user_id AND source_user_challenge_id = p_user_challenge_id;
    RETURN jsonb_build_object('completed', true, 'unlocked_theme_id', v_reward_theme_id, 'already_completed', true);
  END IF;

  v_progress := public.get_monthly_challenge_progress(p_user_challenge_id);

  IF v_progress->>'error' IS NOT NULL THEN
    RETURN jsonb_build_object('completed', false, 'error', v_progress->>'error');
  END IF;

  IF NOT (v_progress->>'is_complete')::boolean THEN
    RETURN jsonb_build_object('completed', false, 'progress', v_progress);
  END IF;

  v_reward_theme_id := (v_progress->>'reward_theme_id')::uuid;

  -- Get template + theme info for badge
  SELECT t.title, t.month_start, a.preview_emoji, a.name, a.config_json->'badge'
  INTO v_template_title, v_month_start, v_theme_emoji, v_theme_name, v_badge_config
  FROM public.user_monthly_challenges uc
  JOIN public.monthly_challenge_templates t ON t.id = uc.template_id
  LEFT JOIN public.app_themes a ON a.id = t.reward_theme_id
  WHERE uc.id = p_user_challenge_id;

  UPDATE public.user_monthly_challenges
  SET status = 'completed', completed_at = now()
  WHERE id = p_user_challenge_id;

  IF v_reward_theme_id IS NOT NULL THEN
    INSERT INTO public.user_theme_unlocks (user_id, theme_id, source_user_challenge_id)
    VALUES (v_user_id, v_reward_theme_id, p_user_challenge_id)
    ON CONFLICT (user_id, theme_id) DO NOTHING;
  END IF;

  -- Award badge
  v_badge_key := to_char(v_month_start, 'Mon-YYYY');
  INSERT INTO public.user_badges (user_id, badge_key, emoji, label, description, theme_id)
  VALUES (
    v_user_id,
    lower(v_badge_key),
    COALESCE(v_badge_config->>'emoji', v_theme_emoji, '🏆'),
    COALESCE(v_badge_config->>'label', v_theme_name, v_template_title),
    COALESCE(v_badge_config->>'description', 'Completed the ' || v_template_title),
    v_reward_theme_id
  )
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  RETURN jsonb_build_object(
    'completed', true,
    'unlocked_theme_id', v_reward_theme_id,
    'already_completed', false,
    'badge_awarded', true
  );
END;
$$;
