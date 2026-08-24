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
requireCheck(migration.includes('success_path_evidence_node_is_safe')
  && migration.includes('p_depth > 6') && migration.includes("jsonb_typeof(p_value)='array'")
  && migration.includes('|task|completion|completed|complete|done|checked|checkmark|')
  && migration.includes('coursemetadata'),
  'recursive evidence key/value proxy rejection missing');
requireCheck(migration.includes('success_path_evidence_supports_advancement')
  && migration.includes("'business_metric', 'customer_response', 'deliverable', 'decision', 'experiment_result'"),
  'advancement-eligible evidence classification missing');
requireCheck(migration.includes("p_outcome NOT IN ('continue','improve','reduce','support')"), 'explicit evaluation outcomes missing');
requireCheck(migration.includes("p_outcome='reduce'"), 'reduce behavior missing');
requireCheck(migration.includes("capacity_mode='reduced'"), 'reduce must change capacity mode');
requireCheck(migration.includes("p_outcome='support'"), 'support behavior missing');
requireCheck(migration.includes("status IN ('open', 'acknowledged', 'resolved')"), 'support lifecycle missing');
requireCheck(migration.includes("p_transition_kind='milestone_advance'"), 'milestone advancement evidence gate missing');
requireCheck(migration.includes("p_confirm IS DISTINCT FROM true"), 'false transition confirmation must fail closed');
requireCheck(migration.includes('success_path_canonical_transition_diff')
  && migration.includes('v_recomputed_diff:=public.success_path_canonical_transition_diff')
  && migration.includes('p_expected_impact_diff IS DISTINCT FROM v_recomputed_diff'),
  'confirmation does not rederive and compare exact transition authority');
requireCheck(migration.includes("'impact_order',jsonb_build_array('transition','path','stage','milestone','learning_authority','action','evidence','history')"), 'ordered complete adversarial diff boundary missing');
for (const field of [
  'expected_state_version', 'assignment_item_id', 'catalog_version_key', 'catalog_item_id',
  'authority_sha256', 'canonical_resource_id', 'media_asset_id', 'transcript_version_id',
  'playback_attempt_id', 'publication_sha256', 'logical_action_key', 'request_sha256',
  'canonical_identity_semantics',
]) requireCheck(migration.includes(`'${field}'`), `transition authority diff missing ${field}`);
requireCheck(migration.includes("'evidence_preserved',true,'actions_preserved',true,'checkins_preserved',true"), 'transition preservation impact missing');
requireCheck(!migration.includes('difficult_week'), 'one difficult week must not be an authority or proposal input');
requireCheck(migration.includes("'stage_preserved',true,'milestone_preserved',true,'overdue_items_created',0"), 'absence recovery preservation receipt missing');
requireCheck(migration.includes("p_small_action_minutes NOT BETWEEN 5 AND 60"), 'absence recovery small-action bound missing');
requireCheck((migration.match(/success_path_retire_canonical_action\(/g) || []).length >= 5,
  'reduce/transition/recovery do not all retire prior canonical generation safely');
requireCheck(migration.includes('success_path_one_active_canonical_task_idx')
  && migration.includes("system_source = 'guided_action_v1'") && migration.includes('generation_active'),
  'database active canonical task uniqueness gate missing');

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
requireCheck(migration.includes("REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role"),
  'Wave 3 table ACL loop does not revoke service_role');
requireCheck(!migration.includes("REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',v_table"),
  'defective service_role table bypass pattern returned');
for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
  requireCheck(postgres.includes(`"${privilege}"`), `native final ACL verifier missing ${privilege}`);
}
for (const role of ['anon', 'authenticated', 'service_role']) {
  requireCheck(postgres.includes(`"${role}"`), `native effective ACL matrix missing ${role}`);
}
requireCheck(postgres.includes("grantee='PUBLIC'"), 'native ACL matrix missing PUBLIC grants oracle');
requireCheck(postgres.includes('service_statements') && postgres.includes('forged-service-append'),
  'native service_role forged append/delete/truncate proof missing');

const functionBody = (name) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  return migration.slice(start, migration.indexOf('\n$$;', start) + 4);
};
const previewBody = functionBody('preview_my_success_path_transition');
const firstPreviewLookup = previewBody.indexOf('SELECT * INTO v_existing FROM public.success_path_focus_proposals');
const previewLock = previewBody.indexOf('pg_advisory_xact_lock', firstPreviewLookup);
const previewRecheck = previewBody.indexOf('SELECT * INTO v_existing FROM public.success_path_focus_proposals', previewLock);
requireCheck(firstPreviewLookup >= 0 && previewLock > firstPreviewLookup && previewRecheck > previewLock,
  'preview request receipt does not follow check-lock-recheck ordering');
