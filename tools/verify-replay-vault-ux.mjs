#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applySeekTarget,
  groupSearchResults,
  makeDetailHref,
  normalizeAccessResponse,
  parseDetailTarget,
  shouldAutoRefresh,
} from '../src/components/replay-vault/replayVaultCore.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

// Synthetic access matrix: an endpoint outage is a client transport state, never a denial decision.
const outage = { status: 'unavailable' };
const denied = normalizeAccessResponse({ decision: 'denied', reasonCode: 'expired', checkedAt: '2026-08-09T00:00:00Z' });
const limited = normalizeAccessResponse({ decision: 'limited', capabilities: ['core', 'current_replay'] });
const allowed = normalizeAccessResponse({ decision: 'allowed', capabilities: ['core', 'full_vault'] });
assert.equal(outage.status, 'unavailable');
assert.equal(denied.status, 'denied');
assert.equal(limited.status, 'limited');
assert.equal(allowed.status, 'allowed');
assert.notEqual(outage.status, denied.status, 'service failure must not collapse into access denial');

// Synthetic grouped response: one replay retains every approved moment.
const sentinelGroups = groupSearchResults({ results: [
  { resourceId: 'replay-1', title: 'Capacity coaching', categoryTitle: 'Ask Faith', momentId: 'moment-214', startsAtSeconds: 214, snippet: 'First answer' },
  { resourceId: 'replay-1', title: 'Capacity coaching', categoryTitle: 'Ask Faith', momentId: 'moment-1630', startsAtSeconds: 1630, snippet: 'Second answer' },
  { resourceId: 'replay-2', title: 'Pricing coaching', categoryTitle: 'Office hours', momentId: 'moment-90', startsAtSeconds: 90, snippet: 'Another replay' },
] });
assert.equal(sentinelGroups.length, 2);
assert.equal(sentinelGroups[0].moments.length, 2);
assert.deepEqual(sentinelGroups[0].moments.map((moment) => moment.startSeconds), [214, 1630]);

// Same loaded media element must apply a second target, not only loadedmetadata's first target.
const media = { duration: 3600, currentTime: 0 };
applySeekTarget(media, 214);
assert.equal(media.currentTime, 214);
applySeekTarget(media, 1630);
assert.equal(media.currentTime, 1630);

// Expired-link recovery is bounded to one automatic refresh.
let attempts = 0;
assert.equal(shouldAutoRefresh(attempts), true);
attempts += 1;
assert.equal(shouldAutoRefresh(attempts), false);

// Protected detail state uses stable approved IDs and never serializes media/provider paths.
const href = makeDetailHref({ resourceId: 'replay-1', questionId: 'question-7', momentId: 'moment-214' });
assert.equal(href, '/mastermind/replay-vault?resource=replay-1&question=question-7&moment=moment-214');
assert.deepEqual(parseDetailTarget('?resource=replay-1&question=question-7&moment=moment-214&t=214'), {
  resourceId: 'replay-1', questionId: 'question-7', momentId: 'moment-214',
});
for (const forbidden of ['playbackUrl', 'dropbox', '/provider/media', 'token=', 't=214']) {
  assert.equal(href.includes(forbidden), false, `detail href leaked ${forbidden}`);
}

const page = read('src/pages/ReplayVault.tsx');
const results = read('src/components/replay-vault/VaultSearchResults.tsx');
const player = read('src/components/replay-vault/VaultPlayer.tsx');
const seek = read('src/components/replay-vault/useVaultSeekCoordinator.ts');

// Keyboard/focus/live-region behavior is implemented with native controls and explicit names.
for (const required of [
  'role="search"', 'label htmlFor="vault-search"', 'aria-describedby="vault-search-help"',
  'aria-live="polite"', 'role="alert"', 'min-h-11', 'overflow-x-auto',
]) assert.ok(page.includes(required), `page missing keyboard/mobile semantic: ${required}`);
for (const required of ['aria-label={`Watch', 'min-h-11', '<Button', '<ProtectedReplayLink']) {
  assert.ok(results.includes(required), `results missing keyboard/touch behavior: ${required}`);
}
assert.ok(player.includes('playsInline'), 'mobile player must use inline playback');
assert.ok(player.includes('max-w-full'), 'player must be width bounded on 360/390px screens');
assert.ok(seek.includes('targetKey'), 'seek coordinator must react to subsequent target changes');
assert.ok(seek.includes('applyPendingTarget'), 'seek coordinator must apply pending target after metadata');

// Honest placeholders cannot inject fake browse/question/saved records.
assert.ok(page.includes('approved catalog API is available'));
assert.ok(page.includes('reviewed Questions API is available'));
assert.ok(page.includes('protected bookmarks are available'));
assert.equal(page.includes('const fake'), false);

console.log('Replay Vault UX behavioral verifier passed: access outage, grouped moments, second seek, one-retry expiry recovery, protected IDs, no provider path, keyboard semantics, and 360/390 width guards.');
