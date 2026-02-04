-- Add calendar date mode setting to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS calendar_date_mode TEXT DEFAULT 'dual';

-- Add comment for documentation
COMMENT ON COLUMN user_settings.calendar_date_mode IS 'Calendar view mode: dual, create-only, or publish-only';