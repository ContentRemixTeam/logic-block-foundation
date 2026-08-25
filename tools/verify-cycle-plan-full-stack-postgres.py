#!/usr/bin/env python3
"""Apply the full chronological migration stack through Wave 4 on disposable PG16.

This intentionally fails (without relabeling source inspection as behavior) when
the local PostgreSQL distribution lacks a Supabase-only extension required by a
predecessor migration.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase/migrations"
WAVE_CANDIDATES = [
    MIGRATIONS / "20260822190000_cycle_plan_reconciliation_v2.sql",
    MIGRATIONS / "20260822200000_mastermind_capability_projection.sql",
    MIGRATIONS / "20260822210000_planner_learning_catalog_assignments.sql",
    MIGRATIONS / "20260822220000_success_path_execution_ledger.sql",
    MIGRATIONS / "20260822230000_offer_first_assigned_learning_slice.sql",
    MIGRATIONS / "20260824210000_success_path_member_authority_engagement.sql",
    MIGRATIONS / "20260825090000_success_path_real_curriculum_catalog_seed.sql",
]
LATEST_CANDIDATE = WAVE_CANDIDATES[-1]
BEHAVIOR = ROOT / "test/cycle-plan-reconciliation-v2/behavior.sql"


def need(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise SystemExit(f"BLOCKED missing local executable: {name}")
    return value


def checked(command: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stdout}{result.stderr}")
    return result


def main() -> None:
    initdb, pg_ctl, psql = need("initdb"), need("pg_ctl"), need("psql")
    version = checked([psql, "--version"], os.environ.copy()).stdout.strip()
    if " 16." not in version:
        raise SystemExit(f"BLOCKED PostgreSQL 16 required, found {version}")
    migrations = sorted(MIGRATIONS.glob("*.sql"))
    if len(migrations) != 199:
        raise SystemExit(f"Expected exact 199-migration chronology, found {len(migrations)}")
    if not migrations or migrations[-1] != LATEST_CANDIDATE:
        raise SystemExit("Latest Wave 4 candidate is not the final chronological migration")
    if any(candidate not in migrations for candidate in WAVE_CANDIDATES):
        raise SystemExit("One or more Wave 1/Wave 2/Wave 3/Wave 4 candidate migrations are missing")

    bootstrap = """
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY, email text UNIQUE, raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb);
INSERT INTO auth.users(id, email) VALUES ('72011c8d-a746-47e8-8f45-79789388260b', 'legacy-feature-fixture@example.test') ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
DO $$ BEGIN CREATE PUBLICATION supabase_realtime; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages(topic text, payload jsonb);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('realtime.topic', true), '')
$$;
GRANT USAGE ON SCHEMA realtime TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON realtime.messages TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION realtime.topic() TO anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS storage.buckets(id text PRIMARY KEY, name text, public boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated, service_role;
"""
    port = 55440
    env = os.environ.copy()
    env.update({
        "LC_ALL": "C",
        "LANG": "C",
    })
    with tempfile.TemporaryDirectory(prefix="cycle-full-stack-pg-", dir="/tmp") as temp:
        base = Path(temp)
        data, socket_dir, log = base / "data", base / "socket", base / "postgres.log"
        socket_dir.mkdir()
        started = False
        try:
            try:
                checked([initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                         "-c", "shared_memory_type=mmap", "-c", "dynamic_shared_memory_type=mmap"], env)
            except RuntimeError as error:
                if "could not create shared memory segment: Operation not permitted" in str(error):
                    raise SystemExit(
                        "BLOCKED PostgreSQL 16 initdb cannot create its bootstrap shared-memory segment "
                        "inside this managed sandbox; no full-stack database claim was made."
                    ) from error
                raise
            checked([pg_ctl, "-D", str(data), "-l", str(log), "-o", f"-p {port} -k {socket_dir} -h ''", "-w", "start"], env)
            started = True
            command = [psql, "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-h", str(socket_dir), "-p", str(port), "-d", "postgres"]
            checked([*command, "-c", bootstrap], env)
            for index, migration in enumerate(migrations, start=1):
                try:
                    checked([*command, "-f", str(migration)], env)
                except RuntimeError as error:
                    raise RuntimeError(f"Full stack failed at {index}/{len(migrations)} {migration.name}\n{error}") from error
            for candidate in WAVE_CANDIDATES:
                checked([*command, "-f", str(candidate)], env)
            search_probe = """
DO $$
DECLARE
  v_vector tsvector;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mastermind_portal_search_array_text'
      AND p.provolatile = 'i' AND p.proparallel = 's'
  ) THEN
    RAISE EXCEPTION 'migration 182 compatibility helper is not immutable/parallel safe';
  END IF;
  IF has_function_privilege('authenticated', 'public.mastermind_portal_search_array_text(text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'migration 182 helper leaked member execution';
  END IF;
  INSERT INTO public.mastermind_portal_resources(
    portal_resource_id, product_title, category_title, title, portal_path,
    search_summary, success_paths, stages
  ) VALUES (
    'pg16-compatibility-probe', 'Offer Product', 'Sales Category',
    'Searchable Title', '/private/probe', 'Summary Phrase',
    ARRAY['success path phrase'], ARRAY['growth stage']
  ) RETURNING metadata_search_vector INTO v_vector;
  IF NOT (v_vector @@ plainto_tsquery('english', 'Searchable Title Offer Product Sales Category Summary Phrase success path growth stage')) THEN
    RAISE EXCEPTION 'migration 182 generated search semantics changed: %', v_vector;
  END IF;
END
$$;
"""
            checked([*command, "-c", search_probe], env)
            checked([*command, "-f", str(BEHAVIOR)], env)
            private_acl_probe = """
DO $$
DECLARE
  v_table text;
  v_privilege text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'cycle_drafts', 'cycle_plan_intents_v2', 'cycle_plan_identity_aliases_v2',
    'cycle_plan_reconciliation_requests_v2', 'success_path_cycle_states',
    'success_path_actions', 'success_path_confirmations', 'success_path_evidence_receipts',
    'success_path_checkins', 'success_path_support_requests', 'success_path_focus_proposals',
    'success_path_focus_transitions', 'success_path_absence_recoveries',
    'success_path_support_events', 'success_path_timeline_events'
  ] LOOP
    FOREACH v_privilege IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege('anon', format('public.%I', v_table), v_privilege)
         OR has_table_privilege('authenticated', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'effective private-table privilege %.% survived realistic defaults', v_table, v_privilege;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
        WHERE c.oid = format('public.%I', v_table)::regclass
          AND acl.grantee = 0
          AND upper(acl.privilege_type) = v_privilege
      ) THEN
        RAISE EXCEPTION 'PUBLIC private-table privilege %.% survived realistic defaults', v_table, v_privilege;
      END IF;
    END LOOP;
  END LOOP;
