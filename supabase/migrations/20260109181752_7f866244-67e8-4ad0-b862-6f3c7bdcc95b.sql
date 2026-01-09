-- Add project_id column to journal_pages
ALTER TABLE public.journal_pages 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_journal_pages_project_id ON public.journal_pages(project_id);

-- Create index for user + project queries
CREATE INDEX idx_journal_pages_user_project ON public.journal_pages(user_id, project_id);