for (const functionName of ['submit_my_success_path_evidence', 'recover_my_success_path_after_absence']) {
  const body = functionBody(functionName);
  const first = body.indexOf('SELECT * INTO v_existing');
  const lock = body.indexOf('pg_advisory_xact_lock', first);
  const recheck = body.indexOf('SELECT * INTO v_existing', lock);
  requireCheck(first >= 0 && lock > first && recheck > lock,
    `${functionName} does not follow check-lock-recheck ordering`);
}
const checkinBody = functionBody('evaluate_my_success_path_week');
requireCheck(checkinBody.includes("'success-path-request:'") && checkinBody.includes("'success-path-checkin:'")
  && checkinBody.indexOf("'success-path-request:'") < checkinBody.indexOf("'success-path-checkin:'"),
  'check-in request/period advisory locks are absent or nondeterministic');
requireCheck(checkinBody.includes('WHERE user_id=v_user_id AND cycle_id=p_cycle_id AND period_key=p_period_key'),
  'check-in does not recheck authoritative period receipt');
const supportBody = functionBody('update_success_path_support');
requireCheck(supportBody.includes('user_id=v_support.user_id AND support_request_id=p_support_request_id AND request_id=p_request_id'),
  'support request replay lookup is not scoped to owner/support/request identity');
requireCheck(!/success_path_support_events WHERE request_id=p_request_id/.test(supportBody),
  'defective global support request-id lookup returned');

