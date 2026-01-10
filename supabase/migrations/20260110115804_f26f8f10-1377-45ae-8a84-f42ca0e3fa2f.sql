-- Lead Gen additions to cycle_strategy
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS batch_frequency TEXT DEFAULT 'weekly';
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS lead_gen_content_audit TEXT;

-- Nurture Strategy additions to cycle_strategy
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS nurture_posting_days JSONB DEFAULT '[]';
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS nurture_posting_time TEXT;
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS nurture_batch_day TEXT;
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS nurture_batch_frequency TEXT DEFAULT 'weekly';
ALTER TABLE cycle_strategy ADD COLUMN IF NOT EXISTS nurture_content_audit TEXT;

COMMENT ON COLUMN cycle_strategy.batch_frequency IS 'How often to batch lead gen content: weekly, biweekly, monthly, quarterly';
COMMENT ON COLUMN cycle_strategy.lead_gen_content_audit IS 'Existing lead gen content that can be reused';
COMMENT ON COLUMN cycle_strategy.nurture_posting_days IS 'Array of day names for nurture posting schedule';
COMMENT ON COLUMN cycle_strategy.nurture_posting_time IS 'Time for nurture posts';
COMMENT ON COLUMN cycle_strategy.nurture_batch_day IS 'Day to batch nurture content';
COMMENT ON COLUMN cycle_strategy.nurture_batch_frequency IS 'How often to batch nurture content: weekly, biweekly, monthly, quarterly';
COMMENT ON COLUMN cycle_strategy.nurture_content_audit IS 'Existing nurture content that can be reused';