import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];

function requireText(file, text, label) {
  const content = read(file);
  if (!content.includes(text)) failures.push(`${label}: ${file} is missing ${JSON.stringify(text)}`);
}

const migration = 'supabase/migrations/20260808210000_cycle_success_path_snapshots.sql';
requireText(migration, 'CREATE TABLE IF NOT EXISTS public.cycle_success_path_snapshots', 'snapshot table');
requireText(migration, 'UNIQUE (user_id, cycle_id)', 'one snapshot per member cycle');
requireText(migration, 'ENABLE ROW LEVEL SECURITY', 'RLS enabled');
requireText(migration, 'auth.uid() = user_id', 'owner check');
requireText(migration, 'cycle.user_id = auth.uid()', 'same-owner cycle check');
requireText(migration, "CHECK (recommended_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'))", 'recommended stage constraint');
requireText(migration, "CHECK (confirmed_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'))", 'confirmed stage constraint');

const hook = 'src/hooks/useMastermindSuccessPath.ts';
requireText(hook, ".from('cycle_success_path_snapshots')", 'snapshot persistence');
requireText(hook, ".eq('cycle_id', cycle.cycle_id)", 'cycle-isolated snapshot read');
requireText(hook, "onConflict: 'user_id,cycle_id'", 'idempotent stage confirmation');
requireText(hook, 'selectedStageId: stageId', 'saved stage drives current UI');
requireText(hook, 'current_milestone_title: milestone.label', 'current milestone snapshot');
requireText(hook, 'const selectMilestone', 'milestone persistence');

const successPathModel = 'src/lib/mastermindSuccessPath.ts';
const successPathModelText = read(successPathModel);
const milestoneCount = (successPathModelText.match(/\{ id: '(offer|find|nurture|sell|deliver|leverage)-/g) ?? []).length;
if (milestoneCount !== 24) failures.push(`milestone architecture: expected 24 milestones, found ${milestoneCount}`);

const hub = 'src/pages/MastermindHub.tsx';
requireText(hub, 'useParams<{ cycleId?: string }>()', 'cycle-specific route binding');
requireText(hub, 'confirmStage(stageId)', 'explicit stage persistence');
requireText(hub, 'Your previous focus is still safe.', 'honest save failure state');

const app = 'src/App.tsx';
requireText(app, 'path="/mastermind/success-path/:cycleId"', 'cycle-specific Success Path route');
requireText(app, 'VITE_ENABLE_MASTERMIND_90_DAY_PLAN', 'member launch flag');
requireText(app, '<MastermindLaunchGate><MastermindGate><PageSuspense><MastermindHub />', 'member route launch gate');
requireText(app, 'path="/admin/mastermind-90-day-plan-preview"', 'admin 90-day preview route');
requireText(app, '<AdminPreviewGate><PageSuspense><MastermindHub />', 'admin preview gate retained');

for (const navFile of ['src/components/AppSidebar.tsx', 'src/components/sidebar/MobileSidebarContent.tsx']) {
  const nav = read(navFile);
  if (nav.includes('/mastermind/success-path/')) {
    failures.push(`launch gate: ${navFile} exposes the unfinished cycle-specific Success Path`);
  }
}

if (failures.length) {
  console.error('Success Path verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Success Path verification passed: cycle route, durable confirmation, RLS, idempotency, failure safety, and launch gating are present.');
