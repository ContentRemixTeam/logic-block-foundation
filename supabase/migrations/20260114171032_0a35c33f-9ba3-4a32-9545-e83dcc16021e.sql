-- Add soft delete columns to key tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for efficient queries on deleted items
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sops_deleted_at ON sops(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_deleted_at ON ideas(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies for tasks to exclude soft-deleted items by default
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy for viewing deleted tasks (for Trash page)
DROP POLICY IF EXISTS "Users can view their deleted tasks" ON tasks;
CREATE POLICY "Users can view their deleted tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Update RLS policies for sops
DROP POLICY IF EXISTS "Users can view their own SOPs" ON sops;
CREATE POLICY "Users can view their own SOPs"
  ON sops FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their deleted SOPs" ON sops;
CREATE POLICY "Users can view their deleted SOPs"
  ON sops FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Update RLS policies for ideas
DROP POLICY IF EXISTS "Users can view their own ideas" ON ideas;
CREATE POLICY "Users can view their own ideas"
  ON ideas FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their deleted ideas" ON ideas;
CREATE POLICY "Users can view their deleted ideas"
  ON ideas FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Update RLS policies for habits
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;
CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their deleted habits" ON habits;
CREATE POLICY "Users can view their deleted habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL);