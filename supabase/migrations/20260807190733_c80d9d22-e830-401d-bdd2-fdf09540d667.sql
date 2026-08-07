CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.forward_low_battery_planner_login_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE LOWER(e.email) = LOWER(COALESCE(NEW.member_email, ''))
      AND e.tier = 'mastermind'
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://gigantic-albatross.pikapod.net/webhook/amm-ghl-membership-intelligence-v2',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'event_id', NEW.id::text,
        'contact_id', NEW.user_id::text,
        'event_type', 'portal_login',
        'event_timestamp', NEW.occurred_at,
        'source', 'low_battery_planner',
        'platform', 'low_battery_planner',
        'member_email', NEW.member_email,
        'evidence', NEW.evidence->>'fact',
        'metadata', jsonb_build_object(
          'auth_provider', COALESCE(NEW.evidence->>'auth_provider', 'unknown'),
          'source_table', 'low_battery_planner_login_events',
          'exported_event', true,
          'audience', 'mastermind_only'
        )
      ),
      timeout_milliseconds := 3000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'forward_low_battery_planner_login_event failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.forward_low_battery_planner_login_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_forward_low_battery_planner_login_event ON public.low_battery_planner_login_events;
CREATE TRIGGER trg_forward_low_battery_planner_login_event
AFTER INSERT ON public.low_battery_planner_login_events
FOR EACH ROW EXECUTE FUNCTION public.forward_low_battery_planner_login_event();