import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];

function requireText(file, text, label) {
  const content = read(file);
  if (!content.includes(text)) failures.push(`${label}: ${file} is missing ${JSON.stringify(text)}`);
}

const hub = 'src/pages/MastermindHub.tsx';
requireText(hub, 'Resource Hub', 'Resource Hub shell');
requireText(hub, 'Planner first', 'planner-first positioning');
requireText(hub, 'Open 90-Day Planner', 'planner link');
requireText(hub, 'Core Curriculum Links', 'curriculum links section');
requireText(hub, 'Calls & Support', 'support links section');
requireText(hub, 'curriculum and replays stay in the member portal', 'course portal boundary copy');
requireText(hub, 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', 'mobile-safe resource grid');

const hubText = read(hub);
for (const forbidden of [
  'useMastermindSuccessPath',
  'SuccessPathPlanCard',
  'MASTERMIND_SUCCESS_STAGES',
  '<Tabs',
  'TabsTrigger',
  'Resource finder',
  'My Success Plan',
  'Your 90-day focus',
  'Build My Success Plan',
]) {
  if (hubText.includes(forbidden)) {
    failures.push(`Resource Hub should not expose app-native Success Path UI: ${forbidden}`);
  }
}

const app = 'src/App.tsx';
requireText(app, 'path="/mastermind"', 'gated Resource Hub route');
requireText(app, '<MastermindGate><PageSuspense><MastermindHub />', 'Mastermind gate retained');
if (read(app).includes('path="/mastermind/success-path/:cycleId"')) {
  failures.push('App must not expose a cycle-specific Success Path route');
}

for (const navFile of ['src/components/AppSidebar.tsx', 'src/components/sidebar/MobileSidebarContent.tsx']) {
  const nav = read(navFile);
  if (nav.includes('/mastermind/success-path/')) {
    failures.push(`launch gate: ${navFile} exposes the removed cycle-specific Success Path`);
  }
}

if (failures.length) {
  console.error('Mastermind Resource Hub verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Mastermind Resource Hub verification passed: links-only hub, planner-first positioning, and launch gating are present.');
