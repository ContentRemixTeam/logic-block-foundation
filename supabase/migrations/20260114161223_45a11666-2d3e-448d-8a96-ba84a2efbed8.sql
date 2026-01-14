-- Add metric 4 and 5 columns to cycles_90_day table
ALTER TABLE public.cycles_90_day 
ADD COLUMN IF NOT EXISTS metric_4_name text,
ADD COLUMN IF NOT EXISTS metric_4_start numeric,
ADD COLUMN IF NOT EXISTS metric_4_goal numeric,
ADD COLUMN IF NOT EXISTS metric_5_name text,
ADD COLUMN IF NOT EXISTS metric_5_start numeric,
ADD COLUMN IF NOT EXISTS metric_5_goal numeric;

-- Add goal columns for existing metrics
ALTER TABLE public.cycles_90_day 
ADD COLUMN IF NOT EXISTS metric_1_goal numeric,
ADD COLUMN IF NOT EXISTS metric_2_goal numeric,
ADD COLUMN IF NOT EXISTS metric_3_goal numeric;

-- Add metric 4 and 5 actual columns to weekly_reviews table
ALTER TABLE public.weekly_reviews
ADD COLUMN IF NOT EXISTS metric_4_actual numeric,
ADD COLUMN IF NOT EXISTS metric_5_actual numeric;

-- Create index for metric tracking queries
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_metrics 
ON public.weekly_reviews (user_id, week_id);