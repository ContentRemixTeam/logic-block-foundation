-- Wave 2: caller-bound capability projection for Planner, Mastermind, and Vault.
-- This migration is additive. It does not replace the existing entitlement ledger
-- or Replay Vault R10 decision function, and it never accepts browser identity.

CREATE TABLE IF NOT EXISTS public.capability_verification_holds (
  hold_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability_key text NOT NULL CHECK (capability_key IN (
    'planner.base',
    'mastermind.section',
    'mastermind.learning.assigned',
    'mastermind.ask_faith',
    'mastermind.community_link',
    'vault.discovery',
    'vault.search',
    'vault.playback',
    'vault.saved_videos',
    'admin.curriculum_preview'
  )),
  hold_state text NOT NULL CHECK (hold_state IN ('verification_unavailable', 'review_required')),
  reason_code text NOT NULL CHECK (reason_code IN (
    'missing_evidence',
    'contradictory_evidence',
    'stale_evidence',
    'verification_service_unavailable',
    'manual_review'
  )),
  evidence_checked_at timestamptz,
  starts_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS capability_verification_holds_lookup_idx
  ON public.capability_verification_holds(user_id, capability_key, starts_at DESC, hold_id DESC);

ALTER TABLE public.capability_verification_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.capability_verification_holds
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mastermind_wave2_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS capability_verification_holds_append_only
  ON public.capability_verification_holds;
CREATE TRIGGER capability_verification_holds_append_only
  BEFORE UPDATE OR DELETE ON public.capability_verification_holds
  FOR EACH ROW EXECUTE FUNCTION public.mastermind_wave2_forbid_mutation();

CREATE OR REPLACE FUNCTION public.set_capability_verification_hold(
  p_user_id uuid,
  p_capability_key text,
  p_hold_state text,
  p_reason_code text,
  p_evidence_checked_at timestamptz,
  p_expires_at timestamptz,
  p_created_by text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hold_id uuid;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'capability hold requires an existing auth user';
  END IF;
  IF p_capability_key IS NULL OR p_capability_key NOT IN (
    'planner.base', 'mastermind.section', 'mastermind.learning.assigned',
    'mastermind.ask_faith', 'mastermind.community_link', 'vault.discovery',
    'vault.search', 'vault.playback', 'vault.saved_videos', 'admin.curriculum_preview'
  ) THEN
    RAISE EXCEPTION 'unsupported capability key';
  END IF;
  IF p_hold_state IS NULL OR p_hold_state NOT IN ('verification_unavailable', 'review_required') THEN
    RAISE EXCEPTION 'verification holds may only fail closed';
  END IF;
  IF p_reason_code IS NULL OR p_reason_code NOT IN (
    'missing_evidence', 'contradictory_evidence', 'stale_evidence',
    'verification_service_unavailable', 'manual_review'
  ) THEN
    RAISE EXCEPTION 'unsupported capability hold reason';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'capability hold expiry must be in the future';
  END IF;
  IF btrim(coalesce(p_created_by, '')) = '' THEN
    RAISE EXCEPTION 'capability hold creator is required';
  END IF;

  INSERT INTO public.capability_verification_holds(
    user_id, capability_key, hold_state, reason_code, evidence_checked_at, expires_at, created_by
  ) VALUES (
    p_user_id, p_capability_key, p_hold_state, p_reason_code,
    p_evidence_checked_at, p_expires_at, p_created_by
  )
  RETURNING hold_id INTO v_hold_id;

  RETURN v_hold_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mastermind_membership_evidence_state(
  p_user_id uuid,
  p_as_of timestamptz
) RETURNS TABLE(decision_state text, safe_reason text, normalized_email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text;
  v_count integer := 0;
  v_status text;
  v_starts_at date;
  v_ends_at date;
  v_created_at timestamptz;
  v_updated_at timestamptz;
BEGIN
  SELECT lower(btrim(u.email))
    INTO v_email
    FROM auth.users u
   WHERE u.id = p_user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN QUERY SELECT 'verification_unavailable', 'identity_verification_unavailable', NULL::text;
    RETURN;
  END IF;

  SELECT count(*), min(e.status), min(e.starts_at), min(e.ends_at),
         min(e.created_at), min(e.updated_at)
    INTO v_count, v_status, v_starts_at, v_ends_at, v_created_at, v_updated_at
    FROM public.entitlements e
   WHERE lower(btrim(e.email)) = v_email
     AND e.tier = 'mastermind';

  IF v_count = 0 THEN
    RETURN QUERY SELECT 'denied', 'no_active_mastermind_membership', v_email;
    RETURN;
  END IF;
  IF v_count > 1 THEN
    RETURN QUERY SELECT 'review_required', 'membership_evidence_conflict', v_email;
    RETURN;
  END IF;
  IF (v_starts_at IS NOT NULL AND v_ends_at IS NOT NULL AND v_starts_at > v_ends_at)
     OR (v_created_at IS NOT NULL AND v_updated_at IS NOT NULL AND v_updated_at < v_created_at) THEN
    RETURN QUERY SELECT 'review_required', 'membership_evidence_conflict', v_email;
    RETURN;
  END IF;
  IF v_status <> 'active' THEN
    RETURN QUERY SELECT 'denied', 'mastermind_membership_inactive', v_email;
    RETURN;
  END IF;
  IF v_starts_at IS NOT NULL
     AND (v_starts_at::timestamp AT TIME ZONE 'America/New_York') > p_as_of THEN
    RETURN QUERY SELECT 'denied', 'mastermind_membership_not_started', v_email;
    RETURN;
  END IF;
  IF v_ends_at IS NOT NULL AND public.replay_vault_exclusive_end(v_ends_at) <= p_as_of THEN
    RETURN QUERY SELECT 'denied', 'mastermind_membership_expired', v_email;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'granted', 'active_mastermind_membership', v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.mastermind_capability_state(
  p_user_id uuid,
  p_capability_key text,
  p_as_of timestamptz
) RETURNS TABLE(decision_state text, safe_reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hold public.capability_verification_holds%ROWTYPE;
  v_membership_state text;
  v_membership_reason text;
  v_email text;
  v_vault jsonb;
  v_action text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 'denied', 'authentication_required';
    RETURN;
  END IF;
  IF p_capability_key IS NULL OR p_capability_key NOT IN (
    'planner.base', 'mastermind.section', 'mastermind.learning.assigned',
    'mastermind.ask_faith', 'mastermind.community_link', 'vault.discovery',
    'vault.search', 'vault.playback', 'vault.saved_videos', 'admin.curriculum_preview'
  ) THEN
    RAISE EXCEPTION 'unsupported capability key';
  END IF;

  SELECT h.*
    INTO v_hold
    FROM public.capability_verification_holds h
   WHERE h.user_id = p_user_id
     AND h.capability_key = p_capability_key
     AND h.starts_at <= p_as_of
     AND (h.expires_at IS NULL OR p_as_of < h.expires_at)
   ORDER BY CASE h.hold_state WHEN 'review_required' THEN 2 ELSE 1 END DESC,
            h.starts_at DESC,
            h.hold_id DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_hold.hold_state,
      CASE v_hold.reason_code
        WHEN 'contradictory_evidence' THEN 'evidence_review_required'
        WHEN 'manual_review' THEN 'evidence_review_required'
        WHEN 'stale_evidence' THEN 'verification_unavailable'
        WHEN 'missing_evidence' THEN 'verification_unavailable'
        ELSE 'verification_unavailable'
      END;
    RETURN;
  END IF;

  IF p_capability_key = 'planner.base' THEN
    RETURN QUERY SELECT 'granted', 'authenticated_planner_account';
    RETURN;
  END IF;

  IF p_capability_key = 'admin.curriculum_preview' THEN
    IF coalesce(public.is_admin(p_user_id), false) THEN
      RETURN QUERY SELECT 'granted', 'verified_admin';
    ELSE
      RETURN QUERY SELECT 'denied', 'admin_access_required';
    END IF;
    RETURN;
  END IF;

  SELECT m.decision_state, m.safe_reason, m.normalized_email
    INTO v_membership_state, v_membership_reason, v_email
    FROM public.mastermind_membership_evidence_state(p_user_id, p_as_of) m;

  IF v_membership_state <> 'granted' THEN
    RETURN QUERY SELECT v_membership_state, v_membership_reason;
    RETURN;
  END IF;

  IF p_capability_key IN (
    'mastermind.section', 'mastermind.learning.assigned',
    'mastermind.ask_faith', 'mastermind.community_link'
  ) THEN
    RETURN QUERY SELECT 'granted', 'active_mastermind_membership';
    RETURN;
  END IF;

  v_action := CASE p_capability_key
    WHEN 'vault.search' THEN 'search'
    WHEN 'vault.playback' THEN 'playback'
    ELSE 'access'
  END;
  BEGIN
    v_vault := public.replay_vault_access_decision(
      p_user_id, v_email, NULL, v_action, false, p_as_of
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'verification_unavailable', 'verification_unavailable';
    RETURN;
  END;

  IF v_vault IS NULL OR NOT (v_vault ? 'allowed')
     OR v_vault->>'allowed' NOT IN ('true', 'false') THEN
    RETURN QUERY SELECT 'verification_unavailable', 'verification_unavailable';
    RETURN;
  END IF;

  IF (v_vault->>'allowed')::boolean THEN
    RETURN QUERY SELECT 'granted', 'vault_access_available';
  ELSE
    RETURN QUERY SELECT 'denied', 'vault_access_unavailable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_capabilities()
RETURNS TABLE(
  capability_key text,
  capability_state text,
  reason text,
  evaluated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_as_of timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT requested.capability_key, state.decision_state, state.safe_reason, v_as_of
    FROM unnest(ARRAY[
      'planner.base',
      'mastermind.section',
      'mastermind.learning.assigned',
      'mastermind.ask_faith',
      'mastermind.community_link',
      'vault.discovery',
      'vault.search',
      'vault.playback',
      'vault.saved_videos',
      'admin.curriculum_preview'
    ]::text[]) WITH ORDINALITY AS requested(capability_key, ordinal)
    CROSS JOIN LATERAL public.mastermind_capability_state(
      v_user_id, requested.capability_key, v_as_of
    ) state
   ORDER BY requested.ordinal;
END;
$$;

REVOKE ALL ON FUNCTION public.mastermind_wave2_forbid_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_capability_verification_hold(uuid,text,text,text,timestamptz,timestamptz,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_capability_verification_hold(uuid,text,text,text,timestamptz,timestamptz,text)
  TO service_role;
REVOKE ALL ON FUNCTION public.mastermind_membership_evidence_state(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mastermind_capability_state(uuid,text,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_my_capabilities()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_my_capabilities()
  TO authenticated;

COMMENT ON TABLE public.capability_verification_holds IS
  'Append-only, fail-closed verification exceptions. Holds can never grant a capability.';
COMMENT ON FUNCTION public.resolve_my_capabilities() IS
  'Caller-only projection of the ten independent Planner, Mastermind, Vault, and admin capability decisions.';
