-- Focused predecessor extension for Wave 2. The Wave 1 mock schema is loaded
-- first; this file supplies the existing entitlement/admin/Vault authority that
-- the additive capability projection composes without redefining in production.

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id)
$$;

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tier text NOT NULL DEFAULT 'mastermind',
  status text NOT NULL DEFAULT 'active',
  first_name text,
  last_name text,
  starts_at date,
  ends_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  planner_tier text,
  planner_status text,
  planner_starts_at date,
  planner_ends_at date,
  planner_product_id text,
  planner_price_id text,
  planner_order_id text,
  planner_last_purchase_at timestamptz
);

CREATE TABLE public.replay_vault_launch_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  launch_state text NOT NULL CHECK (launch_state IN ('disabled', 'pilot', 'launched'))
);
INSERT INTO public.replay_vault_launch_config(singleton, launch_state)
VALUES (true, 'launched');

CREATE TABLE public.replay_vault_pilot_subjects (
  auth_user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE public.replay_vault_purchase_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  entitlement_tier text NOT NULL CHECK (entitlement_tier IN ('monthly', 'annual', 'lifetime')),
  contribution_starts_at timestamptz NOT NULL,
  contribution_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.replay_vault_purchase_lifecycle_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_contribution_id uuid NOT NULL REFERENCES public.replay_vault_purchase_contributions(id),
  lifecycle_type text NOT NULL,
  effective_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION public.replay_vault_exclusive_end(p_inclusive_date date)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT CASE WHEN p_inclusive_date IS NULL THEN NULL::timestamptz
    ELSE (p_inclusive_date + 1)::timestamp AT TIME ZONE 'America/New_York' END
$$;

CREATE OR REPLACE FUNCTION public.replay_vault_access_decision(
  p_user_id uuid,
  p_email text,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_preview boolean DEFAULT false,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_mastermind_active boolean := false;
  v_tier text;
  v_launch_state text := 'disabled';
  v_pilot boolean := false;
  v_allowed boolean := false;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('access', 'search', 'playback') THEN
    RAISE EXCEPTION 'invalid replay vault action';
  END IF;
  SELECT launch_state INTO v_launch_state
    FROM public.replay_vault_launch_config WHERE singleton;
  SELECT EXISTS (
    SELECT 1 FROM public.replay_vault_pilot_subjects
     WHERE auth_user_id = p_user_id AND enabled
  ) INTO v_pilot;
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e
     WHERE lower(btrim(e.email)) = v_email
       AND e.tier = 'mastermind'
       AND e.status = 'active'
       AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York') <= p_as_of)
       AND (e.ends_at IS NULL OR public.replay_vault_exclusive_end(e.ends_at) > p_as_of)
  ) INTO v_mastermind_active;
  SELECT c.entitlement_tier INTO v_tier
    FROM public.replay_vault_purchase_contributions c
   WHERE c.normalized_email = v_email
     AND c.contribution_starts_at <= p_as_of
     AND (c.contribution_expires_at IS NULL OR p_as_of < c.contribution_expires_at)
     AND NOT EXISTS (
       SELECT 1 FROM public.replay_vault_purchase_lifecycle_evidence l
        WHERE l.purchase_contribution_id = c.id
          AND l.lifecycle_type IN ('expiration', 'refund', 'chargeback', 'immediate_revocation')
          AND l.effective_at <= p_as_of
     )
   ORDER BY CASE c.entitlement_tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC
   LIMIT 1;
  v_allowed := coalesce(public.is_admin(p_user_id), false) AND p_preview
    OR (
      v_mastermind_active
      AND v_tier IN ('annual', 'lifetime')
      AND (v_launch_state = 'launched' OR (v_launch_state = 'pilot' AND v_pilot))
    );
  RETURN jsonb_build_object('allowed', v_allowed, 'publicReason', CASE WHEN v_allowed THEN 'allowed' ELSE 'inaccessible' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_access_decision(uuid,text,text,text,boolean,timestamptz)
  TO service_role;
