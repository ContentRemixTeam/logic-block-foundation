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
assert.match(migration, /REVOKE ALL ON FUNCTION public\.reconcile_cycle_plan_v2/);
assert.match(types, /reconcile_cycle_plan_v2: \{/);

const directBrowserMutation = /\.from\(['"](?:cycles_90_day|cycle_strategy|cycle_offers|cycle_limited_offers|cycle_revenue_plan|cycle_month_plans|projects|habits|tasks|user_settings|daily_plans)['"]\)[\s\S]{0,180}?\.(?:insert|upsert|update|delete)\(/;
assert.doesNotMatch(cycleSetup, directBrowserMutation,
  'Cycle Setup still directly mutates a canonical reconciliation table');

console.log('PASS STATIC migration ordering, schema destinations, auth/hash/lock contract, generated types, and browser boundary');
console.log('NOTE STATIC checks are not PostgreSQL behavior proof; run verify:cycle-plan-postgres separately');
