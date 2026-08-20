#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/data/mastermindVideoLibrary.ts'), 'utf8');
const marker = 'export const YOUTUBE_TEST_VIDEOS: MastermindVideo[] = ';
const start = source.indexOf('[', source.indexOf(marker) + marker.length);
const end = source.indexOf('\n];', start) + 2;
const library = JSON.parse(source.slice(start, end));
const excludedIds = new Set(['business-unstuck', 'offers-visibility-confidence', 'business-without-hustle']);
const excluded = library.filter((video) => excludedIds.has(video.id));
assert.equal(excluded.length, 3, 'all excluded privacy-sensitive fixtures must remain covered');

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-vault-pilot-bundle-'));
try {
  const build = spawnSync('npx', ['vite', 'build', '--outDir', outDir], {
    cwd: root,
    env: {
      ...process.env,
      VITE_REPLAY_VAULT_PILOT: 'true',
      VITE_ENABLE_MASTERMIND_VIDEO_SEARCH: 'true',
    },
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(build.status, 0, `pilot build failed:\n${build.stdout}\n${build.stderr}`);
  const assets = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(?:js|html|json)$/i.test(entry.name)) assets.push({ path: target, text: fs.readFileSync(target, 'utf8') });
    }
  };
  walk(outDir);
  const combined = assets.map((asset) => asset.text).join('\n');
  for (const video of excluded) {
    const forbidden = [video.id, video.videoId, video.title, video.transcript.slice(0, 160)];
    for (const sentinel of forbidden) {
      assert.equal(combined.includes(sentinel), false, `excluded pilot content leaked into browser build: ${video.id} / ${sentinel.slice(0, 60)}`);
    }
  }
  for (const forbidden of ['Recommended for your plan', 'annual-goals', 'TFake8oGWXQ', 'REPLAY_VAULT_PILOT_VIDEOS']) {
    assert.equal(combined.includes(forbidden), false, `retired static pilot content leaked into production browser build: ${forbidden}`);
  }
  const pilotAssets = assets.filter((asset) => asset.text.includes('Recommended for your plan'));
  assert.equal(pilotAssets.length, 0, 'retired static pilot UI must not exist in any production browser asset');
  console.log(`Replay Vault compiled privacy gate passed: ${excluded.length} privacy-sensitive fixtures and all retired static pilot sentinels are absent.`);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
