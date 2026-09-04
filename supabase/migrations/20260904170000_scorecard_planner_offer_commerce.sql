-- Scorecard -> Planner funnel commerce foundation.
--
-- This migration keeps the $9 Scorecard entitlement independent from the
-- Planner subscription. A buyer who adds the Planner and later refunds it can
-- therefore retain the Scorecard they paid for. All grants are exact-mapped,
-- amount checked, idempotent, and written to the commerce event ledger.

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_planner_tier_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_planner_tier_check
  CHECK (planner_tier IS NULL OR planner_tier IN ('monthly', 'annual', 'lifetime'));

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_planner_status_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_planner_status_check
  CHECK (planner_status IS NULL OR planner_status IN ('active', 'cancelled', 'expired', 'refunded'));

ALTER TABLE public.scorecard_commerce_mappings
  ADD COLUMN IF NOT EXISTS entitlement_kind text NOT NULL DEFAULT 'scorecard',
  ADD COLUMN IF NOT EXISTS planner_tier text,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'lifetime',
  ADD COLUMN IF NOT EXISTS interval_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS expected_currency text,
  ADD COLUMN IF NOT EXISTS expected_amount_cents integer,
  ADD COLUMN IF NOT EXISTS expected_renewal_amount_cents integer;

ALTER TABLE public.scorecard_commerce_mappings
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_entitlement_kind_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_planner_tier_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_billing_interval_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_interval_count_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_expected_currency_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_expected_amount_check,
  DROP CONSTRAINT IF EXISTS scorecard_commerce_mappings_expected_renewal_amount_check;

