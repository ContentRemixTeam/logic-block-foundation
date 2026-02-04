-- Add calendar integration settings to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS auto_create_content_tasks boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_content_in_planners boolean DEFAULT true;