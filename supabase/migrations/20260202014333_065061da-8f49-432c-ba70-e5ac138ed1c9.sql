-- Add project_id column to launches table to link launches to projects
ALTER TABLE public.launches
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_launches_project_id ON public.launches(project_id);