import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const foundationMigration = join(root, 'supabase/migrations/20260903120000_scorecard_product_foundation.sql');
const commerceMigration = join(root, 'supabase/migrations/20260903233000_scorecard_commerce_bridge.sql');
const offerCommerceMigration = join(root, 'supabase/migrations/20260904170000_scorecard_planner_offer_commerce.sql');
const pgDir = mkdtempSync(join(tmpdir(), 'scorecard-pg-'));
const port = String(55432 + (process.pid % 500));
const connectionArgs = ['-h', pgDir, '-p', port, '-d', 'scorecard_test'];

function run(binary, args, options = {}) {
  return execFileSync(binary, args, { encoding: 'utf8', stdio: 'pipe', timeout: 30_000, ...options });
}

function psql(sql) {
  return run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-c', sql]);
}

const fixture = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;

CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL);

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;

CREATE TABLE public.admin_users (user_id uuid PRIMARY KEY);
CREATE FUNCTION public.is_admin(check_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id);
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tier text NOT NULL DEFAULT 'mastermind',
  status text NOT NULL DEFAULT 'active',
  first_name text,
  last_name text,
  starts_at date,
  ends_at date,
  planner_tier text,
  planner_status text,
  planner_starts_at date,
  planner_ends_at date,
  planner_product_id text,
  planner_price_id text,
  planner_order_id text,
  planner_last_purchase_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX entitlements_email_unique ON public.entitlements (email);
GRANT SELECT ON public.entitlements TO service_role;

CREATE TABLE public.cycles_90_day (
  cycle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  goal text,
  start_date date,
  end_date date
);

CREATE TABLE public.tasks (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  task_text text NOT NULL,
  source text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  scheduled_date date,
  planned_day text,
  status text,
  project_column text,
  category text,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id),
  day_order integer,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_select_own ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT ON public.cycles_90_day TO authenticated;

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'scorecard@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'stranger@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'planner@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'admin@example.com');
INSERT INTO public.admin_users (user_id) VALUES ('44444444-4444-4444-8444-444444444444');
`;

const assertions = `
SET ROLE service_role;
SELECT public.grant_scorecard_entitlement('scorecard@example.com', 'active', '2026-09-01', NULL, 'scorecard-product', 'scorecard-price', 'order-1');
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SET request.jwt.claims = '{"email":"scorecard@example.com"}';

DO $$
BEGIN
  IF NOT public.has_product_capability('scorecard.core') THEN
    RAISE EXCEPTION 'scorecard purchase did not grant scorecard.core';
  END IF;
  IF public.has_product_capability('planner.core') OR public.has_product_capability('mastermind.core') THEN
    RAISE EXCEPTION 'scorecard-only purchase leaked a larger product capability';
  END IF;
END $$;

INSERT INTO public.scorecard_actions (user_id, action_text, category, cadence, scheduled_days)
VALUES ('11111111-1111-4111-8111-111111111111', 'Follow up with five warm leads', 'Sales', 'daily', ARRAY[1,3,5]::smallint[]);

SELECT public.sync_scorecard_week(CURRENT_DATE);
SELECT public.sync_scorecard_week(date_trunc('week', CURRENT_DATE)::date);

DO $$
DECLARE
  task_count integer;
  date_count integer;
BEGIN
  SELECT count(*), count(DISTINCT scheduled_date)
  INTO task_count, date_count
  FROM public.tasks
  WHERE user_id = auth.uid() AND scorecard_week_start = date_trunc('week', CURRENT_DATE)::date;

  IF task_count <> 3 OR date_count <> 3 THEN
    RAISE EXCEPTION 'weekly sync was not idempotent or did not create three canonical tasks: %, %', task_count, date_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE user_id = auth.uid()
      AND scheduled_date = date_trunc('week', CURRENT_DATE)::date + 2
      AND source = 'scorecard'
      AND scorecard_action_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Wednesday canonical task is missing';
  END IF;
END $$;

UPDATE public.tasks
SET is_completed = true, completed_at = now()
WHERE user_id = auth.uid() AND scheduled_date = date_trunc('week', CURRENT_DATE)::date + 2;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.tasks WHERE user_id = auth.uid() AND is_completed) <> 1 THEN
    RAISE EXCEPTION 'canonical task completion did not persist';
  END IF;

  PERFORM public.sync_scorecard_week((date_trunc('week', CURRENT_DATE)::date - 7));
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE user_id = auth.uid()
      AND scorecard_week_start = date_trunc('week', CURRENT_DATE)::date - 7
  ) THEN
    RAISE EXCEPTION 'past history was rebuilt from the current action setup';
  END IF;
