-- Harden the ThriveCart Scorecard -> Planner commerce path before launch.
--
-- Every successful charge becomes an immutable contribution. Lifecycle events
-- are bound to the same buyer, order, product, price, and transaction before
-- aggregate access changes. Advisory locks serialize event, transaction, and
-- buyer updates so duplicate or out-of-order deliveries fail closed.

ALTER TABLE public.scorecard_commerce_events
  ADD COLUMN IF NOT EXISTS semantic_sha256 text;

ALTER TABLE public.scorecard_commerce_events
  DROP CONSTRAINT IF EXISTS scorecard_commerce_events_semantic_sha256_check;

ALTER TABLE public.scorecard_commerce_events
  ADD CONSTRAINT scorecard_commerce_events_semantic_sha256_check
  CHECK (semantic_sha256 IS NULL OR semantic_sha256 ~ '^[a-f0-9]{64}$');

DROP INDEX IF EXISTS public.scorecard_commerce_purchase_transaction_unique_idx;

CREATE UNIQUE INDEX scorecard_commerce_purchase_transaction_unique_idx
  ON public.scorecard_commerce_events (provider, transaction_id)
  WHERE transaction_id IS NOT NULL
    AND event_type IN ('grant', 'purchase', 'order_paid', 'renewal');

CREATE TABLE IF NOT EXISTS public.scorecard_commerce_contributions (
  provider text NOT NULL,
  transaction_id text NOT NULL,
  purchase_event_id text NOT NULL,
  semantic_sha256 text NOT NULL CHECK (semantic_sha256 ~ '^[a-f0-9]{64}$'),
  email text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  order_id text,
  entitlement_kind text NOT NULL CHECK (entitlement_kind IN ('scorecard', 'planner')),
  planner_tier text CHECK (
    (entitlement_kind = 'scorecard' AND planner_tier IS NULL)
    OR (entitlement_kind = 'planner' AND planner_tier IN ('monthly', 'annual', 'lifetime'))
  ),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'refunded')),
  starts_at date NOT NULL,
  ends_at date,
  currency text,
  amount_cents integer,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, transaction_id)
);

ALTER TABLE public.scorecard_commerce_contributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scorecard_commerce_contributions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_commerce_contributions TO service_role;

CREATE INDEX IF NOT EXISTS scorecard_commerce_contributions_subscription_idx
  ON public.scorecard_commerce_contributions
  (provider, lower(email), order_id, product_id, price_id, effective_at DESC);

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
  v_parent_transaction_id text := nullif(trim(coalesce(p_parent_transaction_id, '')), '');
  v_currency text := upper(nullif(trim(coalesce(p_currency, '')), ''));
  -- Official ThriveCart lifecycle payloads omit timestamps. Record the first
  -- authenticated receipt once in the transaction; replay hashes deliberately
  -- exclude this server-derived value.
  v_effective_at timestamptz := coalesce(p_effective_at, transaction_timestamp());
  v_payload_sha256 text := lower(trim(coalesce(p_payload_sha256, '')));
  v_event_semantic_sha256 text;
  v_transaction_semantic_sha256 text;
  v_existing_payload_sha256 text;
  v_existing_semantic_sha256 text;
  v_mapping public.scorecard_commerce_mappings%ROWTYPE;
  v_parent public.scorecard_commerce_contributions%ROWTYPE;
  v_survivor public.scorecard_commerce_contributions%ROWTYPE;
  v_entitlement_id uuid;
  v_starts_at date;
  v_ends_at date;
  v_expected_ends_at date;
  v_existing_ends_at date;
  v_result_status text;
  v_target_count integer;
  v_survivor_status text;
  v_current_product_id text;
  v_current_price_id text;
  v_current_order_id text;
  v_current_tier text;
  v_current_status text;
  v_current_starts_at date;
  v_current_ends_at date;
