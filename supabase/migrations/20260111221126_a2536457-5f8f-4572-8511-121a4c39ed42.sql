-- Add individual header widget visibility settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS show_coin_counter BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_pet_widget BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_pomodoro_widget BOOLEAN DEFAULT true;