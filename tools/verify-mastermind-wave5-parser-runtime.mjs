#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wave5-parser-'));
try{
 const out=path.join(tmp,'parser.mjs');await build({entryPoints:[path.join(root,'src/lib/successPathMemberAuthority.ts')],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
 const {parseTransitionPreview}=await import(`${pathToFileURL(out).href}?${Date.now()}`);
 const valid={status:'pending',replayed:false,proposal_id:'11111111-1111-4111-8111-111111111111',impact_diff:{transition:{kind:'focus_change',reason_code:'member_requested'},stage:{old:'start',new:'start'},milestone:{old:{key:'m1',title:'First milestone'},new:{key:'m1',title:'First milestone'}},learning:{assignment_reroute:false,learning_item_changed:false},action:{old:{text:'Old action',estimated_minutes:20},new:{text:'New action',estimated_minutes:15}},history:{prior_task_preserved:true,prior_task_completion_preserved:true,evidence_preserved:true,actions_preserved:true,checkins_preserved:true}},impact_diff_sha256:'a'.repeat(64)};
 const parsed=parseTransitionPreview(structuredClone(valid));assert.deepEqual(parsed,valid);assert.notEqual(parsed,valid);assert.notEqual(parsed.impact_diff,valid.impact_diff);
 const paths=[['root_secret'],['impact_diff','private_locator'],['impact_diff','transition','operator_note'],['impact_diff','stage','path_id'],['impact_diff','milestone','old','assignment_id'],['impact_diff','milestone','new','catalog_content_sha256'],['impact_diff','learning','media_asset_id'],['impact_diff','action','old','task_id'],['impact_diff','action','new','logical_key'],['impact_diff','history','request_receipt_id']];
 const inject=(parts)=>{const value=structuredClone(valid);let node=value;for(const part of parts.slice(0,-1))node=node[part];node[parts.at(-1)]='SECRET';return value;};
 for(const parts of paths)assert.throws(()=>parseTransitionPreview(inject(parts)),`accepted nested injection ${parts.join('.')}`);
 const invalid=[null,[],{...valid,impact_diff:[]},{...valid,replayed:'false'},{...valid,proposal_id:'not-uuid'},(()=>{const x=structuredClone(valid);delete x.impact_diff.history.checkins_preserved;return x})(),(()=>{const x=structuredClone(valid);x.impact_diff.action.new.estimated_minutes=1.5;return x})(),(()=>{const x=structuredClone(valid);x.impact_diff.action.new.text='x'.repeat(301);return x})(),(()=>{const x=structuredClone(valid);x.impact_diff.transition.kind='secret_kind';return x})()];
 for(const value of invalid)assert.throws(()=>parseTransitionPreview(value));
 console.log(`PASS Wave 5 production parser accepted the exact safe contract and rejected ${paths.length+invalid.length} recursive privacy/type/shape mutations.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
