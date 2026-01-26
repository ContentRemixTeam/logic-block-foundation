-- Create content_log table for tracking published content
CREATE TABLE public.content_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own content logs"
  ON public.content_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content logs"
  ON public.content_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content logs"
  ON public.content_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content logs"
  ON public.content_log FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_content_log_user_date ON public.content_log(user_id, date);
CREATE INDEX idx_content_log_user_cycle ON public.content_log(user_id, cycle_id);