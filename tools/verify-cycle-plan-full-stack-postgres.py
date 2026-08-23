#!/usr/bin/env python3
"""Apply every chronological predecessor migration plus Wave 1 on disposable PG16.

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
CANDIDATE = MIGRATIONS / "20260822190000_cycle_plan_reconciliation_v2.sql"


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
    if not migrations or migrations[-1] != CANDIDATE:
        raise SystemExit("Candidate is not the final chronological migration")

    bootstrap = """
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY, email text UNIQUE);
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
            checked([*command, "-f", str(CANDIDATE)], env)
            print(f"PASS {len(migrations) - 1} predecessor migrations + candidate")
            print("PASS candidate double apply on full chronological stack")
            print(f"PASS native disposable {version} full-stack probe")
        finally:
            if started:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"], env=env, text=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
