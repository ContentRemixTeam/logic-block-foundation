#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { mapPlaybackResponse, mapSearchRow } from "../supabase/functions/_shared/replayVaultProducer.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const uxCore=path.resolve(root,"../replay-vault-ux-r1/src/components/replay-vault/replayVaultCore.mjs");
const { groupSearchResults, validatePlaybackResponse }=await import(pathToFileURL(uxCore).href);
const searchEndpoint=readFileSync(path.join(root,"supabase/functions/search-mastermind-resources/index.ts"),"utf8");
const playbackEndpoint=readFileSync(path.join(root,"supabase/functions/get-mastermind-playback-link/index.ts"),"utf8");
assert.match(searchEndpoint,/import \{ mapSearchRow \} from "\.\.\/_shared\/replayVaultProducer\.mjs"/);
assert.match(searchEndpoint,/\.map\(mapSearchRow\)/);
assert.match(playbackEndpoint,/import \{ mapPlaybackResponse \} from "\.\.\/_shared\/replayVaultProducer\.mjs"/);
assert.match(playbackEndpoint,/secureJson\(req, mapPlaybackResponse\(/);

const momentId="11111111-1111-4111-8111-111111111111";
const questionId="22222222-2222-4222-8222-222222222222";
const searchRow={portal_resource_id:"replay-1",moment_id:momentId,question_id:null,title:"Pricing replay",
  product_title:"Vault",category_title:"Selling",resource_type:"video",snippet:"pricing strategy",reason:"matches transcript",
  starts_at_seconds:120,ends_at_seconds:165,duration_seconds:3600};
const mappedSearch=mapSearchRow(searchRow);
const groups=groupSearchResults({results:[mappedSearch]});
assert.equal(groups.length,1);
assert.equal(groups[0].resourceId,"replay-1");
assert.equal(groups[0].moments[0].momentId,momentId);
assert.equal(groups[0].moments[0].startSeconds,120);
assert.equal(groups[0].moments[0].endSeconds,165);

for (const [name,mutate] of [
  ["remove resourceId",value=>delete value.resourceId],
  ["mutate resourceId",value=>value.resourceId="bad/id"],
  ["remove momentId",value=>delete value.momentId],
  ["mutate momentId",value=>value.momentId="bad/id"],
]) {
  const value=structuredClone(mappedSearch); mutate(value);
  assert.equal(groupSearchResults({results:[value]}).length,0,`UX accepted negative search producer control: ${name}`);
}

const basePlaybackRow={portal_resource_id:"replay-1",title:"Pricing replay",access_scope:"replay_vault",
  authoritative_start_seconds:120,authoritative_end_seconds:165,moment_id:momentId,question_id:null};
const mappedPlayback=mapPlaybackResponse(basePlaybackRow,"https://dropbox.example/temporary","2026-08-09T20:00:00.000Z");
const momentTarget={resourceId:"replay-1",momentId,questionId:null};
assert.ok(validatePlaybackResponse(mappedPlayback,momentTarget),"committed UX rejected real moment playback mapper");
assert.equal(mappedPlayback.accessScope,"replay_vault");
for (const [name,mutate] of [
  ["remove resourceId",value=>delete value.resourceId],
  ["mutate resourceId",value=>value.resourceId="replay-2"],
  ["remove playbackUrl",value=>delete value.playbackUrl],
  ["remove startSeconds",value=>delete value.startSeconds],
  ["remove momentId",value=>delete value.momentId],
  ["mutate momentId",value=>value.momentId=questionId],
]) {
  const value=structuredClone(mappedPlayback); mutate(value);
  assert.equal(validatePlaybackResponse(value,momentTarget),null,`UX accepted negative moment playback producer control: ${name}`);
}

const questionPlayback=mapPlaybackResponse({...basePlaybackRow,authoritative_start_seconds:180,authoritative_end_seconds:240,
  moment_id:null,question_id:questionId},"https://dropbox.example/temporary","2026-08-09T20:00:00.000Z");
const questionTarget={resourceId:"replay-1",momentId:null,questionId};
assert.ok(validatePlaybackResponse(questionPlayback,questionTarget),"committed UX rejected real question playback mapper");
for (const [name,mutate] of [
  ["remove questionId",value=>delete value.questionId],
  ["mutate questionId",value=>value.questionId=momentId],
]) {
  const value=structuredClone(questionPlayback); mutate(value);
  assert.equal(validatePlaybackResponse(value,questionTarget),null,`UX accepted negative question producer control: ${name}`);
}
console.log("Replay Vault producer contract passed: actual endpoint mappers satisfy committed UX; 12 mutated/removed-field negative controls fail closed.");
