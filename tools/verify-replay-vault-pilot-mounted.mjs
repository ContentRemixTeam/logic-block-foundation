#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
assert.ok(fs.existsSync(chrome), 'pilot mounted verifier requires Google Chrome');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-vault-pilot-mounted-'));
const exact = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const aliases = {
  name: 'pilot-test-aliases',
  setup(api) {
    api.onResolve({ filter: exact('@/hooks/useMastermindSuccessPath') }, () => ({ path: path.join(root, 'tools/replay-vault-pilot-success-path-mock.ts') }));
  },
};

async function runViewport(html, width) {
  const profile = path.join(tmp, `chrome-${width}`);
  const browser = spawn(chrome, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { stdio: ['ignore','ignore','pipe'] });
  let stderr = '';
  try {
    const browserWs = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Chrome startup timed out: ${stderr}`)), 10000);
      browser.stderr.on('data', (chunk) => { stderr += String(chunk); const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
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
    const browserErrors = [];
    socket.on('message', (raw) => { const message = JSON.parse(String(raw)); if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'unknown browser exception'); if (!message.id) return; const waiter = pending.get(message.id); if (!waiter) return; pending.delete(message.id); if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result); });
    const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    await command('Page.enable'); await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: `file://${html}` });
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); ready = await evaluate(`Boolean(document.querySelector('[data-replay-vault-pilot]'))`); }
    if (!ready) {
      const dom = await evaluate('document.documentElement.outerHTML');
      assert.fail(`pilot did not mount at ${width}px; exceptions=${JSON.stringify(browserErrors)}; dom=${dom.slice(-1200)}`);
    }
    const initial = await evaluate(`(() => {
      const visible=(el)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      const controls=[...document.querySelectorAll('button,input')].filter(visible);
      return {
        innerWidth, bodyWidth:document.body.scrollWidth, documentWidth:document.documentElement.scrollWidth,
        clipped:[...document.querySelectorAll('button,input,iframe')].filter(visible).map(el=>({tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent?.trim().slice(0,60),...(()=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}})()})).filter(x=>x.left < -1 || x.right > innerWidth + 1),
        shortControls:controls.map(el=>({label:el.getAttribute('aria-label')||el.textContent?.trim().slice(0,60),height:el.getBoundingClientRect().height})).filter(x=>x.height < 40),
        hasSearchLabel:document.querySelector('input')?.getAttribute('aria-label') === 'Search Replay Vault pilot',
        hasLiveRegion:Boolean(document.querySelector('[aria-live="polite"]')),
        stageButtons:['All','Offer','Find','Nurture','Sell','Deliver','Leverage'].every(name=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===name)),
        watchButtons:[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Watch training')).length,
        iframeCount:document.querySelectorAll('iframe').length,
        recommendedTitle:[...document.querySelectorAll('*')].find(el=>el.textContent?.trim()==='Recommended for your plan')?.closest('[class*="border-primary"]')?.textContent || ''
      };
    })()`);
    assert.ok(initial.bodyWidth <= width && initial.documentWidth <= width, `horizontal document overflow at ${width}px: ${JSON.stringify(initial)}`);
    assert.deepEqual(initial.clipped, [], `clipped primary controls at ${width}px`);
    assert.deepEqual(initial.shortControls, [], `touch targets under 40px at ${width}px`);
    assert.equal(initial.hasSearchLabel, true); assert.equal(initial.hasLiveRegion, true); assert.equal(initial.stageButtons, true);
    assert.ok(initial.watchButtons >= 9, 'all selected pilot videos must remain reachable');
    assert.equal(initial.iframeCount, 0, 'player should not load before an explicit member action');
    assert.match(initial.recommendedTitle, /sales page/i, 'real planner bottleneck must influence the mounted recommendation');
    await evaluate(`([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Watch training'))).click()`);
    let player = null;
    for (let attempt = 0; attempt < 30 && !player; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); player = await evaluate(`(() => { const f=document.querySelector('iframe'); const panel=document.querySelector('[tabindex="-1"][aria-labelledby="pilot-player-title"]'); return f&&panel?{src:f.src,title:f.title,focused:document.activeElement===panel}:null })()`); }
    assert.ok(player, 'explicit Watch action must mount the player');
    assert.match(player.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\//); assert.ok(player.title); assert.equal(player.focused, true, 'focus must move to the player heading');
    socket.close();
    return initial;
  } finally {
    if (browser.exitCode === null) {
      browser.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => browser.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    if (browser.exitCode === null) {
      browser.kill('SIGKILL');
      await new Promise((resolve) => browser.once('exit', resolve));
    }
  }
}

try {
  const outfile = path.join(tmp, 'pilot.js');
  await build({ entryPoints:[path.join(root,'tools/replay-vault-pilot-mounted-harness.tsx')], outfile, bundle:true, platform:'browser', format:'iife', jsx:'automatic', tsconfig:path.join(root,'tsconfig.app.json'), plugins:[aliases], logLevel:'silent' });
  const cssPath = path.join(tmp, 'pilot.css');
  const cssBuild = spawnSync('npx',['tailwindcss','-i',path.join(root,'src/index.css'),'-o',cssPath,'--minify'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(cssBuild.status,0,`could not compile pilot CSS: ${cssBuild.stderr}`);
  const script=fs.readFileSync(outfile,'utf8').replaceAll('</script','<\\/script'); const css=fs.readFileSync(cssPath,'utf8');
  const html=path.join(tmp,'pilot.html'); fs.writeFileSync(html,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><body><script>${script}</script></body>`);
  for (const width of [320,360,390]) await runViewport(html,width);
  console.log('Replay Vault pilot mounted mobile/accessibility gate passed at 320/360/390px with complete reachability, 40px+ controls, labeled/live search, contextual recommendation, consent-gated no-cookie player, and focus transfer.');
} finally { fs.rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
