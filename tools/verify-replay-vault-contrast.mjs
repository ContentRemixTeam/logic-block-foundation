#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
assert.ok(fs.existsSync(chrome),'mounted contrast verifier requires Chrome');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'replay-vault-contrast-'));
let browser;
try {
 const cssPath=path.join(tmp,'app.css');
 const built=spawnSync('npx',['tailwindcss','-i','src/index.css','-o',cssPath,'--minify'],{cwd:root,encoding:'utf8',timeout:120000});
 assert.equal(built.status,0,`Tailwind CSS build failed: ${built.stdout}\n${built.stderr}`);
 const htmlPath=path.join(tmp,'index.html');
 const base='inline-flex items-center justify-center rounded-lg text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2';
 fs.writeFileSync(htmlPath,`<!doctype html><html><head><link rel="stylesheet" href="${new URL(`file://${cssPath}`).href}"></head><body class="bg-background"><button id="normal" class="${base} bg-primary text-primary-foreground">Normal</button><button id="hover" class="${base} bg-primary text-primary-foreground hover:bg-primary-hover">Hover</button><button id="focus" class="${base} bg-primary text-primary-foreground">Focus</button><button id="disabled" disabled class="${base} disabled:bg-muted disabled:text-foreground disabled:opacity-100">Disabled</button><button id="error" class="${base} bg-destructive text-destructive-foreground">Error</button></body></html>`);
 const profile=path.join(tmp,'profile');
 browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let stderr='';
 const browserWs=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Chrome startup timeout: ${stderr}`)),10000);browser.stderr.on('data',chunk=>{stderr+=String(chunk);const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});browser.once('exit',code=>{clearTimeout(timer);reject(new Error(`Chrome exited ${code}: ${stderr}`));});});
 const endpoint=new URL(browserWs);const targets=await fetch(`http://${endpoint.host}/json/list`).then(r=>r.json());const target=targets.find(x=>x.type==='page');assert(target?.webSocketDebuggerUrl);
 const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});let id=0;const pending=new Map();socket.on('message',raw=>{const message=JSON.parse(String(raw));if(!message.id)return;const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);});const command=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
 await command('Page.enable');await command('Runtime.enable');await command('DOM.enable');await command('CSS.enable');await command('Page.navigate',{url:new URL(`file://${htmlPath}`).href});await new Promise(resolve=>setTimeout(resolve,500));
 const doc=await command('DOM.getDocument');const hoverNode=await command('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#hover'});await command('CSS.forcePseudoState',{nodeId:hoverNode.nodeId,forcedPseudoClasses:['hover']});const hoverPoint=await command('Runtime.evaluate',{expression:`(()=>{const r=document.querySelector('#hover').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`,returnByValue:true});await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:hoverPoint.result.value.x,y:hoverPoint.result.value.y});
 const evaluate=async(expression)=>(await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const themes=[['default',null],['pink','pink'],['orange','orange'],['green','green'],['red','red'],['teal','teal'],['blue','blue'],['purple','purple'],['monochrome','bw']];
 const matrix=[];
 for(const [theme,value] of themes){
  await evaluate(`document.documentElement${value?`.setAttribute('data-theme',${JSON.stringify(value)});document.body.setAttribute('data-theme',${JSON.stringify(value)})`:`.removeAttribute('data-theme');document.body.removeAttribute('data-theme')`};document.querySelector('#focus').focus();new Promise(resolve=>setTimeout(()=>resolve(true),250))`);
  for(const state of ['normal','hover','focus','disabled','error']){
   const colors=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('#${state}'));return {foreground:s.color,background:s.backgroundColor,display:s.display,disabled:document.querySelector('#${state}').disabled};})()`);
   const parse=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255);const lum=color=>parse(color).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const a=lum(colors.foreground),b=lum(colors.background);const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   matrix.push({theme,state,foreground:colors.foreground,background:colors.background,ratio:Number(ratio.toFixed(2))});assert.ok(colors.display!=='none',`${theme} ${state} not mounted`);assert.ok(ratio>=4.5,`${theme} ${state} mounted contrast ${ratio.toFixed(2)}: ${colors.foreground} on ${colors.background}`);
  }
 }
 socket.close();
 console.log(JSON.stringify({status:'pass',evidence:'mounted Chrome computed styles',minimum:Math.min(...matrix.map(x=>x.ratio)),matrix},null,2));
} finally {if(browser&&!browser.killed)browser.kill('SIGTERM');try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{}},500);}}
