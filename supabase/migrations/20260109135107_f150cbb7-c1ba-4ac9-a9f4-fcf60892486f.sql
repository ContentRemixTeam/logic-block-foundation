-- Create project_sections table for Monday-style groups
CREATE TABLE public.project_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Group',
  color TEXT NOT NULL DEFAULT '#6366F1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own project sections"
  ON public.project_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project sections"
  ON public.project_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project sections"
  ON public.project_sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project sections"
  ON public.project_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Add section_id to tasks table
ALTER TABLE public.tasks ADD COLUMN section_id UUID REFERENCES public.project_sections(id) ON DELETE SET NULL;

-- Create project_board_settings table for per-project column visibility
CREATE TABLE public.project_board_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '["task", "status", "scheduled_date", "tags", "priority", "energy_level", "notes"]'::jsonb,
  sort_by TEXT DEFAULT 'position_in_column',
  sort_direction TEXT DEFAULT 'asc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_board_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own board settings"
  ON public.project_board_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own board settings"
  ON public.project_board_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own board settings"
  ON public.project_board_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own board settings"
  ON public.project_board_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_project_sections_updated_at
  BEFORE UPDATE ON public.project_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_board_settings_updated_at
  BEFORE UPDATE ON public.project_board_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();