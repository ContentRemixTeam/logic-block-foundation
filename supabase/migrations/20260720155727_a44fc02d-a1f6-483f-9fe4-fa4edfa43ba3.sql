
-- 1. member_access table
CREATE TABLE public.member_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL CHECK (access_level IN ('lifetime','annual')),
  access_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  source TEXT NOT NULL DEFAULT 'ghl',
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_member_access_email ON public.member_access (lower(email));
CREATE INDEX idx_member_access_user_id ON public.member_access (user_id);

GRANT SELECT ON public.member_access TO authenticated;
GRANT ALL ON public.member_access TO service_role;

ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own row (matched by user_id OR by lowercased email)
CREATE POLICY "Users can view their own access"
  ON public.member_access
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- updated_at trigger
CREATE TRIGGER trg_member_access_updated_at
  BEFORE UPDATE ON public.member_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. provision_events audit log
CREATE TABLE public.provision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provision_events_email ON public.provision_events (lower(email));
CREATE INDEX idx_provision_events_created_at ON public.provision_events (created_at DESC);

GRANT ALL ON public.provision_events TO service_role;

ALTER TABLE public.provision_events ENABLE ROW LEVEL SECURITY;

-- No client policies: service role only via GRANT above.

-- 3. Grandfather all existing auth users with lifetime access
INSERT INTO public.member_access (user_id, email, access_level, status, source)
SELECT u.id, lower(u.email), 'lifetime', 'active', 'grandfathered'
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;
