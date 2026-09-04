import React, { act } from 'react';
import '@/index.css';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ReplayVault from '@/pages/ReplayVault';
import { __vaultMock } from '@/integrations/supabase/client';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

const tick = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const waitFor = async (condition: () => boolean, label: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) { if (condition()) return; await tick(); }
  throw new Error(`Timed out waiting for ${label}`);
};
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const byText = (text: string) => [...document.querySelectorAll<HTMLElement>('button,a')].find((node) => node.textContent?.includes(text));
let root: Root | null = null;

async function mount(path = '/mastermind/replay-vault') {
  if (root) await act(async () => root?.unmount());
  document.body.innerHTML = '<div id="app-shell"><div id="root"></div></div>';
  root = createRoot(document.getElementById('root')!);
  await act(async () => root!.render(<MemoryRouter initialEntries={[path]}><ReplayVault /></MemoryRouter>));
  await tick();
}

async function click(node: Element | undefined | null) {
  assert(node, 'expected clickable element');
  await act(async () => (node as HTMLElement).click());
  await tick();
}

async function typeAndSubmit(value: string) {
  const input = document.querySelector<HTMLInputElement>('#vault-search')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await click(document.querySelector('button[type="submit"]'));
}

const resourceId = `membershipio:${'a'.repeat(64)}`;
const momentOne = '11111111-1111-4111-8111-111111111111';
const momentTwo = '22222222-2222-4222-8222-222222222222';
const questionOne = '33333333-3333-4333-8333-333333333333';
const questionTwo = '44444444-4444-4444-8444-444444444444';
const accessPayload = (overrides: Record<string, unknown> = {}) => ({
  allowed: true, memberEntitled: true, memberTier: 'annual',
  memberScopes: ['core_curriculum', 'current_replay_30_day', 'replay_vault'],
  previewCapabilities: [], previewActive: false, launchState: 'launched', ...overrides,
});
const allowed = { data: accessPayload(), error: null };
const monthlyDenied = { data: accessPayload({ allowed: false, memberTier: 'monthly', memberScopes: ['core_curriculum', 'current_replay_30_day'] }), error: null };
const denied = { data: accessPayload({ allowed: false, memberEntitled: false, memberTier: null, memberScopes: [] }), error: null };
const launchDisabled = { data: accessPayload({ allowed: false, launchState: 'disabled' }), error: null };
const pilotExcluded = { data: accessPayload({ allowed: false, launchState: 'pilot' }), error: null };
const groups = (label = 'Answer') => ({ data: { results: [
  { resourceId, momentId: momentOne, questionId: questionOne, title: `${label} replay`, category: 'Office hours', sourceType: 'video', publishedAt: null, durationSeconds: 1200, thumbnailUrl: null, matchType: 'best_answer', startSeconds: 42, endSeconds: 70, snippet: `${label} one`, reason: '', answerer: null },
  { resourceId, momentId: momentTwo, questionId: questionTwo, title: `${label} replay`, category: 'Office hours', sourceType: 'video', publishedAt: null, durationSeconds: 1200, thumbnailUrl: null, matchType: 'best_answer', startSeconds: 90, endSeconds: 110, snippet: `${label} two`, reason: '', answerer: null },
] }, error: null });
const nativePlayback = (url = 'file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=protected.mp4', momentId = momentOne, startSeconds = 42) => ({ data: {
  resourceId, title: 'Answer replay', provider: 'dropbox', playbackUrl: url, expiresAt: null, accessScope: 'replay_vault',
  momentId, questionId: momentId === momentOne ? questionOne : questionTwo, startSeconds, endSeconds: startSeconds + 28,
}, error: null });
const fullReplayPlayback = { data: {
  resourceId, title: 'Recent canonical call', provider: 'dropbox', playbackUrl: 'file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=protected-full.mp4', expiresAt: null, accessScope: 'replay_vault',
  momentId: null, questionId: null, startSeconds: 0, endSeconds: 1200,
}, error: null };

async function malformedAccessIsUnavailable() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', { data: {}, error: null });
  await mount();
  assert(document.body.textContent?.includes('Access check unavailable'), 'malformed 2xx access must be unavailable');
  assert(!document.body.textContent?.includes('This page is not available for this account'), 'malformed 2xx must not claim denial');
}

