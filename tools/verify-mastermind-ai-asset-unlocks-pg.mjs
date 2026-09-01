#!/usr/bin/env node
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = mkdtempSync(path.join(tmpdir(), "mm-ai-unlocks-pg-data-"));
const socket = mkdtempSync(path.join(tmpdir(), "mm-ai-unlocks-pg-sock-"));
const port = 61000 + Math.floor(Math.random() * 3000);
const db = "mm_ai_asset_unlocks";
const env = {
  ...process.env,
  PGHOST: socket,
  PGPORT: String(port),
  PGDATABASE: db,
  LC_ALL: "en_US.UTF-8",
  LANG: "en_US.UTF-8",
};
let started = false;

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} failed (${result.status})`);
  }
  return result;
}

function psql(args = []) {
  return run("/opt/homebrew/bin/psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args]);
}

const migrationPath = path.join(root, "supabase/migrations/20260901123000_mastermind_ai_asset_unlocks.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
if (!migrationSql.includes("confirm_my_mastermind_ai_asset_unlock")) {
  throw new Error("AI asset unlock migration missing confirmation RPC");
}

const baseSql = String.raw`
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $fn$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

CREATE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $fn$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$fn$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TABLE public.cycles_90_day (
  cycle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tier text NOT NULL,
  status text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz
);

CREATE FUNCTION public.replay_vault_exclusive_end(p_ends_at timestamptz)
RETURNS timestamptz
LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT p_ends_at;
$fn$;

CREATE TABLE public.replay_vault_preview_allowlist (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE FUNCTION public.replay_vault_admin_preview_enabled(
  p_user_id uuid,
  p_allow_app_database boolean DEFAULT true
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM public.replay_vault_preview_allowlist
     WHERE user_id = p_user_id
  );
$fn$;

CREATE TABLE public.replay_vault_purchase_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  entitlement_tier text NOT NULL,
  contribution_starts_at timestamptz NOT NULL,
  contribution_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.replay_vault_purchase_lifecycle_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_contribution_id uuid NOT NULL REFERENCES public.replay_vault_purchase_contributions(id) ON DELETE CASCADE,
  lifecycle_type text NOT NULL,
  effective_at timestamptz NOT NULL
);
`;

const fixtureSql = String.raw`
INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'monthly@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'annual@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'preview@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'planner@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'other@example.com');

