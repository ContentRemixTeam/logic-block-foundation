#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = (process.env.MASTERMIND_LIVE_BASE_URL || 'https://plan.faithmariah.com').replace(/\/$/, '');
const artifactPath = process.env.MASTERMIND_LIVE_BROWSER_ARTIFACT || '';
const protectedTerms = [
  '90-Day Goal Setting: Start Here',
  '90-Day Goal Setting Workshop',
  'Find Your Next Money Move',
  'Package Your Money Move',
  'Create Your Sales Plan',
  'Great Marketing Breakthrough',
  'Get Social Media Done',
  'Get Your Freebie Done',
  'Bosses Make Sales',
  'Launch Aligned',
  'Program Upgrade',
  'Do Less Make More',
  'Mastermind Training Library',
  'Timestamps and transcript',
  'Search within this video',
  'Mark lesson complete',
  'Protected Dropbox',
  'dropbox.com',
  'dropboxusercontent.com',
  'portal_resource_id',
  'playbackUrl',
];

const readyCurriculumResourceIds = [
  'ninety-day-goal-setting-introduction',
  'ninety-day-goal-setting-workshop',
  'money-move-day-one',
  'money-move-day-two',
  'money-move-day-three',
  'great-marketing-breakthrough-day-two',
  'great-marketing-breakthrough-day-three',
  'get-social-media-done-workshop-one',
  'get-social-media-done-workshop-two',
  'get-social-media-done-workshop-three',
  'get-your-freebie-non-boring-idea',
  'get-your-freebie-welcome-email',
  'bosses-make-sales-day-one',
  'bosses-make-sales-day-two',
  'bosses-make-sales-day-three',
  'launch-aligned-half-ass-launch',
  'launch-aligned-debrief',
  'program-upgrade-strategic-improvement',
  'program-upgrade-onboarding-upgrade',
  'program-upgrade-surprise-and-delight',
  'program-upgrade-offboard-like-a-boss',
  'do-less-make-more-workshop',
  'do-less-make-more-bonus-coaching',
];

const routes = [
  '/admin/mastermind-90-day-plan-preview',
  '/mastermind',
  ...readyCurriculumResourceIds.flatMap((resourceId) => [
    `/admin/mastermind-training-preview?resource=${encodeURIComponent(resourceId)}&from=phase-one`,
    `/mastermind/training?resource=${encodeURIComponent(resourceId)}`,
  ]),
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function terminateProcess(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  const graceful = await Promise.race([
    exited.then(() => true),
    sleep(3000).then(() => false),
  ]);
  if (!graceful && child.exitCode === null) child.kill('SIGKILL');
  await Promise.race([exited, sleep(1000)]);
}

async function removeDirectoryWithRetry(directory) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      rmSync(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await sleep(200 * attempt);
    }
  }
}

async function startChrome(debugPort, userDataDir) {
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } },
  );

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  const versionUrl = `http://127.0.0.1:${debugPort}/json/version`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const response = await fetch(versionUrl);
      if (response.ok) return { child, getOutput: () => output };
    } catch {
      await sleep(200);
    }
    if (child.exitCode !== null) throw new Error(`Chrome exited early: ${output}`);
  }

  throw new Error(`Timed out waiting for Chrome debugger: ${output}`);
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message}: ${message.error.data || ''}`));
        else resolve(message.result || {});
        return;
      }
      if (message.method && this.handlers.has(message.method)) {
        for (const handler of this.handlers.get(message.method)) handler(message.params || {});
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new CdpClient(ws);
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function openNewPage(debugPort) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
  assert.ok(response.ok, `Unable to create Chrome target: ${response.status}`);
  const target = await response.json();
  assert.ok(target.webSocketDebuggerUrl, 'Chrome target did not expose a websocket URL');
  return await CdpClient.connect(target.webSocketDebuggerUrl);
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  return result.result?.value;
}

async function waitFor(client, expression, label, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, expression)) return;
    await sleep(250);
  }
  const bodyText = await evaluate(client, 'document.body?.innerText?.slice(0, 1000) || ""');
  throw new Error(`Timed out waiting for ${label}. Body: ${bodyText}`);
}

async function runRoute(debugPort, route) {
  const client = await openNewPage(debugPort);
  const errors = [];
  const failedRequests = [];
  const requestUrls = new Map();

  client.on('Runtime.exceptionThrown', (params) => {
    errors.push(params.exceptionDetails?.text || 'Runtime exception');
  });
  client.on('Network.requestWillBeSent', (params) => {
    requestUrls.set(params.requestId, params.request.url);
  });
  client.on('Network.loadingFailed', (params) => {
    if (!params.canceled) failedRequests.push(`${params.errorText}: ${requestUrls.get(params.requestId) || params.requestId}`);
  });

  try {
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.enable');
    await client.send('Page.navigate', { url: `${baseUrl}${route}` });
    await waitFor(client, 'document.readyState === "complete"', `${route} document complete`);
    await waitFor(
      client,
      'location.pathname === "/auth"',
      `${route} signed-out auth redirect`,
    );

    const finalUrl = await evaluate(client, 'location.href');
    const bodyText = await evaluate(client, 'document.body?.innerText || ""');
    const pageText = bodyText.toLowerCase();
    const leakedTerms = protectedTerms.filter((term) => pageText.includes(term.toLowerCase()));
    const videoCount = await evaluate(client, 'document.querySelectorAll("video, iframe").length');
    const pageHtml = await evaluate(client, 'document.documentElement?.outerHTML || ""');
    const rawSourceLeak = /dropbox\.com|dropboxusercontent\.com|playbackUrl|source_url|dropbox_path/i.test(pageHtml);

    assert.deepEqual(errors, [], `${route} runtime errors`);
    assert.deepEqual(failedRequests, [], `${route} failed requests`);
    assert.deepEqual(leakedTerms, [], `${route} leaked protected text at ${finalUrl}: ${leakedTerms.join(', ')}`);
    assert.equal(videoCount, 0, `${route} rendered protected media while signed out`);
    assert.equal(rawSourceLeak, false, `${route} leaked raw playback/source data`);

    return {
      route,
      finalUrl,
      passed: true,
      blockedMedia: true,
      protectedTextLeakCount: 0,
    };
  } finally {
    client.close();
  }
}

function writeArtifact(summary) {
  if (!artifactPath) return;
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(summary, null, 2)}\n`);
}

async function main() {
  const debugPort = await getFreePort();
  const chromeProfileDir = mkdtempSync(path.join(tmpdir(), 'mastermind-live-signedout-profile-'));
  let chrome;

  try {
    chrome = await startChrome(debugPort, chromeProfileDir);
    const results = [];
    for (const route of routes) results.push(await runRoute(debugPort, route));
    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      mode: 'signed_out_fail_closed',
      results,
    };
    writeArtifact(summary);
    console.log(`mastermind live browser routes passed (${results.length} signed-out routes)`);
  } catch (error) {
    const chromeOutput = chrome?.getOutput?.() || '';
    throw new Error([error.message, chromeOutput ? `\nChrome output:\n${chromeOutput}` : ''].join(''));
  } finally {
    await terminateProcess(chrome?.child);
    await removeDirectoryWithRetry(chromeProfileDir);
  }
}

await main();
