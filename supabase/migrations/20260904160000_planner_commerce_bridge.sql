-- Secure GHL -> Planner entitlement bridge.
--
-- This is intentionally separate from ghl-webhook-grant-planner, which is the
-- Replay Vault commercial pipeline despite its legacy name. Only the two
-- explicitly verified Planner product/price pairs can change Planner access.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_planner_status_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_planner_status_check
  CHECK (planner_status IS NULL OR planner_status IN ('active', 'cancelled', 'expired', 'refunded'));

CREATE TABLE IF NOT EXISTS public.planner_commerce_mappings (
  provider text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  planner_tier text NOT NULL CHECK (planner_tier IN ('annual', 'lifetime')),
  entitlement_days integer CHECK (
    (planner_tier = 'annual' AND entitlement_days > 0)
    OR (planner_tier = 'lifetime' AND entitlement_days IS NULL)
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, product_id, price_id)
);

ALTER TABLE public.planner_commerce_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planner_commerce_mappings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_commerce_mappings TO service_role;

-- Product mappings are intentionally not seeded here. They must be added only
-- after the GHL records are verified as belonging to the 90 Day Planner.

CREATE TABLE IF NOT EXISTS public.planner_commerce_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  event_type text NOT NULL,
  email text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  order_id text,
  transaction_id text,
  result_status text NOT NULL,
  effective_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.planner_commerce_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planner_commerce_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_commerce_events TO service_role;

CREATE INDEX IF NOT EXISTS planner_commerce_events_email_idx
  ON public.planner_commerce_events (lower(email), effective_at DESC);

