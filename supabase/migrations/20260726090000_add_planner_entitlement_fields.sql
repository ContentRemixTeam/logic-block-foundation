-- Keep planner access separate from Mastermind access without creating a second
-- entitlement row for the same email. entitlements.email is intentionally unique.
ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS planner_tier TEXT,
  ADD COLUMN IF NOT EXISTS planner_status TEXT,
  ADD COLUMN IF NOT EXISTS planner_starts_at DATE,
  ADD COLUMN IF NOT EXISTS planner_ends_at DATE,
  ADD COLUMN IF NOT EXISTS planner_product_id TEXT,
  ADD COLUMN IF NOT EXISTS planner_price_id TEXT,
  ADD COLUMN IF NOT EXISTS planner_order_id TEXT,
  ADD COLUMN IF NOT EXISTS planner_last_purchase_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_planner_tier_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_planner_tier_check
  CHECK (planner_tier IS NULL OR planner_tier IN ('annual', 'lifetime'));

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_planner_status_check;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_planner_status_check
  CHECK (planner_status IS NULL OR planner_status IN ('active', 'cancelled', 'expired'));

CREATE INDEX IF NOT EXISTS entitlements_planner_access_idx
  ON public.entitlements (planner_tier, planner_status, planner_ends_at);
