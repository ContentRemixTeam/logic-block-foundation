-- Drop the restrictive check constraint on content_items.channel
-- This allows custom platforms to be used
ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_channel_check;