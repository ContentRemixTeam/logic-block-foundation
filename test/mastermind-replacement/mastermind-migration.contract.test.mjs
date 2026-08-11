import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/20260811120000_mastermind_planner_replacement.sql';
const migration = await readFile(migrationPath, 'utf8');
const receiptRepair = await readFile('supabase/migrations/20260811183000_mastermind_action_receipt_provenance.sql', 'utf8');
const hook = await readFile('src/hooks/useMastermindSuccessPath.ts', 'utf8');

function repairedContractFailures(sql = migration, repairSql = receiptRepair, hookSource = hook) {
  const contracts = [
    [sql, /CREATE UNIQUE INDEX mastermind_success_path_one_active_action_per_cycle[\s\S]*WHERE retired_at IS NULL/, 'active cycle uniqueness'],
    [sql, /FOREIGN KEY \(task_id, user_id, cycle_id\) REFERENCES public\.tasks\(task_id, user_id, cycle_id\)/, 'action task cycle binding'],
    [sql, /retired_at IS NULL/, 'retired action rejection'],
    [sql, /v_milestone IS DISTINCT FROM v_action\.milestone_id/, 'current milestone check-in binding'],
    [sql, /v_confirmed_receipt IS DISTINCT FROM v_receipt/, 'confirmed receipt equality'],
    [repairSql, /ALTER COLUMN planner_receipt_id SET NOT NULL/, 'non-null action receipt provenance'],
    [repairSql, /FOREIGN KEY \(planner_receipt_id, user_id, cycle_id\)[\s\S]*REFERENCES public\.cycle_plan_reconciliation_requests\(request_id, user_id, cycle_id\)/, 'action receipt owner-cycle binding'],
    [repairSql, /action\.milestone_id IS DISTINCT FROM p_milestone_id OR action\.planner_receipt_id IS DISTINCT FROM v_receipt/, 'same-milestone receipt retirement'],
    [repairSql, /planner_receipt_id=EXCLUDED.planner_receipt_id/, 'explicit reschedule receipt rebind'],
    [repairSql, /v_action\.planner_receipt_id IS DISTINCT FROM v_receipt/, 'check-in action receipt binding'],
    [hookSource, /from\('mastermind_cycle_curriculum_assignments'\)/, 'assignment manifest query'],
    [hookSource, /parseFrozenManifest/, 'manifest validation'],
    [hookSource, /curriculumUnavailable = true/, 'malformed manifest fail closed'],
    [hookSource, /\.is\('retired_at', null\)/, 'client active action filter'],
    [hookSource, /\.eq\('milestone_id', snapshot\.current_milestone_id\)/, 'client current milestone filter'],
    [hookSource, /\.eq\('planner_receipt_id', snapshot\.planner_receipt_id\)/, 'client current receipt filter'],
  ];
  return contracts.filter(([source, pattern]) => !pattern.test(source)).map(([, , label]) => label);
}

test('confirmation accepts no client manifest and derives the frozen manifest from the catalog', () => {
  const signature = migration.match(/confirm_mastermind_success_path\(([^)]*)\)/)?.[1];
  assert.equal(signature, 'p_cycle_id uuid, p_stage text, p_milestone_id text, planner_receipt_id uuid');
  assert.doesNotMatch(migration, /p_manifest|jsonb_array_elements\(p_manifest\)/);
  assert.match(migration, /FROM public\.mastermind_curriculum_catalog WHERE manifest_version='mastermind-curriculum-v1' AND milestone_id=p_milestone_id AND stage_id=p_stage/);
  assert.match(migration, /jsonb_agg\(jsonb_build_object\([\s\S]*ORDER BY slot_order\)/);
  assert.match(migration, /VALUES\(v_user,p_cycle_id,'mastermind-curriculum-v1',v_manifest\)/);
});

test('action identity, milestone, date, and lengths are server-authoritative', () => {
  assert.match(migration, /p_scheduled_date IS NULL/);
  assert.match(migration, /p_milestone_id<>v_current_milestone/);
  assert.match(migration, /v_expected_key := p_cycle_id::text\|\|':'\|\|p_milestone_id\|\|':active'/);
  assert.match(migration, /p_stable_key<>v_expected_key/);
  assert.match(migration, /char_length\(btrim\(p_exact_move\)\)>500/);
  assert.doesNotMatch(migration, /v_expected_key := p_stable_key/);
});

