-- Add LinkedIn template preferences column to brand_profiles
-- Stores only user preferences, not template definitions (those are in code)
ALTER TABLE public.brand_profiles
ADD COLUMN IF NOT EXISTS linkedin_template_prefs jsonb DEFAULT '{"preferredTemplate": null, "usageStats": {}}'::jsonb;