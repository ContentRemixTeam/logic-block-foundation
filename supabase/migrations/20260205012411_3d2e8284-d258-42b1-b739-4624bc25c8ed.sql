-- Add columns for graphics and copy attachments to content_items
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS graphics_url text,
ADD COLUMN IF NOT EXISTS graphics_urls text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.content_items.graphics_url IS 'Primary graphic/image URL for this content item';
COMMENT ON COLUMN public.content_items.graphics_urls IS 'Array of additional graphic/image URLs';