-- Add metric actual columns to weekly_reviews table
ALTER TABLE public.weekly_reviews
ADD COLUMN metric_1_actual NUMERIC,
ADD COLUMN metric_2_actual NUMERIC,
ADD COLUMN metric_3_actual NUMERIC;