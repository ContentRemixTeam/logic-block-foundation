-- Add theme_preference to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'vibrant' CHECK (theme_preference IN ('vibrant', 'bw'));