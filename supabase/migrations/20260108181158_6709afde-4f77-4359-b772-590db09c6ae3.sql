-- Enable RLS on google_calendar_secrets table
ALTER TABLE public.google_calendar_secrets ENABLE ROW LEVEL SECURITY;

-- Users can only view their own secrets
CREATE POLICY "Users can view their own calendar secrets"
ON public.google_calendar_secrets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own secrets
CREATE POLICY "Users can insert their own calendar secrets"
ON public.google_calendar_secrets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own secrets
CREATE POLICY "Users can update their own calendar secrets"
ON public.google_calendar_secrets
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own secrets
CREATE POLICY "Users can delete their own calendar secrets"
ON public.google_calendar_secrets
FOR DELETE
USING (auth.uid() = user_id);