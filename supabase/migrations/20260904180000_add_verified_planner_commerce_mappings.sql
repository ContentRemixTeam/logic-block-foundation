-- Allow only the verified 90-Day Low Battery Business Planner offer.
-- Point Summit, Collab Studio, the monthly Planner price, and the Scorecard
-- upgrade price are intentionally excluded from this launch allowlist.
INSERT INTO public.planner_commerce_mappings (
  provider,
  product_id,
  price_id,
  planner_tier,
  entitlement_days,
  is_active
) VALUES
  (
    'ghl',
    '6a9add7e8b0f3acdde8a4552',
    '6a9add8001e27c1e592a2842',
    'annual',
    365,
    true
  ),
  (
    'ghl',
    '6a9add7e8b0f3acdde8a4552',
    '6a9aeccd01e27c1e592b4436',
    'lifetime',
    NULL,
    true
  )
ON CONFLICT (provider, product_id, price_id) DO UPDATE SET
  planner_tier = EXCLUDED.planner_tier,
  entitlement_days = EXCLUDED.entitlement_days,
  is_active = EXCLUDED.is_active,
  updated_at = now();
