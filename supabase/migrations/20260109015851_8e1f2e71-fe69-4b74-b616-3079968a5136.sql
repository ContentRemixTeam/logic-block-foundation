-- Add missing indexes for performance optimization

-- Weekly plans - frequently queried by user_id and start_of_week
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week 
ON weekly_plans(user_id, start_of_week DESC);

-- Journal pages - frequently filtered by is_archived
CREATE INDEX IF NOT EXISTS idx_journal_pages_user_archived 
ON journal_pages(user_id, is_archived);

-- Tasks by status for kanban views (excluding completed tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_status 
ON tasks(user_id, status) 
WHERE is_completed = false OR is_completed IS NULL;

-- Tasks by planned_day for weekly planner
CREATE INDEX IF NOT EXISTS idx_tasks_user_planned_day 
ON tasks(user_id, planned_day) 
WHERE planned_day IS NOT NULL;

-- Tasks by scheduled_date for calendar views
CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled 
ON tasks(user_id, scheduled_date) 
WHERE scheduled_date IS NOT NULL;

-- Daily plans by date for quick lookup
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date 
ON daily_plans(user_id, date DESC);

-- Habit logs for streak calculations
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date 
ON habit_logs(user_id, date DESC);

-- Projects by status for filtering
CREATE INDEX IF NOT EXISTS idx_projects_user_status 
ON projects(user_id, status);