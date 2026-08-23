#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

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
  const reconciliationOut = path.join(temp, 'reconciliation.mjs');
  const cleanupOut = path.join(temp, 'cleanup.mjs');
  const ownershipOut = path.join(temp, 'ownership.mjs');
  await build({
    entryPoints: [path.join(root, 'src/lib/cyclePlanReconciliation.ts')],
    outfile: reconciliationOut, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'mock-supabase', setup(builder) {
      builder.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: mock }));
    } }],
  });
  await build({ entryPoints: [path.join(root, 'src/lib/cycleDraftCleanup.ts')], outfile: cleanupOut,
    bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
  await build({ entryPoints: [path.join(root, 'src/lib/draftSyncOwnership.ts')], outfile: ownershipOut,
    bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });

  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  const reconciliation = await import(pathToFileURL(reconciliationOut));
  const cleanup = await import(pathToFileURL(cleanupOut));
  const ownership = await import(pathToFileURL(ownershipOut));

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
  globalThis.__cycleReadback = async () => ({ data: { status: 'complete', request_id: receipt.request_id }, error: null });
  await assert.rejects(reconciliation.verifyCyclePlanReceiptReadback(receipt), /receipt readback was not verified/);
  globalThis.__cycleReadback = async () => ({ data: {
    request_id: receipt.request_id, plan_id: receipt.logical_plan_id, planner_receipt_id: receipt.planner_receipt_id,
    cycle_id: receipt.cycle_id, payload_hash: receipt.payload_hash, content_hash: receipt.content_hash,
    resulting_version: receipt.version, status: 'complete', receipt: { ...receipt, logical_plan_key: cloudIdentity.request_id },
  }, error: null });
  await assert.rejects(reconciliation.verifyCyclePlanReceiptReadback(receipt), /receipt readback was not verified/);

  let localDraftPresent = true;
  await assert.rejects(
    cleanup.clearCycleDraftAfterReceipt(async () => ({ error: new Error('cloud delete failed') }), () => { localDraftPresent = false; }),
    /draft could not be cleared/,
  );
  assert.equal(localDraftPresent, true, 'draft cleanup failure removed browser recovery state');
  await cleanup.clearCycleDraftAfterReceipt(async () => ({ error: null }), () => { localDraftPresent = false; });
  assert.equal(localDraftPresent, false);

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
  console.log('PASS draft cleanup failure preserves browser recovery state');
  console.log('PASS stale cloud draft owner cannot confirm newer work');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
