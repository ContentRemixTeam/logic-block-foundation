-- Create SOPs table
CREATE TABLE public.sops (
  sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sop_name TEXT NOT NULL,
  description TEXT,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  times_used INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SOPs"
ON public.sops
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SOPs"
ON public.sops
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOPs"
ON public.sops
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SOPs"
ON public.sops
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_sops_user ON public.sops(user_id);
CREATE INDEX idx_sops_name ON public.sops(user_id, sop_name);

-- Add trigger for updated_at
CREATE TRIGGER update_sops_updated_at
BEFORE UPDATE ON public.sops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add sop_id and checklist_progress to tasks table
ALTER TABLE public.tasks 
ADD COLUMN sop_id UUID REFERENCES public.sops(sop_id) ON DELETE SET NULL,
ADD COLUMN checklist_progress JSONB DEFAULT '[]'::jsonb;