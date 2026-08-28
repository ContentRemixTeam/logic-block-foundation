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
assert.ok(workspace.includes("getQuickWinRecommendation"), 'stage-aware quick win helper is missing');
assert.ok(workspace.includes("getFundamentalsPlaylist"), 'fundamentals playlist helper is missing');
assert.ok(workspace.includes("getRecommendedPlaylist"), 'recommended playlist helper is missing');
assert.ok(workspace.includes("TrainingLibrarySummary"), 'Training Library summary contract is missing');
assert.ok(workspace.includes("This is where the videos live"), 'Training Library must be the explicit curriculum video home');
assert.ok(workspace.includes("Core curriculum videos are included"), 'Training Library must separate core curriculum videos');
assert.ok(workspace.includes("Current call replays stay in the active replay window"), 'Training Library must separate current replay access');
assert.ok(workspace.includes("Offer Clarity Assistant"), 'Offer AI workflow is missing');
assert.ok(workspace.includes("Sales Follow-Up Assistant"), 'Sell AI workflow is missing');

assert.ok(hiddenDraft.includes('data-mastermind-hidden-draft'), 'hidden draft page needs a stable QA marker');
assert.ok(hiddenDraft.includes('DRAFT PREVIEW'), 'hidden draft page needs visible admin-only draft warning');
assert.ok(hiddenDraft.includes('SAMPLE DATA'), 'hidden draft must label sample data');
assert.ok(hiddenDraft.includes('90-Day Plan'), 'hidden draft must position the member-facing guidance as the 90-day plan');
assert.ok(dashboard.includes('data-my-workspace-dashboard'), 'workspace dashboard marker is missing');
assert.ok(dashboard.includes('Recommended playlist'), 'workspace dashboard must route members toward the plan-based playlist');
assert.ok(dashboard.includes('Open videos'), 'workspace dashboard must expose the video home for Mastermind members');
assert.ok(dashboard.includes('Training Library'), 'workspace dashboard must name the video home');
assert.ok(dashboard.includes('Quick win'), 'workspace dashboard must surface one quick win before extra curriculum');
assert.ok(dashboard.includes('Current constraint'), 'workspace dashboard must show the current constraint from the 90-day plan');
assert.ok(dashboard.includes('Bring back'), 'workspace dashboard must show the evidence to bring back');
assert.ok(successPath.includes('data-success-path-core-loop'), 'Success Path core loop marker is missing');
assert.ok(successPath.includes('Quick Win Generator'), '90-day guidance must include a quick win generator');
assert.ok(successPath.includes('Fundamentals'), '90-day guidance must include a fundamentals playlist');
assert.ok(successPath.includes('Recommended for this 90-day plan'), '90-day guidance must include a plan-based recommended playlist');
assert.ok(successPath.includes('After watching'), 'playlist items must point back to implementation after watching');
assert.ok(successPath.includes('Done enough'), 'Success Path must define the finish line');
assert.ok(successPath.includes('Core curriculum videos'), '90-day guidance must explain where core videos live');
assert.ok(successPath.includes('Current 30-day replays'), '90-day guidance must separate current replay access from Vault');
assert.ok(!successPath.includes('Before the live sprint'), '90-day guidance must not include live sprint prep as an app module');
assert.ok(!successPath.includes('If there is no live sprint this week'), '90-day guidance must not include a no-live-sprint prep fallback');
assert.ok(aiBuilder.includes('Current 90-day focus'), 'AI builder must reference the current 90-day focus instead of member-facing Success Path language');
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
  assert.ok(!source.includes('>Success Path<'), `${name} must not show Success Path as a member-facing tab`);
  assert.ok(!source.includes('"Success Path"'), `${name} must not show Success Path as a quoted member-facing label`);
  for (const forbidden of ['dropbox.com', 'bunny_video_id', 'membershipio:', 'VITE_ENABLE_MASTERMIND_VIDEO_SEARCH', 'MastermindVideoSearch']) {
    assert.ok(!source.includes(forbidden), `${name} must not bundle protected/private sentinel ${forbidden}`);
  }
}

assert.ok(packageJson.includes('"verify:mastermind-hidden-draft"'), 'package script for hidden draft verifier is missing');

console.log('Mastermind hidden draft verifier passed: admin-only route, no nav exposure, planner/member/Vault boundaries, Training Library video home, AI workflow skeleton, and privacy sentinels are present.');
