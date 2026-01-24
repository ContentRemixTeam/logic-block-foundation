-- Add dashboard_widgets column to user_settings for dashboard customization
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb DEFAULT '{}'::jsonb;