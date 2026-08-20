import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterPilotVideos, pilotRecommendationReason, pilotTranscriptSnippet, rankPilotRecommendation } from '../src/components/mastermind/mastermindVideoSearchCore.mjs';

const videos = [
  { id:'offer', title:'Build Your Offer', stage:'Offer', summary:'Clarify your buyer and promise', keywords:['offer','buyer'], transcript:'Choose one buyer and make a clear offer.' },
  { id:'find', title:'Grow Your List', stage:'Find', summary:'Find leads through email list growth', keywords:['email list','leads'], transcript:'Your discovery system helps the right people find you.' },
  { id:'nurture', title:'Warm Your Audience', stage:'Nurture', summary:'Build trust through email', keywords:['nurture','email'], transcript:'Send useful emails that build trust before selling.' },
  { id:'sell', title:'Simple Sales Page', stage:'Sell', summary:'Make invitations and sales pages', keywords:['sales page','conversion'], transcript:'A sales page makes the offer easy to understand.' },
  { id:'deliver', title:'Implementation Gap', stage:'Deliver', summary:'Help customers follow through', keywords:['implementation','delivery'], transcript:'Shorten the gap between knowing and implementation.' },
  { id:'leverage', title:'Low Capacity Plan', stage:'Leverage', summary:'Simplify work in a low capacity season', keywords:['capacity','burnout','simplify'], transcript:'A low capacity plan protects what matters without burnout.' },
];

for (const stageId of ['offer','find','nurture','sell','deliver','leverage']) {
  const result=rankPilotRecommendation(videos,{stageId,stageLabel:stageId,goal:'unrelated sentinel'});
  assert.equal(result.video.id,stageId,`stage ${stageId} must select its own training`);
  assert.equal(result.stageMatch,true);
}
const minimum=rankPilotRecommendation(videos,{stageId:'offer',stageLabel:'Offer',capacityMode:'minimum',goal:'maintain the business'});
assert.equal(minimum.video.id,'leverage','minimum capacity must be able to override stage with a safer capacity resource');
assert.equal(minimum.capacityMatch,true);
const sell=rankPilotRecommendation(videos,{stageId:'sell',stageLabel:'Sell',milestoneTitle:'Run the complete sales cycle',goal:'finish my sales page'});
assert.equal(sell.video.id,'sell');
assert.match(pilotRecommendationReason({stageLabel:'Sell',milestoneTitle:'Run the complete sales cycle'},sell),/Sell stage/);
assert.deepEqual(filterPilotVideos(videos,'sales page','All').map(v=>v.id),['sell']);
assert.deepEqual(filterPilotVideos(videos,'email','Nurture').map(v=>v.id),['nurture']);
assert.deepEqual(filterPilotVideos(videos,'not-present-anywhere','All'),[]);
assert.match(pilotTranscriptSnippet(videos[4],'implementation'),/implementation/i);

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const page=fs.readFileSync(path.join(repo,'src/pages/ReplayVault.tsx'),'utf8');
const pilot=fs.readFileSync(path.join(repo,'src/components/mastermind/MastermindVideoSearch.tsx'),'utf8');
const pilotData=fs.readFileSync(path.join(repo,'src/data/replayVaultPilotVideos.ts'),'utf8');
const pilotDataMarker='export const REPLAY_VAULT_PILOT_VIDEOS: MastermindVideo[] = ';
const pilotDataStart=pilotData.indexOf('[',pilotData.indexOf(pilotDataMarker)+pilotDataMarker.length);
const actualVideos=JSON.parse(pilotData.slice(pilotDataStart,pilotData.lastIndexOf('];')+1));
assert.doesNotMatch(page,/VITE_REPLAY_VAULT_PILOT/,'production Vault route must not contain a static pilot feature-flag bypass');
assert.doesNotMatch(page,/MastermindVideoSearch/,'production Vault route must not mount the static pilot component');
assert.match(pilot,/useMastermindSuccessPath/);
assert.match(pilot,/Recommended for your plan/);
assert.match(pilot,/Search titles, topics, keywords, and full transcripts/);
assert.match(pilot,/Browse by Success Path/);
assert.match(pilot,/youtube-nocookie\.com\/embed/);
assert.doesNotMatch(pilot,/YOUTUBE_TEST_VIDEOS/,'pilot must not import and runtime-filter the broader transcript library');
assert.match(pilot,/REPLAY_VAULT_PILOT_VIDEOS/,'pilot must import the physically isolated selected catalog');
assert.equal((pilotData.match(/"id":/g) || []).length,9,'isolated pilot module must contain exactly nine records');
assert.doesNotMatch(pilotData,/business-unstuck|offers-visibility-confidence|business-without-hustle|p7fwlN9aGnk/,'privacy-sensitive coaching/panel content must stay out of the isolated pilot module');
assert.deepEqual(filterPilotVideos(actualVideos,'AI','All').map(video=>video.id),['ai-brand-strategy'],'short AI query must match a whole token, not letters inside training or said');
assert.match(pilotTranscriptSnippet(actualVideos.find(video=>video.id==='ai-brand-strategy'),'AI'),/\bAI\b/i,'AI transcript snippet must be centered on a standalone AI term');
assert.deepEqual(filterPilotVideos([{id:'false-positive',title:'Training',stage:'Offer',summary:'She said yes',keywords:[],transcript:'Maintain the plan.'}],'AI','All'),[],'short tokens must reject substring false positives');
assert.equal(rankPilotRecommendation(actualVideos,{stageId:'unknown',stageLabel:'Unknown',goal:'Use AI to clarify my brand'}).video.id,'ai-brand-strategy','standalone AI planner context must influence recommendation ranking');
console.log('Replay Vault pilot recommendation/search gate passed.');