CREATE OR REPLACE FUNCTION public.grant_planner_entitlement(
  p_email text,
  p_tier text,
  p_status text DEFAULT 'active',
  p_starts_at date DEFAULT CURRENT_DATE,
  p_ends_at date DEFAULT NULL,
  p_product_id text DEFAULT NULL,
  p_price_id text DEFAULT NULL,
  p_order_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF nullif(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF p_tier NOT IN ('annual', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid Planner tier';
  END IF;
  IF p_status NOT IN ('active', 'cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'Invalid Planner status';
  END IF;
  IF p_tier = 'lifetime' AND p_status = 'active' AND p_ends_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lifetime Planner access cannot expire';
  END IF;
  IF p_tier = 'annual' AND p_status = 'active' AND p_ends_at IS NULL THEN
    RAISE EXCEPTION 'Annual Planner access requires an end date';
  END IF;

  INSERT INTO public.entitlements (
    email, tier, status, starts_at,
    planner_tier, planner_status, planner_starts_at, planner_ends_at,
    planner_product_id, planner_price_id, planner_order_id, planner_last_purchase_at
  ) VALUES (
    lower(trim(p_email)), 'none', 'inactive', p_starts_at,
    p_tier, p_status, p_starts_at, p_ends_at,
    p_product_id, p_price_id, p_order_id, now()
  )
  ON CONFLICT (email) DO UPDATE SET
    planner_tier = EXCLUDED.planner_tier,
    planner_status = EXCLUDED.planner_status,
    planner_starts_at = EXCLUDED.planner_starts_at,
    planner_ends_at = EXCLUDED.planner_ends_at,
    planner_product_id = coalesce(EXCLUDED.planner_product_id, public.entitlements.planner_product_id),
    planner_price_id = coalesce(EXCLUDED.planner_price_id, public.entitlements.planner_price_id),
    planner_order_id = coalesce(EXCLUDED.planner_order_id, public.entitlements.planner_order_id),
    planner_last_purchase_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.process_planner_commerce_event(
  p_provider text,
  p_event_id text,
  p_email text,
  p_event_type text,
  p_product_id text,
  p_price_id text,
  p_order_id text DEFAULT NULL,
  p_transaction_id text DEFAULT NULL,
  p_effective_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_provider text := lower(trim(coalesce(p_provider, '')));
  v_event_id text := trim(coalesce(p_event_id, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_event_type text := lower(trim(coalesce(p_event_type, '')));
  v_product_id text := trim(coalesce(p_product_id, ''));
  v_price_id text := trim(coalesce(p_price_id, ''));
  v_order_id text := nullif(trim(coalesce(p_order_id, '')), '');
  v_transaction_id text := nullif(trim(coalesce(p_transaction_id, '')), '');
  v_effective_at timestamptz := coalesce(p_effective_at, now());
  v_payload_sha256 text;
  v_existing_payload text;
  v_tier text;
  v_days integer;
  v_status text;
  v_starts_at date;
  v_ends_at date;
  v_current_tier text;
  v_current_status text;
  v_current_ends_at date;
  v_latest_effective_at timestamptz;
  v_entitlement_id uuid;
BEGIN
  IF v_provider <> 'ghl' THEN RAISE EXCEPTION 'Invalid provider'; END IF;
  IF v_event_id = '' OR char_length(v_event_id) > 200 THEN RAISE EXCEPTION 'Invalid event id'; END IF;
  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR char_length(v_email) > 255 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF v_event_type NOT IN ('grant', 'purchase', 'order_paid', 'renewal', 'refund', 'chargeback', 'cancel', 'cancelled', 'expiration') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  -- Serialize duplicate deliveries before reading the event ledger. Without
  -- this lock, two simultaneous deliveries could both extend an annual term.
  PERFORM pg_advisory_xact_lock(hashtextextended('planner-event:' || v_provider || ':' || v_event_id, 0));

  SELECT planner_tier, entitlement_days INTO v_tier, v_days
  FROM public.planner_commerce_mappings
  WHERE provider = v_provider AND product_id = v_product_id AND price_id = v_price_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unmapped product or price'; END IF;

  v_payload_sha256 := encode(extensions.digest(concat_ws('|', v_provider, v_event_id, v_email,
    v_event_type, v_product_id, v_price_id, coalesce(v_order_id, ''), coalesce(v_transaction_id, '')), 'sha256'), 'hex');

  SELECT payload_sha256 INTO v_existing_payload
  FROM public.planner_commerce_events WHERE provider = v_provider AND event_id = v_event_id;
  IF FOUND THEN
    IF v_existing_payload <> v_payload_sha256 THEN
      RETURN jsonb_build_object('success', false, 'status', 'event_id_payload_conflict');
    END IF;
    RETURN jsonb_build_object('success', true, 'status', 'replayed', 'replayed', true);
  END IF;

  -- Different events for the same buyer also need a stable order so an older
  -- refund cannot race a newer renewal.
  PERFORM pg_advisory_xact_lock(hashtextextended('planner-email:' || v_provider || ':' || v_email, 0));

  SELECT max(effective_at) INTO v_latest_effective_at
  FROM public.planner_commerce_events WHERE provider = v_provider AND lower(email) = v_email;
  IF v_latest_effective_at IS NOT NULL AND v_effective_at < v_latest_effective_at THEN
    INSERT INTO public.planner_commerce_events
      (provider, event_id, payload_sha256, event_type, email, product_id, price_id, order_id, transaction_id, result_status, effective_at)
    VALUES
      (v_provider, v_event_id, v_payload_sha256, v_event_type, v_email, v_product_id, v_price_id, v_order_id, v_transaction_id, 'ignored_stale', v_effective_at);
    RETURN jsonb_build_object('success', true, 'status', 'ignored_stale', 'replayed', false);
  END IF;

  SELECT planner_tier, planner_status, planner_ends_at
  INTO v_current_tier, v_current_status, v_current_ends_at
  FROM public.entitlements WHERE email = v_email FOR UPDATE;

  v_starts_at := v_effective_at::date;
  IF v_event_type IN ('grant', 'purchase', 'order_paid', 'renewal') THEN
    v_status := 'active';
    IF v_tier = 'lifetime' THEN
      v_ends_at := NULL;
    ELSE
      v_ends_at := greatest(v_effective_at::date, CASE
        WHEN v_current_tier = 'annual' AND v_current_status = 'active' THEN v_current_ends_at
        ELSE NULL
      END) + v_days;
    END IF;
  ELSIF v_event_type IN ('refund', 'chargeback') THEN
    v_status := 'refunded';
    v_ends_at := v_effective_at::date;
  ELSIF v_event_type = 'expiration' THEN
    v_status := 'expired';
    v_ends_at := v_effective_at::date;
  ELSE
    v_status := 'cancelled';
    v_ends_at := v_effective_at::date;
  END IF;

  v_entitlement_id := public.grant_planner_entitlement(
    v_email, v_tier, v_status, v_starts_at, v_ends_at, v_product_id, v_price_id, v_order_id
  );

  INSERT INTO public.planner_commerce_events
    (provider, event_id, payload_sha256, event_type, email, product_id, price_id, order_id, transaction_id, result_status, effective_at)
  VALUES
    (v_provider, v_event_id, v_payload_sha256, v_event_type, v_email, v_product_id, v_price_id, v_order_id, v_transaction_id, v_status, v_effective_at);

  RETURN jsonb_build_object('success', true, 'status', v_status, 'replayed', false,
    'tier', v_tier, 'ends_at', v_ends_at, 'entitlement_id', v_entitlement_id);
END;
$$;

REVOKE ALL ON FUNCTION public.process_planner_commerce_event(text, text, text, text, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_planner_commerce_event(text, text, text, text, text, text, text, text, timestamptz) TO service_role;
