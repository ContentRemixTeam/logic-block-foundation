-- Add ai_generation_id column to link content items to AI generations
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS ai_generation_id UUID REFERENCES public.ai_copy_generations(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_content_items_ai_generation_id ON public.content_items(ai_generation_id);