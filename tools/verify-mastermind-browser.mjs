#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const repeatCount = Number.parseInt(process.env.MASTERMIND_BROWSER_QA_REPEAT || '2', 10);
const artifactDir = process.env.MASTERMIND_BROWSER_QA_ARTIFACT_DIR
  ? path.resolve(process.env.MASTERMIND_BROWSER_QA_ARTIFACT_DIR)
  : null;
const qaPath = process.env.MASTERMIND_BROWSER_QA_PATH || '/admin/mastermind-90-day-plan-preview';
const supabaseProjectRef = 'wdxelomsouudmidakxiz';
const mockUserId = '00000000-0000-4000-8000-000000000001';
const mockEmail = 'mastermind-browser-qa@example.com';

const browserProfiles = {
  androidChrome: {
    label: 'Android Chrome profile',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
  },
  desktopFirefox: {
    label: 'Desktop Firefox profile',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
    platform: 'MacIntel',
  },
  iosSafari: {
    label: 'iOS Safari profile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
  },
};

const savedCycle = {
  cycle_id: 'browser-qa-cycle',
  goal: 'Sell the current offer with a calm, specific sales page and a follow-up rhythm that does not require a high-energy week to keep moving',
  start_date: '2026-08-01',
  end_date: '2026-10-29',
  focus_area: 'Sales page and follow-up',
  biggest_bottleneck: 'The sales page, invitation, and follow-up are the first broken link',
  discover_score: 7,
  nurture_score: 8,
  convert_score: 3,
  audience_target: 'low-capacity business owners',
  audience_frustration: 'too many tactics and not enough money-path clarity',
  signature_message: 'low battery business',
  why: 'cash-first implementation',
  low_energy_version: 'Send one direct invitation',
  medium_energy_version: 'Finish the sales page draft and send one follow-up',
  high_energy_version: 'Run the complete sales sprint',
  updated_at: '2026-08-08T00:00:00.000Z',
};

const scenarios = [
  {
    name: 'saved-cycle-desktop',
    viewport: { width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 },
    cycle: savedCycle,
    checks: ['savedCyclePath'],
  },
  {
    name: 'saved-cycle-ios-safari-mobile-resources',
    viewport: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 },
    browserProfile: browserProfiles.iosSafari,
    cycle: savedCycle,
    checks: ['savedCyclePath', 'resourceFinder'],
  },
  {
    name: 'saved-cycle-android-chrome-narrow-resources',
    viewport: { width: 360, height: 740, mobile: true, deviceScaleFactor: 3 },
    browserProfile: browserProfiles.androidChrome,
    cycle: savedCycle,
    checks: ['savedCyclePath', 'resourceFinder'],
  },
  {
    name: 'no-cycle-desktop-firefox-profile',
    viewport: { width: 1366, height: 900, mobile: false, deviceScaleFactor: 1 },
    browserProfile: browserProfiles.desktopFirefox,
    cycle: null,
    checks: ['noCyclePrompt'],
  },
  {
    name: 'no-cycle-ios-safari-mobile',
    viewport: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 },
    browserProfile: browserProfiles.iosSafari,
    cycle: null,
    checks: ['noCyclePrompt'],
  },
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

async function waitForHttp(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }

  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function terminateProcess(child) {
  if (!child || child.exitCode !== null) return;

  const exited = new Promise((resolve) => {
    child.once('exit', resolve);
  });

  child.kill('SIGTERM');
  const graceful = await Promise.race([
    exited.then(() => true),
    sleep(3000).then(() => false),
  ]);

  if (!graceful && child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([
      exited,
      sleep(1000),
    ]);
  }
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

function startPreviewServer(port) {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    }
  );

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return {
    child,
    getOutput: () => output,
  };
}

