#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-plan-v2-client-'));
try {
  const mock = path.join(temp, 'supabase-mock.mjs');
  fs.writeFileSync(mock, `
    export const supabase = {
      rpc(name, params) { return globalThis.__cycleRpc(name, params); },
      from(table) { return {
        select(columns) { return {
          eq(column, value) { return {
            single() { return globalThis.__cycleReadback(table, columns, column, value); }
          }; }
        }; }
      }; }
    };
  `);
  const reconciliationOut = path.join(temp, 'reconciliation.ts');
  fs.copyFileSync(
    path.join(root, 'src/lib/cyclePlanReceiptVerification.ts'),
    path.join(temp, 'cyclePlanReceiptVerification.ts'),
  );
  const reconciliationSource = fs.readFileSync(path.join(root, 'src/lib/cyclePlanReconciliation.ts'), 'utf8')
    .replace("import { supabase } from '@/integrations/supabase/client';", "import { supabase } from './supabase-mock.mjs';")
    .replace("import type { Json } from '@/integrations/supabase/types';", 'type Json = unknown;')
    .replaceAll("@/lib/cyclePlanReceiptVerification", './cyclePlanReceiptVerification.ts');
  fs.writeFileSync(reconciliationOut, reconciliationSource);

  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  const reconciliation = await import(pathToFileURL(reconciliationOut));
  const cleanup = await import(pathToFileURL(path.join(root, 'src/lib/cycleDraftCleanup.ts')));
  const ownership = await import(pathToFileURL(path.join(root, 'src/lib/draftSyncOwnership.ts')));
  const persistence = await import(pathToFileURL(path.join(root, 'src/lib/cycleSetupPersistence.ts')));
  const cycleSetupSource = fs.readFileSync(path.join(root, 'src/pages/CycleSetup.tsx'), 'utf8');
  const saveStatusBannerSource = fs.readFileSync(path.join(root, 'src/components/cycle/SaveStatusBanner.tsx'), 'utf8');

  const cloudIdentity = {
    logical_plan_key: 'aaaaaaaa-1111-4111-8111-111111111111',
    request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  };
  assert.deepEqual(reconciliation.getOrCreateCyclePlanIdentity('alice', cloudIdentity), cloudIdentity);
  assert.deepEqual(reconciliation.getOrCreateCyclePlanIdentity('alice'), cloudIdentity,
    'cloud-backed identity was not retained in browser retry cache');

  const receipt = {
    planner_receipt_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    request_id: cloudIdentity.request_id,
    logical_plan_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    logical_plan_key: cloudIdentity.logical_plan_key,
    status: 'complete', replayed: false,
    payload_hash: 'a'.repeat(64), content_hash: 'b'.repeat(64),
    cycle_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', version: 1,
    active_generated_project_count: 1, active_generated_habit_count: 1, active_generated_task_count: 1,
    retired_generated_project_count: 0, retired_generated_habit_count: 0, retired_generated_task_count: 0,
    daily_plan_inserted_count: 1, daily_plan_linked_count: 0,
    daily_plan_preserved_count: 0, daily_plan_conflict_count: 0,
    daily_plan_outcomes: [{ date: '2026-08-10', outcome: 'created_generated_plan' }],
    completed_at: '2026-08-22T20:00:00.000Z',
  };
  const payload = {
    payload_version: 'cycle-plan-v2', logical_plan_key: cloudIdentity.logical_plan_key,
    cycle: { start_date: '2026-08-01', end_date: '2026-10-30', goal: 'Goal' },
    strategy: {}, offers: [], limited_offers: [], revenue_plan: {}, month_plans: [],
    generated_projects: [], generated_habits: [], generated_tasks: [], daily_plans: [], details: {},
  };
  const boundFirst = await reconciliation.bindCyclePlanRequestToPayload('alice', cloudIdentity, payload);
  const boundRetry = await reconciliation.bindCyclePlanRequestToPayload('alice', boundFirst, payload);
  assert.equal(boundRetry.request_id, boundFirst.request_id,
    'identical payload rotated its delivery identity');
  const boundChanged = await reconciliation.bindCyclePlanRequestToPayload(
    'alice',
    boundRetry,
    { ...payload, cycle: { ...payload.cycle, goal: 'Changed payload' } },
  );
  assert.notEqual(boundChanged.request_id, boundRetry.request_id,
    'changed payload reused its delivery identity');
  assert.equal(boundChanged.logical_plan_key, boundRetry.logical_plan_key,
    'changed payload rotated its logical plan identity');
  const calls = [];
  globalThis.__cycleRpc = async (name, params) => {
    calls.push({ name, params });
    return { data: receipt, error: null };
  };
  const first = await reconciliation.submitCyclePlanReconciliation(payload, cloudIdentity.request_id);
  const ambiguousRetry = await reconciliation.submitCyclePlanReconciliation(payload, cloudIdentity.request_id);
  assert.deepEqual(ambiguousRetry, first, 'lost-response retry did not return original receipt');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].params.p_request_id, calls[1].params.p_request_id,
    'ambiguous retry rotated delivery identity');
  assert.equal(calls[0].params.p_payload.logical_plan_key, calls[1].params.p_payload.logical_plan_key,
    'ambiguous retry rotated logical identity');

  globalThis.__cycleRpc = async () => ({
    data: { status: 'conflict', conflict: true, conflict_kind: 'request_changed' }, error: null,
  });
  await assert.rejects(
    reconciliation.submitCyclePlanReconciliation({ ...payload, cycle: { ...payload.cycle, goal: 'Changed' } }, cloudIdentity.request_id),
    /retry ID already completed with different answers/,
  );

  globalThis.__cycleReadback = async () => ({ data: {
    request_id: receipt.request_id, plan_id: receipt.logical_plan_id, planner_receipt_id: receipt.planner_receipt_id,
    cycle_id: receipt.cycle_id, payload_hash: receipt.payload_hash, content_hash: receipt.content_hash,
    resulting_version: receipt.version, status: 'complete', receipt,
  }, error: null });
  await reconciliation.verifyCyclePlanReceiptReadback(receipt);
  const losingReceipt = {
    ...receipt,
    request_id: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
    logical_plan_key: 'ffffffff-1111-4111-8111-111111111111',
    payload_hash: 'c'.repeat(64),
    replayed: true,
  };
  const losingReadback = {
    request_id: losingReceipt.request_id,
    plan_id: losingReceipt.logical_plan_id,
    planner_receipt_id: losingReceipt.planner_receipt_id,
    cycle_id: losingReceipt.cycle_id,
    payload_hash: losingReceipt.payload_hash,
    content_hash: losingReceipt.content_hash,
    resulting_version: losingReceipt.version,
    status: 'complete',
    receipt: losingReceipt,
  };
  assert.equal(reconciliation.cyclePlanReceiptMatchesReadback(losingReceipt, losingReadback), true,
    'different-request convergence receipt failed the real client readback contract');
  assert.equal(reconciliation.cyclePlanReceiptMatchesReadback(losingReceipt, {
    ...losingReadback,
    payload_hash: receipt.payload_hash,
    receipt: { ...losingReceipt, payload_hash: receipt.payload_hash },
  }), false, 'losing request accepted the winner payload hash');
  globalThis.__cycleReadback = async () => ({ data: { status: 'complete', request_id: receipt.request_id }, error: null });
  await assert.rejects(reconciliation.verifyCyclePlanReceiptReadback(receipt), /receipt readback was not verified/);

  globalThis.__cycleRpc = async () => ({
    data: { ...receipt, daily_plan_conflict_count: 1 }, error: null,
  });
  await assert.rejects(
    reconciliation.submitCyclePlanReconciliation(payload, cloudIdentity.request_id),
    /Daily Plan date is already attached to another cycle/,
  );
  globalThis.__cycleReadback = async () => ({ data: {
    request_id: receipt.request_id, plan_id: receipt.logical_plan_id, planner_receipt_id: receipt.planner_receipt_id,
    cycle_id: receipt.cycle_id, payload_hash: receipt.payload_hash, content_hash: receipt.content_hash,
    resulting_version: receipt.version, status: 'complete', receipt: { ...receipt, logical_plan_key: cloudIdentity.request_id },
  }, error: null });
  await assert.rejects(reconciliation.verifyCyclePlanReceiptReadback(receipt), /receipt readback was not verified/);

  let localDraftPresent = true;
  await assert.rejects(
    cleanup.clearCycleDraftAfterReceipt(
      async () => ({ data: null, error: new Error('network failed') }),
      () => false,
      () => { localDraftPresent = false; return true; },
    ),
    /Recovery was preserved/,
  );
  assert.equal(localDraftPresent, true, 'network cleanup failure removed browser recovery state');
  await assert.rejects(
    cleanup.clearCycleDraftAfterReceipt(
      async () => ({ data: { success: false, conflict: true }, error: null }),
      (data) => data?.success === true,
      () => { localDraftPresent = false; return true; },
    ),
    /Recovery was preserved/,
  );
  assert.equal(localDraftPresent, true, 'stale-tab conflict removed browser recovery state');
  await assert.rejects(
    cleanup.clearCycleDraftAfterReceipt(
      async () => ({ data: { success: true, deleted: true }, error: null }),
      (data) => data?.success === true,
      () => false,
    ),
    /newer browser draft appeared/,
  );
  assert.equal(localDraftPresent, true, 'newer cross-tab browser draft was cleared after cloud receipt');
  await cleanup.clearCycleDraftAfterReceipt(
    async () => ({ data: { success: true, deleted: true }, error: null }),
    (data) => data?.success === true && data?.deleted === true,
    () => { localDraftPresent = false; return true; },
  );
  assert.equal(localDraftPresent, false);

  localDraftPresent = true;
  await cleanup.clearCycleDraftAfterReceipt(
    async () => ({ data: { success: true, deleted: false, verified_absent: true }, error: null }),
    (data) => data?.verified_absent === true,
    () => { localDraftPresent = false; return true; },
  );
  assert.equal(localDraftPresent, false, 'verified cloud no-row did not clear exact browser recovery');

  const legacyProjects = persistence.normalizeSupportingProjects(['Duplicate', 'Duplicate', 'Third']);
  const legacyHabits = persistence.normalizeHabits([
    { name: 'Duplicate', category: 'sales' },
    { name: 'Duplicate', category: 'sales' },
  ]);
  assert.deepEqual(legacyProjects.map((item) => item.id), ['slot-1', 'slot-2', 'slot-3']);
  assert.deepEqual(legacyHabits.map((item) => item.id), ['slot-1', 'slot-2']);
  const reordered = [legacyProjects[2], legacyProjects[0], legacyProjects[1]];
  assert.deepEqual(reordered.map((item) => item.id), ['slot-3', 'slot-1', 'slot-2']);
  const removedFirst = reordered.filter((item) => item.id !== 'slot-3');
  assert.deepEqual(removedFirst.map((item) => item.id), ['slot-1', 'slot-2']);
  const roundTripped = persistence.normalizeSupportingProjects(JSON.parse(JSON.stringify(removedFirst)));
  assert.deepEqual(roundTripped, removedFirst, 'durable project IDs did not round-trip through draft JSON');
  assert.notEqual(legacyProjects[0].id, legacyProjects[1].id, 'duplicate labels shared a canonical identity');

  const arrayFields = [
    'secondaryPlatforms', 'postingDays', 'nurturePlatforms', 'offers', 'limitedOffers',
    'monthPlans', 'projects', 'habits', 'thingsToRemember', 'officeHoursDays',
    'recurringTasks', 'day1Top3', 'day2Top3', 'day3Top3',
  ];
  for (const field of arrayFields) {
    assert.deepEqual(persistence.exactArrayOrCurrent([], [{ stale: field }]), [], `${field} revived stale values`);
    const legacyDefault = [{ legacy: field }];
    assert.equal(persistence.exactArrayOrCurrent(undefined, legacyDefault), legacyDefault,
      `${field} omission did not preserve legacy default`);
    const saved = persistence.exactArrayOrCurrent([], legacyDefault);
    const reopened = persistence.exactArrayOrCurrent(JSON.parse(JSON.stringify(saved)), legacyDefault);
    const resaved = JSON.parse(JSON.stringify(reopened));
    assert.deepEqual(resaved, [], `${field} did not stay empty through save/reopen/resave`);
  }

  const aliceDraftKey = persistence.cycleDraftStorageKey('alice');
  const bobDraftKey = persistence.cycleDraftStorageKey('bob');
  assert.notEqual(aliceDraftKey, bobDraftKey, 'two accounts shared one browser draft key');
  values.set(aliceDraftKey, JSON.stringify({ goal: 'Alice only' }));
  assert.equal(values.get(bobDraftKey), undefined, 'account B could see account A browser recovery');
  assert.equal(JSON.parse(values.get(persistence.cycleDraftStorageKey('alice'))).goal, 'Alice only',
    'same-user reauthentication lost its scoped browser recovery');
  values.set(persistence.LEGACY_GLOBAL_CYCLE_DRAFT_KEY, JSON.stringify({ goal: 'Ownerless secret' }));
  let legacyWasRead = false;
  persistence.quarantineLegacyGlobalCycleDraft(
    (key) => { values.delete(key); },
    () => { legacyWasRead = true; return null; },
  );
  assert.equal(legacyWasRead, false, 'ownerless legacy draft content was read during quarantine');
  assert.equal(values.has(persistence.LEGACY_GLOBAL_CYCLE_DRAFT_KEY), false,
    'ownerless legacy global draft was not quarantined');

  const staleLocalTimestamp = new Date('2026-08-20T10:00:00Z');
  const statusCases = [
    {
      input: { localStatus: 'idle', lastLocalSave: null, isCloudSyncing: false, lastCloudSync: null, cloudIssue: null },
      text: /Recovery is ready on this device/,
      cloud: /Not backed up to cloud/,
    },
    {
      input: { localStatus: 'saving', lastLocalSave: null, isCloudSyncing: false, lastCloudSync: null, cloudIssue: null },
      text: /Saving on this device/,
      cloud: /Cloud backup pending/,
    },
    {
      input: { localStatus: 'saving', lastLocalSave: staleLocalTimestamp, isCloudSyncing: false, lastCloudSync: null, cloudIssue: 'cloud_error' },
      text: /Saving on this device/,
      cloud: /Cloud backup pending/,
    },
    {
      input: { localStatus: 'saved', lastLocalSave: new Date(), isCloudSyncing: false, lastCloudSync: null, cloudIssue: null },
      text: /Saved on this device; waiting to sync/,
      cloud: /Cloud backup pending/,
    },
    {
      input: { localStatus: 'saved', lastLocalSave: new Date(), isCloudSyncing: true, lastCloudSync: null, cloudIssue: null },
      text: /Syncing recovery to cloud/,
      cloud: /Cloud backup pending/,
    },
    {
      input: { localStatus: 'saved', lastLocalSave: new Date(), isCloudSyncing: false, lastCloudSync: new Date(), cloudIssue: null },
      text: /Verified cloud backup/,
      cloud: /Backed up to cloud/,
    },
    {
      input: { localStatus: 'error', lastLocalSave: staleLocalTimestamp, isCloudSyncing: false, lastCloudSync: null, cloudIssue: null },
      text: /Current changes are not safely saved on this device or cloud/,
      cloud: /Not safely saved/,
    },
    {
      input: { localStatus: 'saved', lastLocalSave: new Date(), isCloudSyncing: false, lastCloudSync: null, cloudIssue: 'cloud_error' },
      text: /Current changes are saved on this device, but cloud backup failed/,
      cloud: /Not backed up to cloud/,
    },
    {
      input: { localStatus: 'saved', lastLocalSave: new Date(), isCloudSyncing: false, lastCloudSync: null, cloudIssue: 'conflict_blocked' },
      text: /Cloud backup is blocked by newer work elsewhere/,
      cloud: /Cloud backup blocked/,
    },
  ];
  for (const testCase of statusCases) {
    const presentation = persistence.getCycleSaveStatusPresentation(testCase.input);
    assert.match(presentation.message, testCase.text);
    assert.match(presentation.cloudLabel, testCase.cloud);
  }
  assert.match(saveStatusBannerSource, /localStatus: CycleLocalSaveStatus/,
    'save-status component does not receive the latest local-write state explicitly');
  assert.match(saveStatusBannerSource, /cloudIssue: CycleCloudIssue/,
    'save-status component does not receive cloud failure/conflict state separately');
  assert.match(saveStatusBannerSource, /presentation\.kind === 'conflict'[\s\S]+Reload cloud draft/,
    'conflict status component offers no explicit authoritative reload action');
  assert.match(cycleSetupSource, /localStatus=\{localSaveStatus\}[\s\S]+cloudIssue=\{cloudIssue\}/,
    'Cycle Setup does not wire separate local and cloud status evidence into the component');
  assert.doesNotMatch(cycleSetupSource, /Saved in this browser; cloud backup not confirmed/,
    'Cycle Setup retains a second status path that can make an unsupported local-save claim');
  const coordinatorA = new persistence.CycleDraftCloudSaveCoordinator({ revision: 'base' });
  const coordinatorB = new persistence.CycleDraftCloudSaveCoordinator({ revision: 'base' });
  let cloud = { revision: 'base', goal: 'base' };
  let cloudMutations = 0;
  const saveToCloud = (goal) => async (expected) => {
    if (expected?.revision !== cloud.revision) return { outcome: 'conflict' };
    cloud = { revision: `${goal}-${cloudMutations + 1}`, goal };
    cloudMutations += 1;
    return { outcome: 'saved', snapshot: { revision: cloud.revision } };
  };
  assert.equal((await coordinatorA.enqueue(saveToCloud('tab A wins'))).outcome, 'saved');
  const tabBConflict = coordinatorB.enqueue(saveToCloud('tab B stale'));
  const tabBQueued = coordinatorB.enqueue(saveToCloud('tab B queued edit'));
  assert.equal((await tabBConflict).outcome, 'conflict');
  assert.equal((await tabBQueued).outcome, 'blocked');
  assert.equal((await coordinatorB.enqueue(saveToCloud('tab B later edit'))).outcome, 'blocked');
  assert.equal(cloudMutations, 1, 'conflict-blocked tab mutated cloud after losing CAS');
  assert.equal(cloud.goal, 'tab A wins', 'conflict-blocked tab overwrote the winner');
  const preReloadQueued = coordinatorB.enqueue(saveToCloud('tab B pre-reload queued edit'));
  coordinatorB.reload({ revision: cloud.revision });
  assert.equal((await preReloadQueued).outcome, 'blocked',
    'explicit reload revived a save queued before the reload action');
  assert.equal((await coordinatorB.enqueue(saveToCloud('tab B after explicit reload'))).outcome, 'saved');
  assert.equal(cloudMutations, 2, 'explicit authoritative reload did not permit a later save');
  assert.equal(cloud.goal, 'tab B after explicit reload');
  const losingLocalRecovery = persistence.markCycleDraftConflictBlocked({
    draftRevision: 'tab-b-local-revision',
    goal: 'tab B recovery',
  });
  const remountedRecovery = JSON.parse(JSON.stringify(losingLocalRecovery));
  const remountedCoordinator = new persistence.CycleDraftCloudSaveCoordinator();
  if (persistence.isCycleDraftConflictBlocked(remountedRecovery)
    || persistence.cycleDraftRevisionsDiverge(remountedRecovery.draftRevision, cloud.revision)) {
    remountedCoordinator.blockConflict();
  } else {
    remountedCoordinator.reload({ revision: cloud.revision });
  }
  assert.equal((await remountedCoordinator.enqueue(saveToCloud('tab B after remount'))).outcome, 'blocked');
  assert.equal(cloudMutations, 2, 'remounted losing recovery overwrote cloud without explicit reload');
  const explicitlyReloadedRecovery = persistence.clearCycleDraftConflictBlock({
    ...remountedRecovery,
    draftRevision: cloud.revision,
    goal: cloud.goal,
  });
  assert.equal(persistence.isCycleDraftConflictBlocked(explicitlyReloadedRecovery), false);
  remountedCoordinator.reload({ revision: cloud.revision });
  assert.equal((await remountedCoordinator.enqueue(saveToCloud('tab B after remount reload'))).outcome, 'saved');
  assert.equal(cloudMutations, 3);

  // Simulate localStorage rejecting the conflict-marker write: the older unmarked
  // local recovery shadows lower-priority fallback storage and the cloud row is gone.
  const staleUnmarkedRecovery = {
    draftRevision: 'stale-local-revision-after-failed-marker',
    goal: 'unsynced local recovery',
  };
  assert.equal(persistence.isCycleDraftConflictBlocked(staleUnmarkedRecovery), false);
  assert.equal(persistence.cycleDraftRevisionsDiverge(staleUnmarkedRecovery.draftRevision, null), true,
    'local revision plus missing cloud authority must remain divergent after marker persistence failure');
  const missingCloudRemount = new persistence.CycleDraftCloudSaveCoordinator();
  if (persistence.isCycleDraftConflictBlocked(staleUnmarkedRecovery)
    || persistence.cycleDraftRevisionsDiverge(staleUnmarkedRecovery.draftRevision, null)) {
    missingCloudRemount.blockConflict();
  } else {
    missingCloudRemount.reload(null);
  }
  assert.equal((await missingCloudRemount.enqueue(async () => ({ outcome: 'saved', snapshot: null }))).outcome, 'blocked',
    'failed marker plus missing cloud row permitted create without explicit authoritative reload');
  missingCloudRemount.reload(null);
  assert.equal((await missingCloudRemount.enqueue(async () => ({ outcome: 'saved', snapshot: null }))).outcome, 'saved',
    'explicit authoritative missing-cloud reload did not clear the block');

  assert.match(cycleSetupSource, /nurtureContentAudit,\s*nurturePlatforms,\s*offers/,
    'autosave payload omits nurturePlatforms');
  assert.match(cycleSetupSource, /nurtureContentAudit,\s*nurturePlatforms,\s*offers, limitedOffers/,
    'autosave dependencies omit nurturePlatforms');

  const loadRef = { current: 0 };
  const loadingRequest = persistence.beginAuthoritativeCycleLoad(loadRef);
  assert.equal(loadingRequest, 1);
  assert.equal(persistence.settleAuthoritativeCycleLoad(loadRef, loadingRequest, 'ready'), 'ready');
  const failedRequest = persistence.beginAuthoritativeCycleLoad(loadRef);
  assert.equal(persistence.settleAuthoritativeCycleLoad(loadRef, failedRequest, 'load_failed'), 'load_failed');
  const retryRequest = persistence.beginAuthoritativeCycleLoad(loadRef);
  assert.equal(persistence.settleAuthoritativeCycleLoad(loadRef, retryRequest, 'ready'), 'ready');
  assert.equal(persistence.settleAuthoritativeCycleLoad(loadRef, failedRequest, 'load_failed'), null,
    'stale failed response replaced retry success');

  const versionRef = { current: 0 };
  const oldVersion = ownership.beginDraftVersion(versionRef);
  const newVersion = ownership.beginDraftVersion(versionRef);
  assert.equal(ownership.ownsDraftVersion(versionRef, oldVersion), false);
  assert.equal(ownership.ownsDraftVersion(versionRef, newVersion), true);

  console.log('PASS cloud draft identity overrides browser cache');
  console.log('PASS ambiguous/lost response retry retains logical and request identities');
  console.log('PASS one request identity is retained per exact payload and rotated for changed content');
  console.log('PASS changed-payload retry is rejected');
  console.log('PASS authoritative receipt readback is required');
  console.log('PASS different-request convergence binds each caller payload hash through client readback');
  console.log('PASS draft cleanup failure preserves browser recovery state');
  console.log('PASS Start Fresh stale-tab, legacy/no-row, network-failure, and success contracts');
  console.log('PASS supporting-project and habit identities survive reorder/removal/duplicates/round-trip');
  console.log('PASS authoritative empty arrays survive save/reopen/resave while omitted legacy fields retain defaults');
  console.log('PASS authoritative cycle load gates loading/failure/retry and rejects stale responses');
  console.log('PASS stale cloud draft owner cannot confirm newer work');
  console.log('PASS browser draft recovery is account-scoped and ownerless legacy data is quarantined unread');
  console.log('PASS nurturePlatforms including [] survives autosave dependencies');
  console.log('PASS save banner wording distinguishes latest local failure, cloud failure, conflict, pending, and verified success');
  console.log('PASS cloud draft CAS conflict blocks queued/later/remounted saves until explicit authoritative reload');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
