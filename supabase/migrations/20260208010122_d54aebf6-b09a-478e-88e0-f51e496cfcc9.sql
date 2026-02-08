-- Add Brand DNA fields to brand_profiles table
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS custom_banned_phrases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS frameworks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS signature_phrases JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS emoji_preferences JSONB DEFAULT '{"use_emojis": false, "preferred_emojis": []}',
ADD COLUMN IF NOT EXISTS content_philosophies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_values TEXT[] DEFAULT '{}';