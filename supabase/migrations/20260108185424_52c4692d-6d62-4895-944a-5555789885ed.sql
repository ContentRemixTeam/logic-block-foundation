-- Add goal_rewrite to daily_plans
ALTER TABLE public.daily_plans 
  ADD COLUMN IF NOT EXISTS goal_rewrite text;

-- Add goal_rewrite to weekly_plans  
ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS goal_rewrite text;

-- Add goal_support field to daily_reviews
ALTER TABLE public.daily_reviews
  ADD COLUMN IF NOT EXISTS goal_support text;

-- Add goal_support to weekly_reviews
ALTER TABLE public.weekly_reviews  
  ADD COLUMN IF NOT EXISTS goal_support text;