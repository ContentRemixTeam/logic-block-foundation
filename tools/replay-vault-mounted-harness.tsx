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
const limited = { data: accessPayload({ memberTier: 'monthly', memberScopes: ['core_curriculum', 'current_replay_30_day'] }), error: null };
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

async function malformedAccessIsUnavailable() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', { data: {}, error: null });
  await mount();
  assert(document.body.textContent?.includes('Access check unavailable'), 'malformed 2xx access must be unavailable');
  assert(!document.body.textContent?.includes('Replay access not included'), 'malformed 2xx must not claim denial');
}

async function producerAccessStatesStayDistinct() {
  for (const [fixture, expected, forbidden] of [
    [allowed, 'Full Replay Vault', 'Access check unavailable'],
    [limited, 'Current replays', 'Access check unavailable'],
    [denied, 'Replay access not included', 'Access check unavailable'],
    [launchDisabled, 'Replay Vault is not open yet', 'Replay access not included'],
    [pilotExcluded, 'Replay Vault is not open yet', 'Replay access not included'],
  ] as const) {
    __vaultMock.reset();
    __vaultMock.enqueue('get-mastermind-portal-access', fixture);
    await mount();
    assert(document.body.textContent?.includes(expected), `producer access fixture must render ${expected}`);
    assert(!document.body.textContent?.includes(forbidden), `producer access fixture must not render ${forbidden}`);
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
  assert(body.responseShape === 'grouped_moments_v1' && body.momentsPerReplay === 8, 'search must request authoritative grouped multi-moment shape');
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
  assert(video.querySelector('source')?.getAttribute('src')?.includes('newest.mp4'), 'stale playback must not overwrite newest target');
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
  assert(document.querySelector('source')?.getAttribute('src')?.includes('replaced.mp4'), 'manual recovery must accept a new URL');
}

async function youtubeRecoveryIsHonest() {
  __vaultMock.reset();
  __vaultMock.enqueue('get-mastermind-portal-access', allowed);
  __vaultMock.enqueue('search-mastermind-resources', groups());
  __vaultMock.enqueue('get-mastermind-playback-link', { data: { ...nativePlayback().data, provider: 'youtube', playbackUrl: 'about:blank' }, error: null });
  await mount();
  await typeAndSubmit('capacity');
  await click(byText('Watch answer'));
  assert(document.body.textContent?.includes('Automatic playback recovery is not available for YouTube'), 'YouTube must explicitly disclose unsupported recovery');
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

async function run() {
  const tests = [malformedAccessIsUnavailable, producerAccessStatesStayDistinct, accessRaceKeepsNewestIntent, deepLinkIsBoundedAndRetryExplicit, searchRaceKeepsNewestIntent, playbackRaceAndSameTargetSeek, nativeRecoveryHandlesSameAndNewUrlOnce, youtubeRecoveryIsHonest, semanticsAndReflow, interactionReceiptsAreMountedAndPartialOutcomesHonest];
  const passed: string[] = [];
  for (const test of tests) { await test(); passed.push(test.name); }
  document.body.innerHTML = `<pre id="test-report" data-status="pass">${passed.join('\n')}</pre>`;
}

run().catch((error) => {
  document.body.innerHTML = `<pre id="test-report" data-status="fail">${String(error?.stack ?? error)}</pre>`;
});
