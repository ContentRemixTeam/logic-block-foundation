-- Drop the outdated CHECK constraint on content_items.type
-- This allows the flexible user_content_types system to work properly
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_type_check;