END $$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET request.jwt.claims = '{"email":"stranger@example.com"}';

DO $$
BEGIN
  IF public.has_product_capability('scorecard.core') THEN
    RAISE EXCEPTION 'unentitled user received scorecard access';
  END IF;
  IF EXISTS (SELECT 1 FROM public.scorecard_actions) THEN
    RAISE EXCEPTION 'RLS exposed another user scorecard actions';
  END IF;
  BEGIN
    PERFORM public.sync_scorecard_week(CURRENT_DATE);
    RAISE EXCEPTION 'unentitled sync unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
INSERT INTO public.entitlements (email, tier, status, planner_tier, planner_status)
VALUES ('planner@example.com', 'none', 'inactive', 'annual', 'active');

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
SET request.jwt.claims = '{"email":"planner@example.com"}';
DO $$
BEGIN
  IF NOT public.has_product_capability('scorecard.core') OR NOT public.has_product_capability('planner.core') THEN
    RAISE EXCEPTION 'Planner did not inherit Scorecard access';
  END IF;
END $$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
SET request.jwt.claims = '{"email":"admin@example.com"}';
DO $$
BEGIN
  IF NOT public.has_product_capability('scorecard.core') THEN
    RAISE EXCEPTION 'admin preview access failed';
  END IF;
END $$;
RESET ROLE;
`;

const commerceAssertions = `
INSERT INTO public.scorecard_commerce_config (provider, secret_sha256)
VALUES ('ghl', encode(extensions.digest('test-secret', 'sha256'), 'hex'));

SET ROLE anon;
SET request.headers = '{"x-ghl-api-key":"wrong-secret"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.process_scorecard_commerce_event(
      'purchase-unauthorized',
      'commerce@example.com',
      'grant',
      '6a99ffc0722c713622d07e5f',
      '6a99ffc1e7735bdf5b08f6d3',
      'order-unauthorized',
      '2026-09-03T20:00:00Z'
    );
    RAISE EXCEPTION 'wrong webhook secret unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SET request.headers = '{"x-ghl-api-key":"test-secret"}';

SELECT public.process_scorecard_commerce_event(
  'purchase-1',
  'commerce@example.com',
  'grant',
  '6a99ffc0722c713622d07e5f',
  '6a99ffc1e7735bdf5b08f6d3',
  'order-1',
  '2026-09-03T20:00:00Z'
);

RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.entitlements
    WHERE email = 'commerce@example.com'
      AND scorecard_status = 'active'
      AND tier = 'none'
      AND status = 'inactive'
      AND planner_tier IS NULL
  ) THEN
    RAISE EXCEPTION 'commerce grant did not create a Scorecard-only entitlement';
  END IF;

  IF (public.process_scorecard_commerce_event(
    'purchase-1',
    'commerce@example.com',
    'grant',
    '6a99ffc0722c713622d07e5f',
    '6a99ffc1e7735bdf5b08f6d3',
    'order-1',
    '2026-09-04T20:00:00Z'
  ) ->> 'status') <> 'replayed' THEN
    RAISE EXCEPTION 'duplicate purchase was not idempotent';
  END IF;

  IF (public.process_scorecard_commerce_event(
    'purchase-1',
    'commerce@example.com',
    'refund',
    '6a99ffc0722c713622d07e5f',
    '6a99ffc1e7735bdf5b08f6d3',
    'order-1',
    '2026-09-05T20:00:00Z'
  ) ->> 'status') <> 'event_id_payload_conflict' THEN
    RAISE EXCEPTION 'conflicting duplicate event was not rejected';
  END IF;
END $$;

SELECT public.process_scorecard_commerce_event(
  'refund-1',
  'commerce@example.com',
  'refund',
  '6a99ffc0722c713622d07e5f',
  '6a99ffc1e7735bdf5b08f6d3',
  'order-1',
  '2026-09-05T20:00:00Z'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.entitlements
    WHERE email = 'commerce@example.com'
      AND scorecard_status = 'refunded'
  ) THEN
    RAISE EXCEPTION 'refund did not revoke Scorecard access';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM public.process_scorecard_commerce_event(
      'purchase-unmapped',
      'commerce@example.com',
      'grant',
      'wrong-product',
      'wrong-price',
      'order-unmapped',
      '2026-09-03T20:00:00Z'
    );
    RAISE EXCEPTION 'unmapped product unexpectedly granted access';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'unmapped product unexpectedly granted access' THEN
      RAISE;
    END IF;
  END;
