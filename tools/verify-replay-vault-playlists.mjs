#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findVaultPlaylist, VAULT_PLAYLISTS } from '../src/components/replay-vault/vaultPlaylists.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = fs.readFileSync(path.join(root, 'src/components/replay-vault/VaultCuratedPlaylists.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/ReplayVault.tsx'), 'utf8');

assert.equal(VAULT_PLAYLISTS.length, 10, 'launch shelf must stay focused at ten collections');
assert.equal(new Set(VAULT_PLAYLISTS.map((item) => item.slug)).size, 10, 'playlist slugs must be unique');
for (const playlist of VAULT_PLAYLISTS) {
  assert.ok(playlist.title.length > 8 && playlist.description.length > 24 && playlist.query.length > 8, `playlist ${playlist.slug} needs useful member copy and a search query`);
}
assert.equal(findVaultPlaylist('start-here')?.title, 'Start Here: Best of the Vault');
assert.equal(findVaultPlaylist('missing'), null);
assert.doesNotMatch(component, /search-mastermind-resources/, 'collections must not wire hidden search outside the protected Vault page');
assert.match(component, /onSearchPlaylist/, 'collections must use the protected page-owned search surface');
assert.match(page, /search-mastermind-resources/, 'member Vault page must own the entitlement-aware search call');
assert.match(page, /momentsPerReplay: 1/, 'collection results should stay compact');
assert.match(component, /if \(own !== requestGeneration\.current\) return/, 'stale playlist responses must be discarded');
assert.match(component, /Your access has not changed/, 'transport errors must not be presented as entitlement loss');
assert.match(page, /<VaultCuratedPlaylists onOpen=\{handleOpen\} onSearchPlaylist=\{handleCuratedPlaylistSearch\} \/>/, 'member Vault must mount curated collections through the protected page search owner');

console.log('Replay Vault curated playlist UI gate passed: 10 focused collections, protected search integration, stale-response guard, and member-safe errors.');
