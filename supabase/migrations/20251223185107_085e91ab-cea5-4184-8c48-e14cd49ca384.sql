-- Add metric target columns to weekly_plans table
ALTER TABLE public.weekly_plans
ADD COLUMN metric_1_target NUMERIC,
ADD COLUMN metric_2_target NUMERIC,
ADD COLUMN metric_3_target NUMERIC;