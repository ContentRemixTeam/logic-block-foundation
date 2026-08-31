#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import WebSocket from 'ws';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import {
  formatVaultTitle,
  groupSearchResults,
  makeDetailHref,
  normalizeAccessResponse,
  parseDetailTarget,
} from '../src/components/replay-vault/replayVaultCore.mjs';

assert.equal(formatVaultTitle('YES_SUPPLY_Embodiment_EFT_Tapping.mp4'), 'Yes Supply Embodiment EFT Tapping');
assert.equal(formatVaultTitle('Next Level Livestream_Introduction'), 'Next Level Livestream Introduction');
assert.equal(formatVaultTitle('AskFaith_CEO_Q1'), 'Ask Faith CEO Q1');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
assert.ok(fs.existsSync(chrome), 'Mounted Replay Vault verifier requires Google Chrome on this macOS host');

const resourceId = `membershipio:${'a'.repeat(64)}`;
const momentOne = '11111111-1111-4111-8111-111111111111';
const momentTwo = '22222222-2222-4222-8222-222222222222';
const questionOne = '33333333-3333-4333-8333-333333333333';
const questionTwo = '44444444-4444-4444-8444-444444444444';
const accessPayload = (overrides = {}) => ({ allowed: true, memberEntitled: true, memberTier: 'annual', memberScopes: ['core_curriculum', 'current_replay_30_day', 'replay_vault'], previewCapabilities: [], previewActive: false, launchState: 'launched', ...overrides });
assert.equal(normalizeAccessResponse(accessPayload()).status, 'allowed');
assert.equal(normalizeAccessResponse(accessPayload({ memberTier: 'lifetime' })).status, 'allowed');
assert.equal(normalizeAccessResponse(accessPayload({ allowed: false, memberTier: 'monthly', memberScopes: ['core_curriculum', 'current_replay_30_day'] })).status, 'denied');
assert.equal(normalizeAccessResponse(accessPayload({ allowed: false, memberEntitled: false, memberTier: null, memberScopes: [] })).status, 'denied');
assert.equal(normalizeAccessResponse(accessPayload({ allowed: false, launchState: 'disabled' })).status, 'not_launched');
assert.equal(normalizeAccessResponse(accessPayload({ allowed: false, launchState: 'pilot' })).status, 'not_launched');
assert.equal(normalizeAccessResponse(null).status, 'unavailable');
assert.equal(normalizeAccessResponse({}).status, 'unavailable');
assert.equal(normalizeAccessResponse({ error: 'Could not verify access' }).status, 'unavailable');

const authoritative = groupSearchResults({ results: [
  { resourceId, title: 'Capacity', category: 'Office hours', momentId: momentOne, questionId: questionOne, startSeconds: 42, snippet: 'First' },
  { resourceId, title: 'Capacity', category: 'Office hours', momentId: momentTwo, questionId: questionTwo, startSeconds: 90, snippet: 'Second' },
] });
assert.equal(authoritative[0]?.moments.length, 2, 'authoritative multi-moment producer shape must survive intact');
assert.equal(groupSearchResults({ results: [{ resourceId, startSeconds: 42 }] }).length, 0, 'moments without durable IDs must be rejected');
const href = makeDetailHref({ resourceId, questionId: questionOne, momentId: momentOne });
assert.ok(href.includes('resource=membershipio%3A'), 'canonical ID must be encoded by URLSearchParams');
assert.deepEqual(parseDetailTarget(new URL(href, 'https://app.example').search), { resourceId, questionId: null, momentId: momentOne });


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

async function stopBrowser(browser, signal) {
  if (browser.exitCode !== null || browser.signalCode !== null) return;

  const exited = new Promise((resolve) => browser.once('exit', resolve));
  browser.kill(signal);
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

async function runChromeViewport(html, width) {
  const profile = path.join(tmp, `chrome-${width}-${Date.now()}`);
  const browser = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--allow-file-access-from-files',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  try {
    const browserWs = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Chrome DevTools startup timed out: ${stderr}`)), 10000);
      browser.stderr.on('data', (chunk) => {
        stderr += String(chunk);
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      browser.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome exited before DevTools was ready (${code}): ${stderr}`)); });
    });
    const endpoint = new URL(browserWs);
    const targets = await fetch(`http://${endpoint.host}/json/list`).then((response) => response.json());
    const target = targets.find((item) => item.type === 'page');
    assert(target?.webSocketDebuggerUrl, 'Chrome did not expose a page target');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let nextId = 0;
    const pending = new Map();
    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (!message.id) return;
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome DevTools command timed out: ${method}`));
      }, 5000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
    await command('Page.enable');
    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: `file://${html}` });
    let status = '';
    for (let attempt = 0; attempt < 150 && !status; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await command('Runtime.evaluate', { expression: "document.querySelector('#test-report')?.getAttribute('data-status') || ''", returnByValue: true });
      status = result.result.value;
    }
    const domResult = await command('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
    const metricsResult = await command('Runtime.evaluate', { expression: '({innerWidth,clientWidth:document.documentElement.clientWidth,bodyWidth:document.body.scrollWidth,documentWidth:document.documentElement.scrollWidth})', returnByValue: true });
    socket.close();
    return { passed: status === 'pass', output: `${domResult.result.value}\nviewport=${JSON.stringify(metricsResult.result.value)}\n${stderr}`, status: status ? 0 : 1 };
  } finally {
    await stopBrowser(browser, 'SIGTERM');
    await stopBrowser(browser, 'SIGKILL');
  }
}

async function runMounted(label, width, negative = false) {
  const outfile = path.join(tmp, `${label}.js`);
  await build({
    entryPoints: [path.join(root, 'tools/replay-vault-mounted-harness.tsx')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    tsconfig: path.join(root, 'tsconfig.app.json'),
    define: { 'import.meta.env.VITE_REPLAY_VAULT_PILOT': '"false"' },
    plugins: [aliases(negative)],
    logLevel: 'silent',
  });
  const script = fs.readFileSync(outfile, 'utf8').replaceAll('</script', '<\\/script');
  const cssPath = path.join(tmp, `${label}.css`);
  const cssBuild = spawnSync('npx', ['tailwindcss', '-i', path.join(root, 'src/index.css'), '-o', cssPath, '--minify'], {
    cwd: root, encoding: 'utf8', timeout: 120000,
  });
  assert.equal(cssBuild.status, 0, `could not compile mounted harness CSS: ${cssBuild.stderr}`);
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.min-w-0'), 'mounted harness must include compiled application CSS');
  const html = path.join(tmp, `${label}.html`);
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><body><script>${script}</script></body>`);
  return runChromeViewport(html, width);
}

try {
  for (const width of [320, 360, 390]) {
    const mounted = await runMounted(`real-${width}`, width);
    if (!mounted.passed) {
      console.error(mounted.output.match(/<pre id="test-report"[\s\S]*?<\/pre>/)?.[0] ?? mounted.output.slice(-4000));
      process.exit(1);
    }
  }
  const negative = await runMounted('negative-control', 320, true);
  assert.equal(negative.passed, false, 'false-green negative control: removing executable Replay Vault UI must fail mounted coverage');
  console.log('Replay Vault mounted behavioral verifier passed: exact producer access states and canonical IDs, malformed/transport availability, authoritative grouped moments, access/search/playback races, bounded deep-link retry, repeated target seek, native same/new URL recovery, honest YouTube fallback, actual 320/360/390 viewport document/body/control bounds, focus/landmarks, keyboard semantics, and executable-UI negative control.');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
