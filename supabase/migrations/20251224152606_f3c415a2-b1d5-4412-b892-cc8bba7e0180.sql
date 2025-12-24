-- Create journal_pages table for standalone brainstorming notes
CREATE TABLE public.journal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Page',
  content TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journal_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view their own pages" ON public.journal_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pages" ON public.journal_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pages" ON public.journal_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pages" ON public.journal_pages FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_journal_pages_updated_at
  BEFORE UPDATE ON public.journal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();