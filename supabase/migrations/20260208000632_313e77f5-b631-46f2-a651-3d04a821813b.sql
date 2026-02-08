-- Add generation_mode column to ai_copy_generations table
ALTER TABLE ai_copy_generations 
ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 'premium';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_copy_generations_mode 
ON ai_copy_generations(generation_mode);