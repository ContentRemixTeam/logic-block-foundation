-- Add priority, tags, and project_id to ideas table
ALTER TABLE public.ideas 
  ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('asap', 'next_week', 'next_month', 'someday')),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for faster project filtering
CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON public.ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON public.ideas(priority);