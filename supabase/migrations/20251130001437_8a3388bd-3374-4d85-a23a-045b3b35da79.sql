-- Add new columns to habits table
ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'custom')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS success_definition TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add custom_reflections columns to review tables
ALTER TABLE public.daily_plans
ADD COLUMN IF NOT EXISTS custom_reflections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.weekly_reviews
ADD COLUMN IF NOT EXISTS custom_reflections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.monthly_reviews
ADD COLUMN IF NOT EXISTS custom_reflections JSONB DEFAULT '{}'::jsonb;

-- Add cycle_summary_questions to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS cycle_summary_questions JSONB DEFAULT '[]'::jsonb;