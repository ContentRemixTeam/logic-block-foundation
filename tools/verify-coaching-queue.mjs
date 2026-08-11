import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const queueModule = await import(pathToFileURL(path.join(root, 'src/lib/coachingQueue.ts')).href);
const { getQueueWindowState, canJoinQueue, sortCoachingQueue, getEstimatedQueueStatus } = queueModule;

const startsAt = '2026-08-11T19:00:00.000Z';
const call = {
  startsAt,
  queueOpensAt: startsAt,
  queueClosesAt: '2026-08-11T19:15:00.000Z',
};
assert.equal(getQueueWindowState(call, new Date('2026-08-11T18:59:59.000Z')), 'before');
assert.equal(getQueueWindowState(call, new Date('2026-08-11T19:00:00.000Z')), 'open');
assert.equal(getQueueWindowState(call, new Date('2026-08-11T19:15:00.000Z')), 'open');
assert.equal(getQueueWindowState(call, new Date('2026-08-11T19:15:00.001Z')), 'closed');
assert.equal(canJoinQueue(call, { joinedAt: null }, new Date('2026-08-11T19:15:00.001Z')), false);
assert.equal(canJoinQueue(call, { joinedAt: '2026-08-11T19:04:00.000Z' }, new Date('2026-08-11T20:00:00.000Z')), true);

const base = {
  waitingSince: '2026-08-01T12:00:00.000Z', joinedAt: '2026-08-11T19:01:00.000Z',
  deadline: null, blocker: null, coachedCount: 2,
  lastCoachedAt: '2026-07-01T12:00:00.000Z', timesSkipped: 0,
  returningSupportNeeded: false, manualPriority: null,
};
const ordered = sortCoachingQueue([
  { ...base, id: 'regular' },
  { ...base, id: 'returning', returningSupportNeeded: true },
  { ...base, id: 'skipped', timesSkipped: 2 },
  { ...base, id: 'deadline', deadline: '2026-08-13', blocker: 'Launch is Friday' },
  { ...base, id: 'never', coachedCount: 0, lastCoachedAt: null },
  { ...base, id: 'override', manualPriority: 1 },
  { ...base, id: 'not-joined', joinedAt: null, coachedCount: 0 },
], new Date('2026-08-11T19:05:00.000Z'));
assert.deepEqual(ordered.map((item) => item.id), ['override', 'never', 'deadline', 'skipped', 'returning', 'regular']);
assert.equal(getEstimatedQueueStatus(1, 6), 'Near the front');
assert.match(getEstimatedQueueStatus(5, 6), /6 people waiting/);

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const pilotGate = fs.readFileSync(path.join(root, 'src/components/mastermind/CoachingQueuePilotGate.tsx'), 'utf8');
const pilotPage = fs.readFileSync(path.join(root, 'src/pages/CoachingQueuePilot.tsx'), 'utf8');
const sidebar = [
  'src/components/AppSidebar.tsx',
  'src/components/sidebar/MobileSidebarContent.tsx',
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
assert.match(app, /path="\/mastermind\/coaching-queue-pilot"[^\n]+<MastermindGate>/);
assert.match(app, /<CoachingQueuePilotGate><PageSuspense><CoachingQueuePilot/);
assert.match(pilotGate, /rpc\('is_admin', \{ check_user_id: user\.id \}\)/);
assert.match(pilotGate, /if \(!allowed\) return <Navigate to="\/mastermind" replace/);
assert.doesNotMatch(sidebar, /coaching-queue-pilot/i);
assert.match(pilotPage, /'save_and_join_my_coaching_queue'/);
assert.doesNotMatch(pilotPage, /pilotRpc<[^>]+>\('join_my_coaching_queue'/);
assert.match(pilotPage, /mode === 'live'[\s\S]+queuePosition/);

const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260811130000_hidden_coaching_queue_pilot.sql'), 'utf8');
for (const required of [
  "queue_closes_at <= starts_at + interval '15 minutes'",
  'clock_timestamp() > v_call.queue_closes_at',
  'waiting_since = public.coaching_requests.waiting_since',
  'REVOKE INSERT, UPDATE, DELETE ON public.coaching_requests FROM anon, authenticated',
  'public.get_my_pending_coaching_followups()',
  "system_source, external_id, is_system_generated",
  "'coaching_queue', 'coaching:' || p_request_id::text",
  'a failed arrival check rolls back the save',
  "AND call_row.queue_closes_at >= clock_timestamp()",
  'CREATE OR REPLACE FUNCTION public.coaching_queue_ranked',
  "WHERE outcome.disposition = 'completed'",
]) assert.ok(migration.includes(required), `missing migration contract: ${required}`);
assert.ok(
  (migration.match(/public\.coaching_queue_ranked\(p_call_id\)/g) || []).length >= 2,
  'member and admin queue readers must share the canonical rank function',
);
const completeFunction = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.complete_coaching_request'),
  migration.indexOf('CREATE OR REPLACE FUNCTION public.get_my_pending_coaching_followups'),
);
assert.ok(
  completeFunction.indexOf('WHERE request_id = p_request_id FOR UPDATE;') <
    completeFunction.indexOf('FROM public.coaching_outcomes WHERE request_id = p_request_id;'),
  'completion must lock the request before checking replay state',
);

console.log('PASS Coaching Queue window, fair order, hidden route, and write-back contracts');
