-- Add secondary_platforms column to cycle_strategy table for storing multiple platform/content type pairs
ALTER TABLE cycle_strategy 
ADD COLUMN IF NOT EXISTS secondary_platforms JSONB DEFAULT '[]'::jsonb;