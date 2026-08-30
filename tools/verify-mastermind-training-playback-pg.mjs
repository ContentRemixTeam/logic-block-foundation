#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = mkdtempSync(path.join(tmpdir(), "mm-training-pg-data-"));
const socket = mkdtempSync(path.join(tmpdir(), "mm-training-pg-sock-"));
const port = 59000 + Math.floor(Math.random() * 4000);
const db = "mm_training_playback";
const env = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: db, LC_ALL: "en_US.UTF-8", LANG: "en_US.UTF-8" };
let started = false;

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure && result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  return result;
}

function psql(args = []) {
  return run("/opt/homebrew/bin/psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args]);
}

const ingestionCommit = "5ddac1453a5cc0c16094a6eb4ca07dd821cb0cf8";
const ingestionRelative = "supabase/migrations/20260809130000_replay_vault_deterministic_ingestion.sql";
const committedIngestion = spawnSync("git", ["-C", root, "show", `${ingestionCommit}:${ingestionRelative}`], { encoding: "utf8" });
const localIngestionPath = path.join(root, ingestionRelative);
const localIngestion = existsSync(localIngestionPath) ? readFileSync(localIngestionPath, "utf8") : "";
const ingestionSql = committedIngestion.status === 0 && committedIngestion.stdout.includes("replay_import_content_package")
  ? committedIngestion.stdout
  : localIngestion;
if (!ingestionSql.includes("replay_import_content_package")) throw new Error("canonical ingestion producer missing");
const ingestionMigration = path.join(socket, "20260809130000_replay_vault_deterministic_ingestion.sql");
writeFileSync(ingestionMigration, ingestionSql);

const migrations = [
  ingestionMigration,
  "supabase/migrations/20260809140000_replay_vault_access_hardening.sql",
  "supabase/migrations/20260809150000_replay_vault_questions_answered_r1.sql",
  "supabase/migrations/20260809160500_replay_vault_member_interactions_r2.sql",
  "supabase/migrations/20260809170000_replay_vault_member_parity_r4.sql",
  "supabase/migrations/20260809180000_replay_vault_commercial_evidence_r7.sql",
  "supabase/migrations/20260820183000_replay_vault_annual_only_access_r10.sql",
  "supabase/migrations/20260828233500_replay_vault_hidden_preview_approval.sql",
  "supabase/migrations/20260829133000_replay_vault_admin_preview_catalog.sql",
  "supabase/migrations/20260829170500_mastermind_training_media_playback.sql",
  "supabase/migrations/20260830210500_mastermind_media_locator_normalization.sql",
];

for (const migration of migrations.slice(1)) {
  if (!existsSync(path.join(root, migration))) throw new Error(`missing ${migration}`);
}

const fixtureSql = String.raw`
CREATE OR REPLACE FUNCTION pg_temp.add_purchase(
  p_delivery_id uuid,
  p_email text,
  p_tier text,
  p_order text,
  p_transaction text
) RETURNS void
LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO public.replay_vault_commercial_deliveries(
    id, provider, provider_delivery_id, event_type, order_id, transaction_id,
    normalized_email, product_id, price_id, payload_sha256, signature_sha256,
    signature_timestamp, signature_verified, effective_at, requested_expires_at,
    outcome, receipt
  ) VALUES(
    p_delivery_id, 'fixture', p_delivery_id::text, 'grant', p_order, p_transaction,
    p_email, p_tier || '-product', p_tier || '-price', repeat('a', 64), repeat('b', 64),
    1786291201, true, '2026-01-01', '2027-01-01', 'applied', '{}'::jsonb
  );
  INSERT INTO public.replay_vault_purchase_contributions(
    provider, transaction_id, order_id, normalized_email, product_id, price_id,
    entitlement_tier, purchase_effective_at, requested_expires_at,
    contribution_starts_at, contribution_expires_at, purchase_delivery_id
  ) VALUES(
    'fixture', p_transaction, p_order, p_email, p_tier || '-product', p_tier || '-price',
    p_tier, '2026-01-01', '2027-01-01', '2026-01-01', '2027-01-01', p_delivery_id
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION pg_temp.add_resource(
  p_resource_id uuid,
  p_portal_id text,
  p_title text,
  p_scope text,
  p_dropbox_id text,
  p_hash_seed text,
  p_available_until date DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO public.mastermind_portal_resources(
    id, portal_resource_id, product_title, title, portal_path, access_scope,
    approved_access_scope, stages, success_paths, available_until
  ) VALUES(
    p_resource_id, p_portal_id, 'Mastermind', p_title, '/fixture/' || p_portal_id,
    p_scope, p_scope, ARRAY['offer'], ARRAY['offer'], p_available_until
  );

  PERFORM public.replay_import_content_package(jsonb_build_object(
    'resource_id', p_resource_id::text,
    'source', jsonb_build_object(
      'system', 'fixture',
      'native_id', p_portal_id || '-transcript',
      'version', '1',
      'privacy_flag', 'clear',
      'title', p_title,
      'event_date', '2026-08-01',
      'metadata', jsonb_build_object('scope', p_scope)
    ),
    'media', jsonb_build_object(
      'native_id', p_portal_id || '-media',
      'version', '1',
      'duration_ms', 600000,
      'size_bytes', 1000000,
      'dropbox_file_id', p_dropbox_id,
      'dropbox_content_hash', repeat(p_hash_seed, 64),
      'byte_sha256', repeat('1', 64),
      'decode_report_sha256', repeat('2', 64),
      'range_report_sha256', repeat('3', 64),
      'seek_report_sha256', repeat('4', 64),
      'mime_type', 'video/mp4',
      'container', 'mp4',
      'codecs', jsonb_build_object('video', 'h264', 'audio', 'aac')
    ),
    'transcript', jsonb_build_object('segments', jsonb_build_array(
      jsonb_build_object('index', 0, 'start_ms', 0, 'end_ms', 300000, 'text', p_title || ' first focused lesson'),
      jsonb_build_object('index', 1, 'start_ms', 300000, 'end_ms', 600000, 'text', p_title || ' action and evidence')
    ))
  ), 'fixture');

  UPDATE public.mastermind_portal_resources
     SET publication_state = 'published',
         privacy_state = 'approved',
         pairing_state = 'paired',
         transcript_state = 'active',
         media_state = 'approved',
         published_at = '2026-08-01',
         approved_access_scope = p_scope
   WHERE id = p_resource_id;

  UPDATE public.replay_publication_authority
     SET state = 'READY',
         ready_review_version = 'fixture',
         ready_reviewer = 'fixture-editor',
         ready_at = '2026-08-01',
         updated_at = '2026-08-01'
   WHERE resource_id = p_resource_id;
  UPDATE public.replay_publication_authority
     SET state = 'APPROVED',
         approval_review_version = 'fixture',
         approval_reviewer = 'fixture-approver',
         approved_at = '2026-08-01',
         updated_at = '2026-08-01'
   WHERE resource_id = p_resource_id;
  UPDATE public.replay_publication_authority
     SET state = 'PUBLISHED',
         published_by = 'fixture-publisher',
         published_at = '2026-08-01',
         updated_at = '2026-08-01'
   WHERE resource_id = p_resource_id;
END;
$fn$;

DO $$
DECLARE
  monthly_user uuid := '11111111-1111-4111-8111-111111111111';
  annual_user uuid := '22222222-2222-4222-8222-222222222222';
  active_only_user uuid := '33333333-3333-4333-8333-333333333333';
  planner_user uuid := '44444444-4444-4444-8444-444444444444';
  monthly_delivery uuid;
  annual_delivery uuid;
  core_resource uuid;
  vault_resource uuid;
  recent_resource uuid;
  core_count integer;
  vault_count integer;
BEGIN
  INSERT INTO public.entitlements(email, tier, status, starts_at, ends_at) VALUES
    ('monthly@example.com', 'mastermind', 'active', '2026-01-01', '2027-01-01'),
    ('annual@example.com', 'mastermind', 'active', '2026-01-01', '2027-01-01'),
    ('active-only@example.com', 'mastermind', 'active', '2026-01-01', '2027-01-01'),
    ('planner@example.com', 'planner', 'active', '2026-01-01', '2027-01-01');
  UPDATE public.replay_vault_launch_config SET launch_state = 'launched' WHERE singleton;

  monthly_delivery := gen_random_uuid();
  annual_delivery := gen_random_uuid();
  PERFORM pg_temp.add_purchase(monthly_delivery, 'monthly@example.com', 'monthly', 'monthly-order', 'monthly-charge');
  PERFORM pg_temp.add_purchase(annual_delivery, 'annual@example.com', 'annual', 'annual-order', 'annual-charge');

  core_resource := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  vault_resource := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  recent_resource := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  PERFORM pg_temp.add_resource(core_resource, 'core-lesson', 'Core curriculum lesson', 'core_curriculum', 'id:dbid-core', 'c');
  PERFORM pg_temp.add_resource(vault_resource, 'vault-lesson', 'Annual replay vault lesson', 'replay_vault', 'dbid-vault', 'd');
  PERFORM pg_temp.add_resource(recent_resource, 'recent-lesson', 'Current replay lesson', 'current_replay_30_day', 'dbid-recent', 'e', '2026-09-15');

  IF NOT (public.mastermind_media_access_decision(monthly_user, 'monthly@example.com', 'core-lesson', 'playback', 'curriculum', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'monthly core curriculum denied';
  END IF;
  IF NOT (public.mastermind_media_access_decision(active_only_user, 'active-only@example.com', 'core-lesson', 'playback', 'curriculum', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'active mastermind core curriculum denied without normalized purchase tier';
  END IF;
  IF (public.mastermind_media_access_decision(planner_user, 'planner@example.com', 'core-lesson', 'playback', 'curriculum', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'planner-only core curriculum allowed';
  END IF;
  IF (public.mastermind_media_access_decision(monthly_user, 'monthly@example.com', 'vault-lesson', 'playback', 'vault', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'monthly vault playback allowed';
  END IF;
  IF NOT (public.mastermind_media_access_decision(annual_user, 'annual@example.com', 'vault-lesson', 'playback', 'vault', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'annual vault playback denied';
  END IF;
  IF NOT (public.mastermind_media_access_decision(monthly_user, 'monthly@example.com', 'recent-lesson', 'playback', 'recent_replay', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'monthly recent replay denied';
  END IF;
  IF (public.mastermind_media_access_decision(monthly_user, 'monthly@example.com', 'vault-lesson', 'playback', 'curriculum', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'vault resource allowed through curriculum surface';
  END IF;
  IF (public.mastermind_media_access_decision(annual_user, 'annual@example.com', 'core-lesson', 'playback', 'vault', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'core resource allowed through vault surface';
  END IF;

  SELECT count(*) INTO core_count
    FROM public.resolve_mastermind_media_playback(monthly_user, 'monthly@example.com', 'core-lesson', 'curriculum', NULL, NULL, false, '2026-08-29') x
   WHERE x.dropbox_locator = 'id:dbid-core'
     AND x.authoritative_start_seconds = 0
     AND x.authoritative_end_seconds = 600;
  IF core_count <> 1 THEN
    RAISE EXCEPTION 'monthly curriculum resolver failed: %', core_count;
  END IF;

  SELECT count(*) INTO vault_count
    FROM public.resolve_mastermind_media_playback(annual_user, 'annual@example.com', 'vault-lesson', 'vault', NULL, NULL, false, '2026-08-29') x
   WHERE x.dropbox_locator = 'id:dbid-vault'
     AND x.access_scope = 'replay_vault';
  IF vault_count <> 1 THEN
    RAISE EXCEPTION 'annual vault resolver failed: %', vault_count;
  END IF;

  SELECT count(*) INTO vault_count
    FROM public.resolve_mastermind_media_playback(monthly_user, 'monthly@example.com', 'vault-lesson', 'vault', NULL, NULL, false, '2026-08-29');
  IF vault_count <> 0 THEN
    RAISE EXCEPTION 'monthly vault resolver leaked: %', vault_count;
  END IF;

  UPDATE public.mastermind_portal_resources SET available_until = '2026-08-01' WHERE id = recent_resource;
  IF (public.mastermind_media_access_decision(monthly_user, 'monthly@example.com', 'recent-lesson', 'playback', 'recent_replay', false, '2026-08-29')->>'allowed')::boolean THEN
    RAISE EXCEPTION 'expired current replay allowed';
  END IF;
END $$;

DO $$
BEGIN
  IF has_function_privilege('public', 'public.mastermind_media_access_decision(uuid,text,text,text,text,boolean,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC mastermind_media_access_decision execute';
  END IF;
  IF has_function_privilege('authenticated', 'public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated resolve_mastermind_media_playback execute';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.resolve_mastermind_media_playback(uuid,text,text,text,uuid,uuid,boolean,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role resolver execute missing';
  END IF;
END $$;

SELECT 'PASS mastermind_training_playback_surface_access';
`;

const fixturePath = path.join(socket, "mastermind-training-playback-fixture.sql");
writeFileSync(fixturePath, fixtureSql);

try {
  run("/opt/homebrew/bin/initdb", ["-D", data, "--auth=trust", "--no-instructions"]);
  run("/opt/homebrew/bin/pg_ctl", ["-D", data, "-l", path.join(data, "postgres.log"), "-o", `-p ${port} -k ${socket}`, "-w", "start"]);
  started = true;
  run("/opt/homebrew/bin/createdb", [db]);
  psql(["-f", path.join(root, "tools/replay-vault-access-fixtures/mock-base.sql")]);
  psql(["-c", "CREATE SCHEMA IF NOT EXISTS extensions;CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;"]);
  psql(["-c", "CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);CREATE FUNCTION public.update_updated_at_column()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;CREATE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;"]);
  psql(["-f", path.join(root, "supabase/migrations/20251224152606_f3c415a2-b1d5-4412-b892-cc8bba7e0180.sql")]);
  for (const migration of migrations) {
    psql(["-f", path.isAbsolute(migration) ? migration : path.join(root, migration)]);
  }
  psql(["-f", fixturePath]);
  console.log(`Mastermind Training playback PostgreSQL 16 surface-access fixture passed (port ${port})`);
} finally {
  if (started) run("/opt/homebrew/bin/pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"], { allowFailure: true });
  rmSync(data, { recursive: true, force: true });
  rmSync(socket, { recursive: true, force: true });
}
