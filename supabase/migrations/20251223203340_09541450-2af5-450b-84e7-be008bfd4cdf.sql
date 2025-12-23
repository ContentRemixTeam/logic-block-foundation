-- Add columns for offer tracking and daily wins
ALTER TABLE public.daily_plans 
ADD COLUMN IF NOT EXISTS made_offer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_wins jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scratch_pad_content text,
ADD COLUMN IF NOT EXISTS scratch_pad_processed_at timestamp with time zone;