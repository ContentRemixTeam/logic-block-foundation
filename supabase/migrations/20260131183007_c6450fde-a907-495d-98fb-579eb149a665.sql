-- Add gap_strategy column for THE GAP preparation step
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS gap_strategy text;