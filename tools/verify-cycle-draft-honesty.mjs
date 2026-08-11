#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-draft-honesty-'));

try {
  const ownershipOut = path.join(temp, 'draftSyncOwnership.mjs');
  const storageOut = path.join(temp, 'storage.mjs');
  await build({
    entryPoints: [path.join(root, 'src/lib/draftSyncOwnership.ts')],
    outfile: ownershipOut,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  await build({
    entryPoints: [path.join(root, 'src/lib/storage.ts')],
    outfile: storageOut,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });

  const { beginDraftVersion, ownsDraftVersion, parseValidDraftTimestamp } = await import(pathToFileURL(ownershipOut));
  const owner = { current: 0 };
  const versionA = beginDraftVersion(owner);
  const versionB = beginDraftVersion(owner);
  let confirmed = null;
  if (ownsDraftVersion(owner, versionA)) confirmed = 'A';
  assert.equal(confirmed, null, 'stale response A confirmed newer draft B');
  if (ownsDraftVersion(owner, versionB)) confirmed = 'B';
  assert.equal(confirmed, 'B', 'latest response B could not confirm its own draft');
  assert.equal(parseValidDraftTimestamp('not-a-date'), null, 'invalid timestamp was accepted');
  assert.ok(parseValidDraftTimestamp('2026-08-09T17:00:00.000Z') instanceof Date, 'valid timestamp was rejected');

  const storageUrl = pathToFileURL(storageOut).href;
  const failingStorageProbe = `
    const failing = { setItem(){ throw new Error('blocked'); }, getItem(){ throw new Error('blocked'); }, removeItem(){} };
    globalThis.window = { localStorage: failing, sessionStorage: failing };
    globalThis.localStorage = failing;
    globalThis.sessionStorage = failing;
    const { setStorageItemWithReceipt } = await import(${JSON.stringify(storageUrl)});
    const receipt = setStorageItemWithReceipt('draft', 'value');
    if (receipt.persistent) throw new Error('memory fallback was reported as persistent');
  `;
  const failedProbe = spawnSync(process.execPath, ['--input-type=module', '-e', failingStorageProbe], { encoding: 'utf8' });
  assert.equal(failedProbe.status, 0, failedProbe.stderr || failedProbe.stdout);

  const sessionStorageProbe = `
    const failing = { setItem(){ throw new Error('blocked'); }, getItem(){ throw new Error('blocked'); }, removeItem(){} };
    const values = new Map();
    const session = { setItem(k,v){ values.set(k,v); }, getItem(k){ return values.get(k) ?? null; }, removeItem(k){ values.delete(k); } };
    globalThis.window = { localStorage: failing, sessionStorage: session };
    globalThis.localStorage = failing;
    globalThis.sessionStorage = session;
    const { setStorageItemWithReceipt } = await import(${JSON.stringify(storageUrl)});
    const receipt = setStorageItemWithReceipt('draft', 'value');
    if (!receipt.persistent || !receipt.sessionStorage || receipt.localStorage) throw new Error('session persistence receipt is wrong');
  `;
  const sessionProbe = spawnSync(process.execPath, ['--input-type=module', '-e', sessionStorageProbe], { encoding: 'utf8' });
  assert.equal(sessionProbe.status, 0, sessionProbe.stderr || sessionProbe.stdout);

  const hook = fs.readFileSync(path.join(root, 'src/hooks/useCycleSetupDraft.ts'), 'utf8');
  assert.ok(hook.includes('setStorageItemWithReceipt'), 'draft hook does not require a persistence receipt');
  assert.ok(hook.includes('if (!storageReceipt.persistent)'), 'draft hook ignores failed browser persistence');
  assert.ok((hook.match(/ownsDraftVersion\(draftVersionRef, version\)/g) || []).length >= 4,
    'cloud success/error/loading paths are not consistently version-owned');
  assert.ok(hook.includes('ownsDraftVersion(draftVersionRef, checkedVersion)'), 'initial server fetch is not version-owned');
  assert.ok(hook.includes('ownsDraftVersion(draftVersionRef, loadVersion)'), 'resume-draft fetch is not version-owned');
  const resumeFlow = hook.slice(hook.indexOf('const loadDraft = useCallback'), hook.indexOf('const clearDraft = useCallback'));
  const resumeGuard = resumeFlow.indexOf('if (!ownsDraftVersion(draftVersionRef, loadVersion)) return null');
  const resumeWrite = resumeFlow.indexOf('setStorageItem(DRAFT_STORAGE_KEY');
  assert.ok(resumeGuard >= 0 && resumeWrite >= 0 && resumeGuard < resumeWrite,
    'resume ownership guard does not precede browser storage mutation');
  assert.ok(hook.includes("if (!serverTimestamp) throw new Error('Cloud draft returned an invalid timestamp.')"),
    'initial fetch does not reject invalid timestamps');
  assert.ok(resumeFlow.includes('const serverDate = parseValidDraftTimestamp(serverTimestamp)'),
    'resume fetch does not validate its server timestamp');

  console.log('PASS stale cloud response cannot confirm a newer draft');
  console.log('PASS memory-only fallback is not reported as browser-persistent');
  console.log('PASS session storage produces a refresh-surviving persistence receipt');
  console.log('PASS initial and resume fetches are draft-version owned before mutation');
  console.log('PASS malformed draft timestamps are rejected');
  console.log('Cycle draft persistence honesty verified (5 runtime contracts).');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
