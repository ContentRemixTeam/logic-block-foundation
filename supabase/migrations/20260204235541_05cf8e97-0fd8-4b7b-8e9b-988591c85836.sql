-- Add flag to control vault visibility
ALTER TABLE content_items 
ADD COLUMN show_in_vault BOOLEAN DEFAULT true;

-- Update existing empty items to be hidden from vault
UPDATE content_items 
SET show_in_vault = false 
WHERE (body IS NULL OR body = '') 
AND (notes IS NULL OR notes = '');