async function producerAccessStatesStayDistinct() {
  for (const [fixture, expected, forbidden] of [
    [allowed, 'Full Replay Vault', ['Access check unavailable']],
    [monthlyDenied, 'This page is not available for this account', ['Access check unavailable', 'Replay Vault']],
    [denied, 'This page is not available for this account', ['Access check unavailable', 'Replay Vault']],
    [launchDisabled, 'This page is not open yet', ['This page is not available for this account', 'Replay Vault']],
    [pilotExcluded, 'This page is not open yet', ['This page is not available for this account', 'Replay Vault']],
  ] as const) {
    __vaultMock.reset();
    __vaultMock.enqueue('get-mastermind-portal-access', fixture);
    await mount();
    assert(__vaultMock.lastBody('get-mastermind-portal-access').preview === true, 'access request must ask the server to evaluate admin preview');
    assert(document.body.textContent?.includes(expected), `producer access fixture must render ${expected}`);
    for (const forbiddenText of forbidden) {
      assert(!document.body.textContent?.includes(forbiddenText), `producer access fixture must not render ${forbiddenText}`);
    }
  }
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', { data: null, error: { message: 'offline' } });
  await mount();
  assert(document.body.textContent?.includes('Access check unavailable'), 'transport failure must remain unavailable');
}

async function accessRaceKeepsNewestIntent() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', { data: {}, error: null });
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  __vaultMock.enqueue('get-mastermind-portal-access', first.promise);
  __vaultMock.enqueue('get-mastermind-portal-access', second.promise);
  await mount();
  const retry = byText('Try again')!;
  await act(async () => { retry.click(); retry.click(); });
  second.resolve(allowed);
  await tick();
  first.resolve({ data: {}, error: null });
  await tick();
  assert(document.body.textContent?.includes('Full Replay Vault'), 'stale access response must not overwrite newest access intent');
}

async function deepLinkIsBoundedAndRetryExplicit() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('get-mastermind-playback-link', { data: null, error: { message: 'offline' } });
  __vaultMock.enqueue('get-mastermind-playback-link', { data: { ...nativePlayback().data, provider: 'youtube', playbackUrl: 'about:blank' }, error: null });
  const deepLinkPath = `/mastermind/replay-vault?${new URLSearchParams({ resource: resourceId, moment: momentOne }).toString()}#answer`;
  await mount(deepLinkPath);
  await tick();
  assert(document.querySelector('[data-auth-return-to]')?.getAttribute('data-auth-return-to') === deepLinkPath, 'manager integration contract must preserve pathname, encoded canonical IDs, search, and hash');
  assert(__vaultMock.count('get-mastermind-playback-link') === 1, 'deep-link failure must attempt exactly once');
  await tick();
  assert(__vaultMock.count('get-mastermind-playback-link') === 1, 'deep-link failure must not loop');
  assert(document.body.textContent?.includes('Try answer again'), 'deep-link failure must offer explicit retry');
  await click(byText('Try answer again'));
  assert(__vaultMock.count('get-mastermind-playback-link') === 2, `explicit retry must make one new request (observed ${__vaultMock.count('get-mastermind-playback-link')})`);
  const body = __vaultMock.lastBody('get-mastermind-playback-link');
  assert(body.questionId === null && body.momentId === momentOne, 'resolver must receive exactly one stable mapper target ID');
  assert(body.preview === true, 'playback request must ask the server to evaluate admin preview');
}

async function searchRaceKeepsNewestIntent() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  __vaultMock.enqueue('search-mastermind-resources', first.promise);
  __vaultMock.enqueue('search-mastermind-resources', second.promise);
  await mount();
  await typeAndSubmit('first query');
  await typeAndSubmit('second query');
  second.resolve(groups('Newest'));
  await tick();
  first.resolve(groups('Stale'));
  await tick();
  assert(document.body.textContent?.includes('Newest replay'), 'newest search must render');
  assert(!document.body.textContent?.includes('Stale replay'), 'stale search must not overwrite newest intent');
  const body = __vaultMock.lastBody('search-mastermind-resources');
  assert(body.responseShape === 'grouped_moments_v1' && body.limit === 12 && body.momentsPerReplay === 4, 'quick search must request a fast grouped multi-moment shape');
  assert(body.preview === true, 'search request must ask the server to evaluate admin preview');
  assert(document.body.textContent?.includes('Search deeper'), 'quick search must offer an explicit deeper search path');
}

