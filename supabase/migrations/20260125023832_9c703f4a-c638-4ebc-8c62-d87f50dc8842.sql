-- Add planned creation and publish date columns to content_items
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS planned_creation_date DATE,
ADD COLUMN IF NOT EXISTS planned_publish_date DATE;

-- Optional: Add reference columns to track the auto-generated task IDs
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS creation_task_id UUID,
ADD COLUMN IF NOT EXISTS publish_task_id UUID;