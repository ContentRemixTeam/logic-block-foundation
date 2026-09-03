-- Secure GHL -> Scorecard entitlement bridge.
--
-- GHL calls this through PostgREST with a secret request header. The browser
-- never receives the secret. Product/price mappings and idempotency are
-- enforced in the database before any entitlement can change.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.scorecard_commerce_config (
  provider text PRIMARY KEY,
  secret_sha256 text NOT NULL CHECK (secret_sha256 ~ '^[a-f0-9]{64}$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scorecard_commerce_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scorecard_commerce_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_commerce_config TO service_role;

CREATE TABLE IF NOT EXISTS public.scorecard_commerce_mappings (
  provider text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  entitlement_days integer CHECK (entitlement_days IS NULL OR entitlement_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, product_id, price_id)
);

ALTER TABLE public.scorecard_commerce_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scorecard_commerce_mappings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_commerce_mappings TO service_role;

INSERT INTO public.scorecard_commerce_mappings (
  provider,
  product_id,
  price_id,
  entitlement_days,
  is_active
) VALUES (
  'ghl',
  '6a99ffc0722c713622d07e5f',
  '6a99ffc1e7735bdf5b08f6d3',
  NULL,
  true
)
ON CONFLICT (provider, product_id, price_id) DO UPDATE SET
  entitlement_days = EXCLUDED.entitlement_days,
  is_active = EXCLUDED.is_active,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.scorecard_commerce_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  event_type text NOT NULL,
  email text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  order_id text,
  result_status text NOT NULL,
  effective_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.scorecard_commerce_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scorecard_commerce_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_commerce_events TO service_role;

CREATE INDEX IF NOT EXISTS scorecard_commerce_events_email_idx
  ON public.scorecard_commerce_events (lower(email), processed_at DESC);

CREATE OR REPLACE FUNCTION public.process_scorecard_commerce_event(
  p_event_id text,
  p_email text,
  p_event_type text,
  p_product_id text,
  p_price_id text,
  p_order_id text DEFAULT NULL,
  p_effective_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_headers jsonb;
  v_secret text;
  v_event_id text := trim(coalesce(p_event_id, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_event_type text := lower(trim(coalesce(p_event_type, '')));
  v_product_id text := trim(coalesce(p_product_id, ''));
  v_price_id text := trim(coalesce(p_price_id, ''));
  v_order_id text := nullif(trim(coalesce(p_order_id, '')), '');
  v_effective_at timestamptz := coalesce(p_effective_at, now());
  v_payload_sha256 text;
  v_existing_payload text;
  v_entitlement_days integer;
  v_entitlement_status text;
  v_entitlement_ends_at date;
  v_entitlement_id uuid;
BEGIN
  BEGIN
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  v_secret := coalesce(
    nullif(v_headers ->> 'x-ghl-api-key', ''),
    nullif(regexp_replace(coalesce(v_headers ->> 'authorization', ''), '^Bearer\s+', '', 'i'), '')
  );

  IF v_secret IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.scorecard_commerce_config config
    WHERE config.provider = 'ghl'
      AND config.is_active = true
      AND config.secret_sha256 = encode(extensions.digest(v_secret, 'sha256'), 'hex')
  ) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_event_id = '' OR char_length(v_event_id) > 200 THEN
    RAISE EXCEPTION 'Invalid event id';
  END IF;
  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR char_length(v_email) > 255 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF v_event_type NOT IN ('grant', 'purchase', 'order_paid', 'refund', 'chargeback', 'cancel', 'cancelled', 'expiration') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  SELECT mapping.entitlement_days
  INTO v_entitlement_days
  FROM public.scorecard_commerce_mappings mapping
  WHERE mapping.provider = 'ghl'
    AND mapping.product_id = v_product_id
    AND mapping.price_id = v_price_id
    AND mapping.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unmapped product or price';
  END IF;

  v_payload_sha256 := encode(
    extensions.digest(
      concat_ws('|', 'ghl', v_event_id, v_email, v_event_type, v_product_id, v_price_id, coalesce(v_order_id, '')),
      'sha256'
    ),
    'hex'
  );

  SELECT event.payload_sha256
  INTO v_existing_payload
  FROM public.scorecard_commerce_events event
  WHERE event.provider = 'ghl'
    AND event.event_id = v_event_id;

  IF FOUND THEN
    IF v_existing_payload <> v_payload_sha256 THEN
      RETURN jsonb_build_object('success', false, 'status', 'event_id_payload_conflict');
    END IF;
    RETURN jsonb_build_object('success', true, 'status', 'replayed', 'replayed', true);
  END IF;

  IF v_event_type IN ('grant', 'purchase', 'order_paid') THEN
    v_entitlement_status := 'active';
    v_entitlement_ends_at := CASE
      WHEN v_entitlement_days IS NULL THEN NULL
      ELSE v_effective_at::date + v_entitlement_days
    END;
  ELSIF v_event_type IN ('refund', 'chargeback') THEN
    v_entitlement_status := 'refunded';
    v_entitlement_ends_at := v_effective_at::date;
  ELSE
    v_entitlement_status := 'cancelled';
    v_entitlement_ends_at := v_effective_at::date;
  END IF;

  v_entitlement_id := public.grant_scorecard_entitlement(
    v_email,
    v_entitlement_status,
    v_effective_at::date,
    v_entitlement_ends_at,
    v_product_id,
    v_price_id,
    v_order_id
  );

  INSERT INTO public.scorecard_commerce_events (
    provider,
    event_id,
    payload_sha256,
    event_type,
    email,
    product_id,
    price_id,
    order_id,
    result_status,
    effective_at
  ) VALUES (
    'ghl',
    v_event_id,
    v_payload_sha256,
    v_event_type,
    v_email,
    v_product_id,
    v_price_id,
    v_order_id,
    v_entitlement_status,
    v_effective_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_entitlement_status,
    'replayed', false,
    'entitlement_id', v_entitlement_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_scorecard_commerce_event(text, text, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_scorecard_commerce_event(text, text, text, text, text, text, timestamptz) TO anon, authenticated, service_role;
