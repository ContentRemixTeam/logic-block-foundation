#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import {
  groupSearchResults,
  makeDetailHref,
  normalizeAccessResponse,
  parseDetailTarget,
} from '../src/components/replay-vault/replayVaultCore.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
assert.ok(fs.existsSync(chrome), 'Mounted Replay Vault verifier requires Google Chrome on this macOS host');

assert.equal(normalizeAccessResponse(null).status, 'unavailable');
assert.equal(normalizeAccessResponse({}).status, 'unavailable');
assert.equal(normalizeAccessResponse({ error: 'Could not verify access' }).status, 'unavailable');
assert.equal(normalizeAccessResponse({ decision: 'denied', reasonCode: 'expired' }).status, 'denied');

const authoritative = groupSearchResults({ groups: [{
  resourceId: 'replay-1', title: 'Capacity', category: 'Office hours', moments: [
    { momentId: 'moment-1', questionId: 'question-1', startSeconds: 42, snippet: 'First' },
    { momentId: 'moment-2', questionId: 'question-2', startSeconds: 90, snippet: 'Second' },
  ],
}] });
assert.equal(authoritative[0]?.moments.length, 2, 'authoritative multi-moment server shape must survive intact');
assert.equal(groupSearchResults({ groups: [{ resourceId: 'replay-1', moments: [{ startSeconds: 42 }] }] }).length, 0, 'moments without durable IDs must be rejected');
const href = makeDetailHref({ resourceId: 'replay-1', questionId: 'question-1', momentId: 'moment-1' });
assert.deepEqual(parseDetailTarget(new URL(href, 'https://app.example').search), { resourceId: 'replay-1', questionId: 'question-1', momentId: 'moment-1' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-vault-mounted-'));
const aliases = (negative) => ({
  name: 'replay-vault-test-aliases',
  setup(buildApi) {
    const exact = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    buildApi.onResolve({ filter: exact('@/integrations/supabase/client') }, () => ({ path: path.join(root, 'tools/replay-vault-supabase-mock.ts') }));
    buildApi.onResolve({ filter: exact('@/components/Layout') }, () => ({ path: path.join(root, 'tools/replay-vault-layout-mock.tsx') }));
    if (negative) buildApi.onResolve({ filter: exact('@/pages/ReplayVault') }, () => ({ path: path.join(root, 'tools/replay-vault-negative-stub.tsx') }));
  },
});

async function runMounted(label, negative = false) {
  const outfile = path.join(tmp, `${label}.js`);
  await build({
    entryPoints: [path.join(root, 'tools/replay-vault-mounted-harness.tsx')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    tsconfig: path.join(root, 'tsconfig.app.json'),
    plugins: [aliases(negative)],
    logLevel: 'silent',
  });
  const script = fs.readFileSync(outfile, 'utf8').replaceAll('</script', '<\\/script');
  const cssPath = path.join(tmp, `${label}.css`);
  const cssBuild = spawnSync('npx', ['tailwindcss', '-i', path.join(root, 'src/index.css'), '-o', cssPath, '--minify'], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(cssBuild.status, 0, `could not compile mounted harness CSS: ${cssBuild.stderr}`);
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.min-w-0'), 'mounted harness must include compiled application CSS');
  const html = path.join(tmp, `${label}.html`);
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><body><script>${script}</script></body>`);
  const result = spawnSync(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--allow-file-access-from-files',
    '--run-all-compositor-stages-before-draw', '--virtual-time-budget=12000', '--dump-dom', `file://${html}`,
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
  if (result.error) throw result.error;
  const output = `${result.stdout}\n${result.stderr}`;
  const passed = output.includes('id="test-report" data-status="pass"');
  return { passed, output, status: result.status };
}

try {
  const mounted = await runMounted('real');
  if (!mounted.passed) {
    console.error(mounted.output.match(/<pre id="test-report"[\s\S]*?<\/pre>/)?.[0] ?? mounted.output.slice(-4000));
    process.exit(1);
  }
  const negative = await runMounted('negative-control', true);
  assert.equal(negative.passed, false, 'false-green negative control: removing executable Replay Vault UI must fail mounted coverage');
  console.log('Replay Vault mounted behavioral verifier passed: malformed access, authoritative grouped moments, access/search/playback races, bounded deep-link retry, repeated target seek, native same/new URL recovery, honest YouTube fallback, 320/360/390 reflow, focus/landmarks, keyboard semantics, and executable-UI negative control.');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
