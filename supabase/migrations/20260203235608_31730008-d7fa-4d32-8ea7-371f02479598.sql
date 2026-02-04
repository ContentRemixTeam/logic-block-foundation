-- Migration: Editorial Calendar Enhancement
-- Part 1: Custom platform support
ALTER TABLE user_content_platforms
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS short_label TEXT;

-- Part 2: Enhanced content_items fields
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS promoting TEXT,
  ADD COLUMN IF NOT EXISTS launch_id UUID REFERENCES launches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS idea_id UUID,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;

-- Part 2b: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_launch_id ON content_items(launch_id);
CREATE INDEX IF NOT EXISTS idx_content_items_idea_id ON content_items(idea_id);
CREATE INDEX IF NOT EXISTS idx_content_items_recurring_parent ON content_items(recurring_parent_id);

-- Part 3: User content types table
CREATE TABLE IF NOT EXISTS user_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  type_label TEXT NOT NULL,
  platform TEXT,
  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT '#6B7280',
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type_key)
);

CREATE INDEX IF NOT EXISTS idx_user_content_types_user ON user_content_types(user_id);

-- Part 3b: RLS for user content types
ALTER TABLE user_content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content types"
  ON user_content_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content types"
  ON user_content_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content types"
  ON user_content_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content types"
  ON user_content_types FOR DELETE
  USING (auth.uid() = user_id);