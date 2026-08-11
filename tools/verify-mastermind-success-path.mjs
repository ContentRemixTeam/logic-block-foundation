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

const postgres = spawnSync('python3', ['test/mastermind-replacement/verify-mastermind-postgres.py'], {
  cwd: root,
  encoding: 'utf8',
});
if (postgres.stdout) process.stdout.write(postgres.stdout);
if (postgres.stderr) process.stderr.write(postgres.stderr);
if (postgres.status !== 0) {
  failures.push(`PostgreSQL behavioral harness exited ${postgres.status ?? 'without a status'}`);
}

const app = read('src/App.tsx');
const hook = read('src/hooks/useMastermindSuccessPath.ts');
const migration = read('supabase/migrations/20260811120000_mastermind_planner_replacement.sql');
const receiptRepair = read('supabase/migrations/20260811183000_mastermind_action_receipt_provenance.sql');
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
  [receiptRepair, /planner_receipt_id uuid NULL[\s\S]*ALTER COLUMN planner_receipt_id SET NOT NULL/, 'non-null action receipt provenance'],
  [receiptRepair, /FOREIGN KEY \(planner_receipt_id, user_id, cycle_id\)[\s\S]*REFERENCES public\.cycle_plan_reconciliation_requests\(request_id, user_id, cycle_id\)/, 'action receipt owner-cycle binding'],
  [receiptRepair, /action\.milestone_id IS DISTINCT FROM p_milestone_id OR action\.planner_receipt_id IS DISTINCT FROM v_receipt/, 'confirmation receipt retirement'],
  [receiptRepair, /v_action\.planner_receipt_id IS DISTINCT FROM v_receipt/, 'check-in action receipt equality'],
  [hook, /from\('mastermind_cycle_curriculum_assignments'\)/, 'frozen assignment read'],
  [hook, /curriculumUnavailable = true/, 'malformed assignment fail-closed state'],
  [hook, /\.is\('retired_at', null\)/, 'unretired action filter'],
  [hook, /\.eq\('planner_receipt_id', snapshot\.planner_receipt_id\)/, 'current receipt action filter'],
]) {
  if (!pattern.test(source)) failures.push(`${label} contract is missing`);
}

if (failures.length) {
  console.error('Success Path verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Success Path verification passed: behavioral and migration contracts pass; the exact route remains admin-gated and absent from desktop/mobile navigation.');
