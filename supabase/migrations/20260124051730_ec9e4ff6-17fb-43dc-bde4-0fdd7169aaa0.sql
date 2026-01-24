-- Add planner preferences JSONB column to user_settings for granular control
-- of what appears on daily/weekly planning pages
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS planner_preferences jsonb DEFAULT '{
  "plannerStyle": "balanced",
  "dailyPageWidgets": {
    "top3Tasks": true,
    "habits": true,
    "calendar": true,
    "timeBlocks": true,
    "scratchPad": true,
    "todayFocus": true,
    "metrics": false,
    "journaling": false,
    "thoughtWork": false
  },
  "weeklyPageWidgets": {
    "weeklyGoals": true,
    "priorityList": true,
    "habitTracker": true,
    "calendar": true,
    "courseStudy": true,
    "projectProgress": false,
    "metricsReview": false,
    "contentPlan": false,
    "thoughtWork": false
  },
  "autoScheduling": {
    "enabled": true,
    "studySessions": true,
    "habits": true,
    "recurringTasks": true
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_settings.planner_preferences IS 'User preferences for daily/weekly planning pages including which widgets to show and auto-scheduling options';