async function playbackRaceAndSameTargetSeek() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('search-mastermind-resources', groups());
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  __vaultMock.enqueue('get-mastermind-playback-link', first.promise);
  __vaultMock.enqueue('get-mastermind-playback-link', second.promise);
  await mount();
  await typeAndSubmit('capacity');
  const watch = [...document.querySelectorAll<HTMLButtonElement>('button')].filter((node) => node.textContent?.includes('Watch answer'));
  await click(watch[0]);
  await click(watch[1]);
  second.resolve(nativePlayback('file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=newest.mp4', momentTwo, 90));
  await tick();
  first.resolve(nativePlayback('file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=stale.mp4', momentOne, 42));
  await tick();
  const video = document.querySelector<HTMLVideoElement>('video')!;
  assert(video.getAttribute('src')?.includes('newest.mp4'), 'stale playback must not overwrite newest target');
  const backLink = [...document.querySelectorAll<HTMLAnchorElement>('a')].find((node) => node.textContent?.includes('Back to search and library'));
  assert(backLink?.getAttribute('href') === '#vault-search-area', 'player must provide a return link to search and library');
  const shareLink = [...document.querySelectorAll<HTMLAnchorElement>('a')].find((node) => node.textContent?.includes('Share your takeaway'));
  assert(Boolean(shareLink?.getAttribute('href')?.includes('/communities/groups/mastermind/home')), 'takeaway prompt must link to the community');
  assert(document.body.textContent?.includes('Make this replay stick'), 'takeaway prompt must mount below the player');
  Object.defineProperty(video, 'duration', { configurable: true, value: 1200 });
  video.dispatchEvent(new Event('loadedmetadata'));
  await tick();
  assert(video.currentTime === 90, 'server-returned cue must be applied');
  video.currentTime = 300;
  __vaultMock.enqueue('get-mastermind-playback-link', nativePlayback('file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=newest.mp4', momentTwo, 90));
  const newestButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find((node) => node.getAttribute('aria-label')?.includes('1 minute 30 seconds'))!;
  await click(newestButton);
  assert(video.currentTime === 90, 'activating the same answer must seek back using an activation nonce');
}

async function nativeRecoveryHandlesSameAndNewUrlOnce() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('search-mastermind-resources', groups());
  __vaultMock.enqueue('get-mastermind-playback-link', nativePlayback());
  __vaultMock.enqueue('get-mastermind-playback-link', nativePlayback());
  await mount();
  await typeAndSubmit('capacity');
  await click(byText('Watch answer'));
  let video = document.querySelector<HTMLVideoElement>('video')!;
  Object.defineProperty(video, 'duration', { configurable: true, value: 1200 });
  Object.defineProperty(video, 'paused', { configurable: true, value: true });
  video.currentTime = 66;
  const generation = video.dataset.sourceGeneration;
  video.dispatchEvent(new Event('error'));
  await tick();
  video = document.querySelector<HTMLVideoElement>('video')!;
  assert(video.dataset.sourceGeneration !== generation, 'same URL refresh must force a new media source generation');
  Object.defineProperty(video, 'duration', { configurable: true, value: 1200 });
  video.dispatchEvent(new Event('loadedmetadata'));
  await tick();
  assert(video.currentTime === 66, 'same URL recovery must preserve position');
  video.dispatchEvent(new Event('error'));
  await tick();
  assert(__vaultMock.count('get-mastermind-playback-link') === 2, 'automatic recovery must be bounded to one retry');
  assert(document.body.textContent?.includes('Refresh video'), 'bounded failure must offer manual refresh');
  __vaultMock.enqueue('get-mastermind-playback-link', nativePlayback('file:///Users/faithhawks/Developer/Mastermind%20Scaling/worktrees/replay-vault-ux-r3/public/sounds/timer-complete.mp3?source=replaced.mp4'));
  await click(byText('Refresh video'));
  assert(document.querySelector('video')?.getAttribute('src')?.includes('replaced.mp4'), 'manual recovery must accept a new URL');
}

async function youtubeRecoveryIsHonest() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('search-mastermind-resources', groups());
  __vaultMock.enqueue('get-mastermind-playback-link', { data: { ...nativePlayback().data, provider: 'youtube', playbackUrl: 'about:blank' }, error: null });
  __vaultMock.setHandler('vault-member-library', ({body}: {body?: Record<string, unknown>}) => {
    if(body?.action==='transcript') return {data:{items:[{cueId:momentOne,cueIndex:0,startSeconds:42,endSeconds:70,text:'External player cue.'}],nextCursor:null},error:null};
    if(body?.action==='questions') return {data:{items:[],nextCursor:null},error:null};
    return {data:{items:[],categories:[],nextCursor:null},error:null};
  });
  await mount();
  await typeAndSubmit('capacity');
  await click(byText('Watch answer'));await tick();
  assert(document.body.textContent?.includes('Automatic playback recovery is not available for YouTube'), 'YouTube must explicitly disclose unsupported recovery');
  assert(document.body.textContent?.includes('Transcript timing cannot synchronize with this external player'), 'external transcript must disclose unsupported active tracking');
  assert(document.querySelectorAll('[data-vault-transcript] [aria-current="true"]').length===0,'YouTube/external playback must never expose an active cue');
}

