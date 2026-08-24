import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capabilityPath = path.join(root, 'supabase/migrations/20260822200000_mastermind_capability_projection.sql');
const curriculumPath = path.join(root, 'supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql');
const typesPath = path.join(root, 'src/integrations/supabase/types.ts');
const packagePath = path.join(root, 'package.json');
const postgresVerifierPath = path.join(root, 'tools/verify-mastermind-wave2-postgres.py');

const capability = readFileSync(capabilityPath, 'utf8');
const curriculum = readFileSync(curriculumPath, 'utf8');
const types = readFileSync(typesPath, 'utf8');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const postgresVerifier = readFileSync(postgresVerifierPath, 'utf8');
const resolverBody = curriculum.slice(
  curriculum.indexOf('CREATE OR REPLACE FUNCTION public.resolve_my_assigned_learning'),
  curriculum.indexOf('REVOKE ALL ON FUNCTION public.curriculum_catalog_item_guard'),
);

let checks = 0;
function requireCheck(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`FAIL ${message}`);
}

const capabilityKeys = [
  'planner.base',
  'mastermind.section',
  'mastermind.learning.assigned',
  'mastermind.ask_faith',
  'mastermind.community_link',
  'vault.discovery',
  'vault.search',
  'vault.playback',
  'vault.saved_videos',
  'admin.curriculum_preview',
];

for (const key of capabilityKeys) {
  requireCheck(capability.includes(`'${key}'`), `missing exact capability key ${key}`);
}
requireCheck(capability.includes('v_user_id uuid := auth.uid()'), 'member resolver must derive caller from auth.uid()');
requireCheck(!/resolve_my_capabilities\s*\([^)]*(email|user_id)/i.test(capability), 'capability RPC must not accept caller identity');
requireCheck(
  !/resolve_my_assigned_learning\s*\([^)]*(email|user_id)/i.test(curriculum),
  'assigned Learning RPC must not accept caller identity',
);
for (const state of ['granted', 'denied', 'verification_unavailable', 'review_required']) {
  requireCheck(capability.includes(`'${state}'`), `capability projection missing ${state}`);
}
requireCheck(
  capability.includes("p_hold_state NOT IN ('verification_unavailable', 'review_required')"),
  'verification holds must be restriction-only',
);
requireCheck(
  capability.includes('public.replay_vault_access_decision('),
  'Vault capabilities must compose the existing R10 decision',
);
requireCheck(
  capability.includes('REVOKE ALL ON FUNCTION public.resolve_my_capabilities()\n  FROM PUBLIC, anon;'),
  'PUBLIC/anon capability resolver ACL missing',
);
requireCheck(
  curriculum.includes('REVOKE ALL ON FUNCTION public.resolve_my_assigned_learning(uuid)\n  FROM PUBLIC, anon;'),
  'PUBLIC/anon Learning resolver ACL missing',
);

for (const table of [
  'curriculum_media_assets_private',
  'curriculum_catalog_versions',
  'curriculum_catalog_items',
  'curriculum_catalog_item_revocations',
  'curriculum_catalog_version_revocations',
  'curriculum_cycle_assignments',
  'curriculum_cycle_assignment_items',
]) {
  requireCheck(curriculum.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `missing ${table}`);
  requireCheck(types.includes(`      ${table}: {`), `generated types missing ${table}`);
}
for (const state of ['gap', 'candidate', 'refresh_required', 'ready', 'revoked']) {
  requireCheck(curriculum.includes(`'${state}'`), `catalog item state missing ${state}`);
}
for (const qa of [
  'transcript_qa_state', 'provenance_qa_state', 'rights_qa_state', 'privacy_qa_state',
  'edit_qa_state', 'caption_qa_state', 'playback_qa_state', 'action_qa_state', 'evidence_qa_state',
]) {
  requireCheck(curriculum.includes(`${qa} <> 'approved'`), `ready guard missing ${qa}`);
}
requireCheck(
  curriculum.includes('private_locator text NOT NULL') && !resolverBody.includes('private_locator'),
  'private media locator must remain outside member publication JSON',
);
requireCheck(curriculum.includes('curriculum_assignments_exact_receipt_fkey'), 'assignment exact receipt FK missing');
requireCheck(curriculum.includes('curriculum_assignments_owner_cycle_fkey'), 'same-owner cycle FK missing');
requireCheck(curriculum.includes("WHERE assignment_status = 'active'"), 'one-active-assignment partial unique missing');
requireCheck(curriculum.includes('pg_advisory_xact_lock'), 'concurrent assignment lock missing');
requireCheck(curriculum.includes("v_status := 'pending_confirmation'"), 'rebuild confirmation boundary missing');
requireCheck(curriculum.includes('curriculum_rebuild_diff_for_proposal'), 'server-derived proposal diff missing');
requireCheck(curriculum.includes('curriculum_assignment_rebuild_diff'), 'frozen pending diff recomputation missing');
requireCheck(
  curriculum.includes('p_rebuild_diff IS NOT NULL AND p_rebuild_diff IS DISTINCT FROM v_rebuild_diff'),
  'caller proposal diff must be treated only as an exact expectation',
);
requireCheck(
  curriculum.includes('p_expected_rebuild_diff IS DISTINCT FROM v_server_diff')
    && curriculum.includes('p_expected_rebuild_diff_sha256 IS DISTINCT FROM v_server_diff_sha256'),
  'confirmation must match exact server-derived diff and canonical hash',
);
requireCheck(curriculum.includes('assigned_learning_review_required'), 'revocation/review fail-closed branch missing');
requireCheck(curriculum.includes('assigned_catalog_revoked'), 'whole-catalog revocation fail-closed branch missing');
requireCheck(curriculum.includes("'items', '[]'::jsonb"), 'denied resolver must return no item metadata');

