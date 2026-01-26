-- Add course reference columns to journal_pages
ALTER TABLE public.journal_pages
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS course_title TEXT;

-- Create indexes for better filtering performance
CREATE INDEX IF NOT EXISTS idx_journal_pages_course_id ON public.journal_pages(course_id);
CREATE INDEX IF NOT EXISTS idx_journal_pages_user_course ON public.journal_pages(user_id, course_id);