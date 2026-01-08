-- Create secrets table (no RLS - only service role can access)
CREATE TABLE public.google_calendar_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment explaining security model
COMMENT ON TABLE public.google_calendar_secrets IS 'Stores encrypted Google OAuth tokens. No RLS enabled - only accessible via service role key.';

-- Migrate existing data from google_calendar_connection to google_calendar_secrets
INSERT INTO public.google_calendar_secrets (user_id, refresh_token_encrypted, access_token_encrypted, token_expiry, created_at, updated_at)
SELECT user_id, refresh_token_encrypted, access_token_encrypted, token_expiry, created_at, updated_at
FROM public.google_calendar_connection
WHERE refresh_token_encrypted IS NOT NULL AND access_token_encrypted IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove token columns from connection table (these should only be in secrets table)
ALTER TABLE public.google_calendar_connection 
  DROP COLUMN IF EXISTS refresh_token_encrypted,
  DROP COLUMN IF EXISTS access_token_encrypted,
  DROP COLUMN IF EXISTS token_expiry;

-- Add trigger to update updated_at on google_calendar_secrets
CREATE TRIGGER update_google_calendar_secrets_updated_at
  BEFORE UPDATE ON public.google_calendar_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();