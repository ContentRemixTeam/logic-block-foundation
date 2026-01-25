-- Add efficiency metric columns to wizard_completions for tracking content reuse
ALTER TABLE wizard_completions 
ADD COLUMN IF NOT EXISTS content_reused_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_gaps_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_time_saved_minutes INTEGER DEFAULT 0;