
CREATE TABLE public.integration_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  request_count_1m INTEGER NOT NULL DEFAULT 0,
  window_start_1m TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_tokens_user ON public.integration_tokens(user_id);
CREATE INDEX idx_integration_tokens_hash ON public.integration_tokens(token_hash);

GRANT SELECT, INSERT, UPDATE ON public.integration_tokens TO authenticated;
GRANT ALL ON public.integration_tokens TO service_role;

ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens (name, prefix, timestamps — raw token never exists in DB).
CREATE POLICY "Users read their own tokens"
  ON public.integration_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert tokens only for themselves.
CREATE POLICY "Users create their own tokens"
  ON public.integration_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update ONLY name and revoked_at on their own tokens; token_hash is immutable via API.
CREATE POLICY "Users update their own tokens"
  ON public.integration_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND token_hash = (SELECT token_hash FROM public.integration_tokens WHERE id = integration_tokens.id));

CREATE TRIGGER update_integration_tokens_updated_at
  BEFORE UPDATE ON public.integration_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
