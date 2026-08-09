#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

const forbiddenGroups = [
  {
    label: 'hidden video-search development UI',
    patterns: [
      'MastermindVideoSearch',
      'YOUTUBE_TEST_VIDEOS',
      'transcriptPreview',
      'transcriptWordCount',
      'YouTube auto-captions',
      'Video Search',
    ],
  },
  {
    label: 'private storage, transcript, and database internals',
    patterns: [
      'search_mastermind_portal_resources',
      'portal_playback_source',
      'mastermind_portal_transcript_segments',
      'mastermind_portal_source_evidence',
      'DROPBOX_ACCESS_TOKEN',
      'transcript_text',
      'transcript_source',
      'dropbox_path',
      'ghl_video_url',
      'bunny_video_id',
      'youtube_video_id',
      'source_fingerprint',
      'match_score',
    ],
  },
  {
    label: 'restricted member action/source strings',
    patterns: [
      '055e3875',
      'hub-3pwl3413w2',
      'primaryAction:"Open Vault"',
      'primaryAction:"Open Sprint"',
      "label: 'Vault'",
      'Mapped resources',
    ],
  },
  {
    label: 'internal audit/source copy in member-facing bundle',
    patterns: [
      'local audit',
      'transcripts matched',
      'transcript backfill',
      'Video URLs',
      'source records',
      'Content Repurpose',
      'Dropbox',
      'dropbox',
      'Bunny Stream',
      'bunnycdn',
      'full transcripts',
      'client bundle',
      'server-side search',
    ],
  },
];

const requiredMastermindHubStrings = [
  'Success Path',
  'Resource finder',
  'Visible resources',
  'Indexed now',
  'Access labels',
  'Choose the smallest useful next resource',
  'Bonus and vault items stay out of this finder',
  'Clear resource search',
  'Enable Faith AI',
];

function walkFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function isSearchableTextFile(filePath) {
  const relativePath = path.relative(distDir, filePath);
  const extension = path.extname(filePath);
  return (
    relativePath === 'index.html' ||
    extension === '.js' ||
    extension === '.css' ||
    extension === '.json' ||
    extension === '.webmanifest' ||
    extension === '.svg' ||
    extension === '.html'
  );
}

function findMatches(files, patterns) {
  const matches = [];

  for (const filePath of files) {
    if (!isSearchableTextFile(filePath)) continue;
    const text = readFileSync(filePath, 'utf8');
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        matches.push({
          file: path.relative(projectRoot, filePath),
          pattern,
        });
      }
    }
  }

  return matches;
}

function findMastermindHubBundle(files) {
  return files.find((filePath) => path.basename(filePath).startsWith('MastermindHub-') && filePath.endsWith('.js'));
}

assert.ok(existsSync(distDir), 'dist directory does not exist; run `npm run build` before `npm run verify:mastermind-bundle`');
assert.ok(statSync(distDir).isDirectory(), 'dist path exists but is not a directory');

const files = walkFiles(distDir);
assert.ok(files.length > 0, 'dist directory is empty');

const videoSearchChunks = files
  .map((filePath) => path.basename(filePath))
  .filter((fileName) => fileName.startsWith('MastermindVideoSearch-') && fileName.endsWith('.js'));
assert.deepEqual(videoSearchChunks, [], 'Video Search chunk should not be emitted while VITE_ENABLE_MASTERMIND_VIDEO_SEARCH is off');

for (const group of forbiddenGroups) {
  const matches = findMatches(files, group.patterns);
  assert.deepEqual(
    matches,
    [],
    `${group.label} should not appear in production dist: ${JSON.stringify(matches, null, 2)}`
  );
}

const mastermindHubBundle = findMastermindHubBundle(files);
assert.ok(mastermindHubBundle, 'expected a built MastermindHub chunk in dist/assets');

const mastermindHubText = readFileSync(mastermindHubBundle, 'utf8');
for (const requiredString of requiredMastermindHubStrings) {
  assert.ok(
    mastermindHubText.includes(requiredString),
    `MastermindHub bundle missing expected member-facing string: ${requiredString}`
  );
}

console.log('mastermind production bundle verifier passed');
