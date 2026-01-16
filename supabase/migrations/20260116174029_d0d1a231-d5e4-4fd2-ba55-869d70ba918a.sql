-- Performance indexes for faster queries as data grows
-- These indexes are critical for maintaining app speed at scale

-- Tasks: Most common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled 
ON tasks(user_id, scheduled_date) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_planned 
ON tasks(user_id, planned_day) 
WHERE deleted_at IS NULL AND is_completed = false;

CREATE INDEX IF NOT EXISTS idx_tasks_user_completed
ON tasks(user_id, is_completed, completed_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_status
ON tasks(user_id, status)
WHERE deleted_at IS NULL;

-- Ideas: Sorting by creation date
CREATE INDEX IF NOT EXISTS idx_ideas_user_created 
ON ideas(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ideas_user_category
ON ideas(user_id, category_id);

-- Daily plans: Lookup by date
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date 
ON daily_plans(user_id, date DESC);

-- Habits: Active habits query
CREATE INDEX IF NOT EXISTS idx_habits_user_active 
ON habits(user_id) 
WHERE is_archived = false;

-- Habit logs: For progress tracking
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
ON habit_logs(user_id, date DESC);

-- Coaching entries: For history view
CREATE INDEX IF NOT EXISTS idx_coaching_entries_user_created
ON coaching_entries(user_id, created_at DESC);

-- Content items: For vault queries  
CREATE INDEX IF NOT EXISTS idx_content_items_user_status
ON content_items(user_id, status, created_at DESC);

-- Projects: Active projects
CREATE INDEX IF NOT EXISTS idx_projects_user_status
ON projects(user_id, status);

-- Beliefs: For belief builder
CREATE INDEX IF NOT EXISTS idx_beliefs_user_created
ON beliefs(user_id, created_at DESC);