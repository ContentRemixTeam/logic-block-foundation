-- Create project_boards table
CREATE TABLE public.project_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_columns table
CREATE TABLE public.project_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#94A3B8',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add board columns to projects table
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.project_boards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES public.project_columns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS board_sort_order INTEGER DEFAULT 0;

-- Enable RLS on project_boards
ALTER TABLE public.project_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boards"
  ON public.project_boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards"
  ON public.project_boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards"
  ON public.project_boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards"
  ON public.project_boards FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on project_columns
ALTER TABLE public.project_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own columns"
  ON public.project_columns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own columns"
  ON public.project_columns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own columns"
  ON public.project_columns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own columns"
  ON public.project_columns FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_project_boards_user_id ON public.project_boards(user_id);
CREATE INDEX idx_project_columns_board_id ON public.project_columns(board_id);
CREATE INDEX idx_project_columns_user_id ON public.project_columns(user_id);
CREATE INDEX idx_projects_board_id ON public.projects(board_id);
CREATE INDEX idx_projects_column_id ON public.projects(column_id);

-- Create function to create default board for a user
CREATE OR REPLACE FUNCTION public.create_default_project_board(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id UUID;
BEGIN
  -- Check if user already has a default board
  SELECT id INTO v_board_id FROM project_boards 
  WHERE user_id = p_user_id AND is_default = true 
  LIMIT 1;
  
  IF v_board_id IS NOT NULL THEN
    RETURN v_board_id;
  END IF;
  
  -- Create default board
  INSERT INTO project_boards (user_id, name, is_default)
  VALUES (p_user_id, 'My Projects', true)
  RETURNING id INTO v_board_id;
  
  -- Create default columns
  INSERT INTO project_columns (board_id, user_id, name, color, sort_order)
  VALUES 
    (v_board_id, p_user_id, 'To Do', '#94A3B8', 0),
    (v_board_id, p_user_id, 'In Progress', '#F59E0B', 1),
    (v_board_id, p_user_id, 'Done', '#10B981', 2);
  
  RETURN v_board_id;
END;
$$;

-- Create trigger for updated_at on project_boards
CREATE TRIGGER update_project_boards_updated_at
  BEFORE UPDATE ON public.project_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();