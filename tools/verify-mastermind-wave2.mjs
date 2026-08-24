import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capabilityPath = path.join(root, 'supabase/migrations/20260822200000_mastermind_capability_projection.sql');
const curriculumPath = path.join(root, 'supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql');
const typesPath = path.join(root, 'src/integrations/supabase/types.ts');
const packagePath = path.join(root, 'package.json');

const capability = readFileSync(capabilityPath, 'utf8');
const curriculum = readFileSync(curriculumPath, 'utf8');
const types = readFileSync(typesPath, 'utf8');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

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
  curriculum.includes('private_locator text NOT NULL') && !/jsonb_build_object\([^;]*private_locator/s.test(curriculum),
  'private media locator must remain outside member publication JSON',
);
requireCheck(curriculum.includes('curriculum_assignments_exact_receipt_fkey'), 'assignment exact receipt FK missing');
requireCheck(curriculum.includes('curriculum_assignments_owner_cycle_fkey'), 'same-owner cycle FK missing');
requireCheck(curriculum.includes("WHERE assignment_status = 'active'"), 'one-active-assignment partial unique missing');
requireCheck(curriculum.includes('pg_advisory_xact_lock'), 'concurrent assignment lock missing');
requireCheck(curriculum.includes("v_status := 'pending_confirmation'"), 'rebuild confirmation boundary missing');
requireCheck(curriculum.includes('p_expected_rebuild_diff_sha256'), 'exact rebuild diff confirmation missing');
requireCheck(curriculum.includes('assigned_learning_review_required'), 'revocation/review fail-closed branch missing');
requireCheck(curriculum.includes("'items', '[]'::jsonb"), 'denied resolver must return no item metadata');

for (const rpc of [
  'resolve_my_capabilities',
  'resolve_my_assigned_learning',
  'publish_curriculum_catalog_version',
  'create_curriculum_cycle_assignment',
  'confirm_curriculum_assignment_rebuild',
  'set_capability_verification_hold',
]) {
  requireCheck(types.includes(`      ${rpc}: {`), `generated types missing RPC ${rpc}`);
}

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
