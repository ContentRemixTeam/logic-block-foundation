DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.mastermind_portal_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_resource_id text NOT NULL UNIQUE,
  title text NOT NULL,
  product_title text NOT NULL,
  category_title text,
  publication_state text NOT NULL,
  published_at timestamptz,
  revoked_at timestamptz,
  privacy_state text NOT NULL,
  pairing_state text NOT NULL,
  transcript_state text NOT NULL,
  media_state text NOT NULL,
  approved_access_scope text
);

CREATE VIEW public.replay_published_resource_projection AS
SELECT id, portal_resource_id, title, product_title, category_title
FROM public.mastermind_portal_resources
WHERE publication_state = 'published' AND published_at IS NOT NULL AND revoked_at IS NULL;

CREATE FUNCTION public.replay_vault_access_decision(
  p_user_id uuid,
  p_email text,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'allowed', lower(coalesce(p_email, '')) = 'annual@example.com'
      AND coalesce(p_resource_id, '') <> 'blocked-resource'
  );
$$;