requireCheck(
  curriculum.includes("'encoding_contract', 'planner-learning-authority-jsonb-v1'")
    && curriculum.includes("'encoding_contract', 'planner-learning-catalog-jsonb-v1'")
    && curriculum.includes('ORDER BY i.stable_item_key, i.catalog_item_id'),
  'publication hashing must use versioned canonical JSON and deterministic ordering',
);
requireCheck(!curriculum.includes('concat_ws(\'|\''), 'ambiguous delimiter publication hash must be retired');
for (const field of [
  'milestone_title', 'media_asset_id', 'source_content_sha256', 'canonical_resource_id',
  'transcript_version_id', 'playback_attempt_id', 'publication_sha256', 'required_capability',
  'teacher_display_name', 'attribution_text', 'source_system', 'source_native_id',
  'source_provenance', 'provenance_sha256', 'action_prompt', 'evidence_prompt',
  'transcript_qa_state', 'provenance_qa_state', 'rights_qa_state', 'privacy_qa_state',
  'edit_qa_state', 'caption_qa_state', 'playback_qa_state', 'action_qa_state',
  'evidence_qa_state', 'qa_receipt_sha256', 'qa_approved_at', 'qa_approved_by',
  'lifecycle_state_at_publication', 'published_at', 'catalog_version_id', 'catalog_context',
  'version_key', 'version_number',
]) {
  requireCheck(curriculum.includes(`'${field}'`), `publication authority hash missing ${field}`);
}
requireCheck(
  curriculum.includes('v_catalog.content_sha256 IS DISTINCT FROM')
    && curriculum.includes('curriculum_assignment_authority_is_valid(v_assignment.assignment_id)'),
  'assignment creation/resolution must recompute publication authority',
);
requireCheck(
  curriculum.includes('CREATE OR REPLACE FUNCTION public.revoke_curriculum_catalog_version')
    && curriculum.includes('curriculum_catalog_version_revocations_append_only')
    && curriculum.includes('catalog revocation requires its exact append-only audit event')
    && curriculum.includes('GRANT EXECUTE ON FUNCTION public.revoke_curriculum_catalog_version(uuid,text,text,text)\n  TO service_role;'),
  'service-only append-only terminal catalog revocation transition missing',
);

for (const rpc of [
  'resolve_my_capabilities',
  'resolve_my_assigned_learning',
  'publish_curriculum_catalog_version',
  'create_curriculum_cycle_assignment',
  'confirm_curriculum_assignment_rebuild',
  'revoke_curriculum_catalog_version',
  'set_capability_verification_hold',
]) {
  requireCheck(types.includes(`      ${rpc}: {`), `generated types missing RPC ${rpc}`);
}

for (const sentinel of [
  'media_asset_id', 'canonical_resource_id', 'transcript_version_id', 'playback_attempt_id',
  'publication_sha256', 'private_locator', 'provider_asset_id', 'vault_resource_id',
  'resource_count', 'placement_metadata', 'alternate_label',
]) {
  requireCheck(postgresVerifier.includes(`"${sentinel}"`), `native serialized-response verifier missing ${sentinel}`);
}
for (const state of [
  'standalone Planner', 'expired entitlement', 'verification unavailable', 'review required',
  'stale Planner receipt', 'cross-owner', 'item revoked', 'whole catalog revoked',
  'malformed authority',
]) {
  requireCheck(postgresVerifier.includes(state), `native denied-envelope coverage missing ${state}`);
}
requireCheck(
  postgresVerifier.includes('denied response mutation control'),
  'native verifier mutation control for private denied-response fields missing',
);

requireCheck(pkg.scripts['verify:mastermind-wave2'] === 'npm run verify:mastermind-wave2-static && npm run verify:mastermind-wave2-postgres && npm run verify:cycle-plan-full-stack-postgres', 'Wave 2 aggregate must include focused and full chronological PG16 proof');
requireCheck(pkg.scripts.verify.includes('verify:mastermind-wave2'), 'repository aggregate does not run Wave 2 verifier');

const protectedMigration = 'supabase/migrations/20260808120000_mastermind_portal_private_search.sql';
let protectedDirty = '';
try {
  protectedDirty = execFileSync('git', ['diff', '--name-only', '--', protectedMigration], { cwd: root, encoding: 'utf8' }).trim();
} catch (error) {
  throw new Error(`FAIL could not inspect protected inherited migration: ${error.message}`);
}
requireCheck(protectedDirty === '', 'inherited PG16-blocked private-search migration was modified');

console.log(`PASS Wave 2 static/type contract checks (${checks})`);
