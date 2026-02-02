-- =====================================================
-- Composite indexes for calendar query performance
-- These indexes optimize the common pattern: WHERE user_id = X AND date in range
-- =====================================================

-- Content items: user_id + planned_creation_date
CREATE INDEX IF NOT EXISTS idx_content_items_user_creation_date 
ON content_items(user_id, planned_creation_date) 
WHERE planned_creation_date IS NOT NULL;

-- Content items: user_id + planned_publish_date
CREATE INDEX IF NOT EXISTS idx_content_items_user_publish_date 
ON content_items(user_id, planned_publish_date) 
WHERE planned_publish_date IS NOT NULL;

-- Content plan items: user_id + planned_date
CREATE INDEX IF NOT EXISTS idx_content_plan_items_user_date 
ON content_plan_items(user_id, planned_date) 
WHERE planned_date IS NOT NULL;

-- Tasks: user_id + content_creation_date (for calendar content tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_content_creation 
ON tasks(user_id, content_creation_date) 
WHERE content_creation_date IS NOT NULL;

-- Tasks: user_id + content_publish_date (for calendar content tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_content_publish 
ON tasks(user_id, content_publish_date) 
WHERE content_publish_date IS NOT NULL;

-- Tasks: user_id + scheduled_date (for task scheduling queries)
CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled_date 
ON tasks(user_id, scheduled_date) 
WHERE scheduled_date IS NOT NULL;

-- Tasks: user_id + planned_day (for weekly planner queries)
CREATE INDEX IF NOT EXISTS idx_tasks_user_planned_day 
ON tasks(user_id, planned_day) 
WHERE planned_day IS NOT NULL;