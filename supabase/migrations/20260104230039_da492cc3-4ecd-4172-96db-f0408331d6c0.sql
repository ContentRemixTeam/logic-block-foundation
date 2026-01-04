-- Add Quest Mode columns to user_settings
ALTER TABLE user_settings 
  ADD COLUMN IF NOT EXISTS xp_points integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_potions_remaining integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS current_debrief_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_debrief_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_debrief_date date,
  ADD COLUMN IF NOT EXISTS potions_last_reset date;

-- Create earned_trophies table
CREATE TABLE IF NOT EXISTS earned_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trophy_type text NOT NULL,
  challenge_name text,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trophy_type)
);

-- Enable RLS on earned_trophies
ALTER TABLE earned_trophies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for earned_trophies
CREATE POLICY "Users can view own trophies" ON earned_trophies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trophies" ON earned_trophies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trophies" ON earned_trophies
  FOR DELETE USING (auth.uid() = user_id);