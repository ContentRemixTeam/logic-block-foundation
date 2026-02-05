-- Add timer-related columns to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'manual' CHECK (entry_type IN ('manual', 'timer'));