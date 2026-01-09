-- Drop the existing check constraint on theme_preference
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_preference_check;

-- Add a new constraint that allows all valid theme values
ALTER TABLE user_settings ADD CONSTRAINT user_settings_theme_preference_check 
CHECK (theme_preference IS NULL OR theme_preference IN ('quest', 'minimal', 'vibrant', 'bw', 'light', 'dark', 'system'));