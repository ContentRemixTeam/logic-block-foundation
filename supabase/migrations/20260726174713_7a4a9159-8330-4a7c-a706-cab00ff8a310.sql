ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS planner_tier text,
  ADD COLUMN IF NOT EXISTS planner_status text,
  ADD COLUMN IF NOT EXISTS planner_starts_at date,
  ADD COLUMN IF NOT EXISTS planner_ends_at date,
  ADD COLUMN IF NOT EXISTS planner_product_id text,
  ADD COLUMN IF NOT EXISTS planner_price_id text,
  ADD COLUMN IF NOT EXISTS planner_order_id text,
  ADD COLUMN IF NOT EXISTS planner_purchased_at timestamptz;