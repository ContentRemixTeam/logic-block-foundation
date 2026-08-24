import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = readFileSync(path.join(root, 'supabase/migrations/20260822220000_success_path_execution_ledger.sql'), 'utf8');
const types = readFileSync(path.join(root, 'src/integrations/supabase/types.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const postgres = readFileSync(path.join(root, 'tools/verify-mastermind-wave3-postgres.py'), 'utf8');

let checks = 0;
function requireCheck(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`FAIL ${message}`);
}

const tables = [
  'success_path_cycle_states', 'success_path_actions', 'success_path_confirmations',
  'success_path_evidence_receipts', 'success_path_checkins', 'success_path_support_requests',
  'success_path_focus_proposals', 'success_path_focus_transitions',
  'success_path_absence_recoveries', 'success_path_support_events',
  'success_path_timeline_events',
];
for (const table of tables) {
  requireCheck(migration.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `missing table ${table}`);
  requireCheck(types.includes(`      ${table}: {`), `generated types missing ${table}`);
  requireCheck(migration.includes(`'${table}'`), `private ACL loop missing ${table}`);
}

for (const constraint of [
  'success_path_state_owner_cycle_fkey', 'success_path_state_exact_planner_receipt_fkey',
  'success_path_state_frozen_assignment_fkey', 'success_path_actions_owner_task_fkey',
  'success_path_evidence_frozen_item_fkey', 'success_path_checkins_owner_evidence_fkey',
]) requireCheck(migration.includes(constraint), `missing same-owner/exact authority constraint ${constraint}`);

requireCheck(migration.includes("confirmed_stage IS NULL AND active_milestone_key IS NULL"), 'null confirmation must stay structurally unconfirmed');
requireCheck(migration.includes("'confirmation_state',CASE WHEN v_state.confirmed_stage IS NULL THEN 'unconfirmed'"), 'resolver must serialize null confirmation as unconfirmed');
requireCheck(migration.includes('is_system_generated, system_source, is_completed, generation_key')
  && migration.includes("true, 'guided_action_v1', false, v_logical_key"), 'canonical task must use a neutral Planner source');
requireCheck(!/mastermind[^\n]{0,80}(task_text|task_description|category|context_tags)/i.test(migration), 'ordinary Planner task surface contains Mastermind metadata');
requireCheck(migration.includes("'^guided-action-v1:[0-9a-f]{64}$'"), 'stable action identity contract missing');
requireCheck(migration.includes("p_cycle_id::text || ':' || p_milestone_key || ':' || p_move_key || ':' || p_action_version::text"), 'logical action identity must derive from cycle, milestone, move, and action version');
requireCheck(migration.includes('ON CONFLICT (user_id, cycle_id, generation_key)'), 'canonical task create is not concurrency-idempotent');
requireCheck(!migration.includes('video_completion') || migration.includes("'video_completion'"), 'video completion must only appear in evidence rejection');
requireCheck(migration.includes("'watch_percentage', 'watch_percent', 'video_completion', 'lesson_completion'"), 'watch/lesson completion rejection missing');
requireCheck(migration.includes("p_outcome NOT IN ('continue','improve','reduce','support')"), 'explicit evaluation outcomes missing');
requireCheck(migration.includes("p_outcome='reduce'"), 'reduce behavior missing');
requireCheck(migration.includes("capacity_mode='reduced'"), 'reduce must change capacity mode');
requireCheck(migration.includes("p_outcome='support'"), 'support behavior missing');
requireCheck(migration.includes("status IN ('open', 'acknowledged', 'resolved')"), 'support lifecycle missing');
requireCheck(migration.includes("p_transition_kind='milestone_advance'"), 'milestone advancement evidence gate missing');
requireCheck(migration.includes("p_confirm IS DISTINCT FROM true"), 'false transition confirmation must fail closed');
requireCheck(migration.includes("p_expected_impact_diff IS DISTINCT FROM v_proposal.impact_diff"), 'exact transition diff comparison missing');
requireCheck(migration.includes("'impact_order',jsonb_build_array('stage','milestone','assignment','action','history')"), 'ordered adversarial diff boundary missing');
requireCheck(migration.includes("'evidence_preserved',true,'actions_preserved',true,'checkins_preserved',true"), 'transition preservation impact missing');
requireCheck(!migration.includes('difficult_week'), 'one difficult week must not be an authority or proposal input');
requireCheck(migration.includes("'stage_preserved',true,'milestone_preserved',true,'overdue_items_created',0"), 'absence recovery preservation receipt missing');
requireCheck(migration.includes("p_small_action_minutes NOT BETWEEN 5 AND 60"), 'absence recovery small-action bound missing');

for (const rpc of [
  'create_success_path_recommendation', 'resolve_my_success_path', 'confirm_my_success_path',
  'submit_my_success_path_evidence', 'evaluate_my_success_path_week',
  'preview_my_success_path_transition', 'confirm_my_success_path_transition',
  'recover_my_success_path_after_absence', 'update_success_path_support',
  'resolve_my_success_path_timeline',
]) {
  requireCheck(migration.includes(`FUNCTION public.${rpc}`), `missing RPC ${rpc}`);
  requireCheck(types.includes(`      ${rpc}: {`), `generated contracts missing RPC ${rpc}`);
}

for (const memberRpc of [
  'resolve_my_success_path', 'confirm_my_success_path', 'submit_my_success_path_evidence',
  'evaluate_my_success_path_week', 'preview_my_success_path_transition',
  'confirm_my_success_path_transition', 'recover_my_success_path_after_absence',
  'resolve_my_success_path_timeline',
]) {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${memberRpc}`);
  const body = migration.slice(start, migration.indexOf('\n$$;', start) + 4);
  requireCheck(body.includes('auth.uid()'), `${memberRpc} must resolve auth.uid() server-side`);
  requireCheck(!new RegExp(`${memberRpc}\\s*\\([^)]*p_user_id`, 'i').test(migration), `${memberRpc} accepts browser-supplied identity`);
}

requireCheck(migration.includes('success_path_authority_is_valid(v_state.path_id,v_user_id)'), 'member writes do not revalidate exact authority');
requireCheck(migration.includes("mastermind_capability_state(v_user_id,'mastermind.learning.assigned'"), 'capability revalidation missing');
requireCheck(migration.includes('curriculum_assignment_authority_is_valid'), 'frozen Learning revalidation missing');
requireCheck(migration.includes('last_planner_receipt_id'), 'current Planner receipt revalidation missing');
requireCheck(migration.includes("REVOKE ALL ON FUNCTION public.update_success_path_support")
  && migration.includes('TO service_role;'), 'support operation is not narrow service-role-only');
requireCheck(migration.includes('success_path_forbid_history_mutation'), 'append-only history guard missing');
for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
  requireCheck(postgres.includes(`"${privilege}"`), `native final ACL verifier missing ${privilege}`);
}

const privacySentinels = [
  'stage', 'milestone', 'action', 'evidence', 'support', 'count', 'title', 'placement',
  'media_asset_id', 'transcript_version_id', 'private_locator', 'vault_resource_id',
  'planner_receipt_id', 'assignment_id', 'catalog_content_sha256',
];
for (const sentinel of privacySentinels) {
  requireCheck(postgres.includes(`"${sentinel}"`), `native serialized-denial verifier missing ${sentinel}`);
}
for (const persona of [
  'nonmember', 'expired', 'verification unavailable', 'review required', 'cross-owner',
  'stale Planner receipt', 'frozen assignment authority', 'malformed state',
]) requireCheck(postgres.includes(persona), `native persona/authority proof missing ${persona}`);

const executableMutationBinding = /mutation_control\s*=\s*success_path_after_mutation\([\s\S]*resolver_leak_mutation[\s\S]*\)/;
const hasExecutableMutation = (source) => source.includes('executable_privacy_mutation_control')
  && source.includes('CREATE OR REPLACE FUNCTION public.resolve_my_success_path')
  && executableMutationBinding.test(source)
  && source.includes('mutation_control.get("reason") != "executable_privacy_mutation_control"')
  && source.includes('rollback restoration')
  && !/mutation_control\s*\[\s*["']action_id["']\s*\]\s*=/.test(source);
requireCheck(hasExecutableMutation(postgres), 'native privacy mutation must execute the database-mutated resolver');
const legacyRegression = `${postgres}\nmutation_control["action_id"] = "leak"`;
requireCheck(!hasExecutableMutation(legacyRegression), 'static anti-regression failed to reject local-dictionary mutation');

requireCheck(pkg.scripts['verify:mastermind-wave3-static'] === 'node tools/verify-mastermind-wave3.mjs', 'Wave 3 static script wiring mismatch');
requireCheck(pkg.scripts['verify:mastermind-wave3-postgres'] === 'python3 tools/verify-mastermind-wave3-postgres.py', 'Wave 3 PG script wiring mismatch');
requireCheck(pkg.scripts['verify:mastermind-wave3']?.includes('verify:cycle-plan-full-stack-postgres'), 'Wave 3 aggregate must include chronological PG replay');
requireCheck(pkg.scripts.verify.includes('verify:mastermind-wave3'), 'repository verify must include Wave 3');

console.log(`PASS Wave 3 static/type/privacy contract checks (${checks})`);