INSERT INTO public.cycles_90_day(cycle_id, user_id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222');

INSERT INTO public.entitlements(email, tier, status, starts_at, ends_at) VALUES
  ('monthly@example.com', 'mastermind', 'active', '2026-01-01', '2026-12-31'),
  ('annual@example.com', 'mastermind', 'active', '2026-01-01', '2026-12-31'),
  ('planner@example.com', 'planner', 'active', '2026-01-01', '2026-12-31');

INSERT INTO public.replay_vault_preview_allowlist(user_id) VALUES
  ('33333333-3333-4333-8333-333333333333');

INSERT INTO public.replay_vault_purchase_contributions(
  normalized_email,
  entitlement_tier,
  contribution_starts_at,
  contribution_expires_at
) VALUES (
  'annual@example.com',
  'annual',
  '2026-01-01',
  '2026-12-31'
);

SET ROLE authenticated;

DO $$
DECLARE
  r jsonb;
  visible_count integer;
  direct_insert_blocked boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
  PERFORM set_config('request.jwt.claims', '{"email":"monthly@example.com"}', false);

  r := public.confirm_my_mastermind_ai_asset_unlock(
    'offer-lab',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '2026-09-15T12:00:00-04:00'
  );
  IF r->>'confirmed' <> 'true' OR r->>'consumedMonthlyUnlock' <> 'true' OR r->>'access' <> 'monthly' THEN
    RAISE EXCEPTION 'monthly first confirmation failed: %', r;
  END IF;

  r := public.confirm_my_mastermind_ai_asset_unlock(
    'offer-lab',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '2026-09-20T12:00:00-04:00'
  );
  IF r->>'confirmed' <> 'true' OR r->>'alreadyConfirmed' <> 'true' OR r->>'consumedMonthlyUnlock' <> 'false' THEN
    RAISE EXCEPTION 'monthly repeat was not idempotent: %', r;
  END IF;

  r := public.confirm_my_mastermind_ai_asset_unlock(
    'sales-room',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '2026-09-20T12:00:00-04:00'
  );
  IF r->>'confirmed' <> 'false' OR r->>'conflict' <> 'true' OR r->>'currentPackId' <> 'offer-lab' THEN
    RAISE EXCEPTION 'monthly second pack did not fail closed: %', r;
  END IF;

  SELECT count(*) INTO visible_count
    FROM public.mastermind_ai_asset_unlocks
   WHERE pack_id = 'offer-lab';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'monthly member should see exactly one own unlock, saw %', visible_count;
  END IF;

  BEGIN
    INSERT INTO public.mastermind_ai_asset_unlocks(user_id, unlock_month, pack_id)
    VALUES ('11111111-1111-4111-8111-111111111111', '2026-10-01', 'sales-room');
  EXCEPTION WHEN insufficient_privilege THEN
    direct_insert_blocked := true;
  END;
  IF NOT direct_insert_blocked THEN
    RAISE EXCEPTION 'authenticated member direct insert unexpectedly allowed';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);
  PERFORM set_config('request.jwt.claims', '{"email":"other@example.com"}', false);
  SELECT count(*) INTO visible_count
    FROM public.mastermind_ai_asset_unlocks;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'other member could read another member unlock';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
  PERFORM set_config('request.jwt.claims', '{"email":"annual@example.com"}', false);
  r := public.confirm_my_mastermind_ai_asset_unlock(
    'nurture-desk',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '2026-09-15T12:00:00-04:00'
  );
  IF r->>'confirmed' <> 'true' OR r->>'access' <> 'full_library' OR r->>'consumedMonthlyUnlock' <> 'false' THEN
    RAISE EXCEPTION 'annual full-library confirmation consumed a monthly unlock: %', r;
  END IF;
  SELECT count(*) INTO visible_count
    FROM public.mastermind_ai_asset_unlocks;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'annual full-library member should not get a monthly unlock row';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
  PERFORM set_config('request.jwt.claims', '{"email":"preview@example.com"}', false);
  r := public.confirm_my_mastermind_ai_asset_unlock(
    'sales-room',
    NULL,
    '2026-09-15T12:00:00-04:00'
  );
  IF r->>'confirmed' <> 'true' OR r->>'consumedMonthlyUnlock' <> 'true' THEN
    RAISE EXCEPTION 'preview allowlist confirmation failed: %', r;
  END IF;
  SELECT count(*) INTO visible_count
    FROM public.mastermind_ai_asset_unlocks
   WHERE confirmation_source = 'preview_confirmed';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'preview unlock should be labeled preview_confirmed';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);
  PERFORM set_config('request.jwt.claims', '{"email":"planner@example.com"}', false);
  BEGIN
    PERFORM public.confirm_my_mastermind_ai_asset_unlock(
      'offer-lab',
      NULL,
      '2026-09-15T12:00:00-04:00'
    );
    RAISE EXCEPTION 'planner-only confirmation unexpectedly allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'mastermind access required' THEN
      RAISE EXCEPTION 'planner-only wrong failure: %', SQLERRM;
    END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', '', false);
  PERFORM set_config('request.jwt.claims', '{}', false);
  BEGIN
    PERFORM public.confirm_my_mastermind_ai_asset_unlock(
      'offer-lab',
      NULL,
      '2026-09-15T12:00:00-04:00'
    );
    RAISE EXCEPTION 'signed-out confirmation unexpectedly allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'member authentication required' THEN
      RAISE EXCEPTION 'signed-out wrong failure: %', SQLERRM;
    END IF;
  END;
END $$;

RESET ROLE;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.mastermind_ai_asset_unlocks', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated direct INSERT privilege exists';
  END IF;
  IF has_table_privilege('authenticated', 'public.mastermind_ai_asset_unlocks', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated direct UPDATE privilege exists';
  END IF;
  IF has_table_privilege('authenticated', 'public.mastermind_ai_asset_unlocks', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated direct DELETE privilege exists';
  END IF;
  IF has_function_privilege('anon', 'public.confirm_my_mastermind_ai_asset_unlock(text,uuid,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute confirmation RPC';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.confirm_my_mastermind_ai_asset_unlock(text,uuid,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute confirmation RPC';
  END IF;
END $$;

SELECT 'PASS mastermind_ai_asset_unlocks_pg';
`;

const basePath = path.join(socket, "ai-unlocks-base.sql");
const fixturePath = path.join(socket, "ai-unlocks-fixture.sql");
writeFileSync(basePath, baseSql);
writeFileSync(fixturePath, fixtureSql);

try {
  run("/opt/homebrew/bin/initdb", ["-D", data, "--auth=trust", "--no-instructions"]);
  run("/opt/homebrew/bin/pg_ctl", ["-D", data, "-l", path.join(data, "postgres.log"), "-o", `-p ${port} -k ${socket}`, "-w", "start"]);
  started = true;
  run("/opt/homebrew/bin/createdb", [db]);
  psql(["-f", basePath]);
  psql(["-f", migrationPath]);
  psql(["-f", migrationPath]);
  psql(["-f", fixturePath]);
  console.log(`Mastermind AI asset unlock PostgreSQL fixture passed (port ${port})`);
} finally {
  if (started) run("/opt/homebrew/bin/pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"], { allowFailure: true });
  rmSync(data, { recursive: true, force: true });
  rmSync(socket, { recursive: true, force: true });
}