const privacySentinels = [
  'recommendation_reason', 'recommendation_evidence_sha256', 'recommended_stage', 'confirmed_stage',
  'milestone', 'action_id', 'action_text', 'logical_action_key', 'task_id', 'evidence_receipt_id',
  'evidence_type', 'structured_value', 'member_note', 'support_request_id', 'operator_notes',
  'actor_reference', 'actor_identity', 'actor_role', 'internal_reason', 'count', 'title', 'placement',
  'label', 'discovery', 'search_metadata', 'canonical_resource_id', 'media_asset_id',
  'transcript_version_id', 'playback_attempt_id', 'publication_sha256', 'private_locator',
  'provider_asset_id', 'source_native_id', 'vault_resource_id', 'planner_receipt_id',
  'assignment_id', 'assignment_item_id', 'catalog_version_id', 'catalog_content_sha256',
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
  && source.includes("'recommendation_reason','PRIVATE-RECOMMENDATION-REASON'")
  && source.includes("'canonical_resource_id'")
  && source.includes("'publication_sha256'")
  && source.includes('rollback restoration')
  && !/mutation_control\s*\[\s*["']action_id["']\s*\]\s*=/.test(source);
requireCheck(hasExecutableMutation(postgres), 'native privacy mutation must execute the database-mutated resolver');
const legacyRegression = `${postgres}\nmutation_control["action_id"] = "leak"`;
requireCheck(!hasExecutableMutation(legacyRegression), 'static anti-regression failed to reject local-dictionary mutation');

const timelineMutationBinding = /timeline_mutation_lines\s*=\s*run\([\s\S]*timeline_mutation_sql[\s\S]*json\.loads\(timeline_mutation_lines\[-1\]\)/;
const hasTimelineMutation = (source) => source.includes('CREATE OR REPLACE FUNCTION public.resolve_my_success_path_timeline')
  && source.includes("'actor_reference','PRIVATE-ACTOR-REFERENCE'")
  && source.includes("'internal_actor_metadata'")
  && timelineMutationBinding.test(source)
  && source.includes('assert_timeline_private_free("executable timeline mutation", timeline_mutation')
  && source.includes('timeline rollback restoration')
  && !/timeline_mutation\s*\[\s*["']actor_reference["']\s*\]\s*=/.test(source);
requireCheck(hasTimelineMutation(postgres), 'timeline privacy mutation must execute the database-mutated resolver response');
requireCheck(!hasTimelineMutation(`${postgres}\ntimeline_mutation["actor_reference"] = "leak"`),
  'timeline static anti-regression failed to reject local-object mutation');

for (const proof of [
  'concurrent transition preview retry', 'concurrent evidence retry', 'distinct-request same-period',
  'concurrent absence recovery retry', '"action text":', 'same-milestone/item',
  'backward frozen assignment item', 'active incomplete canonical tasks', '"confirmed stage":',
  '"evidence pointer":', '"support pointer":', 'PRIVATE-RECOMMENDATION-REASON',
  'PRIVATE-ACTOR-REFERENCE', 'pg_proc signature drift', 'information_schema nullability drift',
]) requireCheck(postgres.includes(proof), `native critical proof missing: ${proof}`);

const extractNamedBlock = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  return source.slice(start, end);
};
const expectedTypeArgs = {
  confirm_my_success_path_transition: ['p_confirm', 'p_confirmation_request_id', 'p_expected_impact_diff', 'p_expected_impact_diff_sha256', 'p_proposal_id'],
  evaluate_my_success_path_week: ['p_action_id', 'p_cycle_id', 'p_evidence_receipt_id', 'p_expected_path_version', 'p_outcome', 'p_period_key', 'p_reduced_action_minutes', 'p_reduced_action_text', 'p_request_id'],
  preview_my_success_path_transition: ['p_cycle_id', 'p_evidence_receipt_id', 'p_expected_path_version', 'p_proposed_action_minutes', 'p_proposed_action_text', 'p_proposed_assignment_id', 'p_proposed_assignment_item_id', 'p_proposed_milestone_key', 'p_proposed_milestone_title', 'p_proposed_move_key', 'p_proposed_stage', 'p_reason_code', 'p_request_id', 'p_transition_kind'],
  submit_my_success_path_evidence: ['p_action_id', 'p_cycle_id', 'p_evidence_type', 'p_expected_path_version', 'p_member_note', 'p_observed_at', 'p_reference_label', 'p_request_id', 'p_structured_value'],
};
for (const [name, args] of Object.entries(expectedTypeArgs)) {
  const block = extractNamedBlock(types, `      ${name}: {`, '\n      }\n');
  const argsStart = block.indexOf('Args: {');
  const argsEnd = block.indexOf('\n        }', argsStart);
  const actual = [...block.slice(argsStart, argsEnd).matchAll(/^\s+(p_[a-z0-9_]+)(?:\?)?:/gm)].map((match) => match[1]).sort();
  requireCheck(JSON.stringify(actual) === JSON.stringify([...args].sort()),
    `generated TypeScript Args drift for ${name}: ${actual.join(',')}`);
}
for (const [table, exactFields] of Object.entries({
  success_path_cycle_states: ['active_assignment_item_id: string | null', 'assignment_id: string', 'catalog_content_sha256: string', 'confirmed_stage: string | null'],
  success_path_evidence_receipts: ['member_note: string | null', 'structured_value: Json'],
  success_path_focus_proposals: ['evidence_receipt_id: string | null', 'impact_diff: Json'],
})) {
  const block = extractNamedBlock(types, `      ${table}: {`, '\n      }\n');
  for (const field of exactFields) requireCheck(block.includes(field),
    `generated TypeScript nullability/type drift for ${table}.${field}`);
}
requireCheck(postgres.includes('expected_signatures') && postgres.includes('nullable_contract')
  && postgres.includes('expected_relationships') && postgres.includes('source_columns')
  && postgres.includes('target_columns') && postgres.includes('delete_action'),
  'manual TypeScript surface lacks exact database signature/nullability/relationship drift oracle');
requireCheck(postgres.includes('set(value) != DENIAL_RESPONSE_FIELDS')
  && postgres.includes('set(value) != TIMELINE_RESPONSE_FIELDS')
  && postgres.includes('set(event) != TIMELINE_EVENT_FIELDS'),
  'privacy verifier does not enforce closed denial/timeline response schemas');
requireCheck(postgres.includes('UNSEEDED-WAVE2-LEAK') && postgres.includes('PRIVATE-TOPLEVEL-ACTOR')
  && postgres.includes('PRIVATE-TOPLEVEL-OPERATOR'),
  'privacy executable controls do not cover unknown denial or top-level timeline fields');
requireCheck(postgres.includes('{\"nested\":{\"task\":{\"completed\":true}}}'),
  'native evidence verifier lacks generic nested task-completion proxy control');
requireCheck(!postgres.includes('relationship_count ='),
  'name-count-only relationship drift oracle returned');

requireCheck(pkg.scripts['verify:mastermind-wave3-static'] === 'node tools/verify-mastermind-wave3.mjs', 'Wave 3 static script wiring mismatch');
requireCheck(pkg.scripts['verify:mastermind-wave3-postgres'] === 'python3 tools/verify-mastermind-wave3-postgres.py', 'Wave 3 PG script wiring mismatch');
requireCheck(pkg.scripts['verify:mastermind-wave3']?.includes('verify:cycle-plan-full-stack-postgres'), 'Wave 3 aggregate must include chronological PG replay');
requireCheck(pkg.scripts.verify.includes('verify:mastermind-wave3'), 'repository verify must include Wave 3');

console.log(`PASS Wave 3 static/type/privacy contract checks (${checks})`);
