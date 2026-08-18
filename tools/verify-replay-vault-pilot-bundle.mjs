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
    env: { ...process.env, VITE_REPLAY_VAULT_PILOT: 'true' },
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
  for (const required of ['Recommended for your plan', 'annual-goals', 'TFake8oGWXQ']) {
    assert.equal(combined.includes(required), true, `pilot build is missing required selected content: ${required}`);
  }
  const pilotAssets = assets.filter((asset) => asset.text.includes('Recommended for your plan'));
  assert.equal(pilotAssets.length, 1, 'pilot UI should live in exactly one lazy browser asset');
  console.log(`Replay Vault pilot compiled privacy gate passed: ${excluded.length} excluded records absent; selected pilot asset ${path.basename(pilotAssets[0].path)}.`);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
