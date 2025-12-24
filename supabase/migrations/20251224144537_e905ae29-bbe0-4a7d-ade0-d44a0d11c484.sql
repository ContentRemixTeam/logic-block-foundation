-- Add scratch pad processing preference to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS scratch_pad_review_mode text DEFAULT 'quick_save';

COMMENT ON COLUMN public.user_settings.scratch_pad_review_mode IS 'Options: quick_save (default), organize_now';