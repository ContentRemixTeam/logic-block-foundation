import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function requireText(file, text, label) {
  if (!read(file).includes(text)) failures.push(`${label}: ${file} is missing ${JSON.stringify(text)}`);
}

const entitlementMigration = 'supabase/migrations/20260726090000_add_planner_entitlement_fields.sql';
requireText(entitlementMigration, "planner_tier IN ('annual', 'lifetime')", 'annual/lifetime entitlement constraint');
requireText(entitlementMigration, 'planner_ends_at DATE', 'annual expiry field');

const scopeMigration = 'supabase/migrations/20260808220000_mastermind_portal_access_scopes.sql';
requireText(scopeMigration, 'get_mastermind_portal_access_scopes', 'shared access-scope function');
requireText(scopeMigration, "ARRAY['core_curriculum', 'current_replay_30_day', 'replay_vault', 'vault']", 'full annual Vault scopes');
requireText(scopeMigration, "ARRAY['core_curriculum', 'current_replay_30_day']", 'monthly replay scopes');
requireText(scopeMigration, 'GRANT EXECUTE ON FUNCTION public.get_mastermind_portal_access_scopes(text) TO service_role', 'service-only scope decision');

for (const file of [
  'supabase/functions/search-mastermind-resources/index.ts',
  'supabase/functions/get-mastermind-playback-link/index.ts',
  'supabase/functions/get-mastermind-portal-access/index.ts',
]) {
  requireText(file, 'get_mastermind_portal_access_scopes', 'shared access decision');
}

const search = read('supabase/functions/search-mastermind-resources/index.ts');
if (search.includes('MONTHLY_MEMBER_ACCESS_SCOPES')) failures.push('search still hard-codes monthly scopes');
requireText('supabase/functions/search-mastermind-resources/index.ts', 'p_allowed_access: allowedAccessScopes', 'entitlement-filtered search');

const playback = read('supabase/functions/get-mastermind-playback-link/index.ts');
if (playback.includes('MONTHLY_MEMBER_ACCESS_SCOPES')) failures.push('playback still hard-codes monthly scopes');
requireText('supabase/functions/get-mastermind-playback-link/index.ts', 'isAllowedResource(portalResource, allowedAccessScopes)', 'entitlement-filtered playback');
requireText('supabase/functions/get-mastermind-playback-link/index.ts', '.eq("review_status", "approved")', 'approved playback evidence only');

const vault = 'src/pages/ReplayVault.tsx';
requireText(vault, "invoke('get-mastermind-portal-access'", 'protected access status');
requireText(vault, "invoke('search-mastermind-resources'", 'protected transcript search');
requireText(vault, "invoke('get-mastermind-playback-link'", 'protected playback lookup');
requireText(vault, 'onLoadedMetadata={handleLoadedMetadata}', 'metadata-gated exact seek');
requireText(vault, 'videoRef.current.currentTime = pendingStartSeconds', 'exact timestamp seek');
requireText(vault, 'full Replay Vault is reserved for annual and lifetime members', 'monthly access explanation');

const app = 'src/App.tsx';
requireText(app, 'path="/mastermind/replay-vault"', 'Replay Vault route');
requireText(app, '<MastermindGate><PageSuspense><ReplayVault />', 'admin launch gate retained');
requireText('supabase/config.toml', '[functions.get-mastermind-portal-access]', 'access-status Edge Function config');
requireText('supabase/config.toml', '[functions.ghl-webhook-grant-planner]', 'GHL grant Edge Function config');

for (const navFile of ['src/components/AppSidebar.tsx', 'src/components/sidebar/MobileSidebarContent.tsx']) {
  if (read(navFile).includes('/mastermind/replay-vault')) {
    failures.push(`launch gate: ${navFile} exposes the unfinished Replay Vault`);
  }
}

const grant = 'supabase/functions/ghl-webhook-grant-planner/index.ts';
requireText(grant, 'existing.planner_order_id === incomingOrderId', 'duplicate order replay protection');
requireText(grant, 'existingEnd && existingEnd > today ? existingEnd : today', 'annual access stacking');
requireText(grant, 'addOneYear(annualBase)', 'twelve-month renewal extension');

if (failures.length) {
  console.error('Replay Vault verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Replay Vault verification passed: annual/monthly scopes, protected search/playback, exact seek, renewal stacking, and hidden launch gate are present.');
