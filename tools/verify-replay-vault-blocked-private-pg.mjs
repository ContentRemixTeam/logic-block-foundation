#!/usr/bin/env node
// Fail-closed proof: resources recorded as unapproved private-source imports are
// invisible in browse, categories, search, transcripts, saved pickers, and playback
// (including private admin preview) while verified approved replays stay available.
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = [
  "20260809130000_replay_vault_deterministic_ingestion.sql",
  "20260809140000_replay_vault_access_hardening.sql",
  "20260809150000_replay_vault_questions_answered_r1.sql",
  "20260809160500_replay_vault_member_interactions_r2.sql",
  "20260809170000_replay_vault_member_parity_r4.sql",
  "20260809180000_replay_vault_commercial_evidence_r7.sql",
  "20260809190000_replay_vault_complete_search_r1.sql",
  "20260820183000_replay_vault_annual_only_access_r10.sql",
  "20260828233500_replay_vault_hidden_preview_approval.sql",
  "20260829133000_replay_vault_admin_preview_catalog.sql",
  "20260830191115_b9da3c14-cd79-4f81-8a05-c47d54d9fa25.sql",
  "20260830191815_replay_vault_launch_batch_hardening.sql",
];
const blockedMigrations = readdirSync(path.join(root, "supabase/migrations"))
  .filter((name) => name >= "20260831184700" && name <= "20260831185000")
  .sort();
if (blockedMigrations.length === 0) throw new Error("blocked-private safety migrations are missing");
const migrations = [...names, ...blockedMigrations].map((name) => path.join(root, "supabase/migrations", name));
for (const file of migrations) if (!existsSync(file)) throw new Error(`missing migration ${file}`);

function bin(name) {
  const local = spawnSync("which", [name], { encoding: "utf8" });
  if (local.status === 0 && local.stdout.trim()) return local.stdout.trim();
  const brew = `/opt/homebrew/bin/${name}`;
  if (existsSync(brew)) return brew;
  throw new Error(`postgres binary not found: ${name}`);
}

const data = mkdtempSync(path.join(tmpdir(), "rv-blocked-data-"));
const socket = mkdtempSync(path.join(tmpdir(), "rv-blocked-sock-"));
const port = 55000 + Math.floor(Math.random() * 2000);
const db = "rv_blocked_private";
const env = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: db, LC_ALL: "C", LANG: "C" };
function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure && result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  return result;
}
const psql = (args = []) => run(bin("psql"), ["-X", "-v", "ON_ERROR_STOP=1", ...args]);
let started = false;
try {
  run(bin("initdb"), ["-D", data, "--auth=trust", "--no-instructions"]);
  run(bin("pg_ctl"), ["-D", data, "-l", path.join(data, "postgres.log"), "-o", `-p ${port} -k ${socket}`, "-w", "start"]);
  started = true;
  run(bin("createdb"), [db]);
  psql(["-c", "CREATE SCHEMA IF NOT EXISTS extensions; CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;"]);
  psql(["-f", path.join(root, "tools/replay-vault-access-fixtures/mock-base.sql")]);
  psql(["-c", `CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION public.update_updated_at_column()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;
    CREATE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;`]);
  psql(["-f", path.join(root, "supabase/migrations/20251224152606_f3c415a2-b1d5-4412-b892-cc8bba7e0180.sql")]);
  for (const migration of migrations) psql(["-f", migration]);
  psql(["-f", path.join(root, "tools/replay-vault-admin-preview-fixtures/behavior.sql")]);
  psql(["-f", path.join(root, "tools/replay-vault-blocked-private-fixtures/behavior.sql")]);
  console.log(`Replay Vault blocked-private-source safety verifier passed (port ${port})`);
} finally {
  if (started) run(bin("pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"], { allowFailure: true });
  rmSync(data, { recursive: true, force: true });
  rmSync(socket, { recursive: true, force: true });
}