async function semanticsAndReflow() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('search-mastermind-resources', groups('A very long answer title that must wrap without forcing the route wider than a phone viewport'));
  await mount();
  assert(document.querySelectorAll('main').length === 1, 'Layout must own the route’s single main landmark');
  assert(document.activeElement?.tagName === 'H1', 'route entry must focus the H1');
  await typeAndSubmit('capacity');
  const row = document.querySelector('[data-vault-result-row]')!;
  assert(row.getAttribute('aria-busy') === 'false', 'only a selected row may become busy');
  const viewportWidth = document.documentElement.clientWidth;
  assert([320, 360, 390].includes(viewportWidth), `mounted verifier requires an actual 320/360/390 viewport (observed ${viewportWidth})`);
  assert(document.documentElement.scrollWidth <= viewportWidth, `document overflows the ${viewportWidth}px viewport`);
  assert(document.body.scrollWidth <= viewportWidth, `body overflows the ${viewportWidth}px viewport`);
  const primaryControls = [document.querySelector('button[type="submit"]'), ...document.querySelectorAll('[data-vault-result-row] button')].filter(Boolean) as HTMLElement[];
  assert(primaryControls.length >= 3, 'expected search and answer primary controls for bounds proof');
  for (const control of primaryControls) {
    const rect = control.getBoundingClientRect();
    assert(rect.left >= 0 && rect.right <= viewportWidth, `primary control crosses the ${viewportWidth}px viewport`);
    assert(rect.width > 0 && rect.height >= 44, `primary control must remain visible and at least 44px tall at ${viewportWidth}px`);
  }
  const watch = byText('Watch answer')!;
  assert(watch.tagName === 'BUTTON' && (watch as HTMLButtonElement).type === 'button', 'answer activation must use native keyboard button semantics');
  assert(document.querySelector('[data-motion-safe]'), 'route must expose reduced-motion-safe behavior');
  const compiledCss=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText)}catch{return []}}).join(' ');
  assert(compiledCss.includes('prefers-reduced-motion: reduce')&&(compiledCss.includes('animation: none')||compiledCss.includes('animation-duration: 0.01ms')),'compiled CSS must disable animation under prefers-reduced-motion');
}


async function interactionReceiptsAreMountedAndPartialOutcomesHonest() {
  const attempt='55555555-5555-4555-8555-555555555555', bookmark='66666666-6666-4666-8666-666666666666', note='77777777-7777-4777-8777-777777777777';
  __vaultMock.reset();__vaultMock.enqueue('get-mastermind-portal-access',allowed);
  __vaultMock.enqueue('search-mastermind-resources',groups());
  __vaultMock.enqueue('get-mastermind-playback-link',nativePlayback());
  __vaultMock.enqueue('vault-member-interactions',{data:{data:{target:{resourceId,targetKind:'moment',targetId:momentOne,playbackAttemptId:attempt},bookmark:null,watch:{watchedSeconds:12,durationSeconds:60,lastPositionSeconds:12,completed:false}}},error:null});
  __vaultMock.enqueue('vault-member-interactions',{data:{data:{saved:true,changed:true,bookmarkId:bookmark,resourceId,targetKind:'moment',targetId:momentOne}},error:null});
  __vaultMock.enqueue('vault-member-interactions',{data:{data:{replayed:false,noteId:note,openPath:`/notes?page=${note}`,resourceId,targetKind:'moment',targetId:momentOne}},error:null});
  await mount();await typeAndSubmit('capacity');await click(byText('Watch answer'));await tick();await tick();
  assert(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='20',`real-shaped RPC watch receipt must mount as semantic progress; calls=${__vaultMock.count('vault-member-interactions')} last=${JSON.stringify(__vaultMock.lastBody('vault-member-interactions'))} body=${document.body.textContent}`);
  assert(document.body.textContent?.includes('Resume at 0:12'),'explicit honest resume must render');
  await click(byText('Save answer'));assert(document.body.textContent?.includes('Answer saved.'),'bookmark receipt must drive confirmed UI');
  await click(byText('Add note'));assert(document.querySelector<HTMLAnchorElement>('a[href^="/notes?page="]')?.getAttribute('href')===`/notes?page=${note}`,'exact note readback action must mount');
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}});
  await click(byText('Copy protected link'));assert(document.body.textContent?.includes('Copy unavailable'),'clipboard denial must be honest');
  const prior=window.open;window.open=()=>null;await click(byText('Open community'));assert(document.body.textContent?.includes('Community was not opened'),'popup blocked outcome must be independent');window.open=prior;
  assert(document.querySelectorAll('[role="status"]').length>=1,'status region required');
}


async function libraryRaceKeepsNewestIntent() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  const staleBrowse=deferred<any>();
  __vaultMock.setHandler('vault-member-library', async ({body}: {body?: Record<string, unknown>}) => {
    if(body?.action==='browse') return staleBrowse.promise;
    if(body?.action==='categories') return {data:{categories:[],nextCursor:null},error:null};
    if(body?.action==='questions') return {data:{items:[{questionId:questionOne,resourceId,title:'Newest questions replay',category:'Office hours',question:'Newest approved question?',answerSummary:'Newest answer.',answerer:'Faith',startSeconds:42,endSeconds:70}],nextCursor:null},error:null};
    return {data:{items:[],nextCursor:null},error:null};
  });
  await mount();
  await click(byText('questions'));
  await waitFor(()=>Boolean(document.body.textContent?.includes('Newest approved question?')),'newest Questions intent');
  staleBrowse.resolve({data:{items:[{resourceId,title:'STALE BROWSE MUST NOT RENDER',category:'Old',durationSeconds:10,publishedAt:null,questionCount:0}],nextCursor:null},error:null});
  await tick();await tick();
  assert(document.body.textContent?.includes('Newest approved question?')&&!document.body.textContent?.includes('STALE BROWSE MUST NOT RENDER'),'stale browse completion must not replace newer Questions intent');
}

