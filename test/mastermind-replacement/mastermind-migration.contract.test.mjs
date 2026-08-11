import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/20260811120000_mastermind_planner_replacement.sql';
const migration = await readFile(migrationPath, 'utf8');
const hook = await readFile('src/hooks/useMastermindSuccessPath.ts', 'utf8');

function repairedContractFailures(sql = migration, hookSource = hook) {
  const contracts = [
    [sql, /CREATE UNIQUE INDEX mastermind_success_path_one_active_action_per_cycle[\s\S]*WHERE retired_at IS NULL/, 'active cycle uniqueness'],
    [sql, /FOREIGN KEY \(task_id, user_id, cycle_id\) REFERENCES public\.tasks\(task_id, user_id, cycle_id\)/, 'action task cycle binding'],
    [sql, /retired_at IS NULL/, 'retired action rejection'],
    [sql, /v_milestone IS DISTINCT FROM v_action\.milestone_id/, 'current milestone check-in binding'],
    [sql, /v_confirmed_receipt IS DISTINCT FROM v_receipt/, 'confirmed receipt equality'],
    [hookSource, /from\('mastermind_cycle_curriculum_assignments'\)/, 'assignment manifest query'],
    [hookSource, /parseFrozenManifest/, 'manifest validation'],
    [hookSource, /curriculumUnavailable = true/, 'malformed manifest fail closed'],
    [hookSource, /\.is\('retired_at', null\)/, 'client active action filter'],
    [hookSource, /\.eq\('milestone_id', snapshot\.current_milestone_id\)/, 'client current milestone filter'],
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
    [migration.replace('WHERE retired_at IS NULL;', 'WHERE retired_at IS NOT NULL;'), hook],
    [migration.replace('FOREIGN KEY (task_id, user_id, cycle_id)', 'FOREIGN KEY (task_id)'), hook],
    [migration.replaceAll('retired_at IS NULL', 'retired_at IS NOT NULL'), hook],
    [migration.replace('v_milestone IS DISTINCT FROM v_action.milestone_id', 'false'), hook],
    [migration.replaceAll('v_confirmed_receipt IS DISTINCT FROM v_receipt', 'false'), hook],
    [migration, hook.replace("from('mastermind_cycle_curriculum_assignments')", "from('removed_assignments')")],
    [migration, hook.replaceAll('parseFrozenManifest', 'removedManifestParser')],
    [migration, hook.replaceAll('curriculumUnavailable = true', 'curriculumUnavailable = false')],
    [migration, hook.replace(".is('retired_at', null)", '')],
    [migration, hook.replaceAll(".eq('milestone_id', snapshot.current_milestone_id)", '')],
  ];
  for (const [index, [sql, hookSource]] of mutations.entries()) {
    assert.ok(repairedContractFailures(sql, hookSource).length > 0, `mutation ${index + 1} escaped the gate`);
  }
});
