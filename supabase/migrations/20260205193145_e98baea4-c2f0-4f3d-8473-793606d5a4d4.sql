-- Sprint 1 Phase 1: Performance Indexes
-- These indexes optimize common query patterns

-- Task queries: user + created_at for smart filter (recent tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_created_at 
  ON public.tasks(user_id, created_at DESC);

-- Task queries: user + incomplete filter (active tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_incomplete
  ON public.tasks(user_id) WHERE is_completed = false;

-- Journal pages: user_id for RLS queries
CREATE INDEX IF NOT EXISTS idx_journal_pages_user_id 
  ON public.journal_pages(user_id);

-- Journal pages: compound for date queries
CREATE INDEX IF NOT EXISTS idx_journal_pages_user_date
  ON public.journal_pages(user_id, created_at DESC);

-- Weekly plans: user + cycle for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_cycle 
  ON public.weekly_plans(user_id, cycle_id);

-- Content items: user + status for filtering
CREATE INDEX IF NOT EXISTS idx_content_items_user_status
  ON public.content_items(user_id, status);

-- Launches: user_id for RLS queries
CREATE INDEX IF NOT EXISTS idx_launches_user_id
  ON public.launches(user_id);

-- Projects: user_id for RLS queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

-- Habits: user_id for RLS queries  
CREATE INDEX IF NOT EXISTS idx_habits_user_id
  ON public.habits(user_id);

-- Habit logs: user + date for daily lookups
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON public.habit_logs(user_id, date DESC);

-- Time entries: user + task for aggregations
CREATE INDEX IF NOT EXISTS idx_time_entries_user_task
  ON public.time_entries(user_id, task_id);

-- Time entries: user + date for daily views
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date
  ON public.time_entries(user_id, logged_at DESC);

-- Ideas: user_id index
CREATE INDEX IF NOT EXISTS idx_ideas_db_user_id
  ON public.ideas_db(user_id);