async function parityDirectoriesAndReceiptsMount() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('vault-member-library', {data:{items:[{resourceId,title:'Recent canonical call',category:'Office hours',durationSeconds:1200,publishedAt:'2026-08-09T00:00:00Z',questionCount:2}]},error:null});
  __vaultMock.enqueue('vault-member-library', {data:{categories:[{category:'Office hours',resourceCount:1}]},error:null});
  await mount();await tick();
  assert(document.body.textContent?.includes('Recent canonical call'),'canonical browse and Recent Calls must mount');
  assert(document.body.textContent?.includes('Office hours (1)'),'authorized category directory must mount');
  const assertLibraryBounds=(label:string)=>{const viewportWidth=document.documentElement.clientWidth;const controls=[...document.querySelectorAll<HTMLElement>('[data-vault-library] button')];assert(controls.length>0,`${label} must expose library controls`);for(const control of controls){const rect=control.getBoundingClientRect();assert(rect.left>=0&&rect.right<=viewportWidth,`${label} control crosses the ${viewportWidth}px viewport`);assert(rect.width>0&&rect.height>=44,`${label} control must be visible and at least 44px at ${viewportWidth}px`);}};
  assertLibraryBounds('browse');
  __vaultMock.enqueue('vault-member-interactions',{data:{data:{saved:true,changed:true,bookmarkId:'66666666-6666-4666-8666-666666666666',resourceId,targetKind:'replay',targetId:null}},error:null});
  await click(byText('Save full video'));assert(document.body.textContent?.includes('Full replay saved.'),'full-video bookmark requires confirmed canonical receipt');
  __vaultMock.enqueue('vault-member-library',{data:{items:[{questionId:questionOne,resourceId,title:'Recent canonical call',category:'Office hours',question:'How do I protect capacity?',answerSummary:'Choose one priority.',answerer:'Faith',startSeconds:42,endSeconds:70}]},error:null});
  await click(byText('questions'));await tick();assert(document.body.textContent?.includes('How do I protect capacity?'),'standalone authorized Questions directory must mount');assertLibraryBounds('questions');
  __vaultMock.enqueue('vault-member-library',{data:{items:[{bookmarkId:'66666666-6666-4666-8666-666666666666',resourceId,title:'Recent canonical call',category:'Office hours',targetKind:'replay',targetId:null,startSeconds:0,savedAt:'2026-08-09T00:00:00Z',label:'Full replay'}]},error:null});
  await click(byText('saved'));await tick();assert(document.body.textContent?.includes('Remove everywhere'),'central Saved page must mount video/moment filter and removal control');assertLibraryBounds('saved');
  __vaultMock.enqueue('get-mastermind-playback-link',fullReplayPlayback);
  __vaultMock.enqueue('vault-member-library',{data:{items:[]},error:null});
  __vaultMock.enqueue('vault-member-library',{data:{items:[]},error:null});
  await click(byText('Open saved video'));await tick();await tick();
  const fullBody=__vaultMock.lastBody('get-mastermind-playback-link');
  assert(fullBody.resourceId===resourceId&&fullBody.momentId===null&&fullBody.questionId===null&&!('startSeconds'in fullBody),'Saved full video must reopen through resource-only authoritative playback');
  assert(document.body.textContent?.includes('Playing from the start'),`Saved full video must reopen at the canonical start: ${(document.body.textContent ?? '').slice(-500)}`);
  __vaultMock.enqueue('vault-member-interactions',{data:{data:{deleted:true,bookmarkId:'66666666-6666-4666-8666-666666666666'}},error:null});
  await click(byText('Remove everywhere'));assert(document.body.textContent?.includes('Removed everywhere from Saved.'),'remove-everywhere UI must be receipt-gated');
  const buttons=[...document.querySelectorAll<HTMLButtonElement>('button')].filter(b=>['browse','Answered questions','saved'].includes(b.textContent?.trim()||''));
  assert(buttons.length===3&&buttons.every(b=>b.getBoundingClientRect().height>=44),'parity navigation must keep 44px targets');
}


