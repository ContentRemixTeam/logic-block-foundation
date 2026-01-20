
-- =====================================================
-- MONTHLY CHALLENGES + THEME REWARDS + THEME FX (BETA)
-- =====================================================

-- 1) FEATURE FLAGS (Beta Rollout)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- RLS for feature_flags (read-only for authenticated)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feature flags readable by authenticated" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);

-- RLS for user_feature_flags (users can only see their own)
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own feature flags" ON public.user_feature_flags
  FOR SELECT USING (auth.uid() = user_id);

-- Insert the monthly_challenges feature flag (disabled by default)
INSERT INTO public.feature_flags (key, enabled, rollout_percent)
VALUES ('monthly_challenges', false, 0)
ON CONFLICT (key) DO NOTHING;

-- 2) APP THEMES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  preview_emoji TEXT,
  config_json JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published themes readable by authenticated" ON public.app_themes
  FOR SELECT TO authenticated USING (is_published = true);

-- Create index for published themes
CREATE INDEX IF NOT EXISTS idx_app_themes_published ON public.app_themes(is_published) WHERE is_published = true;

-- Insert default theme
INSERT INTO public.app_themes (slug, name, preview_emoji, is_published, config_json)
VALUES (
  'default',
  'Default',
  '🎨',
  true,
  '{
    "tokens": {},
    "art": {},
    "fx": {
      "confetti": {"enabled": false},
      "sound": {"enabled": false}
    }
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 3) MONTHLY CHALLENGE TEMPLATES (Prescheduled)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monthly_challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_theme_id UUID REFERENCES public.app_themes(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_month_range CHECK (month_end > month_start)
);

ALTER TABLE public.monthly_challenge_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published templates readable by authenticated" ON public.monthly_challenge_templates
  FOR SELECT TO authenticated USING (is_published = true);

CREATE INDEX IF NOT EXISTS idx_monthly_templates_active 
  ON public.monthly_challenge_templates(is_published, month_start, month_end);

-- 4) USER MONTHLY CHALLENGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_monthly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.monthly_challenge_templates(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('tasks_total', 'tasks_in_project', 'daily_checkins')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, template_id)
);

ALTER TABLE public.user_monthly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own challenges" ON public.user_monthly_challenges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own challenges" ON public.user_monthly_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own challenges" ON public.user_monthly_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- 5) USER THEME UNLOCKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_theme_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.app_themes(id) ON DELETE CASCADE,
  source_user_challenge_id UUID REFERENCES public.user_monthly_challenges(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

ALTER TABLE public.user_theme_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own unlocks" ON public.user_theme_unlocks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own unlocks" ON public.user_theme_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6) DAILY CHECKINS (for consistency challenge)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own checkins" ON public.daily_checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own checkins" ON public.daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7) ADD DELIGHT PREFERENCES TO USER_SETTINGS
-- =====================================================

ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS active_theme_id UUID REFERENCES public.app_themes(id),
  ADD COLUMN IF NOT EXISTS themes_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS celebrations_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delight_intensity TEXT NOT NULL DEFAULT 'subtle' CHECK (delight_intensity IN ('none', 'subtle', 'fun'));

-- 8) RPC: GET MONTHLY CHALLENGE PROGRESS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_monthly_challenge_progress(p_user_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_challenge_type TEXT;
  v_target_value INTEGER;
  v_project_id UUID;
  v_month_start DATE;
  v_month_end DATE;
  v_reward_theme_id UUID;
  v_current_count INTEGER := 0;
  v_percent INTEGER;
  v_is_complete BOOLEAN;
BEGIN
  -- Get challenge details
  SELECT 
    uc.user_id, uc.challenge_type, uc.target_value, uc.project_id,
    t.month_start, t.month_end, t.reward_theme_id
  INTO v_user_id, v_challenge_type, v_target_value, v_project_id, v_month_start, v_month_end, v_reward_theme_id
  FROM public.user_monthly_challenges uc
  JOIN public.monthly_challenge_templates t ON t.id = uc.template_id
  WHERE uc.id = p_user_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Challenge not found');
  END IF;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Calculate progress based on challenge type
  IF v_challenge_type = 'tasks_total' THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.tasks
    WHERE user_id = v_user_id
      AND status = 'done'
      AND completed_at IS NOT NULL
      AND completed_at::date >= v_month_start
      AND completed_at::date <= v_month_end;

  ELSIF v_challenge_type = 'tasks_in_project' THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.tasks
    WHERE user_id = v_user_id
      AND project_id = v_project_id
      AND status = 'done'
      AND completed_at IS NOT NULL
      AND completed_at::date >= v_month_start
      AND completed_at::date <= v_month_end;

  ELSIF v_challenge_type = 'daily_checkins' THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.daily_checkins
    WHERE user_id = v_user_id
      AND checkin_date >= v_month_start
      AND checkin_date <= v_month_end;
  END IF;

  v_percent := LEAST(100, (v_current_count * 100) / GREATEST(v_target_value, 1));
  v_is_complete := v_current_count >= v_target_value;

  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'target_value', v_target_value,
    'percent', v_percent,
    'is_complete', v_is_complete,
    'month_start', v_month_start,
    'month_end', v_month_end,
    'reward_theme_id', v_reward_theme_id
  );
