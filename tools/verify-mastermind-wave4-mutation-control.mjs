#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wave4-mutation-control-'));
const files = [
  'supabase/functions/_shared/assignedLearningPlayback.ts',
  'supabase/functions/_shared/assignedLearningPlayback.test.ts',
  'supabase/functions/get-assigned-learning-playback/index.ts',
  'src/pages/MastermindSuccessPath.tsx',
  'src/components/mastermind/AssignedLearningPlayer.tsx',
  'src/hooks/useSuccessPathLearningSlice.ts',
  'src/lib/successPathLearningSlice.ts',
  'src/App.tsx',
  'src/integrations/supabase/types.ts',
  'tools/verify-mastermind-wave4.mjs',
  'tools/verify-mastermind-wave4-mounted.mjs',
  'tools/verify-mastermind-wave4-postgres.py',
  'tools/verify-cycle-plan-full-stack-postgres.py',
  'tools/mastermind-wave4-mounted-harness.tsx',
  'tools/mastermind-wave4-supabase-mock.ts',
  'tools/mastermind-wave4-layout-mock.tsx',
  'test/cycle-plan-reconciliation-v2/mock_current_schema.sql',
  'test/mastermind-wave2/mock-predecessor-extension.sql',
  'package.json',
];

const execute = (command, args, options = {}) => spawnSync(command, args, {
  cwd: temp,
  env: { ...process.env, WAVE4_VERIFY_ROOT: temp },
  encoding: 'utf8',
  timeout: 180_000,
  ...options,
});

const requireRejected = (result, label, marker = 'FAIL') => {
  const output = `${result.stdout}${result.stderr}`;
  assert.notEqual(result.status, 0, `${label} mutation unexpectedly passed`);
  assert.ok(output.includes(marker), `${label} failed for the wrong reason:\n${output}`);
};

try {
  for (const file of files) {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  fs.cpSync(path.join(root, 'supabase/migrations'), path.join(temp, 'supabase/migrations'), { recursive: true });

  const mutations = [
    {
      label: 'DB exact-item authority',
      file: 'supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql',
      before: 'p_assignment_item_id <> v_state.active_assignment_item_id',
      after: 'p_assignment_item_id = v_state.active_assignment_item_id /* p_assignment_item_id <> v_state.active_assignment_item_id */',
      gate: 'static',
    },
    {
      label: 'exact private producer schema',
      file: 'supabase/functions/_shared/assignedLearningPlayback.ts',
      before: 'record.decision !== "allowed" || !exactKeys(record, ALLOWED_PRODUCER_KEYS)',
      after: 'record.decision !== "allowed" || (false && !exactKeys(record, ALLOWED_PRODUCER_KEYS))',
      gate: 'edge',
    },
    {
      label: 'post-mint receipt fence',
      file: 'supabase/functions/_shared/assignedLearningPlayback.ts',
      before: '!second || second.decision !== "allowed" || !sameAllowedAuthority(first, second)',
      after: '!second || second.decision !== "allowed" || (!sameAllowedAuthority(first, second) && false)',
      gate: 'edge',
    },
    {
      label: 'Dropbox locator allowlist',
      file: 'supabase/functions/_shared/assignedLearningPlayback.ts',
      before: 'return typeof value === "string" && DROPBOX_LOCATOR.test(value);',
      after: 'return typeof value === "string" && (DROPBOX_LOCATOR.test(value) || true);',
      gate: 'edge',
    },
    {
      label: 'Dropbox playback host allowlist',
      file: 'supabase/functions/_shared/assignedLearningPlayback.ts',
      before: 'parsed.protocol === "https:" && DROPBOX_TEMPORARY_CONTENT_HOSTS.has(parsed.hostname) &&',
      after: 'parsed.protocol === "https:" && (true || DROPBOX_TEMPORARY_CONTENT_HOSTS.has(parsed.hostname)) &&',
      gate: 'edge',
    },
    {
      label: 'UI evidence receipt readback',
      file: 'src/pages/MastermindSuccessPath.tsx',
      before: 'confirmed.replayed !== true',
      after: 'false && confirmed.replayed !== true',
      gate: 'static',
    },
  ];

  for (const mutation of mutations) {
    const target = path.join(temp, mutation.file);
    const original = fs.readFileSync(target, 'utf8');
    assert.ok(original.includes(mutation.before), `${mutation.label} target missing`);
    fs.writeFileSync(target, original.replace(mutation.before, mutation.after));
    requireRejected(execute(process.execPath, [path.join(temp, 'tools/verify-mastermind-wave4.mjs')]),
      `${mutation.label} static`, 'FAIL');
    console.log(`PASS ${mutation.label} mutation rejected by static aggregate`);
    if (mutation.gate === 'edge') {
      requireRejected(execute('deno', ['test', '--no-lock', '-A',
        path.join(temp, 'supabase/functions/_shared/assignedLearningPlayback.test.ts')]),
      `${mutation.label} executable edge`, 'FAILED');
      console.log(`PASS ${mutation.label} mutation rejected by executable edge suite`);
    }
    fs.writeFileSync(target, original);
  }

  const aclTarget = path.join(temp, 'supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql');
  const aclOriginal = fs.readFileSync(aclTarget, 'utf8');
  const aclBefore = `REVOKE ALL ON FUNCTION public.success_path_learning_authority(uuid,uuid,uuid,timestamptz)\n  FROM PUBLIC, anon, authenticated, service_role;`;
  const aclAfter = `REVOKE ALL ON FUNCTION public.success_path_learning_authority(uuid,uuid,uuid,timestamptz)\n  FROM anon, authenticated, service_role; -- synthetic PUBLIC/default relaxation`;
  assert.ok(aclOriginal.includes(aclBefore), 'private authority helper revoke mutation target missing');
  fs.writeFileSync(aclTarget, aclOriginal.replace(aclBefore, aclAfter));
  requireRejected(execute(process.execPath, [path.join(temp, 'tools/verify-mastermind-wave4.mjs')]),
    'private authority helper ACL static', 'FAIL');
  console.log('PASS private authority helper ACL relaxation rejected by static aggregate');
  const nativeAcl = execute('python3', [path.join(temp, 'tools/verify-mastermind-wave4-postgres.py')]);
  requireRejected(nativeAcl, 'private authority helper ACL native', 'effective function privilege mismatch PUBLIC/default');
  console.log('PASS private authority helper ACL relaxation rejected by native PostgreSQL gate');
  fs.writeFileSync(aclTarget, aclOriginal);

  const restoredStatic = execute(process.execPath, [path.join(temp, 'tools/verify-mastermind-wave4.mjs')]);
  assert.equal(restoredStatic.status, 0, `restored static fixture did not pass: ${restoredStatic.stdout}${restoredStatic.stderr}`);
  const restoredEdge = execute('deno', ['test', '--no-lock', '-A',
    path.join(temp, 'supabase/functions/_shared/assignedLearningPlayback.test.ts')]);
  assert.equal(restoredEdge.status, 0, `restored edge fixture did not pass: ${restoredEdge.stdout}${restoredEdge.stderr}`);
  console.log('Wave 4 executable mutation controls passed: exact producer, post-mint fence, locator, playback host, DB/item, UI readback, and helper ACL relaxations all break governing gates while behavior tokens remain.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
