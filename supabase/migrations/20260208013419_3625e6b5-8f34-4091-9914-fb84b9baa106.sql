-- Add content_examples JSONB column to store user's copy examples for AI learning
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS content_examples JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN brand_profiles.content_examples IS 'Stores user copy examples by category (email, social, sales, longform) for AI few-shot learning';