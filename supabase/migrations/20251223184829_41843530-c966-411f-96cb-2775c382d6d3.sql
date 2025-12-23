-- Add success metrics columns to cycles_90_day table
ALTER TABLE public.cycles_90_day
ADD COLUMN metric_1_name TEXT,
ADD COLUMN metric_1_start NUMERIC,
ADD COLUMN metric_2_name TEXT,
ADD COLUMN metric_2_start NUMERIC,
ADD COLUMN metric_3_name TEXT,
ADD COLUMN metric_3_start NUMERIC;