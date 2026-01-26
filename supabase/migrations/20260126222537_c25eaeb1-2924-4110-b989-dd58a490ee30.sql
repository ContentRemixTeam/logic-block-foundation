-- Add source note reference columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS source_note_id UUID REFERENCES public.journal_pages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_note_title TEXT;

-- Add source note reference columns to ideas table
ALTER TABLE public.ideas
ADD COLUMN IF NOT EXISTS source_note_id UUID REFERENCES public.journal_pages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_note_title TEXT;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_source_note_id ON public.tasks(source_note_id) WHERE source_note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_source_note_id ON public.ideas(source_note_id) WHERE source_note_id IS NOT NULL;