END
$$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
DO $$
DECLARE
  v_before bigint;
  v_after bigint;
BEGIN
  SELECT count(*) INTO v_before FROM public.cycle_plan_reconciliation_requests_v2;
  IF v_before = 0 THEN RAISE EXCEPTION 'receipt survival probe has no ledger fixture'; END IF;
  BEGIN
    TRUNCATE TABLE public.cycle_plan_reconciliation_requests_v2;
    RAISE EXCEPTION 'authenticated TRUNCATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO v_after FROM public.cycle_plan_reconciliation_requests_v2;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'receipt ledger changed across denied TRUNCATE: before %, after %', v_before, v_after;
  END IF;
END
$$;
RESET ROLE;
"""
            checked([*command, "-c", private_acl_probe], env)
            print(f"PASS complete chronological stack through {LATEST_CANDIDATE.name} ({len(migrations)} migrations)")
            print("PASS Wave 1/Wave 2/Wave 3/Wave 4 candidates double apply on full chronological stack")
            print("PASS migration 182 PostgreSQL 16 helper ACL and search semantics")
            print("PASS Wave 1 behavior suite on full chronological stack")
            print("PASS final effective private-ledger ACLs and denied-TRUNCATE receipt survival")
            print(f"PASS native disposable {version} full-stack probe")
        finally:
            if started:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"], env=env, text=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
