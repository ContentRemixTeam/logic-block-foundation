#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql','supabase/functions/_shared/assignedLearningPlayback.ts','supabase/functions/get-assigned-learning-playback/index.ts','supabase/functions/_shared/assignedLearningPlayback.test.ts','src/pages/MastermindSuccessPath.tsx','src/components/mastermind/AssignedLearningPlayer.tsx','src/hooks/useSuccessPathLearningSlice.ts','src/lib/successPathLearningSlice.ts','src/App.tsx','src/integrations/supabase/types.ts','tools/verify-mastermind-wave4-mounted.mjs','tools/verify-mastermind-wave4-postgres.py','package.json'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wave4-mutation-control-'));
try {
  for (const file of files) { const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target); }
  const migrationDir=path.join(temp,'supabase/migrations');
  for(let index=0;index<196;index+=1)fs.writeFileSync(path.join(migrationDir,`synthetic-${String(index).padStart(3,'0')}.sql`),'-- chronology fixture\n');
  const mutations = [
    ['supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql','p_assignment_item_id <> v_state.active_assignment_item_id','p_assignment_item_id = v_state.active_assignment_item_id /* p_assignment_item_id <> v_state.active_assignment_item_id */'],
    ['supabase/functions/_shared/assignedLearningPlayback.ts','row.provider !== "dropbox"','false && row.provider !== "dropbox"'],
    ['src/pages/MastermindSuccessPath.tsx','confirmed.replayed !== true','false && confirmed.replayed !== true'],
  ];
  for (const [file, before, after] of mutations) {
    const target=path.join(temp,file);const original=fs.readFileSync(target,'utf8');assert.ok(original.includes(before),`mutation target missing ${before}`);fs.writeFileSync(target,original.replace(before,after));
    const result=spawnSync(process.execPath,[path.join(root,'tools/verify-mastermind-wave4.mjs')],{cwd:root,env:{...process.env,WAVE4_VERIFY_ROOT:temp},encoding:'utf8'});
    assert.notEqual(result.status,0,`aggregate verifier passed executable behavior mutation in ${file}`);fs.writeFileSync(target,original);
  }
  const restored=spawnSync(process.execPath,[path.join(root,'tools/verify-mastermind-wave4.mjs')],{cwd:root,env:{...process.env,WAVE4_VERIFY_ROOT:temp},encoding:'utf8'});
  assert.equal(restored.status,0,`restored fixture did not pass: ${restored.stdout}${restored.stderr}`);
  console.log('Wave 4 aggregate mutation control passed: DB exact-item, edge provider, and UI receipt-readback behavior breaks the gate while source tokens remain; restoration passes.');
} finally { fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