const pageUuid=(index:number)=>`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
const browsePage=(count:number,label:string,offset=0)=>Array.from({length:count},(_,index)=>({resourceId:`replay-${label}-${offset+index}`,title:`${label} browse row ${offset+index}`,category:'Office hours',durationSeconds:1200,publishedAt:null,questionCount:1}));
const categoryPage=(count:number,label:string,offset=0)=>Array.from({length:count},(_,index)=>({category:`${label} category ${offset+index}`,resourceCount:1}));
const questionPage=(count:number,label:string,offset=0)=>Array.from({length:count},(_,index)=>({questionId:pageUuid(1000+offset+index),resourceId,title:`${label} questions replay`,category:'Office hours',question:`${label} question row ${offset+index}?`,answerSummary:'Approved answer.',answerer:'Faith',startSeconds:42+index,endSeconds:43+index}));
const savedPage=(count:number,label:string,offset=0)=>Array.from({length:count},(_,index)=>({bookmarkId:pageUuid(2000+offset+index),resourceId,title:`${label} saved row ${offset+index}`,category:'Office hours',targetKind:'replay',targetId:null,startSeconds:0,savedAt:null,label:'Full replay'}));

async function mountedPaginationAllLibrarySurfaces() {
  __vaultMock.reset();__vaultMock.enqueue('get-mastermind-portal-access',allowed);
  __vaultMock.setHandler('vault-member-library',({body}: {body?: Record<string,unknown>})=>{
    if(body?.action==='browse') return body.cursor==='browse_next'?{data:{items:browsePage(1,'Terminal',20),nextCursor:null},error:null}:{data:{items:browsePage(20,'First'),nextCursor:'browse_next'},error:null};
    if(body?.action==='categories') return body.cursor==='category_next'?{data:{categories:categoryPage(1,'Terminal',60),nextCursor:null},error:null}:{data:{categories:categoryPage(60,'First'),nextCursor:'category_next'},error:null};
    if(body?.action==='questions') return body.cursor==='question_next'?{data:{items:questionPage(1,'Terminal',40),nextCursor:null},error:null}:{data:{items:questionPage(40,'First'),nextCursor:'question_next'},error:null};
    if(body?.action==='saved') return body.cursor==='saved_next'?{data:{items:savedPage(1,'Terminal',40),nextCursor:null},error:null}:{data:{items:savedPage(40,'First'),nextCursor:'saved_next'},error:null};
    throw new Error(`unexpected pagination request ${JSON.stringify(body)}`);
  });
  await mount();await waitFor(()=>Boolean(document.body.textContent?.includes('First browse row 19')),'browse first producer page');
  assert(document.querySelectorAll('[data-vault-library] button').length>0&&document.body.textContent?.includes('Watch full replay'),'browse must mount returned rows and primary CTA');
  await click(byText('Load more categories'));await waitFor(()=>Boolean(document.body.textContent?.includes('Terminal category 60')),'category terminal page');
  assert(__vaultMock.lastBody('vault-member-library').action==='categories'&&__vaultMock.lastBody('vault-member-library').cursor==='category_next'&&__vaultMock.lastBody('vault-member-library').limit===60,'categories continuation envelope must carry explicit cursor and limit');
  await click(byText('Load more'));await waitFor(()=>Boolean(document.body.textContent?.includes('Terminal browse row 20')),'browse terminal page');
  assert(__vaultMock.lastBody('vault-member-library').action==='browse'&&__vaultMock.lastBody('vault-member-library').cursor==='browse_next'&&__vaultMock.lastBody('vault-member-library').limit===20,'browse continuation envelope must carry explicit cursor and limit');
  assert(!byText('Load more'),'browse terminal response must remove continuation CTA');
  await click(byText('questions'));await waitFor(()=>Boolean(document.body.textContent?.includes('First question row 39?')),'questions first producer page');
  await click(byText('Load more'));await waitFor(()=>Boolean(document.body.textContent?.includes('Terminal question row 40?')),'questions terminal page');
  assert(__vaultMock.lastBody('vault-member-library').action==='questions'&&__vaultMock.lastBody('vault-member-library').cursor==='question_next'&&__vaultMock.lastBody('vault-member-library').limit===40,'standalone Questions continuation envelope must be exact');
  assert(document.body.textContent?.includes('Watch answer at')&&!byText('Load more'),'Questions must mount unique returned row/CTA and stop at terminal page');
  await click(byText('saved'));await waitFor(()=>Boolean(document.body.textContent?.includes('First saved row 39')),'Saved first producer page');
  await click(byText('Load more'));await waitFor(()=>Boolean(document.body.textContent?.includes('Terminal saved row 40')),'Saved terminal page');
  assert(__vaultMock.lastBody('vault-member-library').action==='saved'&&__vaultMock.lastBody('vault-member-library').cursor==='saved_next'&&__vaultMock.lastBody('vault-member-library').limit===40&&__vaultMock.lastBody('vault-member-library').filter==='all','Saved continuation envelope must be exact');
  assert(document.body.textContent?.includes('Open saved video')&&!byText('Load more'),'Saved must mount unique returned row/CTA and stop at terminal page');

  __vaultMock.reset();__vaultMock.enqueue('get-mastermind-portal-access',allowed);
  __vaultMock.setHandler('vault-member-library',({body}: {body?: Record<string,unknown>})=>{
    if(body?.action==='browse')return {data:{items:browsePage(20,'Exact'),nextCursor:null},error:null};
    if(body?.action==='categories')return {data:{categories:categoryPage(60,'Exact'),nextCursor:null},error:null};
    if(body?.action==='questions')return {data:{items:questionPage(40,'Exact'),nextCursor:null},error:null};
    if(body?.action==='saved')return {data:{items:savedPage(40,'Exact'),nextCursor:null},error:null};
    throw new Error(`unexpected exact-multiple request ${JSON.stringify(body)}`);
  });
  await mount();await waitFor(()=>Boolean(document.body.textContent?.includes('Exact browse row 19')),'browse exact multiple');
  assert(!byText('Load more')&&!byText('Load more categories'),'exact-multiple browse/categories must not invent continuation');
  await click(byText('questions'));await waitFor(()=>Boolean(document.body.textContent?.includes('Exact question row 39?')),'questions exact multiple');assert(!byText('Load more'),'exact-multiple Questions must not invent continuation');
  await click(byText('saved'));await waitFor(()=>Boolean(document.body.textContent?.includes('Exact saved row 39')),'Saved exact multiple');assert(!byText('Load more'),'exact-multiple Saved must not invent continuation');
}

async function fullTranscriptAndCallQuestionsMount() {
  __vaultMock.reset();__vaultMock.enqueue('get-mastermind-portal-access',allowed);
  const transcriptPageOne=Array.from({length:100},(_,index)=>({cueId:index===0?momentOne:index===1?momentTwo:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,cueIndex:index,startSeconds:index===0?42:index===1?90:100+index*5,endSeconds:index===0?70:index===1?99:104+index*5,text:index===0?'Complete authorized transcript cue.':index===1?'Second authorized cue.':`Authorized cue ${index}.`}));
  __vaultMock.setHandler('vault-member-library',({body}: {body?: Record<string, unknown>})=>{
    if(body?.action==='browse')return {data:{items:[]},error:null};
    if(body?.action==='categories')return {data:{categories:[]},error:null};
    if(body?.action==='questions'&&body?.resourceId===resourceId&&!body?.cursor)return {data:{items:[{questionId:questionOne,resourceId,title:'Answer replay',category:'Office hours',question:'What is capacity?',answerSummary:'Protect it.',answerer:'Faith',startSeconds:42,endSeconds:70},...questionPage(59,'Call first',1)],nextCursor:'call_questions_next'},error:null};
    if(body?.action==='questions'&&body?.resourceId===resourceId&&body?.cursor==='call_questions_next')return {data:{items:questionPage(1,'Call terminal',60),nextCursor:null},error:null};
    if(body?.action==='transcript'&&!body?.cursor)return {data:{items:transcriptPageOne,nextCursor:'eyJhZnRlckluZGV4Ijo5OX0'},error:null};
    if(body?.action==='transcript'&&body?.cursor==='eyJhZnRlckluZGV4Ijo5OX0')return {data:{items:[{cueId:'00000000-0000-4000-8000-000000000100',cueIndex:100,startSeconds:500,endSeconds:504,text:'Authorized cue beyond first page.'}],nextCursor:null},error:null};
    throw new Error(`Unexpected library action ${JSON.stringify(body)}`);
  });
  __vaultMock.enqueue('search-mastermind-resources',groups());__vaultMock.enqueue('get-mastermind-playback-link',nativePlayback());
  await mount();await typeAndSubmit('capacity');await click(byText('Watch answer'));await tick();await tick();
  await waitFor(()=>__vaultMock.count('vault-member-library')>=5&&Boolean(document.body.textContent?.includes('Authorized cue beyond first page.')),'terminal transcript page');
  assert(document.body.textContent?.includes('Questions answered in this call'),'call-level questions index must mount');
  assert(document.body.textContent?.includes('Complete authorized transcript cue.'),'full authorized transcript must mount');
  assert(document.body.textContent?.includes('Authorized cue beyond first page.'),`full transcript must render records beyond the 100-cue server page cap; calls=${__vaultMock.count('vault-member-library')} last=${JSON.stringify(__vaultMock.lastBody('vault-member-library'))}`);
  assert(__vaultMock.count('vault-member-library')===5&&__vaultMock.lastBody('vault-member-library').cursor==='eyJhZnRlckluZGV4Ijo5OX0','transcript consumer must request the terminal page with an opaque canonical cue cursor');
  assert(document.body.textContent?.includes('What is capacity?'),'call-level Questions proof must render the real questions action response, not only the static section heading');
  await click(byText('Load more questions'));await waitFor(()=>Boolean(document.body.textContent?.includes('Call terminal question row 60?')),'call Questions terminal page');
  const callBody=__vaultMock.lastBody('vault-member-library');assert(callBody.action==='questions'&&callBody.resourceId===resourceId&&callBody.cursor==='call_questions_next'&&callBody.limit===60,'call Questions must preserve resource, cursor, and limit envelope');assert(!byText('Load more questions'),'call Questions terminal page must remove continuation CTA');
  const cue=[...document.querySelectorAll<HTMLButtonElement>('[data-vault-transcript] button')].find(b=>b.textContent?.includes('Second authorized cue'))!;
  __vaultMock.enqueue('get-mastermind-playback-link',nativePlayback(undefined,momentTwo,90));await click(cue);await tick();
  const body=__vaultMock.lastBody('get-mastermind-playback-link');assert(body.momentId===momentTwo&&body.questionId===null&&!('startSeconds'in body),'transcript seek must send only durable cue identity, never caller timestamp');
  const media=document.querySelector('video')!;await act(async()=>{media.currentTime=90;media.dispatchEvent(new window.Event('timeupdate'));});await tick();
  let currentCues=[...document.querySelectorAll('[data-vault-transcript] [aria-current="true"]')];
  assert(currentCues.length===1&&currentCues[0].textContent?.includes('Second authorized cue.'),`exactly one time-active transcript cue must expose aria-current; found=${currentCues.length}`);
  for (const [time,label] of [[0,'before first cue'],[80,'gap between cues'],[99,'exclusive cue end'],[5000,'after final cue']] as const) {
    await act(async()=>{media.currentTime=time;media.dispatchEvent(new window.Event('timeupdate'));});await tick();
    currentCues=[...document.querySelectorAll('[data-vault-transcript] [aria-current="true"]')];
    assert(currentCues.length===0,`${label} must expose no aria-current cue; found=${currentCues.length}`);
  }

  __vaultMock.reset();__vaultMock.enqueue('get-mastermind-portal-access',allowed);
  const exactTranscript=Array.from({length:100},(_,index)=>({cueId:pageUuid(5000+index),cueIndex:index,startSeconds:index*5,endSeconds:index*5+4,text:`Exact transcript cue ${index}.`}));
  __vaultMock.setHandler('vault-member-library',({body}: {body?: Record<string,unknown>})=>{
    if(body?.action==='browse')return {data:{items:[],nextCursor:null},error:null};
    if(body?.action==='categories')return {data:{categories:[],nextCursor:null},error:null};
    if(body?.action==='questions'&&body?.resourceId===resourceId)return {data:{items:questionPage(60,'Exact call'),nextCursor:null},error:null};
    if(body?.action==='transcript')return {data:{items:exactTranscript,nextCursor:null},error:null};
    throw new Error(`Unexpected exact transcript request ${JSON.stringify(body)}`);
  });
  __vaultMock.enqueue('search-mastermind-resources',groups());__vaultMock.enqueue('get-mastermind-playback-link',nativePlayback());
  await mount();await typeAndSubmit('capacity');await click(byText('Watch answer'));await waitFor(()=>Boolean(document.body.textContent?.includes('Exact transcript cue 99.')),'exact-multiple transcript');
  assert(document.querySelectorAll('[data-vault-transcript] li').length===100,'exact-multiple transcript must mount all 100 producer rows');
  assert(!byText('Load more questions'),'exact-multiple call Questions must not invent continuation');
  const exactCalls=__vaultMock.bodies('vault-member-library');
  assert(exactCalls.filter((body)=>body.action==='transcript').length===1&&exactCalls.filter((body)=>body.action==='questions'&&body.resourceId===resourceId).length===1,'exact-multiple transcript and call Questions must make exactly one request each');
}

async function run() {
  const tests = [malformedAccessIsUnavailable, producerAccessStatesStayDistinct, accessRaceKeepsNewestIntent, deepLinkIsBoundedAndRetryExplicit, searchRaceKeepsNewestIntent, playbackRaceAndSameTargetSeek, nativeRecoveryHandlesSameAndNewUrlOnce, youtubeRecoveryIsHonest, semanticsAndReflow, interactionReceiptsAreMountedAndPartialOutcomesHonest, libraryRaceKeepsNewestIntent, parityDirectoriesAndReceiptsMount, mountedPaginationAllLibrarySurfaces, fullTranscriptAndCallQuestionsMount];
  const passed: string[] = [];
  for (const test of tests) { await test(); passed.push(test.name); }
  document.body.innerHTML = `<pre id="test-report" data-status="pass">${passed.join('\n')}</pre>`;
}

run().catch((error) => {
  document.body.innerHTML = `<pre id="test-report" data-status="fail">${String(error?.stack ?? error)}</pre>`;
});
