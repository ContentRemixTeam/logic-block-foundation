-- Add performance tracking columns to content_items table
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS open_rate DECIMAL(5,2);
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS click_rate DECIMAL(5,2);
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS views INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS comments INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS likes INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS shares INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS saves INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS subscribers_gained INTEGER;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2);