async function startChrome(debugPort, userDataDir) {
  assert.ok(existsSync(chromePath), `Chrome executable not found at ${chromePath}; set CHROME_PATH to override`);

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
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    }
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
      if (response.ok) {
        return {
          child,
          getOutput: () => output,
        };
      }
    } catch {
      await sleep(200);
    }

    if (child.exitCode !== null) {
      throw new Error(`Chrome exited early with code ${child.exitCode}: ${output}`);
    }
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
        if (message.error) {
          reject(new Error(`${message.error.message}: ${message.error.data || ''}`));
        } else {
          resolve(message.result || {});
        }
        return;
      }

      if (message.method && this.handlers.has(message.method)) {
        for (const handler of this.handlers.get(message.method)) {
          handler(message.params || {});
        }
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
  const newTargetUrl = `http://127.0.0.1:${debugPort}/json/new?about:blank`;
  const response = await fetch(newTargetUrl, { method: 'PUT' });
  assert.ok(response.ok, `Unable to create Chrome target: ${response.status}`);
  const target = await response.json();
  assert.ok(target.webSocketDebuggerUrl, 'Chrome target did not expose a websocket URL');
  return await CdpClient.connect(target.webSocketDebuggerUrl);
}

function buildMockScript(cycle) {
  return `
(() => {
  const user = {
    id: ${JSON.stringify(mockUserId)},
    aud: 'authenticated',
    role: 'authenticated',
    email: ${JSON.stringify(mockEmail)},
    email_confirmed_at: '2026-08-08T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { first_name: 'Browser', last_name: 'QA' },
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  };
  const session = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user
  };
  const cycle = ${JSON.stringify(cycle)};
  const inactiveMonthlyTheme = {
    active: false,
    template: null,
    challenge: null,
    dismissal: { popup_dismissed: true, hello_bar_dismissed: true },
    theme_unlocked: false,
    progress: null
  };
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  }));
  const empty = () => Promise.resolve(new Response(null, { status: 204 }));

  try {
    localStorage.setItem('sb-${supabaseProjectRef}-auth-token', JSON.stringify(session));
    localStorage.setItem('ninety-day-planner-tour-seen', 'true');
    localStorage.setItem('ninety-day-planner-checklist-dismissed', 'true');
    localStorage.setItem('install_nudge_dismissed_at', String(Date.now()));
    localStorage.setItem('install_banner_dismissed_at', String(Date.now()));
    localStorage.setItem('mastermind-pinned-resources', JSON.stringify([]));
  } catch {}

  try {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        persisted: async () => true,
        persist: async () => true,
        estimate: async () => ({ quota: 512 * 1024 * 1024, usage: 1024 * 1024 })
      }
    });
  } catch {}

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);

    if (url.includes('/auth/v1/token')) {
      return json(session);
    }
    if (url.includes('/auth/v1/user')) {
      return json(user);
    }
    if (url.includes('/rest/v1/rpc/check_mastermind_entitlement')) {
      return json(true);
    }
    if (url.includes('/rest/v1/rpc/is_admin')) {
      return json(true);
    }
    if (url.includes('/rest/v1/rpc/log_low_battery_planner_login')) {
      return json(null);
    }
    if (url.includes('/functions/v1/get-projects')) {
      return json({ data: [] });
    }
    if (url.includes('/functions/v1/get-current-cycle-or-create')) {
      return json({ data: { cycle } });
    }
    if (url.includes('/functions/v1/get-monthly-theme')) {
      return json(inactiveMonthlyTheme);
    }
    if (url.includes('/rest/v1/user_profiles')) {
      return empty();
    }
    if (url.includes('/rest/v1/user_settings')) {
      return json({
        has_seen_tour: true,
        arcade_enabled: false,
        arcade_reduce_motion: true,
        arcade_sounds_off: true,
        pomodoro_focus_minutes: 25,
        pomodoro_break_minutes: 5,
        pomodoro_auto_start_break: false,
        show_coin_counter: false,
        show_pet_widget: false,
        show_pomodoro_widget: false
      });
    }
    if (url.includes('/rest/v1/arcade_wallet')) {
      return json({
        coins_balance: 0,
        tokens_balance: 0,
        total_coins_earned: 0
      });
    }
    if (url.includes('/rest/v1/arcade_daily_pet')) {
      return json(null);
    }
    if (url.includes('/functions/v1/save-user-settings')) {
      return json({ success: true });
    }
    if (url.includes('/rest/v1/launches')) {
      return json([]);
    }
    if (url.includes('/rest/v1/projects')) {
      return json([]);
    }
    if (url.includes('/rest/v1/tasks')) {
      return json([]);
    }
    if (url.includes('/rest/v1/cycle_revenue_plan')) {
      return json(null);
    }
    if (url.includes('/rest/v1/cycle_success_path_snapshots')) {
      return json(null);
    }
    if (url.includes('/rest/v1/cycles_90_day')) {
      return json(cycle);
    }

    return originalFetch(input, init);
  };
})();
`;
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`Runtime evaluation failed: ${result.exceptionDetails.text}`);
  }

  return result.result?.value;
}

