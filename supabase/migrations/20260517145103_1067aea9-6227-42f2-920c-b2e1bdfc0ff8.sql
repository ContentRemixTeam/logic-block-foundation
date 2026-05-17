-- AI Connection Keys table for long-lived MCP API keys (bp_live_)
CREATE TABLE public.ai_connection_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Boss Planner AI Key',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['mcp:read','mcp:write']::TEXT[],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_connection_keys_user ON public.ai_connection_keys(user_id);
CREATE INDEX idx_ai_connection_keys_hash ON public.ai_connection_keys(key_hash);

ALTER TABLE public.ai_connection_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI keys"
  ON public.ai_connection_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI keys"
  ON public.ai_connection_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI keys"
  ON public.ai_connection_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI keys"
  ON public.ai_connection_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER ai_connection_keys_updated_at
  BEFORE UPDATE ON public.ai_connection_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();