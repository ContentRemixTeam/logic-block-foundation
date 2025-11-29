-- Fix RLS policy for cycles_90_day to allow inserts
DROP POLICY IF EXISTS "Users can insert their own cycles" ON public.cycles_90_day;
CREATE POLICY "Users can insert their own cycles"
ON public.cycles_90_day
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add unique constraint to user_settings to enable upsert
ALTER TABLE public.user_settings
DROP CONSTRAINT IF EXISTS user_settings_user_id_unique;

ALTER TABLE public.user_settings
ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);