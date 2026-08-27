import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const membership = read('src/hooks/useMembership.tsx');
assert.ok(membership.includes('canUsePlanner: boolean'), 'membership hook must expose standalone planner capability');
assert.ok(membership.includes('canUseMastermind: boolean'), 'membership hook must expose Mastermind capability');
assert.ok(membership.includes('canUseMastermindAI: boolean'), 'membership hook must expose Mastermind AI capability');
assert.ok(membership.includes('canUseReplayVault: boolean'), 'membership hook must expose Replay Vault capability');
assert.ok(membership.includes('plannerCore: true'), 'signed-in nonmembers must keep planner access');
assert.ok(membership.includes('mastermindCore: false'), 'nonmembers must not inherit Mastermind access');
assert.ok(membership.includes('tierHasReplayVaultAccess'), 'Replay Vault must stay separate from monthly Mastermind access');
assert.ok(!membership.includes('get_user_entitlement'), 'browser membership hook must not call service-role-only entitlement details');

for (const navFile of ['src/components/AppSidebar.tsx', 'src/components/sidebar/MobileSidebarContent.tsx']) {
  const nav = read(navFile);
  assert.ok(nav.includes("import { useMembership } from '@/hooks/useMembership';"), `${navFile} must read membership capabilities`);
  assert.ok(nav.includes("{canUseMastermind ? 'Mastermind' : 'Planner'}"), `${navFile} must label standalone planner users correctly`);
  assert.ok(nav.includes("canUseMastermind && <NavSection label=\"Community\""), `${navFile} must hide Mastermind community links from planner-only users`);
  assert.ok(!nav.includes("href: '/mastermind'"), `${navFile} must not expose the hidden Mastermind portal in navigation before launch`);
}

const app = read('src/App.tsx');
assert.ok(app.includes('path="/mastermind"'), 'Mastermind route should remain available for gated preview QA');
assert.ok(app.includes('<MastermindGate><PageSuspense><MastermindHub />'), 'Mastermind route must remain behind the launch gate');
assert.ok(app.includes('path="/cycle-wizard" element={<ProtectedRoute><PageSuspense><CycleSetup />'), 'legacy cycle-wizard route must point to canonical CycleSetup');

const wizardHub = read('src/components/wizards/WizardHub.tsx');
assert.ok(wizardHub.includes("navigate('/cycle-setup')"), '90-day wizard entry should use canonical CycleSetup');
assert.ok(!wizardHub.includes("navigate('/cycle-wizard')"), 'WizardHub should not send members to the legacy cycle wizard');

const dashboard = read('src/pages/Dashboard.tsx');
assert.ok(!dashboard.includes('/cycle-wizard'), 'Dashboard should not link to the legacy cycle wizard');

const aiCoach = read('supabase/functions/mastermind-ai-coach/index.ts');
const entitlementIndex = aiCoach.indexOf('check_mastermind_entitlement');
const keyLookupIndex = aiCoach.indexOf('.from("user_api_keys")');
assert.ok(entitlementIndex > -1, 'Mastermind AI proxy must verify entitlement');
assert.ok(keyLookupIndex > -1, 'Mastermind AI proxy must load BYO keys only after access check');
assert.ok(entitlementIndex < keyLookupIndex, 'Mastermind AI proxy must check entitlement before loading BYO keys');
assert.ok(aiCoach.includes('status: 403'), 'Mastermind AI proxy must deny nonmembers with 403');
assert.ok(!aiCoach.includes('get_user_entitlement'), 'Mastermind AI proxy must avoid service-role-only entitlement details');

console.log('Planner/Mastermind capability verifier passed.');
