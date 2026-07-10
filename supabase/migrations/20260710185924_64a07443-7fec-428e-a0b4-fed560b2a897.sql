-- 1. Add feature_toggles JSONB column to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS feature_toggles JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill: auto-enable features for users with existing data.
-- Idempotent: uses jsonb concatenation (||) so re-running is safe.

-- courses
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('courses', true)
WHERE EXISTS (SELECT 1 FROM public.courses c WHERE c.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.course_study_plans csp WHERE csp.user_id = us.user_id);

-- focus_pets / arcade
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('focus_pets', true)
WHERE EXISTS (SELECT 1 FROM public.arcade_wallet a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.arcade_daily_pet a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.arcade_game_sessions a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.arcade_pomodoro_sessions a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.hatched_pets a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.earned_trophies a WHERE a.user_id = us.user_id);

-- ai_writing
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('ai_writing', true)
WHERE EXISTS (SELECT 1 FROM public.ai_copy_generations a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.ai_connection_keys a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.user_api_keys a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.brand_profiles a WHERE a.user_id = us.user_id);

-- launch_tools
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('launch_tools', true)
WHERE EXISTS (SELECT 1 FROM public.launches a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.launch_templates a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.launch_debriefs a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.summits a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.flash_sales a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.webinars a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.content_challenges a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.revenue_sprints a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.money_moves_sprint_trackers a WHERE a.user_id = us.user_id);

-- coaching
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('coaching', true)
WHERE EXISTS (SELECT 1 FROM public.coaching_entries a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.coaching_call_prep a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.office_hours a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.user_mastermind_rsvps a WHERE a.user_id = us.user_id);

-- challenges
UPDATE public.user_settings us
SET feature_toggles = us.feature_toggles || jsonb_build_object('challenges', true)
WHERE EXISTS (SELECT 1 FROM public.user_monthly_challenges a WHERE a.user_id = us.user_id)
   OR EXISTS (SELECT 1 FROM public.user_badges a WHERE a.user_id = us.user_id);