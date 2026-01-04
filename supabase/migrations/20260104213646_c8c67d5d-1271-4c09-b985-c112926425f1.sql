-- Add new columns to tasks table for enhanced task management
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_block_start timestamp with time zone;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_block_end timestamp with time zone;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_level text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS context_tags text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal_id uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'backlog';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_on text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position_in_column integer;

-- Create task_settings table for user preferences
CREATE TABLE IF NOT EXISTS task_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_capacity_minutes integer DEFAULT 480,
  default_task_duration integer DEFAULT 30,
  show_completed_tasks boolean DEFAULT true,
  enable_time_tracking boolean DEFAULT true,
  enable_sounds boolean DEFAULT false,
  preferred_view text DEFAULT 'list',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on task_settings
ALTER TABLE task_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_settings
CREATE POLICY "Users can view their own task settings"
ON task_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task settings"
ON task_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task settings"
ON task_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_time_block ON tasks(time_block_start, time_block_end);
CREATE INDEX IF NOT EXISTS idx_tasks_energy_level ON tasks(energy_level);
CREATE INDEX IF NOT EXISTS idx_task_settings_user_id ON task_settings(user_id);