async function waitFor(client, expression, label, timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, expression)) return;
    await sleep(200);
  }
  const bodyText = await evaluate(client, 'document.body?.innerText?.slice(0, 1000) || ""');
  throw new Error(`Timed out waiting for ${label}. Body text: ${bodyText}`);
}

async function clickText(client, text) {
  const target = await evaluate(client, `
(() => {
  const candidates = Array.from(document.querySelectorAll('[role="tab"], button, a'));
  const matchesText = (element) => (element.textContent || '').trim().includes(${JSON.stringify(text)});
  const matchesExactText = (element) => (element.textContent || '').trim() === ${JSON.stringify(text)};
  const target =
    candidates.find((element) => element.getAttribute('role') === 'tab' && matchesExactText(element)) ||
    candidates.find((element) => element.getAttribute('role') === 'tab' && matchesText(element)) ||
    candidates.find((element) => matchesExactText(element)) ||
    candidates.find((element) => matchesText(element));
  if (!target) return null;
  target.scrollIntoView({ block: 'center', inline: 'center' });
  const rect = target.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    text: (target.textContent || '').trim(),
    role: target.getAttribute('role') || '',
  };
})()
`);
  assert.ok(target, `Could not find text to click: ${text}`);
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: target.x,
    y: target.y,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: target.x,
    y: target.y,
    button: 'left',
    clickCount: 1,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: target.x,
    y: target.y,
    button: 'left',
    clickCount: 1,
  });
}

async function setSearch(client, query) {
  const changed = await evaluate(client, `
(() => {
  const input = Array.from(document.querySelectorAll('input'))
    .find((element) => (element.getAttribute('placeholder') || '').includes('Search offer'));
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${JSON.stringify(query)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()
`);
  assert.equal(changed, true, `Could not set Resource Finder search to: ${query}`);
}

async function assertText(client, text) {
  const hasText = await evaluate(client, `document.body.innerText.includes(${JSON.stringify(text)})`);
  assert.equal(hasText, true, `Expected page text to include: ${text}`);
}

async function assertNoText(client, text) {
  const hasText = await evaluate(client, `document.body.innerText.includes(${JSON.stringify(text)})`);
  assert.equal(hasText, false, `Expected page text to exclude: ${text}`);
}

async function assertNoHorizontalOverflow(client, label) {
  const overflow = await evaluate(client, `
(() => Math.max(
  0,
  document.documentElement.scrollWidth - document.documentElement.clientWidth,
  document.body ? document.body.scrollWidth - document.body.clientWidth : 0
))()
`);
  assert.ok(overflow <= 1, `${label} has horizontal overflow of ${overflow}px`);
}

async function saveScreenshot(client, scenario, passNumber) {
  if (!artifactDir) return;

  mkdirSync(artifactDir, { recursive: true });
  const screenshot = await client.send('Page.captureScreenshot', {
    captureBeyondViewport: true,
    format: 'png',
  });
  const fileName = `${String(passNumber).padStart(2, '0')}-${scenario.name}.png`;
  writeFileSync(path.join(artifactDir, fileName), Buffer.from(screenshot.data, 'base64'));
}

