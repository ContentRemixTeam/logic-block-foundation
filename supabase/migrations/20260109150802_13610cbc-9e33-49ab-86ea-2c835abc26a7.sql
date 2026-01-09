-- Add cycle_id to tasks table for linking tasks to cycles
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES cycles_90_day(cycle_id);

-- Create index for faster cycle-based filtering
CREATE INDEX IF NOT EXISTS idx_tasks_cycle_id ON tasks(cycle_id);

-- Extend cycle_strategy with posting schedule details
ALTER TABLE cycle_strategy 
  ADD COLUMN IF NOT EXISTS posting_days jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS posting_time text,
  ADD COLUMN IF NOT EXISTS batch_day text;

-- Add custom options storage for user-defined dropdown values
CREATE TABLE IF NOT EXISTS user_custom_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  option_type TEXT NOT NULL, -- 'platform', 'content_type', 'frequency'
  option_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, option_type, option_value)
);

-- Enable RLS
ALTER TABLE user_custom_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_custom_options
CREATE POLICY "Users can view their own custom options"
  ON user_custom_options FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom options"
  ON user_custom_options FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom options"
  ON user_custom_options FOR DELETE
  USING (auth.uid() = user_id);