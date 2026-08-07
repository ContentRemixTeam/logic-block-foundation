CREATE TABLE public.low_battery_planner_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  event_type text NOT NULL DEFAULT 'portal_login' CHECK (event_type = 'portal_login'),
  source text NOT NULL DEFAULT 'low_battery_planner' CHECK (source = 'low_battery_planner'),
  occurred_at timestamptz NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX low_battery_planner_login_events_user_time_idx
  ON public.low_battery_planner_login_events (user_id, occurred_at DESC);
CREATE INDEX low_battery_planner_login_events_unexported_idx
  ON public.low_battery_planner_login_events (occurred_at)
  WHERE exported_at IS NULL;

ALTER TABLE public.low_battery_planner_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planner login events"
  ON public.low_battery_planner_login_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view planner login events"
  ON public.low_battery_planner_login_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_low_battery_planner_login()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_signed_in_at timestamptz;
  v_dedupe_key text;
  v_event_id uuid;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT last_sign_in_at INTO v_signed_in_at FROM auth.users WHERE id = v_user_id;
  v_signed_in_at := coalesce(v_signed_in_at, now());
  v_dedupe_key := 'low_battery_planner:portal_login:' || v_user_id::text || ':' || v_signed_in_at::text;

  INSERT INTO public.low_battery_planner_login_events (
    user_id, member_email, occurred_at, dedupe_key, evidence
  ) VALUES (
    v_user_id,
    v_email,
    v_signed_in_at,
    v_dedupe_key,
    jsonb_build_object(
      'fact', 'Authenticated user signed into the Low Battery Planner',
      'auth_provider', coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', 'unknown')
    )
  )
  ON CONFLICT (dedupe_key) DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_low_battery_planner_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_low_battery_planner_login() TO authenticated;
