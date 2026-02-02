-- ==============================================
-- EDITORIAL CALENDAR: Database Schema
-- ==============================================

-- 1. User Content Platforms - stores user's active platforms with custom colors
CREATE TABLE public.user_content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.user_content_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own platforms
CREATE POLICY "Users manage own platforms"
  ON public.user_content_platforms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_content_platforms_user ON public.user_content_platforms(user_id);

-- 2. Extend tasks table with content calendar linkage columns
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS content_channel TEXT,
ADD COLUMN IF NOT EXISTS content_creation_date DATE,
ADD COLUMN IF NOT EXISTS content_publish_date DATE;

-- Index for calendar queries on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_content_calendar 
ON public.tasks(content_creation_date, content_publish_date) 
WHERE content_item_id IS NOT NULL OR content_type IS NOT NULL;

-- 3. Add indexes for content_items date queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_content_items_creation_date 
ON public.content_items(planned_creation_date) WHERE planned_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_publish_date 
ON public.content_items(planned_publish_date) WHERE planned_publish_date IS NOT NULL;