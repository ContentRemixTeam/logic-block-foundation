
-- Extend monthly_challenge_templates with richer metadata for automated rollouts
ALTER TABLE public.monthly_challenge_templates 
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS announcement_title TEXT,
  ADD COLUMN IF NOT EXISTS announcement_body TEXT,
  ADD COLUMN IF NOT EXISTS suggested_targets JSONB DEFAULT '{"light": 5, "medium": 10, "stretch": 20}'::jsonb,
  ADD COLUMN IF NOT EXISTS unlock_paths JSONB DEFAULT '["daily_debriefs", "weekly_debriefs", "task_checklist"]'::jsonb;

-- Add debrief-based challenge types (extend the check constraint)
ALTER TABLE public.user_monthly_challenges DROP CONSTRAINT IF EXISTS user_monthly_challenges_challenge_type_check;
ALTER TABLE public.user_monthly_challenges ADD CONSTRAINT user_monthly_challenges_challenge_type_check 
  CHECK (challenge_type IN ('tasks_total', 'tasks_in_project', 'daily_checkins', 'daily_debriefs', 'weekly_debriefs', 'task_checklist'));

-- Track user dismissals for popup and hello bar per month
CREATE TABLE IF NOT EXISTS public.user_monthly_theme_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.monthly_challenge_templates(id) ON DELETE CASCADE,
  popup_dismissed_at TIMESTAMPTZ,
  hello_bar_dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

ALTER TABLE public.user_monthly_theme_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals" ON public.user_monthly_theme_dismissals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dismissals" ON public.user_monthly_theme_dismissals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dismissals" ON public.user_monthly_theme_dismissals
  FOR UPDATE USING (auth.uid() = user_id);

-- Add task_checklist support: link a project whose completed tasks count toward unlock
-- (already supported via project_id on user_monthly_challenges)

-- Create index for fast monthly lookups
CREATE INDEX IF NOT EXISTS idx_monthly_theme_dismissals_lookup
  ON public.user_monthly_theme_dismissals(user_id, template_id);