ALTER TABLE public.scorecard_commerce_mappings
  ADD CONSTRAINT scorecard_commerce_mappings_entitlement_kind_check
    CHECK (entitlement_kind IN ('scorecard', 'planner')),
  ADD CONSTRAINT scorecard_commerce_mappings_planner_tier_check
    CHECK (
      (entitlement_kind = 'scorecard' AND planner_tier IS NULL)
      OR (entitlement_kind = 'planner' AND planner_tier IN ('monthly', 'annual', 'lifetime'))
    ),
  ADD CONSTRAINT scorecard_commerce_mappings_billing_interval_check
    CHECK (billing_interval IN ('lifetime', 'day', 'month', 'year')),
  ADD CONSTRAINT scorecard_commerce_mappings_interval_count_check
    CHECK (interval_count > 0),
  ADD CONSTRAINT scorecard_commerce_mappings_expected_currency_check
    CHECK (expected_currency IS NULL OR expected_currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT scorecard_commerce_mappings_expected_amount_check
    CHECK (expected_amount_cents IS NULL OR expected_amount_cents >= 0),
  ADD CONSTRAINT scorecard_commerce_mappings_expected_renewal_amount_check
    CHECK (expected_renewal_amount_cents IS NULL OR expected_renewal_amount_cents >= 0);

ALTER TABLE public.scorecard_commerce_events
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS parent_transaction_id text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS entitlement_kind text;

CREATE UNIQUE INDEX IF NOT EXISTS scorecard_commerce_purchase_transaction_unique_idx
  ON public.scorecard_commerce_events (provider, transaction_id, product_id, price_id)
  WHERE transaction_id IS NOT NULL
    AND event_type IN ('grant', 'purchase', 'order_paid', 'renewal');

CREATE INDEX IF NOT EXISTS scorecard_commerce_parent_transaction_idx
  ON public.scorecard_commerce_events (provider, parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;

-- Preserve the original $27 Scorecard mapping while adding the new $9 GHL
-- Scorecard backup price. Planner prices are intentionally not inserted into
-- this legacy GHL table yet because the original GHL RPC grants Scorecard-only
-- access. ThriveCart mappings are inserted after their account-specific item
-- and payment-plan IDs have been read back.
UPDATE public.scorecard_commerce_mappings
SET
  entitlement_kind = 'scorecard',
  planner_tier = NULL,
  billing_interval = 'lifetime',
  interval_count = 1,
  expected_currency = 'USD',
  expected_amount_cents = 2700,
  updated_at = now()
WHERE provider = 'ghl'
  AND product_id = '6a99ffc0722c713622d07e5f'
  AND price_id = '6a99ffc1e7735bdf5b08f6d3';

INSERT INTO public.scorecard_commerce_mappings (
  provider,
  product_id,
  price_id,
  entitlement_days,
  entitlement_kind,
  planner_tier,
  billing_interval,
  interval_count,
  expected_currency,
  expected_amount_cents,
  expected_renewal_amount_cents,
  is_active
) VALUES
  ('ghl', '6a99ffc0722c713622d07e5f', '6a9add7f1e2f32ce563b9736', NULL, 'scorecard', NULL, 'lifetime', 1, 'USD', 900, NULL, true)
ON CONFLICT (provider, product_id, price_id) DO UPDATE SET
  entitlement_days = EXCLUDED.entitlement_days,
  entitlement_kind = EXCLUDED.entitlement_kind,
  planner_tier = EXCLUDED.planner_tier,
  billing_interval = EXCLUDED.billing_interval,
  interval_count = EXCLUDED.interval_count,
  expected_currency = EXCLUDED.expected_currency,
  expected_amount_cents = EXCLUDED.expected_amount_cents,
  expected_renewal_amount_cents = EXCLUDED.expected_renewal_amount_cents,
  is_active = EXCLUDED.is_active,
  updated_at = now();

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

  IF p_tier NOT IN ('monthly', 'annual', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid planner tier';
  END IF;

  IF p_status NOT IN ('active', 'cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'Invalid planner status';
  END IF;

  INSERT INTO public.entitlements (
    email,
    tier,
    status,
    starts_at,
    planner_tier,
    planner_status,
    planner_starts_at,
    planner_ends_at,
    planner_product_id,
    planner_price_id,
    planner_order_id,
    planner_last_purchase_at
  ) VALUES (
    lower(trim(p_email)),
    'none',
    'inactive',
    p_starts_at,
    p_tier,
    p_status,
    p_starts_at,
    p_ends_at,
    p_product_id,
    p_price_id,
    p_order_id,
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    planner_tier = EXCLUDED.planner_tier,
    planner_status = EXCLUDED.planner_status,
    planner_starts_at = LEAST(
      coalesce(public.entitlements.planner_starts_at, EXCLUDED.planner_starts_at),
      EXCLUDED.planner_starts_at
    ),
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

REVOKE ALL ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_planner_entitlement(text, text, text, date, date, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_scorecard_planner_commerce_event(
  p_provider text,
  p_event_id text,
  p_email text,
  p_event_type text,
  p_product_id text,
  p_price_id text,
  p_order_id text DEFAULT NULL,
  p_transaction_id text DEFAULT NULL,
  p_parent_transaction_id text DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_amount_cents integer DEFAULT NULL,
  p_effective_at timestamptz DEFAULT now(),
  p_access_expires_at timestamptz DEFAULT NULL,
  p_payload_sha256 text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_parent_transaction_id text := nullif(trim(coalesce(p_parent_transaction_id, '')), '');
  v_currency text := upper(nullif(trim(coalesce(p_currency, '')), ''));
  v_effective_at timestamptz := coalesce(p_effective_at, now());
  v_payload_sha256 text;
  v_existing_payload text;
  v_mapping public.scorecard_commerce_mappings%ROWTYPE;
  v_result_status text;
  v_entitlement_id uuid;
  v_starts_at date;
  v_ends_at date;
  v_existing_ends_at date;
BEGIN
  IF v_provider = '' OR v_event_id = '' OR char_length(v_event_id) > 200 THEN
    RAISE EXCEPTION 'Invalid provider or event id';
  END IF;
  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR char_length(v_email) > 255 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF v_event_type NOT IN (
    'grant', 'purchase', 'order_paid', 'renewal',
    'refund', 'chargeback', 'cancel', 'cancelled', 'cancel_at_period_end',
    'expiration', 'payment_failed', 'subscription_paused', 'subscription_resumed'
  ) THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;
  IF v_product_id = '' THEN
    RAISE EXCEPTION 'Product is required';
  END IF;

  -- ThriveCart omits payment-plan IDs on its documented renewal, refund, and
  -- cancellation payloads. Resolve those events against the exact original
  -- order/item recorded by the successful purchase.
  IF v_price_id = '' AND v_order_id IS NOT NULL THEN
    SELECT event.price_id
    INTO v_price_id
    FROM public.scorecard_commerce_events event
    WHERE event.provider = v_provider
      AND event.order_id = v_order_id
      AND event.email = v_email
      AND event.product_id = v_product_id
      AND event.event_type IN ('grant', 'purchase', 'order_paid', 'renewal')
    ORDER BY event.effective_at DESC, event.processed_at DESC
    LIMIT 1;
  END IF;

  -- A single active plan for an item is still unambiguous if a processor
  -- omits the order reference. Never guess when multiple mappings exist.
  IF v_price_id = '' THEN
    SELECT min(mapping.price_id)
    INTO v_price_id
    FROM public.scorecard_commerce_mappings mapping
    WHERE mapping.provider = v_provider
      AND mapping.product_id = v_product_id
      AND mapping.is_active = true
      AND (
        v_event_type NOT IN ('grant', 'purchase', 'order_paid', 'renewal')
        OR mapping.expected_currency IS NULL
        OR mapping.expected_currency = v_currency
      )
      AND (
        v_event_type NOT IN ('grant', 'purchase', 'order_paid', 'renewal')
        OR coalesce(
          CASE WHEN v_event_type = 'renewal' THEN mapping.expected_renewal_amount_cents END,
          mapping.expected_amount_cents
        ) IS NULL
        OR coalesce(
          CASE WHEN v_event_type = 'renewal' THEN mapping.expected_renewal_amount_cents END,
          mapping.expected_amount_cents
        ) = p_amount_cents
      )
    HAVING count(*) = 1;
  END IF;

  IF v_price_id = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'rejected_unmapped');
  END IF;

  SELECT mapping.*
  INTO v_mapping
  FROM public.scorecard_commerce_mappings mapping
  WHERE mapping.provider = v_provider
    AND mapping.product_id = v_product_id
    AND mapping.price_id = v_price_id
    AND mapping.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'rejected_unmapped');
  END IF;

  IF v_event_type IN ('grant', 'purchase', 'order_paid', 'renewal') THEN
    IF v_transaction_id IS NULL THEN
      RAISE EXCEPTION 'Transaction id is required for a paid event';
    END IF;
    IF v_mapping.expected_currency IS NOT NULL
       AND v_currency IS DISTINCT FROM v_mapping.expected_currency THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_currency');
    END IF;
    IF coalesce(
         CASE WHEN v_event_type = 'renewal' THEN v_mapping.expected_renewal_amount_cents END,
         v_mapping.expected_amount_cents
       ) IS NOT NULL
       AND p_amount_cents IS DISTINCT FROM coalesce(
         CASE WHEN v_event_type = 'renewal' THEN v_mapping.expected_renewal_amount_cents END,
         v_mapping.expected_amount_cents
       ) THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_amount');
    END IF;
  ELSIF v_event_type IN ('refund', 'chargeback', 'cancel', 'cancelled', 'cancel_at_period_end', 'expiration') THEN
    IF v_parent_transaction_id IS NULL AND v_order_id IS NOT NULL THEN
      SELECT event.transaction_id
      INTO v_parent_transaction_id
      FROM public.scorecard_commerce_events event
      WHERE event.provider = v_provider
        AND event.order_id = v_order_id
        AND event.email = v_email
        AND event.product_id = v_product_id
        AND event.price_id = v_price_id
        AND event.transaction_id IS NOT NULL
        AND event.event_type IN ('grant', 'purchase', 'order_paid', 'renewal')
      ORDER BY event.effective_at DESC, event.processed_at DESC
      LIMIT 1;
    END IF;

    IF v_parent_transaction_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.scorecard_commerce_events event
      WHERE event.provider = v_provider
        AND event.transaction_id = v_parent_transaction_id
        AND event.product_id = v_product_id
        AND event.price_id = v_price_id
        AND event.event_type IN ('grant', 'purchase', 'order_paid', 'renewal')
    ) THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
    END IF;
  END IF;

  v_payload_sha256 := coalesce(
    nullif(lower(trim(p_payload_sha256)), ''),
    encode(
      extensions.digest(
        concat_ws('|', v_provider, v_event_id, v_email, v_event_type, v_product_id, v_price_id,
          coalesce(v_order_id, ''), coalesce(v_transaction_id, ''), coalesce(v_parent_transaction_id, ''),
          coalesce(v_currency, ''), coalesce(p_amount_cents::text, '')),
        'sha256'
      ),
      'hex'
    )
  );

  IF v_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid payload hash';
  END IF;

  SELECT event.payload_sha256
  INTO v_existing_payload
  FROM public.scorecard_commerce_events event
  WHERE event.provider = v_provider
    AND event.event_id = v_event_id;

  IF FOUND THEN
    IF v_existing_payload <> v_payload_sha256 THEN
      RETURN jsonb_build_object('success', false, 'status', 'event_id_payload_conflict');
    END IF;
    RETURN jsonb_build_object('success', true, 'status', 'replayed', 'replayed', true);
  END IF;

  IF v_transaction_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.scorecard_commerce_events event
    WHERE event.provider = v_provider
      AND event.transaction_id = v_transaction_id
      AND event.product_id = v_product_id
      AND event.price_id = v_price_id
      AND event.event_type IN ('grant', 'purchase', 'order_paid', 'renewal')
  ) THEN
    RETURN jsonb_build_object('success', true, 'status', 'replayed_transaction', 'replayed', true);
  END IF;

  v_starts_at := v_effective_at::date;

  IF v_event_type IN ('grant', 'purchase', 'order_paid', 'renewal') THEN
    IF v_mapping.billing_interval = 'lifetime' THEN
      v_ends_at := NULL;
    ELSIF p_access_expires_at IS NOT NULL THEN
      v_ends_at := p_access_expires_at::date;
    ELSE
      IF v_mapping.entitlement_kind = 'planner' AND v_event_type = 'renewal' THEN
        SELECT planner_ends_at
        INTO v_existing_ends_at
        FROM public.entitlements
        WHERE email = v_email;
      ELSIF v_mapping.entitlement_kind = 'scorecard' AND v_event_type = 'renewal' THEN
        SELECT scorecard_ends_at
        INTO v_existing_ends_at
        FROM public.entitlements
        WHERE email = v_email;
      END IF;

      v_starts_at := greatest(v_effective_at::date, coalesce(v_existing_ends_at, v_effective_at::date));
      v_ends_at := CASE v_mapping.billing_interval
        WHEN 'day' THEN v_starts_at + v_mapping.interval_count
        WHEN 'month' THEN (v_starts_at + make_interval(months => v_mapping.interval_count))::date
        WHEN 'year' THEN (v_starts_at + make_interval(years => v_mapping.interval_count))::date
      END;
    END IF;

    IF v_mapping.entitlement_kind = 'scorecard' THEN
      v_entitlement_id := public.grant_scorecard_entitlement(
        v_email,
        'active',
        v_effective_at::date,
        v_ends_at,
        v_product_id,
        v_price_id,
        v_order_id
      );
    ELSE
      v_entitlement_id := public.grant_planner_entitlement(
        v_email,
        v_mapping.planner_tier,
        'active',
        v_effective_at::date,
        v_ends_at,
        v_product_id,
        v_price_id,
        v_order_id
      );
    END IF;
    v_result_status := 'active';
  ELSIF v_event_type IN ('payment_failed', 'subscription_paused') THEN
    v_result_status := 'needs_review';
  ELSIF v_event_type = 'subscription_resumed' THEN
    IF v_mapping.entitlement_kind = 'planner' THEN
      UPDATE public.entitlements
      SET planner_status = 'active', updated_at = now()
      WHERE email = v_email
        AND planner_status NOT IN ('expired', 'refunded');
    END IF;
    v_result_status := 'active';
  ELSIF v_event_type IN ('cancel', 'cancelled', 'cancel_at_period_end') THEN
    IF v_mapping.entitlement_kind = 'scorecard' THEN
      v_result_status := 'needs_review';
    ELSE
      UPDATE public.entitlements
      SET
        planner_status = 'cancelled',
        planner_ends_at = greatest(coalesce(planner_ends_at, v_effective_at::date), v_effective_at::date),
        updated_at = now()
      WHERE email = v_email;
      v_result_status := 'cancelled';
    END IF;
  ELSE
    v_result_status := CASE WHEN v_event_type IN ('refund', 'chargeback') THEN 'refunded' ELSE 'expired' END;
    IF v_mapping.entitlement_kind = 'scorecard' THEN
      v_entitlement_id := public.grant_scorecard_entitlement(
        v_email,
        v_result_status,
        v_effective_at::date,
        v_effective_at::date,
        v_product_id,
        v_price_id,
        v_order_id
      );
    ELSE
      v_entitlement_id := public.grant_planner_entitlement(
        v_email,
        v_mapping.planner_tier,
        v_result_status,
        v_effective_at::date,
        v_effective_at::date,
        v_product_id,
        v_price_id,
        v_order_id
      );
    END IF;
  END IF;

  INSERT INTO public.scorecard_commerce_events (
    provider,
    event_id,
    payload_sha256,
    event_type,
    email,
    product_id,
    price_id,
    order_id,
    transaction_id,
    parent_transaction_id,
    currency,
    amount_cents,
    entitlement_kind,
    result_status,
    effective_at
  ) VALUES (
    v_provider,
    v_event_id,
    v_payload_sha256,
    v_event_type,
    v_email,
    v_product_id,
    v_price_id,
    v_order_id,
    v_transaction_id,
    v_parent_transaction_id,
    v_currency,
    p_amount_cents,
    v_mapping.entitlement_kind,
    v_result_status,
    v_effective_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'replayed', false,
    'entitlementKind', v_mapping.entitlement_kind,
    'plannerTier', v_mapping.planner_tier,
    'accessEndsAt', v_ends_at,
    'entitlementId', v_entitlement_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) TO service_role;

-- Cancel-at-period-end remains usable through the paid-through date. A failed
-- payment does not remove access by itself; it is logged for review instead.
CREATE OR REPLACE FUNCTION public.get_current_product_capabilities()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access_state AS (
    SELECT
      public.is_admin(auth.uid()) AS is_admin,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.scorecard_status = 'active'
          AND (e.scorecard_starts_at IS NULL OR e.scorecard_starts_at <= CURRENT_DATE)
          AND (e.scorecard_ends_at IS NULL OR e.scorecard_ends_at >= CURRENT_DATE)
      ) AS has_scorecard,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.planner_tier IN ('monthly', 'annual', 'lifetime')
          AND e.planner_status IN ('active', 'cancelled')
          AND (e.planner_starts_at IS NULL OR e.planner_starts_at <= CURRENT_DATE)
          AND (e.planner_ends_at IS NULL OR e.planner_ends_at >= CURRENT_DATE)
      ) AS has_planner,
      EXISTS (
        SELECT 1
        FROM public.entitlements e
        WHERE lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND e.tier = 'mastermind'
          AND e.status = 'active'
          AND (e.starts_at IS NULL OR e.starts_at <= CURRENT_DATE)
          AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
      ) AS has_mastermind
  )
  SELECT ARRAY(
    SELECT capability
    FROM access_state a
    CROSS JOIN LATERAL (
      VALUES
        ('scorecard.core'::text, a.is_admin OR a.has_scorecard OR a.has_planner OR a.has_mastermind),
        ('planner.core'::text, a.is_admin OR a.has_planner OR a.has_mastermind),
        ('mastermind.core'::text, a.is_admin OR a.has_mastermind)
    ) AS capabilities(capability, allowed)
    WHERE allowed
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_product_capabilities() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_product_capabilities() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_product_capabilities() TO authenticated;
