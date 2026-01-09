-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT DEFAULT '#6366f1',
  start_date DATE,
  end_date DATE,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT projects_status_check CHECK (status IN ('active', 'completed', 'archived'))
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Add project columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN project_column TEXT DEFAULT 'todo';

-- Add constraint for project_column values
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_column_check CHECK (project_column IN ('todo', 'in_progress', 'done'));

-- Index for faster project filtering
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();