-- Add has_seen_tour column to user_settings to persist tour state across devices/sessions
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT false;