BEGIN
  IF v_provider <> 'thrivecart' THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;
  IF v_event_id = '' OR char_length(v_event_id) > 200 THEN
    RAISE EXCEPTION 'Invalid event id';
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
  IF v_effective_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'rejected_timestamp');
  END IF;
  IF v_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid payload hash';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scorecard-event:' || v_provider || ':' || v_event_id, 0));

  -- Official ThriveCart lifecycle payloads can omit payment-plan IDs. Resolve
  -- only when this buyer/order/item has one unambiguous price.
  IF v_price_id = '' AND v_order_id IS NOT NULL THEN
    SELECT min(contribution.price_id), count(DISTINCT contribution.price_id)
    INTO v_price_id, v_target_count
    FROM public.scorecard_commerce_contributions contribution
    WHERE contribution.provider = v_provider
      AND contribution.email = v_email
      AND contribution.order_id = v_order_id
      AND contribution.product_id = v_product_id;
    IF v_target_count <> 1 THEN
      v_price_id := '';
    END IF;
  END IF;

  IF v_price_id = '' THEN
    SELECT min(mapping.price_id), count(*)
    INTO v_price_id, v_target_count
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
      );
    IF v_target_count <> 1 THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_unmapped');
    END IF;
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
    IF v_order_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_order');
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
  END IF;

  v_event_semantic_sha256 := encode(extensions.digest(concat_ws('|',
    v_provider, v_event_id, v_email, v_event_type, v_product_id, v_price_id,
    coalesce(v_order_id, ''), coalesce(v_transaction_id, ''),
    coalesce(v_parent_transaction_id, ''), coalesce(v_currency, ''),
    coalesce(p_amount_cents::text, ''),
    coalesce(p_access_expires_at::text, '')
  ), 'sha256'), 'hex');

  SELECT event.payload_sha256, event.semantic_sha256
  INTO v_existing_payload_sha256, v_existing_semantic_sha256
  FROM public.scorecard_commerce_events event
  WHERE event.provider = v_provider AND event.event_id = v_event_id;
  IF FOUND THEN
    IF v_existing_payload_sha256 IS DISTINCT FROM v_payload_sha256
       OR v_existing_semantic_sha256 IS DISTINCT FROM v_event_semantic_sha256 THEN
      RETURN jsonb_build_object('success', false, 'status', 'event_id_payload_conflict');
    END IF;
    RETURN jsonb_build_object('success', true, 'status', 'replayed', 'replayed', true);
  END IF;

  IF v_transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('scorecard-transaction:' || v_provider || ':' || v_transaction_id, 0));
  ELSIF v_parent_transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('scorecard-transaction:' || v_provider || ':' || v_parent_transaction_id, 0));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('scorecard-email:' || v_provider || ':' || v_email, 0));

  SELECT
    entitlement.planner_product_id,
    entitlement.planner_price_id,
    entitlement.planner_order_id,
    entitlement.planner_tier,
    entitlement.planner_status,
    entitlement.planner_starts_at,
    entitlement.planner_ends_at
  INTO
    v_current_product_id,
    v_current_price_id,
    v_current_order_id,
    v_current_tier,
    v_current_status,
    v_current_starts_at,
    v_current_ends_at
  FROM public.entitlements entitlement
  WHERE entitlement.email = v_email
  FOR UPDATE;

  IF v_event_type IN ('grant', 'purchase', 'order_paid', 'renewal') THEN
    v_starts_at := v_effective_at::date;
    IF v_mapping.entitlement_kind = 'planner' AND v_event_type = 'renewal' THEN
      SELECT max(contribution.ends_at)
      INTO v_existing_ends_at
      FROM public.scorecard_commerce_contributions contribution
      WHERE contribution.provider = v_provider
        AND contribution.email = v_email
        AND contribution.entitlement_kind = 'planner'
        AND contribution.status IN ('active', 'cancelled');
      v_starts_at := greatest(v_starts_at, coalesce(v_existing_ends_at, v_starts_at));
    END IF;

    IF v_mapping.billing_interval = 'lifetime' THEN
      v_ends_at := NULL;
    ELSE
      v_expected_ends_at := CASE v_mapping.billing_interval
        WHEN 'day' THEN v_starts_at + v_mapping.interval_count
        WHEN 'month' THEN (v_starts_at + make_interval(months => v_mapping.interval_count))::date
        WHEN 'year' THEN (v_starts_at + make_interval(years => v_mapping.interval_count))::date
      END;
      IF p_access_expires_at IS NOT NULL THEN
        IF p_access_expires_at::date <= v_starts_at
           OR abs(p_access_expires_at::date - v_expected_ends_at) > 3 THEN
          RETURN jsonb_build_object('success', false, 'status', 'rejected_expiry');
        END IF;
        v_ends_at := p_access_expires_at::date;
      ELSE
        v_ends_at := v_expected_ends_at;
      END IF;
    END IF;

    v_transaction_semantic_sha256 := encode(extensions.digest(concat_ws('|',
      v_provider, v_email, v_event_type, v_product_id, v_price_id, v_order_id,
      v_transaction_id, coalesce(v_currency, ''), coalesce(p_amount_cents::text, ''),
      coalesce(p_access_expires_at::text, '')
    ), 'sha256'), 'hex');

    SELECT contribution.semantic_sha256
    INTO v_existing_semantic_sha256
    FROM public.scorecard_commerce_contributions contribution
    WHERE contribution.provider = v_provider
      AND contribution.transaction_id = v_transaction_id;
    IF FOUND THEN
      IF v_existing_semantic_sha256 IS DISTINCT FROM v_transaction_semantic_sha256 THEN
        RETURN jsonb_build_object('success', false, 'status', 'transaction_payload_conflict');
      END IF;
      RETURN jsonb_build_object('success', true, 'status', 'replayed_transaction', 'replayed', true);
    END IF;

    INSERT INTO public.scorecard_commerce_contributions (
      provider, transaction_id, purchase_event_id, semantic_sha256, email,
      product_id, price_id, order_id, entitlement_kind, planner_tier, status,
      starts_at, ends_at, currency, amount_cents, effective_at
    ) VALUES (
      v_provider, v_transaction_id, v_event_id, v_transaction_semantic_sha256, v_email,
      v_product_id, v_price_id, v_order_id, v_mapping.entitlement_kind,
      v_mapping.planner_tier, 'active', v_starts_at, v_ends_at, v_currency,
      p_amount_cents, v_effective_at
    );
    v_result_status := 'active';
  ELSIF v_event_type IN ('payment_failed', 'subscription_paused') THEN
    IF v_order_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.scorecard_commerce_contributions contribution
      WHERE contribution.provider = v_provider
        AND contribution.email = v_email
        AND contribution.order_id = v_order_id
        AND contribution.product_id = v_product_id
        AND contribution.price_id = v_price_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
    END IF;
    v_result_status := 'needs_review';
  ELSIF v_event_type IN ('cancel', 'cancelled', 'cancel_at_period_end', 'subscription_resumed') THEN
    IF v_order_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
    END IF;
    UPDATE public.scorecard_commerce_contributions contribution
    SET
      status = CASE WHEN v_event_type = 'subscription_resumed' THEN 'active' ELSE 'cancelled' END,
      updated_at = now()
    WHERE contribution.provider = v_provider
      AND contribution.email = v_email
      AND contribution.order_id = v_order_id
      AND contribution.product_id = v_product_id
      AND contribution.price_id = v_price_id
      AND contribution.status IN ('active', 'cancelled');
    GET DIAGNOSTICS v_target_count = ROW_COUNT;
    IF v_target_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
    END IF;
    v_result_status := CASE WHEN v_event_type = 'subscription_resumed' THEN 'active' ELSE 'cancelled' END;
  ELSE
    IF v_parent_transaction_id IS NOT NULL THEN
      SELECT contribution.*
      INTO v_parent
      FROM public.scorecard_commerce_contributions contribution
      WHERE contribution.provider = v_provider
        AND contribution.transaction_id = v_parent_transaction_id
        AND contribution.email = v_email
        AND contribution.product_id = v_product_id
        AND contribution.price_id = v_price_id
        AND (v_order_id IS NULL OR contribution.order_id = v_order_id)
      FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
      END IF;
    ELSE
      IF v_order_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'rejected_parent_purchase');
      END IF;
      SELECT count(*), min(contribution.transaction_id)
      INTO v_target_count, v_parent_transaction_id
      FROM public.scorecard_commerce_contributions contribution
      WHERE contribution.provider = v_provider
        AND contribution.email = v_email
        AND contribution.order_id = v_order_id
        AND contribution.product_id = v_product_id
        AND contribution.price_id = v_price_id
        AND (p_amount_cents IS NULL OR contribution.amount_cents = p_amount_cents);
      IF v_target_count <> 1 THEN
        RETURN jsonb_build_object(
          'success', false,
          'status', CASE WHEN v_target_count = 0 THEN 'rejected_parent_purchase' ELSE 'rejected_ambiguous_parent' END
        );
      END IF;
      SELECT contribution.*
      INTO v_parent
      FROM public.scorecard_commerce_contributions contribution
      WHERE contribution.provider = v_provider
        AND contribution.transaction_id = v_parent_transaction_id
      FOR UPDATE;
    END IF;

    IF v_event_type IN ('refund', 'chargeback')
       AND p_amount_cents IS NOT NULL
       AND p_amount_cents IS DISTINCT FROM v_parent.amount_cents THEN
      RETURN jsonb_build_object('success', false, 'status', 'rejected_refund_amount');
    END IF;

    v_result_status := CASE
      WHEN v_event_type IN ('refund', 'chargeback') THEN 'refunded'
      ELSE 'expired'
    END;
    UPDATE public.scorecard_commerce_contributions contribution
    SET status = v_result_status, updated_at = now()
    WHERE contribution.provider = v_provider
      AND contribution.transaction_id = v_parent.transaction_id;
  END IF;

  IF v_mapping.entitlement_kind = 'scorecard' THEN
    SELECT contribution.*
    INTO v_survivor
    FROM public.scorecard_commerce_contributions contribution
    WHERE contribution.email = v_email
      AND contribution.entitlement_kind = 'scorecard'
      AND contribution.status IN ('active', 'cancelled')
      AND (contribution.ends_at IS NULL OR contribution.ends_at >= CURRENT_DATE)
    ORDER BY (contribution.ends_at IS NULL) DESC, contribution.ends_at DESC, contribution.effective_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_entitlement_id := public.grant_scorecard_entitlement(
        v_email, 'active', v_survivor.starts_at, v_survivor.ends_at,
        v_survivor.product_id, v_survivor.price_id, v_survivor.order_id
      );
    ELSIF EXISTS (
      SELECT 1 FROM public.scorecard_commerce_contributions contribution
      JOIN public.entitlements entitlement ON entitlement.email = contribution.email
      WHERE contribution.email = v_email
        AND contribution.entitlement_kind = 'scorecard'
        AND entitlement.scorecard_product_id = contribution.product_id
        AND entitlement.scorecard_price_id = contribution.price_id
        AND entitlement.scorecard_order_id IS NOT DISTINCT FROM contribution.order_id
    ) THEN
      v_entitlement_id := public.grant_scorecard_entitlement(
        v_email, v_result_status, v_effective_at::date, v_effective_at::date,
        v_product_id, v_price_id, v_order_id
      );
    END IF;
  ELSE
    SELECT contribution.*
    INTO v_survivor
    FROM public.scorecard_commerce_contributions contribution
    WHERE contribution.email = v_email
      AND contribution.entitlement_kind = 'planner'
      AND contribution.status IN ('active', 'cancelled')
      AND (contribution.ends_at IS NULL OR contribution.ends_at >= CURRENT_DATE)
    ORDER BY (contribution.ends_at IS NULL) DESC, contribution.ends_at DESC, contribution.effective_at DESC
    LIMIT 1;

    IF FOUND THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM public.scorecard_commerce_contributions contribution
        WHERE contribution.email = v_email
          AND contribution.entitlement_kind = 'planner'
          AND contribution.status = 'active'
          AND (contribution.ends_at IS NULL OR contribution.ends_at >= CURRENT_DATE)
      ) THEN 'active' ELSE 'cancelled' END
      INTO v_survivor_status;

      IF NOT (
        coalesce(v_current_status IN ('active', 'cancelled'), false)
        AND v_current_product_id IS DISTINCT FROM v_survivor.product_id
        AND (
          v_current_ends_at IS NULL
          OR (v_survivor.ends_at IS NOT NULL AND v_current_ends_at > v_survivor.ends_at)
        )
      ) THEN
        v_entitlement_id := public.grant_planner_entitlement(
          v_email, v_survivor.planner_tier, v_survivor_status,
          v_survivor.starts_at, v_survivor.ends_at,
          v_survivor.product_id, v_survivor.price_id, v_survivor.order_id
        );
      END IF;
    ELSIF v_current_product_id = v_product_id
      AND v_current_price_id = v_price_id
      AND v_current_order_id IS NOT DISTINCT FROM v_order_id THEN
      v_entitlement_id := public.grant_planner_entitlement(
        v_email, v_mapping.planner_tier, v_result_status,
        v_effective_at::date, v_effective_at::date,
        v_product_id, v_price_id, v_order_id
      );
    END IF;
  END IF;

  INSERT INTO public.scorecard_commerce_events (
    provider, event_id, payload_sha256, semantic_sha256, event_type, email,
    product_id, price_id, order_id, transaction_id, parent_transaction_id,
    currency, amount_cents, entitlement_kind, result_status, effective_at
  ) VALUES (
    v_provider, v_event_id, v_payload_sha256, v_event_semantic_sha256,
    v_event_type, v_email, v_product_id, v_price_id, v_order_id,
    v_transaction_id, v_parent_transaction_id, v_currency, p_amount_cents,
    v_mapping.entitlement_kind, v_result_status, v_effective_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'replayed', false,
    'entitlementKind', v_mapping.entitlement_kind,
    'plannerTier', v_mapping.planner_tier,
    'accessEndsAt', v_survivor.ends_at,
    'entitlementId', v_entitlement_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_scorecard_planner_commerce_event(
  text, text, text, text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text
) TO service_role;
