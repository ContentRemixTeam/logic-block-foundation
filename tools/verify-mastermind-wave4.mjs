#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.env.WAVE4_VERIFY_ROOT ? path.resolve(process.env.WAVE4_VERIFY_ROOT) : defaultRoot;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql');
const edge = read('supabase/functions/_shared/assignedLearningPlayback.ts');
const edgeAdapter = read('supabase/functions/get-assigned-learning-playback/index.ts');
const edgeTest = read('supabase/functions/_shared/assignedLearningPlayback.test.ts');
const page = read('src/pages/MastermindSuccessPath.tsx');
const player = read('src/components/mastermind/AssignedLearningPlayer.tsx');
const hook = read('src/hooks/useSuccessPathLearningSlice.ts');
const parser = read('src/lib/successPathLearningSlice.ts');
const app = read('src/App.tsx');
const types = read('src/integrations/supabase/types.ts');
const mounted = read('tools/verify-mastermind-wave4-mounted.mjs');
const postgres = read('tools/verify-mastermind-wave4-postgres.py');
const chronology = read('tools/verify-cycle-plan-full-stack-postgres.py');
const pkg = JSON.parse(read('package.json'));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, `FAIL ${message}`); };

check(fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).length === 198, 'migration chronology must include the Wave 5 frontier');
check(migration.includes('CREATE TABLE IF NOT EXISTS public.planner_learning_playback_authorizations'), 'authorization receipt table missing');
check(migration.includes('append-only') && migration.includes('BEFORE UPDATE OR DELETE'), 'authorization audit is not append-only');
check(migration.includes('evaluation_sequence bigint NOT NULL DEFAULT 1') && migration.includes('supersedes_authorization_receipt_id uuid'), 'sequential/superseding receipt history missing');
check(migration.includes('UNIQUE(user_id, request_id, evaluation_sequence)') && !migration.includes('UNIQUE(user_id, request_id)\n'), 'receipt uniqueness does not preserve sequential history');
check(migration.includes('planner_learning_playback_authorizations_latest_idx') && migration.includes('evaluation_sequence DESC'), 'latest receipt index missing');
check(migration.includes('DROP CONSTRAINT IF EXISTS planner_learning_playback_authorizations_user_id_request_id_key'), 'rejected-candidate unique constraint is not repaired idempotently');
check(migration.includes('CREATE OR REPLACE FUNCTION public.resolve_my_success_path_learning_slice'), 'member resolver missing');
check(migration.includes('v_user_id uuid := auth.uid()'), 'member resolver does not derive auth.uid');
check(!/resolve_my_success_path_learning_slice\s*\([^)]*p_user_id/i.test(migration), 'member resolver accepts caller identity');
check(migration.includes("v_state.confirmed_stage <> 'offer'"), 'Offer-only vertical slice gate missing');
check(/IF p_assignment_item_id IS NOT NULL\s+AND p_assignment_item_id <> v_state\.active_assignment_item_id THEN/.test(migration), 'exact current item gate missing');
check(migration.includes("v_catalog_item.item_state<>'ready'") && migration.includes("'approved' <> ANY"), 'ready/all-QA gate missing');
check(migration.includes('curriculum_catalog_item_publication_authority') && migration.includes('curriculum_catalog_content_sha256'), 'publication authority drift checks missing');
check(migration.includes("'planner_receipt_id',v_state.planner_receipt_id") && migration.includes("'source_content_sha256',v_media.source_content_sha256"), 'private authorization hash is incomplete');
const memberBody = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.resolve_my_success_path_learning_slice'), migration.indexOf('CREATE OR REPLACE FUNCTION public.resolve_assigned_learning_playback'));
check(!memberBody.includes("'private_locator'"), 'member projection contains locator');
check(migration.includes("'slice_state','ready','reason','assigned_learning_available'") && migration.includes("'slice', NULL"), 'closed success/empty envelope missing');
const wave4Functions = [
  'planner_learning_playback_forbid_mutation()',
  'success_path_learning_text_is_safe(text,integer)',
  'success_path_learning_empty(text,text)',
  'success_path_learning_authority(uuid,uuid,uuid,timestamptz)',
  'resolve_my_success_path_learning_slice(uuid)',
  'resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)',
];
for (const signature of wave4Functions) {
  const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  check(new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped}\\s+FROM PUBLIC, anon, authenticated, service_role;`).test(migration),
    `exact all-role function revoke missing for ${signature}`);
}
const wave4Grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.([^\n]+)\s+TO ([a-z_]+);/g)]
  .map((match) => `${match[1].trim()}=>${match[2]}`).filter((grant) => wave4Functions.some((signature) => grant.startsWith(signature)));
check(JSON.stringify(wave4Grants.sort()) === JSON.stringify([
  'resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)=>service_role',
  'resolve_my_success_path_learning_slice(uuid)=>authenticated',
].sort()), 'migration-197 function grants are not the two exact narrow boundaries');
for (const table of ['curriculum_media_assets_private','curriculum_catalog_versions','curriculum_catalog_items','curriculum_catalog_item_revocations','curriculum_catalog_version_revocations','curriculum_cycle_assignments','curriculum_cycle_assignment_items']) check(migration.includes(`REVOKE ALL ON TABLE public.${table}`), `direct table revoke missing for ${table}`);
check(migration.includes("'planner-learning-playback:'||p_user_id::text||':'||p_request_id::text"), 'request concurrency lock missing');
check(migration.includes('v_existing.request_sha256<>v_hash'), 'changed payload conflict missing');
check(migration.includes('ORDER BY evaluation_sequence DESC') && migration.includes('LIMIT 1'), 'resolver does not select the latest sequential receipt');
check(migration.includes('v_existing.decision=v_decision') && migration.includes('v_existing.safe_reason=v_reason') && migration.includes('v_existing.authority_sha256=v_authority_hash'), 'exact live receipt-state comparison missing');
check(migration.includes("'supersedes_authorization_receipt_id',v_supersedes_receipt_id") && migration.includes('v_existing.evaluation_sequence+1'), 'transition receipt does not sequence and supersede the latest receipt');
check(migration.includes("'decision','conflict','reason','request_conflict'"), 'payload conflict is not an exact closed producer response');
check((migration.match(/'authorization_receipt_id',v_receipt_id/g) ?? []).length >= 3 && (migration.match(/'authority_sha256',v_authority_hash/g) ?? []).length >= 3, 'allowed/denied producer responses are not bound to stored receipt authority');

check(edge.includes('Object.keys(record).sort().join(",") !== "assignmentItemId,cycleId,requestId"'), 'edge body is not exact/closed');
check(edge.includes('identity.userId') && !edge.includes('email'), 'edge identity is not JWT-only');
check(edge.includes('parseAssignedLearningAuthorizationProducer(raw)') && edge.includes('const first =') === false, 'producer parser binding drifted');
check((edge.match(/await authorize\(\)/g) ?? []).length === 2 && edge.includes('sameAllowedAuthority(first, second)'), 'post-mint live authority fence missing');
check(edge.includes('ALLOWED_PRODUCER_KEYS') && edge.includes('DENIED_PRODUCER_KEYS') && edge.includes('CONFLICT_PRODUCER_KEYS') && edge.includes('exactKeys(record'), 'private producer schema is not exact for every state');
check(edge.includes('record.decision !== "allowed" || !exactKeys(record, ALLOWED_PRODUCER_KEYS)') && edge.includes('exactKeys(record, DENIED_PRODUCER_KEYS)') && edge.includes('exactKeys(record, CONFLICT_PRODUCER_KEYS)'), 'exact producer parsers are not behavior-bound');
check(edge.includes('DROPBOX_LOCATOR') && edge.includes('isValidDropboxLocator(record.private_locator)'), 'strict Dropbox locator validator missing from producer path');
check(edge.includes('return typeof value === "string" && DROPBOX_LOCATOR.test(value);'), 'Dropbox locator validator was relaxed');
check(edge.includes('DROPBOX_TEMPORARY_CONTENT_HOSTS') && edge.includes('parsed.protocol === "https:"') && edge.includes('parsed.username === ""') && edge.includes('parsed.port === ""') && edge.includes('parsed.hash === ""'), 'Dropbox playback URL validator is incomplete');
check(edge.includes('parsed.protocol === "https:" && DROPBOX_TEMPORARY_CONTENT_HOSTS.has(parsed.hostname) &&'), 'Dropbox playback host/protocol conjunction was relaxed');
check(edge.includes('!second || second.decision !== "allowed" || !sameAllowedAuthority(first, second)'), 'post-mint exact receipt/authority fence was relaxed');
check(edge.includes('ASSIGNED_LEARNING_MAX_BODY_BYTES = 2_048'), 'edge body bound missing');
check(edge.includes('private, no-store'), 'private no-store response missing');
check(edgeAdapter.includes('https://api.dropbox.com/oauth2/token') && edgeAdapter.includes('https://api.dropboxapi.com/2/files/get_temporary_link'), 'approved Dropbox endpoints missing');
const urls = [...edgeAdapter.matchAll(/fetch\("(https:\/\/[^"\s]+)"/g)].map((match) => match[1]);
check(JSON.stringify(urls.sort()) === JSON.stringify(['https://api.dropbox.com/oauth2/token','https://api.dropboxapi.com/2/files/get_temporary_link'].sort()), 'edge adapter can fetch a forbidden host/path');
for (const forbidden of ['resolve_replay_vault_playback','record_replay_vault_playback_event','replay_vault_access_decision','webhook','GHL','Searchie']) check(!`${edge}\n${edgeAdapter}`.includes(forbidden), `edge references forbidden side effect ${forbidden}`);
check(edgeTest.includes('fenced by the same exact receipt') && edgeTest.includes('exact denial, and exact conflict'), 'edge auth/fence/denial tests missing');
check(edgeTest.includes('unknownProducerField: "PRIVATE"') && edgeTest.includes('real RPC producer path rejects'), 'real mocked producer mutation probe missing');
for (const probe of ['revocation','authority hash rotation','denial to allow transition','second call outage','https://evil.example/file','dropboxusercontent.com.evil.example','user:pass@','dl.dropboxusercontent.com:444','http://dl.dropboxusercontent.com','../private/file.mp4']) check(edgeTest.includes(probe), `edge adversarial probe missing ${probe}`);

check(app.includes('const MastermindSuccessPath = lazyWithRetry') && /path="\/mastermind\/success-path\/:cycleId"[^\n]+<MastermindSuccessPath/.test(app), 'exact route is not mounted to dedicated component');
check(hook.includes("'resolve_my_success_path_learning_slice'") && !hook.includes(".from("), 'hook does not use only the combined resolver');
check(!`${page}\n${hook}`.includes('MASTERMIND_PORTAL_RESOURCES') && !`${page}\n${hook}`.includes('localStorage'), 'mounted route uses static/local-storage curriculum');
for (const forbidden of ['Replay Vault','Questions Answered','Saved videos','related replays','library count','upgrade']) check(!page.toLowerCase().includes(forbidden.toLowerCase()), `monthly page leaks ${forbidden}`);
check(page.includes("(['continue','improve','reduce','support'] as Outcome[])") && page.includes("p_reduced_action_text: outcome === 'reduce'"), 'evaluation outcomes/reduce boundary missing');
check(page.includes("p_outcome: outcome") && page.includes('support_state'), 'Support is not server-created/read back');
check((page.match(/submit_my_success_path_evidence/g) ?? []).length >= 2 && /if \(confirmed\?\.status !== 'saved' \|\| confirmed\.evidence_receipt_id !== receipt\.evidence_receipt_id \|\| confirmed\.replayed !== true\)/.test(page), 'evidence receipt/readback missing');
check((page.match(/evaluate_my_success_path_week/g) ?? []).length >= 2 && page.includes('latest_evaluation_outcome !== outcome'), 'evaluation receipt/readback missing');
check(page.includes('setEvidenceRequestId(newStableRequestId())') && page.includes('setEvaluationRequestId(newStableRequestId())'), 'request IDs are not retained until confirmed success');
check(player.includes('controlsList="nodownload noremoteplayback"') && player.includes('playsInline'), 'protected HTML5 controls missing');
check(player.includes('position.current') && player.includes('onLoadedMetadata'), 'refresh position preservation missing');
check(player.includes('Back to my action') && page.includes('actionRef.current?.focus'), 'action focus handoff missing');
check(!/onTimeUpdate[^\n]+(rpc|recordEngagement|complete|evidence|milestone)/.test(player) &&
  !['submit_my_success_path_evidence','evaluate_my_success_path_week','confirm_my_success_path_transition','tasks'].some((name)=>player.includes(name)),
  'watch telemetry can mutate Planner/business state');
check(page.includes('role="alert"') && page.includes('aria-live="polite"') && page.includes('min-h-11'), 'accessible failure/live/touch states missing');
for (const state of ['loading','cannot verify access','90-day result comes first','recommendation needs confirmation','quick review','resource is not ready','temporarily unavailable','conflict','could not confirm','returning after time away']) check(`${page}\n${player}`.toLowerCase().includes(state), `honest mounted state missing: ${state}`);
check(parser.includes('hasExactKeys(root, TOP_KEYS)') && parser.includes('hasExactKeys(slice, SLICE_KEYS)'), 'browser parser does not reject unknown fields');
check(mounted.includes('[320,360,390]') && mounted.includes('below 44px') && mounted.includes('horizontal overflow'), 'mobile mounted verifier missing exact widths/44px/overflow');
check(postgres.includes('PostgreSQL 16') && postgres.includes('applies twice') && postgres.includes('has_table_privilege'), 'native PG16/apply-twice/ACL verifier missing');
check(postgres.includes('annual received a different or Vault-expanded') && postgres.includes('QA drift did not fail immediately'), 'native persona/drift proof missing');
check(postgres.includes('subprocess.Popen') && postgres.includes('concurrent exact allowed') && postgres.includes('concurrent exact denied') && postgres.includes('changed payload conflict racing exact payload'), 'true simultaneous PostgreSQL receipt probes missing');
check(postgres.includes('"PUBLIC/default": "wave4_public_probe"') && postgres.includes('has_function_privilege') && postgres.includes('authenticated cross-owner helper call'), 'native exhaustive function ACL and cross-owner negative controls missing');
check(chronology.includes('sorted(MIGRATIONS.glob("*.sql"))') && chronology.includes('len(migrations) != 198') && chronology.includes('for candidate in WAVE_CANDIDATES'), 'complete 198 chronology plus candidate double-apply verifier missing');
check(types.includes('planner_learning_playback_authorizations: {') && types.includes('resolve_assigned_learning_playback: {') && types.includes('resolve_my_success_path_learning_slice: {'), 'generated contracts missing');
for (const script of ['verify:mastermind-wave4-static','verify:mastermind-wave4-postgres','verify:mastermind-wave4-chronology','verify:mastermind-wave4-edge','verify:mastermind-wave4-mounted','verify:mastermind-wave4']) check(typeof pkg.scripts[script] === 'string', `package script missing ${script}`);

console.log(`Wave 4 static contract passed ${checks} closed-schema, authority, edge, mounted, privacy, chronology, and verifier-wiring checks.`);
