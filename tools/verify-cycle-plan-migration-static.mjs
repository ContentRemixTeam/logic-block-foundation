#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationName = '20260822190000_cycle_plan_reconciliation_v2.sql';
const migrationPath = path.join(root, 'supabase/migrations', migrationName);
const migration = fs.readFileSync(migrationPath, 'utf8');
const fixture = fs.readFileSync(path.join(root, 'test/cycle-plan-reconciliation-v2/mock_current_schema.sql'), 'utf8');
const cycleSetup = fs.readFileSync(path.join(root, 'src/pages/CycleSetup.tsx'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/integrations/supabase/types.ts'), 'utf8');
const draftDelete = fs.readFileSync(path.join(root, 'supabase/functions/delete-cycle-draft/index.ts'), 'utf8');
const draftSave = fs.readFileSync(path.join(root, 'supabase/functions/save-cycle-draft/index.ts'), 'utf8');
const draftHook = fs.readFileSync(path.join(root, 'src/hooks/useCycleSetupDraft.ts'), 'utf8');
const historicalSearch = fs.readFileSync(path.join(root, 'supabase/migrations/20260808120000_mastermind_portal_private_search.sql'), 'utf8');

const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql')).sort();
assert.equal(migrationFiles.at(-1), migrationName, 'Wave 1 migration is not the final chronological migration');

const destinations = [
  'cycles_90_day', 'cycle_strategy', 'cycle_offers', 'cycle_limited_offers',
  'cycle_revenue_plan', 'cycle_month_plans', 'projects', 'habits', 'tasks',
  'user_settings', 'daily_plans',
];
for (const table of destinations) {
  assert.match(fixture, new RegExp(`CREATE TABLE public\\.${table}\\b`), `mock schema omits ${table}`);
  assert.match(migration, new RegExp(`(?:INSERT INTO|UPDATE|DELETE FROM) public\\.${table}\\b`),
    `transaction omits canonical destination ${table}`);
}

assert.equal((migration.match(/\$\$/g) || []).length % 2, 0, 'unbalanced PostgreSQL dollar quotes');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.reconcile_cycle_plan_v2/);
assert.match(migration, /SECURITY DEFINER\s+SET search_path = public, auth, pg_temp/);
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
assert.match(migration, /digest\(convert_to\(p_payload::text, 'UTF8'\), 'sha256'\)/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /conflict_kind', 'request_changed'/);
assert.match(migration, /conflict_kind', 'stale_version'/);
assert.match(migration, /ambiguous_owner_quarter_cycles/);
assert.match(migration, /owner_quarter_cycle_conflict/);
assert.match(migration, /date_trunc\('quarter', start_date\)::date = v_quarter_start/);
assert.match(migration, /ON CONFLICT \(user_id, date\) DO NOTHING/);
assert.doesNotMatch(migration, /ON CONFLICT \(user_id, date\) DO UPDATE SET[\s\S]{0,160}top_3_today/,
  'Daily Plan reconciliation can overwrite member-authored Top 3');
assert.match(migration, /'daily_plan_conflict_count', v_daily_plan_conflict_count/);
assert.match(migration, /conflict_kind', 'daily_plan_collision'/);
assert.ok(migration.indexOf("conflict_kind', 'daily_plan_collision'") < migration.indexOf('INSERT INTO public.cycle_plan_intents_v2'),
  'Daily Plan ownership preflight occurs after required writes begin');
assert.match(migration, /RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'cycle_plan_daily_plan_collision:/,
  'late Daily Plan collision does not roll back the transaction');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.reconcile_cycle_plan_v2/);
assert.match(types, /reconcile_cycle_plan_v2: \{/);

const directBrowserMutation = /\.from\(['"](?:cycles_90_day|cycle_strategy|cycle_offers|cycle_limited_offers|cycle_revenue_plan|cycle_month_plans|projects|habits|tasks|user_settings|daily_plans)['"]\)[\s\S]{0,180}?\.(?:insert|upsert|update|delete)\(/;
assert.doesNotMatch(cycleSetup, directBrowserMutation,
  'Cycle Setup still directly mutates a canonical reconciliation table');
assert.doesNotMatch(cycleSetup, /supporting-project:slot-\$\{slotIndex/,
  'supporting project identity still derives from mutable array position');
assert.doesNotMatch(cycleSetup, /habit:slot-\$\{slotIndex/,
  'habit identity still derives from mutable array position');
for (const field of [
  'secondaryPlatforms', 'postingDays', 'nurturePlatforms', 'offers', 'limitedOffers',
  'monthPlans', 'projects', 'habits', 'thingsToRemember', 'officeHoursDays',
  'recurringTasks', 'day1Top3', 'day2Top3', 'day3Top3',
]) {
  assert.match(cycleSetup, new RegExp(`Array\\.isArray\\(draft\\.${field}\\)`),
    `${field} does not hydrate authoritative empty arrays`);
}
assert.match(cycleSetup, /await clearDraft\(\)/, 'Start Fresh does not await conditional cleanup');
assert.match(cycleSetup, /existingCycleLoadState === 'load_failed'/,
  'authoritative existing-cycle failure does not gate the editor');
assert.match(cycleSetup, /existingCycleLoadState !== 'ready'\) return/,
  'autosave/save is not gated on authoritative load readiness');
assert.match(draftDelete, /expected_updated_at/);
assert.match(draftDelete, /\.rpc\('delete_cycle_draft_conditionally_v2'/);
assert.match(migration, /v_draft\.updated_at IS DISTINCT FROM p_expected_updated_at/);
assert.match(migration, /v_draft\.draft_revision IS DISTINCT FROM p_draft_revision/,
  'legacy draft deletion lacks an exact timestamp/id/null-revision condition');
assert.match(migration, /p_expect_absent[\s\S]+newer_draft_present/,
  'verified no-row cleanup is not serialized against newer cross-tab saves');
assert.doesNotMatch(draftDelete, /body: \{\}/, 'draft deletion retains a user-only fallback');
assert.match(draftSave, /\.rpc\('save_cycle_draft_v2'/);
for (const expected of [
  'p_expected_draft_id', 'p_expected_updated_at', 'p_expected_draft_revision', 'p_expect_absent',
]) {
  assert.match(draftSave, new RegExp(expected), `draft save Edge Function omits ${expected}`);
  assert.match(migration, new RegExp(expected), `draft save RPC omits ${expected}`);
}
assert.match(migration, /conflict_kind', 'draft_revision_reused'/);
assert.match(migration, /conflict_kind', 'draft_created_elsewhere'/);
assert.match(migration, /DROP POLICY IF EXISTS "Users can insert own drafts"/);
assert.match(migration, /DROP POLICY IF EXISTS "Users can update own drafts"/);
assert.match(migration, /DROP POLICY IF EXISTS "Users can delete own drafts"/);
assert.match(migration, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON TABLE public\.cycle_drafts FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT SELECT ON TABLE public\.cycle_drafts TO authenticated/);
for (const table of [
  'cycle_plan_intents_v2',
  'cycle_plan_identity_aliases_v2',
  'cycle_plan_reconciliation_requests_v2',
]) {
  assert.match(
    migration,
    new RegExp(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\\s+ON TABLE public\\.${table} FROM PUBLIC, anon, authenticated`),
    `${table} does not revoke every direct write/bypass privilege from member roles`,
  );
}
for (const table of ['projects', 'habits', 'tasks']) {
  assert.match(migration, new RegExp(`ALTER TABLE public\\.${table}[\\s\\S]{0,360}generation_retired_at`),
    `${table} lacks explicit generator-retirement provenance`);
}
assert.match(migration, /'generation_reactivation_conflicts', v_generation_reactivation_conflicts/,
  'receipt omits truthful unsafe-reactivation metadata');
assert.match(draftHook, /cycleDraftStorageKey\(userId\)/,
  'browser draft storage is not scoped to the authenticated user');
assert.doesNotMatch(draftHook, /getStorageItem\(DRAFT_STORAGE_KEY\)/,
  'browser draft storage still reads the ownerless global key');
assert.match(draftHook, /p_expected_draft_revision|expected_draft_revision/,
  'client does not retain the exact cloud save receipt');
assert.match(draftHook, /conflict_blocked/,
  'typed CAS conflict does not establish a durable cloud-write block');
assert.doesNotMatch(draftHook, /clearExpectationRef\.current\.cloud = refreshedSnapshot/,
  'save failure still adopts the competing cloud snapshot as a write predecessor');
assert.match(historicalSearch, /CREATE OR REPLACE FUNCTION public\.mastermind_portal_search_array_text/);
assert.match(historicalSearch, /LANGUAGE sql\s+IMMUTABLE\s+PARALLEL SAFE/);
assert.match(historicalSearch, /pg_catalog\.array_to_string/);
assert.match(historicalSearch, /public\.mastermind_portal_search_array_text\(success_paths\)/);
assert.match(historicalSearch, /REVOKE ALL ON FUNCTION public\.mastermind_portal_search_array_text\(text\[\]\) FROM PUBLIC, anon, authenticated/);
assert.match(migration, /'cycle-draft:' \|\| v_user_id::text/);

console.log('PASS STATIC migration ordering, preservation, legacy convergence, draft CAS, load gate, durable identity, generated types, and browser boundary');
console.log('NOTE STATIC checks are not PostgreSQL behavior proof; run verify:cycle-plan-postgres separately');
