-- Add missing columns for OAuth token storage to google_calendar_connection
ALTER TABLE public.google_calendar_connection 
ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
ADD COLUMN IF NOT EXISTS access_token_encrypted text,
ADD COLUMN IF NOT EXISTS token_expiry timestamptz;