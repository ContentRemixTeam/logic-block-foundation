#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const git=spawnSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:root,encoding:'buffer'});assert.equal(git.status,0,String(git.stderr));
const records=git.stdout.toString('utf8').split('\0').filter(Boolean);const paths=[];
for(const record of records){const status=record.slice(0,2);let name=record.slice(3);if(status.includes('R')||status.includes('C')){const next=records.shift();if(next)name=next;}if(name==='deno.lock'||name==='package-lock.json'&&status==='??')continue;paths.push(name);}
const manifest={};for(const name of [...new Set(paths)].sort((a,b)=>Buffer.from(a).compare(Buffer.from(b)))){const full=path.join(root,name);assert.ok(fs.existsSync(full),`changed path missing: ${name}`);manifest[name]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');}
const canonical=JSON.stringify(manifest);const aggregate=crypto.createHash('sha256').update(Buffer.from(canonical,'utf8')).digest('hex');
console.log(JSON.stringify({algorithm:'List git status --porcelain=v1 -z changed paths; exclude generated deno.lock and an untracked generated package-lock.json; deduplicate and sort paths by UTF-8 byte order; sha256 each exact file byte sequence; construct insertion-ordered object {path:sha256}; serialize with JSON.stringify (UTF-8, compact, no trailing newline); sha256 those canonical JSON bytes.',encoding:'canonical JSON sorted compact {path:sha256}',aggregateSha256:aggregate,fileCount:Object.keys(manifest).length,canonical,manifest},null,2));
