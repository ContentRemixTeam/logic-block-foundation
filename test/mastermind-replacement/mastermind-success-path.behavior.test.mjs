import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';

let model;
let temporaryDirectory;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'mastermind-model-'));
  const outputFile = path.join(temporaryDirectory, 'mastermindSuccessPath.mjs');
  await build({
    entryPoints: ['src/lib/mastermindSuccessPath.ts'],
    outfile: outputFile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  model = await import(pathToFileURL(outputFile));
});

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function cycle(details = {}) {
  return {
    cycle_id: 'cycle-1',
    goal: 'Build a durable revenue system',
    start_date: '2026-08-01',
    end_date: '2026-10-31',
    focus_area: 'ignored keyword sell launch nurture',
    biggest_bottleneck: 'ignored keyword leverage',
    discover_score: 1,
    nurture_score: 99,
    convert_score: 4,
    audience_target: null,
    audience_frustration: null,
    signature_message: null,
    why: null,
    low_energy_version: 'Send one invitation.',
    medium_energy_version: null,
    high_energy_version: null,
    planner_payload: { details },
    updated_at: null,
  };
}

function provenThrough(stage) {
  const stages = {
    offer: {},
    find: {
      offers: [{ name: 'Offer' }],
      leadPlatform: 'Podcast',
      leadFrequency: 'Weekly',
      leadCommitted: true,
    },
    nurture: {
      offers: [{ name: 'Offer' }],
      leadPlatform: 'Podcast',
      leadFrequency: 'Weekly',
      leadCommitted: true,
      nurtureMethod: 'Email',
      freeTransformation: 'Make the first decision',
    },
    sell: {
      offers: [{ name: 'Offer' }],
      leadPlatform: 'Podcast',
      leadFrequency: 'Weekly',
      leadCommitted: true,
      nurtureMethod: 'Email',
      freeTransformation: 'Make the first decision',
      revenueGoal: '10000',
      launchSchedule: 'September',
    },
    deliver: {
      offers: [{ name: 'Offer' }],
      leadPlatform: 'Podcast',
      leadFrequency: 'Weekly',
      leadCommitted: true,
      nurtureMethod: 'Email',
      freeTransformation: 'Make the first decision',
      revenueGoal: '10000',
      launchSchedule: 'September',
      proofMethods: ['survey'],
      metric1Name: 'First win',
    },
    leverage: {
      offers: [{ name: 'Offer' }],
      leadPlatform: 'Podcast',
      leadFrequency: 'Weekly',
      leadCommitted: true,
      nurtureMethod: 'Email',
      freeTransformation: 'Make the first decision',
      revenueGoal: '10000',
      launchSchedule: 'September',
      proofMethods: ['survey'],
      metric1Name: 'First win',
      recurringTasks: [{ name: 'Follow up' }],
      projects: [{ name: 'Systemize' }],
    },
  };
  return stages[stage];
}

function inputForExpectedStage(stage) {
  const details = provenThrough('leverage');
  const missingEvidence = {
    offer: ['offers'],
    find: ['leadPlatform'],
    nurture: ['nurtureMethod', 'nurturePlatforms'],
    sell: ['revenueGoal'],
    deliver: ['proofMethods'],
    leverage: ['recurringTasks'],
  }[stage];
  for (const key of missingEvidence) delete details[key];
  const input = cycle(details);
  input.audience_target = 'Consultants';
  input.audience_frustration = 'Inconsistent sales';
  return input;
}

test('routes to the first unproven stage for several evidence states', () => {
  for (const expected of ['offer', 'find', 'nurture', 'sell', 'deliver', 'leverage']) {
    const input = inputForExpectedStage(expected);
    assert.equal(model.inferMastermindSuccessPath(input).stageId, expected);
  }
});

test('keywords, bottleneck copy, and diagnostic scores do not change routing', () => {
  const input = cycle(provenThrough('nurture'));
  input.audience_target = 'Consultants';
  input.audience_frustration = 'Inconsistent sales';
  const expected = model.inferMastermindSuccessPath(input).stageId;
  input.focus_area = 'leverage deliver sell offer find nurture';
  input.biggest_bottleneck = 'offer';
  input.discover_score = 100;
  input.nurture_score = -1;
  input.convert_score = 999;
  assert.equal(model.inferMastermindSuccessPath(input).stageId, expected);
});

test('manifest is exactly 24 unique honest Gap slots, four per stage', () => {
  const manifest = model.MASTERMIND_CURRICULUM_MANIFEST;
  assert.equal(manifest.length, 24);
  assert.equal(new Set(manifest.map((slot) => slot.id)).size, 24);
  for (const slot of manifest) {
    assert.equal(slot.status, 'Gap');
    assert.equal(slot.resourceId, null);
  }
  for (const stage of model.MASTERMIND_STAGE_ORDER) {
    assert.equal(manifest.filter((slot) => slot.stageId === stage).length, 4);
  }
});

test('server catalog seed matches every imported TypeScript manifest field', async () => {
  const migration = await readFile('supabase/migrations/20260811120000_mastermind_planner_replacement.sql', 'utf8');
  const rowPattern = /\('mastermind-curriculum-v1',(\d+),'([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)',(NULL|'[^']*')\)/g;
  const rows = [...migration.matchAll(rowPattern)].map((match) => ({
    order: Number(match[1]), id: match[2], stageId: match[3], label: match[4], output: match[5],
    sourceTitle: match[6], sourceOwner: match[7], status: match[8], provenanceNote: match[9],
    resourceId: match[10] === 'NULL' ? null : match[10].slice(1, -1),
  }));
  assert.equal(rows.length, 24);
  assert.deepEqual(
    rows.map(({ order: _order, ...row }) => row),
    model.MASTERMIND_CURRICULUM_MANIFEST.map((slot) => ({ ...slot })),
  );
  assert.deepEqual(rows.map((row) => row.order), Array.from({ length: 24 }, (_, index) => index + 1));
});

test('unverified curriculum resources cannot be rendered', () => {
  for (const stage of model.MASTERMIND_SUCCESS_STAGES) {
    assert.equal(stage.resources.length, 3, `${stage.id} must preserve exactly three compatibility resources`);
    for (const milestone of stage.milestones) {
      assert.equal(milestone.status, 'Gap');
      assert.equal(model.getRenderableCurriculumResourceId(milestone), null);
    }
  }
  for (const slot of model.MASTERMIND_CURRICULUM_MANIFEST) {
    assert.equal(model.getRenderableCurriculumResourceId(slot), null);
  }
  assert.equal(model.getRenderableCurriculumResourceId({
    ...model.MASTERMIND_CURRICULUM_MANIFEST[0], status: 'Refresh', resourceId: 'unverified-resource',
  }), null);
});
