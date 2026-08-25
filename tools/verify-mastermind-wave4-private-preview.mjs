#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const html = process.argv[2] ? path.resolve(process.argv[2]) : path.join(os.homedir(), 'Desktop/HERMES-FILES/mastermind-private-preview.html');
assert.ok(fs.existsSync(chrome), 'Chrome is required');
assert.ok(fs.existsSync(html) && fs.statSync(html).size > 1000, 'Private preview HTML is missing');
const manifestPath=path.join(root,'tools/mastermind-video-filming-manifest.ts');
const manifest=fs.readFileSync(manifestPath,'utf8');
const previewSource=fs.readFileSync(path.join(root,'tools/mastermind-wave4-private-preview.tsx'),'utf8');
const memberPage=fs.readFileSync(path.join(root,'src/pages/MastermindSuccessPath.tsx'),'utf8');
const memberPlayer=fs.readFileSync(path.join(root,'src/components/mastermind/AssignedLearningPlayer.tsx'),'utf8');
const htmlSource=fs.readFileSync(html,'utf8');
const groupCount=(group)=>(manifest.match(new RegExp(`group: '${group}'`,'g'))||[]).length;
assert.deepEqual(Object.fromEntries(['record_now','edit_existing','tool_first_do_not_film','deferred'].map(group=>[group,groupCount(group)])),{record_now:1,edit_existing:3,tool_first_do_not_film:7,deferred:1},'Filming manifest group counts changed');
for(const label of ['RECORD THIS','EDIT EXISTING — DO NOT RESHOOT','DO NOT FILM YET','VIDEO DEFERRED'])assert.ok(manifest.includes(`statusLabel: '${label}'`),`Missing status label: ${label}`);
assert.equal((manifest.match(/EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE/g)||[]).length,4,'Editorial candidate type plus three items required');
for(const slot of ['F4','N4','S2','D1','D3','L3','L4'])assert.ok(manifest.includes(`slot: '${slot}'`),`Missing verified gap ${slot}`);
assert.ok(manifest.includes("target: '6–8 minute Faith-to-camera orientation'")&&manifest.includes('Interactive text + AI Employee Job Card first'),'Required orientation/deferred treatments missing');
assert.ok(previewSource.includes("from './mastermind-video-filming-manifest'")&&previewSource.includes('PRIVATE PRODUCTION PLANNING — MEMBERS WILL NOT SEE THIS'),'Manifest is not isolated to the private preview');
for(const file of fs.readdirSync(path.join(root,'src'),{recursive:true}).filter(name=>String(name).endsWith('.ts')||String(name).endsWith('.tsx'))){assert.ok(!fs.readFileSync(path.join(root,'src',String(file)),'utf8').includes('mastermind-video-filming-manifest'),`Production src imports filming manifest: ${file}`);}
assert.ok(fs.existsSync(path.join(root,'dist')),'Production dist must be freshly built before this verifier');
for(const file of fs.readdirSync(path.join(root,'dist','assets')).filter(name=>name.endsWith('.js'))){const bundle=fs.readFileSync(path.join(root,'dist','assets',file),'utf8');assert.ok(!bundle.includes('PRIVATE PRODUCTION PLANNING')&&!bundle.includes('EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE'),`Production bundle exposes filming manifest in ${file}`);}
assert.ok(memberPage.includes('This resource is being prepared. Your plan has not changed.'),'Calm generic member resource-not-ready copy missing');
for(const label of ['RECORD THIS','EDIT EXISTING — DO NOT RESHOOT','DO NOT FILM YET','VIDEO DEFERRED','EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE'])assert.ok(!memberPage.includes(label)&&!memberPlayer.includes(label),`Member production route exposes internal label: ${label}`);
assert.ok(htmlSource.includes("connect-src 'none'")&&htmlSource.includes("media-src 'none'"),'Offline preview CSP isolation changed');

