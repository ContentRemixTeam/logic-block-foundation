-- Project Board Templates table for reusable configurations
CREATE TABLE public.project_board_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  use_case TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  card_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add card_fields and settings to project_boards
ALTER TABLE public.project_boards 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.project_board_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS card_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Project Card Fields table for custom field definitions
CREATE TABLE public.project_card_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'email', 'phone', 'url', 'select', 'currency')),
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  show_on_card BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Custom Values table for storing custom field values
CREATE TABLE public.project_custom_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.project_card_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, field_id)
);

-- Enable RLS
ALTER TABLE public.project_board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_card_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_board_templates
CREATE POLICY "Users can view own templates"
  ON public.project_board_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own templates"
  ON public.project_board_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.project_board_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.project_board_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for project_card_fields
CREATE POLICY "Users can view own card fields"
  ON public.project_card_fields FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own card fields"
  ON public.project_card_fields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card fields"
  ON public.project_card_fields FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card fields"
  ON public.project_card_fields FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for project_custom_values (via project ownership)
CREATE POLICY "Users can view own custom values"
  ON public.project_custom_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own custom values"
  ON public.project_custom_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own custom values"
  ON public.project_custom_values FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own custom values"
  ON public.project_custom_values FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_project_board_templates_user_id ON public.project_board_templates(user_id);
CREATE INDEX idx_project_card_fields_board_id ON public.project_card_fields(board_id);
CREATE INDEX idx_project_custom_values_project_id ON public.project_custom_values(project_id);
CREATE INDEX idx_project_custom_values_field_id ON public.project_custom_values(field_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_board_templates_updated_at
  BEFORE UPDATE ON public.project_board_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_custom_values_updated_at
  BEFORE UPDATE ON public.project_custom_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();