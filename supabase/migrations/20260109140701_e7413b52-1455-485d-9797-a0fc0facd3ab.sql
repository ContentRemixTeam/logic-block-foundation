-- Create custom field definitions per project
CREATE TABLE public.project_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'checkbox')),
  field_options JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create custom field values per task
CREATE TABLE public.task_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(task_id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES public.project_custom_fields(id) ON DELETE CASCADE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, field_id)
);

-- Enable RLS
ALTER TABLE public.project_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_custom_fields
CREATE POLICY "Users can view their own custom fields"
  ON public.project_custom_fields FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own custom fields"
  ON public.project_custom_fields FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own custom fields"
  ON public.project_custom_fields FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own custom fields"
  ON public.project_custom_fields FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for task_custom_field_values
CREATE POLICY "Users can view field values for their tasks"
  ON public.task_custom_field_values FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE task_id = task_custom_field_values.task_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create field values for their tasks"
  ON public.task_custom_field_values FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE task_id = task_custom_field_values.task_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update field values for their tasks"
  ON public.task_custom_field_values FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE task_id = task_custom_field_values.task_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete field values for their tasks"
  ON public.task_custom_field_values FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE task_id = task_custom_field_values.task_id AND user_id = auth.uid())
  );

-- Add indexes for performance
CREATE INDEX idx_project_custom_fields_project_id ON public.project_custom_fields(project_id);
CREATE INDEX idx_task_custom_field_values_task_id ON public.task_custom_field_values(task_id);
CREATE INDEX idx_task_custom_field_values_field_id ON public.task_custom_field_values(field_id);

-- Trigger to update updated_at
CREATE TRIGGER update_project_custom_fields_updated_at
  BEFORE UPDATE ON public.project_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_custom_field_values_updated_at
  BEFORE UPDATE ON public.task_custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();