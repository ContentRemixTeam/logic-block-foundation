import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const app = read('src/App.tsx');
const desktopNav = read('src/components/AppSidebar.tsx');
const mobileNav = read('src/components/sidebar/MobileSidebarContent.tsx');
const workspace = read('src/lib/mastermindWorkspace.ts');
const hiddenDraft = read('src/pages/MastermindHiddenDraft.tsx');
const aiBuilder = read('src/components/mastermind/AIWorkflowBuilderPreview.tsx');
const dashboard = read('src/components/mastermind/MyWorkspaceDashboard.tsx');
const successPath = read('src/components/mastermind/SuccessPathExecutionPanel.tsx');
const vault = read('src/components/mastermind/VaultReadinessPanel.tsx');
const packageJson = read('package.json');

assert.ok(app.includes("const MastermindHiddenDraft = lazyWithRetry(() => import('./pages/MastermindHiddenDraft'));"), 'hidden draft route must be lazy-loaded');
assert.ok(app.includes('path="/admin/mastermind-hidden-draft"'), 'hidden draft admin route is missing');
assert.ok(app.includes('<AdminPreviewGate><PageSuspense><MastermindHiddenDraft /></PageSuspense></AdminPreviewGate>'), 'hidden draft route must be admin-gated');

for (const [name, source] of [['desktop nav', desktopNav], ['mobile nav', mobileNav]]) {
  assert.ok(!source.includes('/admin/mastermind-hidden-draft'), `${name} must not expose hidden draft navigation`);
  assert.ok(!source.includes('My Workspace'), `${name} must not expose My Workspace before launch`);
  assert.ok(!source.includes('Build AI Support'), `${name} must not expose AI builder before launch`);
}

assert.ok(workspace.includes("planner_only"), 'planner-only persona is required');
assert.ok(workspace.includes("monthly_mastermind"), 'monthly Mastermind persona is required');
assert.ok(workspace.includes("annual_mastermind"), 'annual/lifetime persona is required');
assert.ok(workspace.includes("replayVaultAccess: false"), 'monthly/planner Vault denial must be represented');
assert.ok(workspace.includes("getRecommendedAIWorkflow"), 'stage-aware AI workflow recommendation helper is missing');
assert.ok(workspace.includes("Offer Clarity Assistant"), 'Offer AI workflow is missing');
assert.ok(workspace.includes("Sales Follow-Up Assistant"), 'Sell AI workflow is missing');

assert.ok(hiddenDraft.includes('data-mastermind-hidden-draft'), 'hidden draft page needs a stable QA marker');
assert.ok(hiddenDraft.includes('DRAFT PREVIEW'), 'hidden draft page needs visible admin-only draft warning');
assert.ok(hiddenDraft.includes('SAMPLE DATA'), 'hidden draft must label sample data');
assert.ok(dashboard.includes('data-my-workspace-dashboard'), 'workspace dashboard marker is missing');
assert.ok(successPath.includes('data-success-path-core-loop'), 'Success Path core loop marker is missing');
assert.ok(aiBuilder.includes('data-ai-workflow-builder-preview'), 'AI workflow builder marker is missing');
assert.ok(vault.includes('data-vault-hidden-readiness'), 'Vault hidden readiness marker is missing');

for (const [name, source] of [
  ['workspace lib', workspace],
  ['hidden draft page', hiddenDraft],
  ['AI builder', aiBuilder],
  ['dashboard', dashboard],
  ['success path panel', successPath],
  ['vault readiness panel', vault],
]) {
  for (const forbidden of ['dropbox.com', 'bunny_video_id', 'membershipio:', 'VITE_ENABLE_MASTERMIND_VIDEO_SEARCH', 'MastermindVideoSearch']) {
    assert.ok(!source.includes(forbidden), `${name} must not bundle protected/private sentinel ${forbidden}`);
  }
}

assert.ok(packageJson.includes('"verify:mastermind-hidden-draft"'), 'package script for hidden draft verifier is missing');

console.log('Mastermind hidden draft verifier passed: admin-only route, no nav exposure, planner/member/Vault boundaries, AI workflow skeleton, and privacy sentinels are present.');
