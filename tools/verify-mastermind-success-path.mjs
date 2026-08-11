import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const tests = spawnSync(process.execPath, ['--test', 'test/mastermind-replacement/*.test.mjs'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});
if (tests.stdout) process.stdout.write(tests.stdout);
if (tests.stderr) process.stderr.write(tests.stderr);
if (tests.status !== 0) {
  failures.push(`behavioral/migration tests exited ${tests.status ?? 'without a status'}`);
}

const app = read('src/App.tsx');
const hook = read('src/hooks/useMastermindSuccessPath.ts');
const migration = read('supabase/migrations/20260811120000_mastermind_planner_replacement.sql');
const route = '<Route path="/mastermind/success-path/:cycleId" element={<ProtectedRoute><MastermindGate><PageSuspense><MastermindHub /></PageSuspense></MastermindGate></ProtectedRoute>} />';
if (!app.includes(route)) failures.push('the exact cycle-specific route is not protected by MastermindGate');

for (const navFile of ['src/components/AppSidebar.tsx', 'src/components/sidebar/MobileSidebarContent.tsx']) {
  if (read(navFile).includes('/mastermind/success-path/')) {
    failures.push(`${navFile} exposes the admin-gated Success Path route`);
  }
}

for (const [source, pattern, label] of [
  [migration, /mastermind_success_path_one_active_action_per_cycle[\s\S]*WHERE retired_at IS NULL/, 'one active action per cycle'],
  [migration, /v_milestone IS DISTINCT FROM v_action\.milestone_id/, 'check-in current milestone binding'],
  [migration, /v_confirmed_receipt IS DISTINCT FROM v_receipt/, 'current confirmation receipt equality'],
  [hook, /from\('mastermind_cycle_curriculum_assignments'\)/, 'frozen assignment read'],
  [hook, /curriculumUnavailable = true/, 'malformed assignment fail-closed state'],
  [hook, /\.is\('retired_at', null\)/, 'unretired action filter'],
]) {
  if (!pattern.test(source)) failures.push(`${label} contract is missing`);
}

if (failures.length) {
  console.error('Success Path verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Success Path verification passed: behavioral and migration contracts pass; the exact route remains admin-gated and absent from desktop/mobile navigation.');