async function runChecks(client, checks, label) {
  await waitFor(client, 'document.body && document.body.innerText.includes("Your 90-Day Plan")', `${label} Mastermind shell`);
  await assertNoText(client, 'Video Search');
  await assertNoHorizontalOverflow(client, `${label} initial view`);

  if (checks.includes('savedCyclePath')) {
    await waitFor(client, 'document.body.innerText.includes("Current focus: Sell")', `${label} saved-cycle guidance`);
    await assertText(client, 'Your 90-day plan');
    await assertText(client, 'Do this this week');
    await assertText(client, 'What sales activity would make this 90-day goal possible?');
    await assertText(client, 'Choose one offer and calculate sales, invitations, and follow-ups needed.');
    await assertText(client, 'Save target, baseline, offer, value, assumed conversion, invitation target, and review date.');
    await assertText(client, 'Send one direct invitation');
    await assertText(client, 'Bring back this evidence');
    await assertText(client, 'Ask Faith');
    await clickText(client, 'Get Support');
    await waitFor(client, 'document.body.innerText.includes("Get Coached by Faith")', `${label} support tab`);
    await assertText(client, 'Get Coached by Faith');
    await clickText(client, 'Guidance');
    await waitFor(client, 'document.body.innerText.includes("Do this this week")', `${label} return to guidance`);
    await assertNoHorizontalOverflow(client, `${label} guidance`);

    await assertText(client, 'Open training');
    await clickText(client, 'Training');
    await waitFor(client, 'document.body.innerText.includes("Find What I Need")', `${label} training tab`);
    await assertText(client, 'Sales & Marketing');
    await assertText(client, 'Sell focus');
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} training tab`);
  }

  if (checks.includes('noCyclePrompt')) {
    await waitFor(client, 'document.body.innerText.includes("Build your 90-day plan.")', `${label} no-cycle prompt`);
    await assertText(client, 'Build 90-Day Plan');
    await assertNoText(client, 'Current focus:');
    await assertNoHorizontalOverflow(client, `${label} no-cycle state`);
  }

  if (checks.includes('resourceFinder')) {
    await clickText(client, 'Training');
    await waitFor(client, 'document.body.innerText.includes("Find What I Need")', `${label} Training Finder`);
    await assertText(client, 'Training Library map');
    await assertText(client, 'Visible resources');
    await assertText(client, 'Indexed now');
    await assertText(client, 'Access labels');
    await assertText(client, 'Sell focus');
    await assertText(client, 'Bonus and vault items stay out of this finder');
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} Training Finder default`);

    await clickText(client, 'Sell focus');
    await waitFor(client, 'document.body.innerText.includes("Sales & Marketing")', `${label} Sell focus filter`);
    await assertNoText(client, 'Grow Your Email List');
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} Sell focus filter`);

    await clickText(client, '30-day');
    await waitFor(client, 'document.body.innerText.includes("Current Call Replays")', `${label} 30-day filter`);
    await assertNoText(client, 'Sales & Marketing');
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} 30-day filter`);

    await clickText(client, 'Indexed now');
    await waitFor(client, 'document.body.innerText.includes("Success Plan")', `${label} indexed filter`);
    await assertNoText(client, 'Products & Offers');
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} indexed filter`);

    await clickText(client, 'All');
    await waitFor(client, 'document.body.innerText.includes("Sales & Marketing")', `${label} All filter reset`);

    await setSearch(client, 'sales page');
    await waitFor(client, 'document.body.innerText.includes("Sales & Marketing")', `${label} sales page search`);
    await assertNoText(client, 'Money Moves Sprint');
    await assertNoHorizontalOverflow(client, `${label} sales page search`);

    await setSearch(client, 'email list');
    await waitFor(client, 'document.body.innerText.includes("Grow Your Email List")', `${label} email list search`);
    await assertNoHorizontalOverflow(client, `${label} email list search`);

    await setSearch(client, 'AI');
    await waitFor(client, 'document.body.innerText.includes("Faith AI")', `${label} AI search`);
    await assertNoHorizontalOverflow(client, `${label} AI search`);

    await setSearch(client, 'zzzxqvblormp qyprandleston');
    await waitFor(client, 'document.body.innerText.includes("No resources found matching")', `${label} no-result search`);
    await assertNoHorizontalOverflow(client, `${label} no-result search`);
  }
}

async function runScenario(baseUrl, debugPort, scenario, passNumber) {
  const client = await openNewPage(debugPort);
  const requestUrls = new Map();
  const consoleErrors = [];
  const exceptions = [];
  const failedRequests = [];
  const httpErrors = [];

  client.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error') {
      consoleErrors.push(params.args.map((arg) => arg.value || arg.description || '').join(' '));
    }
  });
  client.on('Runtime.exceptionThrown', (params) => {
    exceptions.push(params.exceptionDetails?.text || 'Runtime exception');
  });
  client.on('Log.entryAdded', (params) => {
    if (params.entry?.level === 'error') {
      consoleErrors.push(params.entry.text);
    }
  });
  client.on('Network.requestWillBeSent', (params) => {
    requestUrls.set(params.requestId, params.request.url);
  });
  client.on('Network.loadingFailed', (params) => {
    if (!params.canceled) {
      failedRequests.push(`${params.errorText}: ${requestUrls.get(params.requestId) || params.requestId}`);
    }
  });
  client.on('Network.responseReceived', (params) => {
    if (params.response?.status >= 400) {
      httpErrors.push(`${params.response.status}: ${params.response.url}`);
    }
  });

  try {
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');
    await client.send('Page.enable');
    if (scenario.browserProfile?.userAgent) {
      await client.send('Network.setUserAgentOverride', {
        userAgent: scenario.browserProfile.userAgent,
        platform: scenario.browserProfile.platform,
      });
    }
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: scenario.viewport.width,
      height: scenario.viewport.height,
      deviceScaleFactor: scenario.viewport.deviceScaleFactor,
      mobile: scenario.viewport.mobile,
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: scenario.viewport.mobile });
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: buildMockScript(scenario.cycle),
    });

    const url = `${baseUrl}${qaPath}?browserQa=${encodeURIComponent(scenario.name)}&pass=${passNumber}`;
    await client.send('Page.navigate', { url });
    await waitFor(client, 'document.readyState === "complete"', `${scenario.name} document complete`);
    await runChecks(client, scenario.checks, `${scenario.name} pass ${passNumber}`);
    await saveScreenshot(client, scenario, passNumber);

    assert.deepEqual(exceptions, [], `${scenario.name} pass ${passNumber} runtime exceptions`);
    assert.deepEqual(httpErrors, [], `${scenario.name} pass ${passNumber} HTTP errors`);
    assert.deepEqual(consoleErrors, [], `${scenario.name} pass ${passNumber} console errors`);
    assert.deepEqual(failedRequests, [], `${scenario.name} pass ${passNumber} failed requests`);
  } finally {
    client.close();
  }
}

async function main() {
  assert.ok(existsSync(path.join(projectRoot, 'dist')), 'dist does not exist; run `npm run build` first');
  assert.ok(Number.isInteger(repeatCount) && repeatCount > 0, 'MASTERMIND_BROWSER_QA_REPEAT must be a positive integer');

  const previewPort = await getFreePort();
  const debugPort = await getFreePort();
  const chromeProfileDir = mkdtempSync(path.join(tmpdir(), 'mastermind-browser-qa-profile-'));
  const preview = startPreviewServer(previewPort);
  const baseUrl = `http://127.0.0.1:${previewPort}`;
  let chrome;

  try {
    await waitForHttp(baseUrl);
    chrome = await startChrome(debugPort, chromeProfileDir);

    for (let pass = 1; pass <= repeatCount; pass += 1) {
      for (const scenario of scenarios) {
        await runScenario(baseUrl, debugPort, scenario, pass);
      }
    }
  } catch (error) {
    const previewOutput = preview.getOutput();
    const chromeOutput = chrome?.getOutput?.() || '';
    throw new Error([
      error.message,
      previewOutput ? `\nPreview output:\n${previewOutput}` : '',
      chromeOutput ? `\nChrome output:\n${chromeOutput}` : '',
    ].join(''));
  } finally {
    await terminateProcess(preview.child);
    await terminateProcess(chrome?.child);
    await removeDirectoryWithRetry(chromeProfileDir);
  }

  console.log(`mastermind browser verifier passed (${scenarios.length} scenarios x ${repeatCount} passes)`);
  if (artifactDir) {
    console.log(`screenshots written to ${artifactDir}`);
  }
}

await main();
