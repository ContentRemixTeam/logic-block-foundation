#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = "/opt/homebrew/opt/postgresql@16/bin";
const data = mkdtempSync(path.join(tmpdir(), "replay-playlists-pg16-data-"));
const socket = mkdtempSync(path.join(tmpdir(), "replay-playlists-pg16-sock-"));
const port = 61000 + Math.floor(Math.random() * 3000);
const env = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: "playlists_test" };
let started = false;

function run(command, args, allowFailure = false) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure && result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  return result;
}

try {
  run(path.join(bin, "initdb"), ["-D", data, "--no-locale", "--encoding=UTF8"]);
  run(path.join(bin, "pg_ctl"), ["-D", data, "-l", path.join(data, "postgres.log"), "-o", `-p ${port} -k ${socket}`, "-w", "start"]);
  started = true;
  run(path.join(bin, "createdb"), ["playlists_test"]);
  const psql = (file) => run(path.join(bin, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-f", file]);
  psql(path.join(root, "tools/replay-vault-playlists-fixtures/prelude.sql"));
  const migration = path.join(root, "supabase/migrations/20260831220000_replay_vault_playlists.sql");
  psql(migration);
  psql(migration);
  const result = psql(path.join(root, "tools/replay-vault-playlists-fixtures/behavior.sql"));
  if (!result.stdout.includes("replay_vault_playlists_pg16_ok")) throw new Error("playlist success marker missing");
  console.log("Replay Vault playlist PostgreSQL 16 contract: PASS");
} finally {
  if (started) run(path.join(bin, "pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"], true);
  rmSync(data, { recursive: true, force: true });
  rmSync(socket, { recursive: true, force: true });
}

