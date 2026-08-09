import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=fs.readFileSync(path.join(root,'src/index.css'),'utf8');
const button=fs.readFileSync(path.join(root,'src/components/ui/button.tsx'),'utf8');
const themes=['pink','orange','green','red','teal','blue','purple','minimal','bw'];
const hsl=(value)=>{const [h,s,l]=value.match(/[\d.]+/g).map(Number);const a=s/100*Math.min(l/100,1-l/100);const f=n=>{const k=(n+h/30)%12;return l/100-a*Math.max(-1,Math.min(k-3,9-k,1));};return [f(0),f(8),f(4)];};
const luminance=rgb=>rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(hsl(a)),y=luminance(hsl(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const variable=(block,name)=>{const m=block.match(new RegExp(`--${name}:\\s*([^;]+);`));assert(m,`${name} missing`);return m[1];};
const results=[];
for(const theme of themes){const marker=`[data-theme="${theme}"]`;const start=css.indexOf(marker);assert(start>=0,`${theme} selector missing`);const end=css.indexOf('/* =====',start+marker.length);const block=css.slice(start,end<0?css.length:end);for(const state of ['primary','primary-hover']){const ratio=contrast(variable(block,state),variable(block,'primary-foreground'));results.push({theme,state,ratio});assert(ratio>=4.5,`${theme} ${state} contrast ${ratio.toFixed(2)}`);}const accentRatio=contrast(variable(block,'accent'),variable(block,'accent-foreground'));results.push({theme,state:'focus/selection accent',ratio:accentRatio});assert(accentRatio>=4.5,`${theme} accent contrast ${accentRatio.toFixed(2)}`);}
const rootBlock=css.slice(css.indexOf(':root {'),css.indexOf('[data-theme="pink"]'));
for(const [state,bg,fg] of [['disabled','muted','foreground'],['error','destructive','destructive-foreground']]){const ratio=contrast(variable(rootBlock,bg),variable(rootBlock,fg));results.push({theme:'all',state,ratio});assert(ratio>=4.5,`${state} contrast ${ratio.toFixed(2)}`);}
assert.match(button,/disabled:bg-muted disabled:text-foreground disabled:opacity-100/);
console.log(JSON.stringify({status:'pass',minimum:Math.min(...results.map(x=>x.ratio)),matrix:results.map(x=>({...x,ratio:Number(x.ratio.toFixed(2))}))},null,2));
