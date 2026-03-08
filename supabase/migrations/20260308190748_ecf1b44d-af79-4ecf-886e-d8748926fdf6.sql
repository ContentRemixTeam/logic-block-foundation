-- Add RLS policies for google_calendar_secrets (currently has RLS enabled but no policies)
CREATE POLICY "Users can view own calendar secrets"
ON public.google_calendar_secrets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar secrets"
ON public.google_calendar_secrets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar secrets"
ON public.google_calendar_secrets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar secrets"
ON public.google_calendar_secrets
FOR DELETE
TO authenticated
USING (user_id = auth.uid());