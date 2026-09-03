import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const migration = join(root, 'supabase/migrations/20260903120000_scorecard_product_foundation.sql');
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
CREATE UNIQUE INDEX entitlements_email_lower_idx ON public.entitlements (lower(email));

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
  run('psql', ['-v', 'ON_ERROR_STOP=1', ...connectionArgs, '-f', migration]);
  process.stdout.write('Applied the Scorecard migration.\n');
  psql(assertions);
  process.stdout.write('Scorecard Postgres verification passed.\n');
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
