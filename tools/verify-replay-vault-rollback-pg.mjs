#!/usr/bin/env node
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = [
  "20260808120000_mastermind_portal_private_search.sql",
  "20260808210000_cycle_success_path_snapshots.sql",
  "20260808220000_mastermind_portal_access_scopes.sql",
  "20260809130000_replay_vault_deterministic_ingestion.sql",
  "20260809140000_replay_vault_access_hardening.sql",
  "20260809150000_replay_vault_questions_answered_r1.sql",
  "20260809160500_replay_vault_member_interactions_r2.sql",
  "20260809170000_replay_vault_member_parity_r4.sql",
  "20260809180000_replay_vault_commercial_evidence_r7.sql",
  "20260809190000_replay_vault_complete_search_r1.sql",
  "20260820183000_replay_vault_annual_only_access_r10.sql",
];
const migrations = names.map(name => path.join(root, "supabase/migrations", name));
const rollback = path.join(root, "tools/replay-vault-rollback/rollback-11-hidden-backend-migrations.sql");
for (const file of [...migrations, rollback]) if (!existsSync(file)) throw new Error(`missing ${file}`);

const bin = "/opt/homebrew/opt/postgresql@16/bin";
const temp = mkdtempSync(path.join(tmpdir(), "rv-rollback-pg16-"));
const data = path.join(temp, "data"), socket = path.join(temp, "socket"), db = "rv_rollback";
const port = 58000 + (process.pid % 1000);
const env = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: db, LC_ALL: "en_US.UTF-8", LANG: "en_US.UTF-8" };
const run = (command, args, allowFailure = false) => {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure && result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  return result;
};
const psql = args => run(path.join(bin, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-d", db, ...args]);
const prelude = path.join(temp, "prelude.sql");
writeFileSync(prelude, String.raw`
DO $$BEGIN CREATE ROLE anon NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE authenticated NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
GRANT anon,authenticated,service_role TO CURRENT_USER;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;
CREATE TABLE public.admin_users(user_id uuid PRIMARY KEY);
CREATE FUNCTION public.is_admin(p_user_id uuid)RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
CREATE TABLE public.entitlements(email text,tier text,status text,starts_at date,ends_at date,planner_tier text,planner_status text,planner_ends_at date);
CREATE TABLE public.cycles_90_day(cycle_id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.journal_pages(id uuid PRIMARY KEY,user_id uuid NOT NULL,title text,content text,tags jsonb);
CREATE TABLE public.planner_rollback_sentinel(id integer PRIMARY KEY,payload text NOT NULL);
INSERT INTO public.planner_rollback_sentinel VALUES(1,'planner-data-must-survive');
CREATE FUNCTION public.update_updated_at_column()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;
`);
let started = false;
try {
  run(path.join(bin, "initdb"), ["-D", data, "--auth=trust", "--no-instructions"]);
  run("/bin/mkdir", ["-p", socket]);
  run(path.join(bin, "pg_ctl"), ["-D", data, "-l", path.join(data, "postgres.log"), "-o", `-p ${port} -k ${socket}`, "-w", "start"]); started = true;
  run(path.join(bin, "createdb"), [db]);
  psql(["-f", prelude]);
  for (const migration of migrations) psql(["-f", migration]);
  psql(["-f", rollback]);
  psql(["-Atqc", String.raw`
DO $$DECLARE n integer;BEGIN
  SELECT count(*) INTO n FROM public.planner_rollback_sentinel WHERE id=1 AND payload='planner-data-must-survive';
  IF n<>1 THEN RAISE EXCEPTION 'Planner sentinel data changed';END IF;
  IF to_regclass('public.journal_pages') IS NULL OR to_regclass('public.cycles_90_day') IS NULL THEN RAISE EXCEPTION 'Planner table removed';END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.journal_pages'::regclass AND conname='journal_pages_id_user_unique') THEN RAISE EXCEPTION 'migration-added journal constraint remained';END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (c.relname LIKE 'replay_%' OR c.relname LIKE 'mastermind_portal_%' OR c.relname='cycle_success_path_snapshots')) THEN RAISE EXCEPTION 'target relation remained';END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'replay_%' OR p.proname LIKE '%replay_vault%' OR p.proname IN('search_mastermind_portal_resources','get_mastermind_portal_access_scopes'))) THEN RAISE EXCEPTION 'target routine remained';END IF;
  IF EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='replay_vault_target_binding') THEN RAISE EXCEPTION 'target type remained';END IF;
END$$;
SELECT 'PASS rollback_removed_only_11_migration_objects_and_preserved_planner_data';
`]);
  console.log("Replay Vault 11-migration rollback PostgreSQL 16 verifier: PASS");
} finally {
  if (started) run(path.join(bin, "pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"], true);
  rmSync(temp, { recursive: true, force: true });
}