END $$;
RESET ROLE;
`;

const offerCommerceAssertions = `
INSERT INTO public.scorecard_commerce_mappings (
  provider, product_id, price_id, entitlement_days, entitlement_kind, planner_tier,
  billing_interval, interval_count, expected_currency, expected_amount_cents,
  expected_renewal_amount_cents, is_active
) VALUES
  ('thrivecart', 'product-101', 'plan-201', NULL, 'scorecard', NULL, 'lifetime', 1, 'USD', 900, NULL, true),
  ('thrivecart', 'upsell-101', 'plan-annual-upgrade', NULL, 'planner', 'annual', 'year', 1, 'USD', 4000, 4900, true),
  ('thrivecart', 'product-102', 'plan-202', NULL, 'planner', 'annual', 'year', 1, 'USD', 4900, 4900, true),
  ('thrivecart', 'downsell-102', 'plan-203', NULL, 'planner', 'monthly', 'month', 1, 'USD', 700, 700, true);

SET ROLE service_role;

DO $$
DECLARE result jsonb;
BEGIN
  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-scorecard-1', 'bundle@example.com', 'purchase',
    'product-101', 'plan-201', 'order-101', 'txn-scorecard-1', NULL,
    'USD', 800, '2026-09-04T12:00:00Z', NULL, repeat('a', 64)
  );
  IF result ->> 'status' <> 'rejected_amount' THEN
    RAISE EXCEPTION 'amount mismatch was not rejected: %', result;
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-scorecard-2', 'bundle@example.com', 'purchase',
    'product-101', 'plan-201', 'order-101', 'txn-scorecard-1', NULL,
    'USD', 900, '2026-09-04T12:00:00Z', NULL, repeat('b', 64)
  );
  IF result ->> 'status' <> 'active' OR result ->> 'entitlementKind' <> 'scorecard' THEN
    RAISE EXCEPTION 'Scorecard purchase failed: %', result;
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-scorecard-duplicate-event', 'bundle@example.com', 'purchase',
    'product-101', 'plan-201', 'order-101', 'txn-scorecard-1', NULL,
    'USD', 900, '2026-09-04T12:00:00Z', NULL, repeat('c', 64)
  );
  IF result ->> 'status' <> 'replayed_transaction' THEN
    RAISE EXCEPTION 'duplicate transaction was not replayed: %', result;
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-upsell-1', 'bundle@example.com', 'purchase',
    'upsell-101', 'plan-annual-upgrade', 'order-101', 'txn-upsell-1', NULL,
    'USD', 4000, '2026-09-04T12:00:00Z', NULL, repeat('d', 64)
  );
  IF result ->> 'status' <> 'active' OR result ->> 'plannerTier' <> 'annual' THEN
    RAISE EXCEPTION 'Planner annual upsell purchase failed: %', result;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'bundle@example.com'
      AND scorecard_status = 'active'
      AND planner_status = 'active'
      AND planner_tier = 'annual'
      AND planner_ends_at = '2027-09-04'
  ) THEN
    RAISE EXCEPTION 'combined Scorecard and Planner access was not stored independently';
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-upsell-refund-1', 'bundle@example.com', 'refund',
    'upsell-101', '', 'order-101', NULL, NULL,
    'USD', 4000, '2026-09-05T12:00:00Z', NULL, repeat('e', 64)
  );
  IF result ->> 'status' <> 'refunded' THEN
    RAISE EXCEPTION 'Planner annual upsell refund failed: %', result;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'bundle@example.com'
      AND scorecard_status = 'active'
      AND planner_status = 'refunded'
  ) THEN
    RAISE EXCEPTION 'Planner refund did not preserve separately purchased Scorecard access';
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-monthly-1', 'monthly@example.com', 'purchase',
    'downsell-102', 'plan-203', 'order-203', 'txn-monthly-1', NULL,
    'USD', 700, '2026-09-04T12:00:00Z', '2026-10-04T12:00:00Z', repeat('f', 64)
  );
  IF result ->> 'status' <> 'active' OR result ->> 'plannerTier' <> 'monthly' THEN
    RAISE EXCEPTION 'Monthly Planner purchase failed: %', result;
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-monthly-failed-1', 'monthly@example.com', 'payment_failed',
    'downsell-102', 'plan-203', 'order-203', NULL, NULL,
    'USD', 700, '2026-10-04T12:00:00Z', NULL, repeat('1', 64)
  );
  IF result ->> 'status' <> 'needs_review' THEN
    RAISE EXCEPTION 'Failed payment was not held for review: %', result;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'monthly@example.com'
      AND planner_status = 'active'
      AND planner_ends_at = '2026-10-04'
  ) THEN
    RAISE EXCEPTION 'Failed payment incorrectly revoked Planner access';
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-upsell-renewal-1', 'renewal@example.com', 'purchase',
    'upsell-101', 'plan-annual-upgrade', 'order-renewal', 'txn-upsell-initial', NULL,
    'USD', 4000, '2026-09-04T12:00:00Z', '2027-09-04T12:00:00Z', repeat('2', 64)
  );
  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-upsell-renewal-2', 'renewal@example.com', 'renewal',
    'upsell-101', '', 'order-renewal', 'txn-upsell-renewal', NULL,
    'USD', 4900, '2027-09-04T12:00:00Z', '2028-09-04T12:00:00Z', repeat('3', 64)
  );
  IF result ->> 'status' <> 'active' THEN
    RAISE EXCEPTION 'Reduced first-year annual upsell did not accept its $49 renewal: %', result;
  END IF;

  result := public.apply_scorecard_planner_commerce_event(
    'thrivecart', 'tc-upsell-cancel-1', 'renewal@example.com', 'cancel_at_period_end',
    'upsell-101', '', 'order-renewal', NULL, NULL,
    'USD', NULL, '2027-10-04T12:00:00Z', NULL, repeat('4', 64)
  );
  IF result ->> 'status' <> 'cancelled' THEN
    RAISE EXCEPTION 'Cancellation without a repeated payment-plan ID was not resolved: %', result;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'renewal@example.com'
      AND planner_status = 'cancelled'
      AND planner_ends_at = '2028-09-04'
  ) THEN
    RAISE EXCEPTION 'Cancelled annual access did not preserve the paid-through date';
  END IF;