async function viewport(width) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `mm-private-${width}-`));
  const browser = spawn(chrome, ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { stdio:['ignore','ignore','pipe'] });
  let stderr = '';
  try {
    const wsUrl = await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error(`Chrome timeout: ${stderr}`)),10000); browser.stderr.on('data',(chunk)=>{stderr+=String(chunk);const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});browser.once('exit',(code)=>reject(new Error(`Chrome exited ${code}: ${stderr}`))); });
    const endpoint = new URL(wsUrl);
    const targets = await fetch(`http://${endpoint.host}/json/list`).then((response)=>response.json());
    const socket = new WebSocket(targets.find((item)=>item.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});
    let id=0;const pending=new Map();const requests=[];
    socket.on('message',(raw)=>{const message=JSON.parse(String(raw));if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);if(!message.id)return;const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);});
    const command=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,{resolve,reject});socket.send(JSON.stringify({id:commandId,method,params}));});
    const evaluate=async(expression)=>(await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
    await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
    await command('Emulation.setDeviceMetricsOverride',{width,height:1400,deviceScaleFactor:1,mobile:width<600});
    await command('Page.navigate',{url:new URL(`file://${html}`).href});
    for(let attempt=0;attempt<80;attempt+=1){if(await evaluate(`document.getElementById('root')?.textContent?.includes('One result. One next move.')||false`))break;await new Promise((resolve)=>setTimeout(resolve,100));}
    const before=await evaluate(`(()=>{const root=document.getElementById('root');const text=root?.textContent||'';const controls=[...document.querySelectorAll('button,input,a,summary')].filter(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});return {text,banner:text.includes('PRIVATE SAMPLE PREVIEW'),productionBanner:text.includes('PRIVATE PRODUCTION PLANNING — MEMBERS WILL NOT SEE THIS'),fake:text.includes('Fake lesson and fake business data'),heading:text.includes('One result. One next move.'),lesson:text.includes('SAMPLE: Turn your idea into one clear offer invitation'),orientation:text.includes('Start Here: You Are the Boss of Your Success Path')&&text.includes('You can edit it, replace it, reschedule it, choose a different path, or ask for support.'),support:document.querySelectorAll('a[href="/support"]').length,htmlWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,clipped:controls.filter(n=>{const r=n.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1}).map(n=>n.textContent?.trim()),short:controls.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.textContent?.trim())}})()`);
    assert.ok(before.banner&&before.productionBanner&&before.fake&&before.heading&&before.lesson&&before.orientation&&before.text.includes('You are the boss')&&before.text.includes('Assigned / not opened')&&before.text.includes('Watched / no action')&&before.text.includes('Stalled')&&before.text.includes('Returned'),'Required private preview content missing');
    assert.equal(before.support,1,'Expected exactly one support route');
    assert.ok(before.htmlWidth<=width&&before.bodyWidth<=width,`Overflow at ${width}: ${JSON.stringify(before)}`);
    assert.deepEqual(before.clipped,[],`Clipped controls at ${width}`);assert.deepEqual(before.short,[],`Controls below 44px at ${width}`);
    await evaluate(`document.querySelector('details').open=true`);
    const planning=await evaluate(`(()=>{const section=document.querySelector('[aria-label="Faith-only video production planning"]');const controls=[...section.querySelectorAll('button,summary')].filter(n=>n.getBoundingClientRect().height>0);return {summary:section.textContent.includes('1 new now / 3 edits / 7 tool-first / 1 deferred'),items:section.querySelectorAll('[data-filming-item]').length,groups:Object.fromEntries([...section.querySelectorAll('[data-filming-group]')].map(n=>[n.dataset.filmingGroup,n.querySelectorAll('[data-filming-item]').length])),links:section.querySelectorAll('a').length,players:section.querySelectorAll('video,audio,iframe,[src]').length,enabled:[...section.querySelectorAll('button')].filter(n=>!n.disabled).length,short:controls.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.textContent.trim()),overflow:document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth}})()`);
    assert.deepEqual(planning.groups,{record_now:1,edit_existing:3,tool_first_do_not_film:7,deferred:1},'Rendered filming groups changed');assert.equal(planning.items,12);assert.ok(planning.summary);assert.equal(planning.links,0);assert.equal(planning.players,0);assert.equal(planning.enabled,0);assert.deepEqual(planning.short,[]);assert.equal(planning.overflow,false,`Planning overflow at ${width}`);
    const originalAction=await evaluate(`document.body.textContent.includes('Send one clear offer invitation')`);
    await evaluate(`([...document.querySelectorAll('button')].find(n=>n.textContent?.includes('Review or change my focus'))).click()`);
    await evaluate(`([...document.querySelectorAll('button')].find(n=>n.textContent?.includes('Cancel — change nothing'))).click()`);
    assert.equal(originalAction&&await evaluate(`document.body.textContent.includes('Send one clear offer invitation')`),true,'Cancel mutated the fake canonical action');
    await evaluate(`([...document.querySelectorAll('button')].find(n=>n.textContent?.includes('Watch this lesson'))).click()`);
    for(let attempt=0;attempt<40;attempt+=1){if(await evaluate(`document.body.textContent.includes('temporarily unavailable')`))break;await new Promise((resolve)=>setTimeout(resolve,50));}
    assert.equal(await evaluate(`document.body.textContent.includes('temporarily unavailable')`),true,'Offline playback did not fail closed honestly');
    const external=requests.filter((url)=>/^https?:/i.test(url));assert.deepEqual(external,[],'Private preview made an external network request');
    const layout=await command('Page.getLayoutMetrics');
    const image=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:layout.cssContentSize.width,height:layout.cssContentSize.height,scale:1}});
    const shot=path.join(os.homedir(),`Desktop/HERMES-FILES/mastermind-private-preview-${width}.png`);fs.writeFileSync(shot,Buffer.from(image.data,'base64'),{mode:0o600});
    socket.close();return {width,shot,bytes:fs.statSync(shot).size,contentHeight:layout.cssContentSize.height,externalRequests:external.length};
  } finally {
    if(browser.exitCode===null){const exited=new Promise((resolve)=>browser.once('exit',resolve));browser.kill('SIGTERM');await Promise.race([exited,new Promise((resolve)=>setTimeout(resolve,2000))]);if(browser.exitCode===null)browser.kill('SIGKILL');}
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}

const results=[];for(const width of [320,360,390,1440])results.push(await viewport(width));
console.log(JSON.stringify({passed:true,html,results},null,2));
