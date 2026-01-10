-- Add promotions column to store planned promotions for the 90-day cycle
ALTER TABLE cycles_90_day ADD COLUMN IF NOT EXISTS promotions JSONB DEFAULT '[]';
COMMENT ON COLUMN cycles_90_day.promotions IS 'Array of planned promotions and launches for the cycle';