-- Add works_weekends column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS works_weekends BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_settings.works_weekends IS 
  'Whether user works on weekends (affects task scheduling and planner display)';