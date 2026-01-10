-- Add nurture_platforms column to cycle_strategy table for storing multiple nurture platforms
ALTER TABLE public.cycle_strategy 
ADD COLUMN IF NOT EXISTS nurture_platforms JSONB DEFAULT '[]';

COMMENT ON COLUMN public.cycle_strategy.nurture_platforms IS 'Array of nurture platform definitions with method, frequency, posting days, time, and batch settings';