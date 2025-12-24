-- Add reminders column to cycles_90_day
ALTER TABLE public.cycles_90_day 
ADD COLUMN IF NOT EXISTS things_to_remember jsonb DEFAULT '[]'::jsonb;