test('check-ins require a confirmed nonnull stage and bounded inputs', () => {
  assert.match(migration, /IF v_stage IS NULL THEN RAISE EXCEPTION[^;]+before checking in/);
  assert.match(migration, /char_length\(COALESCE\(btrim\(p_evidence\),''\)\)>1000/);
  assert.match(migration, /stage_at_check_in text NOT NULL/);
});

test('opaque resources are text and functions are owner-safe with restricted ACLs', () => {
  assert.match(migration, /resource_id text NULL/);
  assert.doesNotMatch(migration, /resource_id uuid NULL/);
  assert.equal((migration.match(/SECURITY DEFINER SET search_path = public, auth, pg_temp/g) ?? []).length, 3);
  assert.equal((migration.match(/REVOKE ALL ON FUNCTION/g) ?? []).length, 3);
  assert.equal((migration.match(/GRANT EXECUTE ON FUNCTION/g) ?? []).length, 3);
  assert.match(migration, /REVOKE ALL ON public\.mastermind_curriculum_catalog FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE)[^;]*mastermind_curriculum_catalog/);
});

test('repaired invariants and frozen assignment fail-closed contracts are present', () => {
  assert.deepEqual(repairedContractFailures(), []);
});

test('normal contract gate fails when any repaired blocker is removed', () => {
  const mutations = [
    [migration.replace('WHERE retired_at IS NULL;', 'WHERE retired_at IS NOT NULL;'), receiptRepair, hook],
    [migration.replace('FOREIGN KEY (task_id, user_id, cycle_id)', 'FOREIGN KEY (task_id)'), receiptRepair, hook],
    [migration.replaceAll('retired_at IS NULL', 'retired_at IS NOT NULL'), receiptRepair, hook],
    [migration.replace('v_milestone IS DISTINCT FROM v_action.milestone_id', 'false'), receiptRepair, hook],
    [migration.replaceAll('v_confirmed_receipt IS DISTINCT FROM v_receipt', 'false'), receiptRepair, hook],
    [migration, receiptRepair.replace('ALTER COLUMN planner_receipt_id SET NOT NULL', 'ALTER COLUMN planner_receipt_id DROP NOT NULL'), hook],
    [migration, receiptRepair.replace('FOREIGN KEY (planner_receipt_id, user_id, cycle_id)', 'FOREIGN KEY (planner_receipt_id)'), hook],
    [migration, receiptRepair.replaceAll('action.milestone_id IS DISTINCT FROM p_milestone_id OR action.planner_receipt_id IS DISTINCT FROM v_receipt', 'action.milestone_id IS DISTINCT FROM p_milestone_id'), hook],
    [migration, receiptRepair.replace('planner_receipt_id=EXCLUDED.planner_receipt_id', 'planner_receipt_id=mastermind_success_path_actions.planner_receipt_id'), hook],
    [migration, receiptRepair.replaceAll('v_action.planner_receipt_id IS DISTINCT FROM v_receipt', 'false'), hook],
    [migration, receiptRepair, hook.replace("from('mastermind_cycle_curriculum_assignments')", "from('removed_assignments')")],
    [migration, receiptRepair, hook.replaceAll('parseFrozenManifest', 'removedManifestParser')],
    [migration, receiptRepair, hook.replaceAll('curriculumUnavailable = true', 'curriculumUnavailable = false')],
    [migration, receiptRepair, hook.replace(".is('retired_at', null)", '')],
    [migration, receiptRepair, hook.replaceAll(".eq('milestone_id', snapshot.current_milestone_id)", '')],
    [migration, receiptRepair, hook.replace(".eq('planner_receipt_id', snapshot.planner_receipt_id)", '')],
  ];
  for (const [index, [sql, repairSql, hookSource]] of mutations.entries()) {
    assert.ok(repairedContractFailures(sql, repairSql, hookSource).length > 0, `mutation ${index + 1} escaped the gate`);
  }
});