END $$;

RESET ROLE;

INSERT INTO auth.users (id, email)
VALUES ('55555555-5555-4555-8555-555555555555', 'monthly@example.com');

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
SET request.jwt.claims = '{"email":"monthly@example.com"}';

DO $$
BEGIN
  IF NOT public.has_product_capability('scorecard.core')
     OR NOT public.has_product_capability('planner.core') THEN
    RAISE EXCEPTION 'Monthly Planner did not inherit Planner and Scorecard access';
  END IF;
  IF public.has_product_capability('mastermind.core') THEN
    RAISE EXCEPTION 'Monthly Planner leaked Mastermind access';
  END IF;
END $$;

RESET ROLE;
`;

let started = false;
try {
  run('initdb', [
    '-D', pgDir,
    '--no-locale',
    '--encoding=UTF8',
    '--auth=trust',
    '--set=shared_memory_type=mmap',
    '--set=dynamic_shared_memory_type=mmap',
    '--set=max_connections=10',
  ]);
  process.stdout.write('Initialized temporary Postgres.\n');
  started = true;
  run(
    'pg_ctl',
    ['-D', pgDir, '-l', join(pgDir, 'postgres.log'), '-o', `-F -k ${pgDir} -p ${port}`, '-t', '60', '-w', 'start'],
    { timeout: 90_000 },
  );
  run('createdb', ['-h', pgDir, '-p', port, 'scorecard_test']);
  process.stdout.write('Started temporary Postgres.\n');
  psql(fixture);
  process.stdout.write('Loaded the test fixture.\n');
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', foundationMigration]);
  process.stdout.write('Applied the Scorecard foundation migration.\n');
  psql(assertions);
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', commerceMigration]);
  process.stdout.write('Applied the Scorecard commerce migration.\n');
  psql(commerceAssertions);
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', offerCommerceMigration]);
  process.stdout.write('Applied the Scorecard + Planner offer commerce migration.\n');
  psql(offerCommerceAssertions);
  process.stdout.write('Scorecard, Planner, and commerce verification passed.\n');
} catch (error) {
  const stderr = error?.stderr?.toString?.() ?? '';
  const stdout = error?.stdout?.toString?.() ?? '';
  process.stderr.write(`${stdout}${stderr}`);
  process.exitCode = 1;
} finally {
  if (started) {
    try {
      run('pg_ctl', ['-D', pgDir, '-m', 'fast', '-w', 'stop']);
    } catch {
      // Preserve the original verification failure.
    }
  }
  rmSync(pgDir, { recursive: true, force: true });
}
