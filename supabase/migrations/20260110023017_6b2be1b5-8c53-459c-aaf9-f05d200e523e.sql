-- Add weekly routine fields to cycles_90_day table
ALTER TABLE public.cycles_90_day 
ADD COLUMN IF NOT EXISTS weekly_planning_day TEXT,
ADD COLUMN IF NOT EXISTS weekly_debrief_day TEXT,
ADD COLUMN IF NOT EXISTS office_hours_start TEXT,
ADD COLUMN IF NOT EXISTS office_hours_end TEXT,
ADD COLUMN IF NOT EXISTS office_hours_days JSONB DEFAULT '[]'::jsonb;