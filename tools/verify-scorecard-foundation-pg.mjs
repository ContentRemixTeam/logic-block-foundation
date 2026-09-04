import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const foundationMigration = join(root, 'supabase/migrations/20260903120000_scorecard_product_foundation.sql');
const commerceMigration = join(root, 'supabase/migrations/20260903233000_scorecard_commerce_bridge.sql');
const plannerCommerceMigration = join(root, 'supabase/migrations/20260904160000_planner_commerce_bridge.sql');
const plannerMappingCleanupMigration = join(root, 'supabase/migrations/20260904170000_remove_collab_studio_planner_mapping.sql');
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
CREATE ROLE service_role NOLOGIN BYPASSRLS;
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

const plannerCommerceAssertions = `
INSERT INTO public.planner_commerce_mappings
  (provider, product_id, price_id, planner_tier, entitlement_days)
VALUES
  ('ghl', 'test-planner-annual', 'test-planner-annual-price', 'annual', 365),
  ('ghl', 'test-planner-lifetime', 'test-planner-lifetime-price', 'lifetime', NULL);

SET ROLE service_role;

SELECT public.process_planner_commerce_event(
  'ghl', 'planner-purchase-1', 'planner-commerce@example.com', 'purchase',
  'test-planner-annual', 'test-planner-annual-price',
  'planner-order-1', 'planner-transaction-1', '2026-09-04T12:00:00Z'
);

DO $$
DECLARE result jsonb;
BEGIN
  SELECT public.process_planner_commerce_event(
    'ghl', 'planner-purchase-1', 'planner-commerce@example.com', 'purchase',
    'test-planner-annual', 'test-planner-annual-price',
    'planner-order-1', 'planner-transaction-1', '2026-09-04T12:00:00Z'
  ) INTO result;
  IF result ->> 'status' <> 'replayed' THEN RAISE EXCEPTION 'Planner duplicate was not idempotent'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'planner-commerce@example.com'
      AND planner_tier = 'annual' AND planner_status = 'active'
      AND planner_starts_at = '2026-09-04' AND planner_ends_at = '2027-09-04'
      AND tier = 'none' AND status = 'inactive'
  ) THEN RAISE EXCEPTION 'Annual purchase did not create Planner-only access'; END IF;
END $$;

SELECT public.process_planner_commerce_event(
  'ghl', 'planner-renewal-1', 'planner-commerce@example.com', 'renewal',
  'test-planner-annual', 'test-planner-annual-price',
  'planner-order-2', 'planner-transaction-2', '2027-08-01T12:00:00Z'
);

DO $$
BEGIN
  IF (SELECT planner_ends_at FROM public.entitlements WHERE email = 'planner-commerce@example.com') <> '2028-09-03' THEN
    RAISE EXCEPTION 'Early annual renewal did not extend the existing term';
  END IF;
END $$;

SELECT public.process_planner_commerce_event(
  'ghl', 'planner-stale-refund', 'planner-commerce@example.com', 'refund',
  'test-planner-annual', 'test-planner-annual-price',
  'planner-order-1', 'planner-transaction-1', '2027-07-01T12:00:00Z'
);

DO $$
BEGIN
  IF (SELECT planner_status FROM public.entitlements WHERE email = 'planner-commerce@example.com') <> 'active' THEN
    RAISE EXCEPTION 'A stale event revoked newer Planner access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.planner_commerce_events WHERE event_id = 'planner-stale-refund' AND result_status = 'ignored_stale') THEN
    RAISE EXCEPTION 'Stale event was not recorded';
  END IF;
END $$;

SELECT public.process_planner_commerce_event(
  'ghl', 'planner-refund-1', 'planner-commerce@example.com', 'refund',
  'test-planner-annual', 'test-planner-annual-price',
  'planner-order-2', 'planner-transaction-2', '2027-08-02T12:00:00Z'
);

DO $$
BEGIN
  IF (SELECT planner_status FROM public.entitlements WHERE email = 'planner-commerce@example.com') <> 'refunded' THEN
    RAISE EXCEPTION 'Refund did not revoke Planner access';
  END IF;
END $$;

SELECT public.process_planner_commerce_event(
  'ghl', 'planner-lifetime-1', 'lifetime@example.com', 'purchase',
  'test-planner-lifetime', 'test-planner-lifetime-price',
  'lifetime-order-1', 'lifetime-transaction-1', '2026-09-04T12:00:00Z'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE email = 'lifetime@example.com' AND planner_tier = 'lifetime'
      AND planner_status = 'active' AND planner_ends_at IS NULL
      AND tier = 'none' AND status = 'inactive'
  ) THEN RAISE EXCEPTION 'Lifetime purchase was not non-expiring Planner-only access'; END IF;

  BEGIN
    PERFORM public.process_planner_commerce_event(
      'ghl', 'planner-unmapped', 'blocked@example.com', 'purchase',
      'wrong-product', 'wrong-price', 'wrong-order', 'wrong-transaction', now()
    );
    RAISE EXCEPTION 'Unmapped Planner product unexpectedly granted access';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Unmapped Planner product unexpectedly granted access' THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;

INSERT INTO auth.users (id, email)
VALUES ('55555555-5555-4555-8555-555555555555', 'lifetime@example.com');

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
SET request.jwt.claims = '{"email":"lifetime@example.com"}';
DO $$
BEGIN
  IF NOT public.has_product_capability('planner.core') THEN
    RAISE EXCEPTION 'Planner buyer did not receive planner.core';
  END IF;
  IF public.has_product_capability('mastermind.core') THEN
    RAISE EXCEPTION 'Planner buyer leaked mastermind.core';
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
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', plannerCommerceMigration]);
  process.stdout.write('Applied the Planner commerce migration.\n');
  psql(`INSERT INTO public.planner_commerce_mappings
    (provider, product_id, price_id, planner_tier, entitlement_days)
    VALUES
      ('ghl', '6a70dd49734d26b901d3e786', '6a70e7bb471129d5db161366', 'annual', 365),
      ('ghl', '6a70dd57bee6fddba29f2654', '6a70dd5716f0cca8c90d2db2', 'lifetime', NULL);`);
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', plannerMappingCleanupMigration]);
  psql(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.planner_commerce_mappings WHERE product_id IN
      ('6a70dd49734d26b901d3e786', '6a70dd57bee6fddba29f2654')) THEN
      RAISE EXCEPTION 'Collab Studio mappings were not removed';
    END IF;
  END $$;`);
  process.stdout.write('Verified the Collab Studio mapping cleanup.\n');
  psql(plannerCommerceAssertions);
  process.stdout.write('Scorecard and Planner Postgres commerce verification passed.\n');
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
