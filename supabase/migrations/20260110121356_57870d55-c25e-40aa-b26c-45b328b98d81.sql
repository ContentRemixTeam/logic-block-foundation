-- Step 9: Mindset & First 3 Days (all fields optional)
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS biggest_fear TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS fear_response TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS commitment_statement TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS accountability_person TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day1_top3 JSONB DEFAULT '[]';
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day1_why TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day2_top3 JSONB DEFAULT '[]';
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day2_why TEXT;
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day3_top3 JSONB DEFAULT '[]';
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS day3_why TEXT;

-- Comments for clarity
COMMENT ON COLUMN cycles_90_day.biggest_fear IS 'User biggest fear about starting the plan';
COMMENT ON COLUMN cycles_90_day.fear_response IS 'Plan for when fear shows up';
COMMENT ON COLUMN cycles_90_day.commitment_statement IS 'How they commit to showing up';
COMMENT ON COLUMN cycles_90_day.accountability_person IS 'Who will check in with them';
COMMENT ON COLUMN cycles_90_day.day1_top3 IS 'Top 3 tasks for day 1';
COMMENT ON COLUMN cycles_90_day.day1_why IS 'Why these tasks matter for day 1';
COMMENT ON COLUMN cycles_90_day.day2_top3 IS 'Top 3 tasks for day 2';
COMMENT ON COLUMN cycles_90_day.day2_why IS 'Why these tasks matter for day 2';
COMMENT ON COLUMN cycles_90_day.day3_top3 IS 'Top 3 tasks for day 3';
COMMENT ON COLUMN cycles_90_day.day3_why IS 'Why these tasks matter for day 3';