END;
$$;

-- 9) RPC: COMPLETE MONTHLY CHALLENGE IF READY (Idempotent)
-- =====================================================

CREATE OR REPLACE FUNCTION public.complete_monthly_challenge_if_ready(p_user_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress JSONB;
  v_user_id UUID;
  v_status TEXT;
  v_reward_theme_id UUID;
  v_already_unlocked BOOLEAN;
BEGIN
  -- Get current challenge info
  SELECT user_id, status INTO v_user_id, v_status
  FROM public.user_monthly_challenges
  WHERE id = p_user_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('completed', false, 'error', 'Challenge not found');
  END IF;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('completed', false, 'error', 'Access denied');
  END IF;

  -- Already completed? Return success (idempotent)
  IF v_status = 'completed' THEN
    SELECT theme_id INTO v_reward_theme_id
    FROM public.user_theme_unlocks
    WHERE user_id = v_user_id AND source_user_challenge_id = p_user_challenge_id;
    
    RETURN jsonb_build_object('completed', true, 'unlocked_theme_id', v_reward_theme_id, 'already_completed', true);
  END IF;

  -- Get progress
  v_progress := public.get_monthly_challenge_progress(p_user_challenge_id);

  IF v_progress->>'error' IS NOT NULL THEN
    RETURN jsonb_build_object('completed', false, 'error', v_progress->>'error');
  END IF;

  -- Check if complete
  IF NOT (v_progress->>'is_complete')::boolean THEN
    RETURN jsonb_build_object('completed', false, 'progress', v_progress);
  END IF;

  v_reward_theme_id := (v_progress->>'reward_theme_id')::uuid;

  -- Mark challenge as completed
  UPDATE public.user_monthly_challenges
  SET status = 'completed', completed_at = now()
  WHERE id = p_user_challenge_id;

  -- Unlock theme (idempotent via unique constraint)
  IF v_reward_theme_id IS NOT NULL THEN
    INSERT INTO public.user_theme_unlocks (user_id, theme_id, source_user_challenge_id)
    VALUES (v_user_id, v_reward_theme_id, p_user_challenge_id)
    ON CONFLICT (user_id, theme_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'completed', true,
    'unlocked_theme_id', v_reward_theme_id,
    'already_completed', false
  );
END;
$$;

-- 10) RPC: CHECK FEATURE FLAG ACCESS
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_feature_flag(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_override BOOLEAN;
  v_global_enabled BOOLEAN;
  v_rollout_percent INTEGER;
  v_user_hash INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check user-specific override first
  SELECT enabled INTO v_user_override
  FROM public.user_feature_flags
  WHERE user_id = v_user_id AND key = p_key;

  IF FOUND THEN
    RETURN v_user_override;
  END IF;

  -- Check global flag with rollout
  SELECT enabled, rollout_percent INTO v_global_enabled, v_rollout_percent
  FROM public.feature_flags
  WHERE key = p_key;

  IF NOT FOUND OR NOT v_global_enabled THEN
    RETURN false;
  END IF;

  -- Deterministic hash for rollout
  v_user_hash := abs(hashtext(v_user_id::text || p_key)) % 100;
  
  RETURN v_user_hash < v_rollout_percent;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_feature_flags_timestamp ON public.feature_flags;
CREATE TRIGGER update_feature_flags_timestamp
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_app_themes_timestamp ON public.app_themes;
CREATE TRIGGER update_app_themes_timestamp
  BEFORE UPDATE ON public.app_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_monthly_templates_timestamp ON public.monthly_challenge_templates;
CREATE TRIGGER update_monthly_templates_timestamp
  BEFORE UPDATE ON public.monthly_challenge_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
