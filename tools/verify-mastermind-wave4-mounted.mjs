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
assert.ok(fs.existsSync(chrome), 'Wave 4 mounted verifier requires local headless Chrome');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mastermind-wave4-mounted-'));
const exact = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const aliases = { name: 'wave4-test-aliases', setup(api) {
  api.onResolve({ filter: exact('@/integrations/supabase/client') }, () => ({ path: path.join(root, 'tools/mastermind-wave4-supabase-mock.ts') }));
  api.onResolve({ filter: exact('@/components/Layout') }, () => ({ path: path.join(root, 'tools/mastermind-wave4-layout-mock.tsx') }));
} };

async function viewport(html, width) {
  const browser = spawn(chrome, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE localhost', '--remote-debugging-port=0',`--user-data-dir=${path.join(tmp,`chrome-${width}`)}`,'about:blank'], { stdio:['ignore','ignore','pipe'] });
  let stderr = '';
  try {
    const wsUrl = await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error(`Chrome timeout: ${stderr}`)),10000); browser.stderr.on('data',(chunk)=>{stderr+=String(chunk);const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});browser.once('exit',(code)=>reject(new Error(`Chrome exited ${code}: ${stderr}`))); });
    const endpoint = new URL(wsUrl);
    const targets = await fetch(`http://${endpoint.host}/json/list`).then((response)=>response.json());
    const socket = new WebSocket(targets.find((item)=>item.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});
    let id=0;const pending=new Map();socket.on('message',(raw)=>{const message=JSON.parse(String(raw));if(!message.id)return;const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);});
    const command=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,{resolve,reject});socket.send(JSON.stringify({id:commandId,method,params}));});
    const evaluate=async(expression)=>(await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
    await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
    await command('Network.setBlockedURLs',{urls:['https://content.dropboxapi.com/*']});
    await command('Emulation.setDeviceMetricsOverride',{width,height:1200,deviceScaleFactor:1,mobile:true});
    await command('Page.navigate',{url:`file://${html}`});
    let status='';for(let attempt=0;attempt<100&&status!=='complete'&&status!=='failed';attempt+=1){await new Promise((resolve)=>setTimeout(resolve,100));status=await evaluate('document.body.dataset.wave4Mounted||""');}
    const error=await evaluate('window.__wave4Error||null');assert.equal(status,'complete',`Wave 4 harness failed at ${width}: ${error}`);
    const result=await evaluate('window.__wave4Result');
    assert.ok(result.bodyWidth<=width&&result.documentWidth<=width,`horizontal overflow at ${width}: ${JSON.stringify(result)}`);
    assert.equal(result.clipped,0,`clipped controls at ${width}`);
    assert.deepEqual(result.shortPrimaryControls,[],`touch targets below 44px at ${width}: ${JSON.stringify(result.shortPrimaryControls)}`);
    assert.equal(result.actionFocused,true,`Back to my action did not focus canonical action; active=${result.activeElementDebug}`);
    assert.equal(result.supportRoutes,1,'mounted slice must expose one support route');
    assert.match(result.videoControls,/nodownload/);assert.equal(result.videoInline,true);
    assert.ok(result.liveRegions>=3,'loading/save/playback live regions missing');
    assert.equal(result.evidenceRequestStable,true);assert.equal(result.evaluationRequestStable,true);
    assert.deepEqual(result.forbiddenMutationCalls,[],'watching or mounted UI invoked forbidden completion/Vault calls');
    socket.close();
  } finally {
    if(browser.exitCode===null)browser.kill('SIGTERM');
  }
}

try {
  const js=path.join(tmp,'wave4.js');
  await build({entryPoints:[path.join(root,'tools/mastermind-wave4-mounted-harness.tsx')],outfile:js,bundle:true,platform:'browser',format:'iife',jsx:'automatic',tsconfig:path.join(root,'tsconfig.app.json'),plugins:[aliases],logLevel:'silent'});
  const cssPath=path.join(tmp,'wave4.css');const cssBuild=spawnSync('npx',['tailwindcss','-i',path.join(root,'src/index.css'),'-o',cssPath,'--minify'],{cwd:root,encoding:'utf8',timeout:30000});assert.equal(cssBuild.status,0,cssBuild.stderr);
  const html=path.join(tmp,'wave4.html');fs.writeFileSync(html,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${fs.readFileSync(cssPath,'utf8')}</style><body><div id="root"></div><script>${fs.readFileSync(js,'utf8').replaceAll('</script','<\\/script')}</script></body>`);
  for(const width of [320,360,390])await viewport(html,width);
  console.log('Wave 4 mounted gate passed at 320/360/390px: closed monthly DOM, one lesson/action/support route, protected player, focus handoff, 44px controls, no overflow, and receipt/readback mutations.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('Chrome exited null:') || message.startsWith('Chrome timeout:')) {
    console.error('BLOCKED local headless Chrome could not establish a DevTools session; no mounted UI behavior claim was made.');
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally { fs.rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
