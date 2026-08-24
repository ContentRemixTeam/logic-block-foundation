#!/usr/bin/env node
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(path.join(tmpdir(), 'mastermind-portal-verify-'));
const entryPath = path.join(tempDir, 'entry.ts');
const outputPath = path.join(tempDir, 'entry.mjs');
const mastermindHubSourcePath = path.join(projectRoot, 'src/pages/MastermindHub.tsx');
const mastermindResourcesSourcePath = path.join(projectRoot, 'src/data/mastermindPortalResources.ts');
const successPathPlanCardSourcePath = path.join(projectRoot, 'src/components/mastermind/SuccessPathPlanCard.tsx');

const entry = String.raw`
import assert from 'node:assert/strict';
import {
  MASTERMIND_PORTAL_RESOURCES,
  type MastermindPortalAccess,
} from '@/data/mastermindPortalResources';
import { isDefaultMastermindPortalResource, searchMastermindPortalResources } from '@/lib/mastermindPortalSearch';
import {
  inferMastermindSuccessPath,
  MASTERMIND_SUCCESS_STAGES,
  type MastermindPlanCycle,
  type MastermindResourceRecommendation,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';

const stageIds: MastermindStageId[] = ['offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'];
const stageIdSet = new Set(stageIds);
const accessLabelByPortalAccess: Record<MastermindPortalAccess, MastermindResourceRecommendation['access'] | 'Eligible members'> = {
  core: 'Core',
  current_replay: '30-day replays',
  vault: 'Vault',
  eligible: 'Eligible members',
  access_review: 'Access review',
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function idsFor(query: string, options = {}) {
  return searchMastermindPortalResources(MASTERMIND_PORTAL_RESOURCES, query, options).map((resource) => resource.id);
}

function matchingPortalResource(recommendation: MastermindResourceRecommendation) {
  if (recommendation.resourceId) {
    return MASTERMIND_PORTAL_RESOURCES.find((resource) => resource.id === recommendation.resourceId);
  }

  const recommendationTitle = normalize(recommendation.title);
  return MASTERMIND_PORTAL_RESOURCES.find((resource) => {
    const resourceTitle = normalize(resource.title);
    return recommendationTitle === resourceTitle ||
      recommendationTitle.includes(resourceTitle) ||
      resourceTitle.includes(recommendationTitle);
  });
}

function cycle(overrides: Partial<MastermindPlanCycle>): MastermindPlanCycle {
  return {
    cycle_id: 'verify-cycle',
    goal: 'Create the next revenue result with a clear plan',
    start_date: '2026-08-01',
    end_date: '2026-10-29',
    focus_area: null,
    biggest_bottleneck: null,
    discover_score: null,
    nurture_score: null,
    convert_score: null,
    audience_target: 'course creators',
    audience_frustration: 'too many tactics',
    signature_message: 'simple money path',
    why: 'cash-first clarity',
    low_energy_version: null,
    medium_energy_version: null,
    high_energy_version: null,
    updated_at: '2026-08-08T00:00:00.000Z',
    ...overrides,
  };
}

assert.ok(MASTERMIND_PORTAL_RESOURCES.length >= 14, 'expected a full portal resource map');

const resourceIds = new Set<string>();
const forbiddenMemberFacingResourceCopy = [
  'local audit',
  'transcripts matched',
  'transcript backfill',
  'video urls',
  'source records',
  'content repurpose',
  'dropbox',
  'ghl',
  'bunny',
  'full transcripts',
  'client bundle',
  'server-side search',
];
for (const resource of MASTERMIND_PORTAL_RESOURCES) {
  assert.ok(!resourceIds.has(resource.id), 'duplicate portal resource id: ' + resource.id);
  resourceIds.add(resource.id);

  assert.ok(resource.title.trim(), 'missing title for ' + resource.id);
  assert.ok(resource.description.trim(), 'missing description for ' + resource.id);
  assert.ok(resource.memberJob.trim(), 'missing member job for ' + resource.id);
  assert.ok(resource.portalPath.trim(), 'missing portal path for ' + resource.id);
  assert.ok(resource.sourceStatus.trim(), 'missing source status for ' + resource.id);
  assert.ok(resource.primaryAction.trim(), 'missing primary action for ' + resource.id);
  assert.ok(resource.stages.length > 0, 'missing stage mapping for ' + resource.id);
  assert.ok(resource.stages.every((stageId) => stageIdSet.has(stageId)), 'invalid stage mapping for ' + resource.id);
  const memberFacingResourceCopy = normalize([
    resource.description,
    resource.memberJob,
    resource.transcriptLabel,
    resource.sourceStatus,
    resource.primaryAction,
  ].join(' '));
  for (const forbidden of forbiddenMemberFacingResourceCopy) {
    assert.ok(
      !memberFacingResourceCopy.includes(forbidden),
      'member-facing resource copy exposes internal/audit wording "' + forbidden + '" for ' + resource.id
    );
  }
  assert.ok(
    resource.isExternal ? resource.url.startsWith('https://') : resource.url.startsWith('/'),
    'unexpected URL shape for ' + resource.id + ': ' + resource.url
  );
  if (resource.access === 'vault' || resource.access === 'access_review') {
    assert.equal(resource.isExternal, false, 'restricted resource must not expose an external URL in the client bundle: ' + resource.id);
    assert.equal(resource.url, '/mastermind', 'restricted resource should route to local access-safe placeholder: ' + resource.id);
    assert.ok(resource.primaryAction.toLowerCase().includes('access'), 'restricted resource action should make access review clear: ' + resource.id);
  }
}

assert.deepEqual(idsFor('sales page').slice(0, 1), ['sales-marketing'], 'sales page should route to Sales & Marketing first');
assert.ok(idsFor('email list').includes('grow-email-list'), 'email list should find Grow Your Email List');
assert.ok(idsFor('AI').includes('faith-ai'), 'AI should find Faith AI');
assert.deepEqual(idsFor('nope impossible query'), [], 'nonsense search should return no results');

const defaultIds = idsFor('');
assert.ok(defaultIds.includes('success-plan'), 'default finder should include core Success Plan');
assert.ok(defaultIds.includes('current-replays'), 'default finder should include current 30-day replays');
assert.ok(!defaultIds.includes('replay-vault'), 'default finder must not expose Replay Vault without explicit access');
assert.ok(!defaultIds.includes('money-moves-sprint'), 'default finder must not expose access-review sprint without explicit access');
assert.equal(
  MASTERMIND_PORTAL_RESOURCES.filter(isDefaultMastermindPortalResource).length,
  defaultIds.length,
  'default finder should match the core/current visible resource set'
);

const coreIds = idsFor('', { access: 'core' });
assert.ok(coreIds.includes('success-plan'), 'core filter should include Success Plan');
assert.ok(!coreIds.includes('replay-vault'), 'core filter must not include Replay Vault');
assert.ok(!coreIds.includes('money-moves-sprint'), 'core filter must not include access-review sprint');
assert.deepEqual(idsFor('', { access: 'current_replay' }), ['current-replays'], '30-day filter should only return current replays');
assert.deepEqual(idsFor('', { access: 'vault' }), ['replay-vault'], 'vault filter should only return replay vault');
assert.deepEqual(idsFor('', { access: 'access_review' }), ['money-moves-sprint'], 'access-review filter should only return Money Moves Sprint');
assert.ok(idsFor('', { includeRestrictedAccess: true }).includes('replay-vault'), 'internal unrestricted finder should still see vault resources');
assert.ok(idsFor('', { includeRestrictedAccess: true }).includes('money-moves-sprint'), 'internal unrestricted finder should still see access-review resources');

const sellPathIds = idsFor('', { stageId: 'sell' });
assert.ok(sellPathIds.includes('sales-marketing'), 'sell path should include Sales & Marketing');
assert.ok(sellPathIds.includes('current-replays'), 'sell path should include Current Call Replays');
assert.ok(!sellPathIds.includes('grow-email-list'), 'sell path should not include unrelated list-growth resources');
assert.ok(!sellPathIds.includes('money-moves-sprint'), 'sell path default must not include access-review sprint');
assert.ok(!sellPathIds.includes('replay-vault'), 'sell path default must not include Replay Vault');

const transcriptReadyIds = idsFor('', { transcriptReadyOnly: true });
assert.ok(transcriptReadyIds.includes('success-plan'), 'transcript-ready filter should include Success Plan');
assert.ok(transcriptReadyIds.includes('faith-ai'), 'transcript-ready filter should include description-indexed Faith AI');
assert.ok(!transcriptReadyIds.includes('products-offers'), 'transcript-ready filter should hide metadata-only resources');
assert.ok(!transcriptReadyIds.includes('replay-vault'), 'transcript-ready filter should hide server-side-required vault search');

for (const stage of MASTERMIND_SUCCESS_STAGES) {
  assert.ok(stageIdSet.has(stage.id), 'unknown stage id: ' + stage.id);
  assert.equal(stage.resources.length, 3, stage.label + ' should recommend exactly three starting resources');
  assert.equal(stage.messyActionSprint.length, 3, stage.label + ' should have exactly three messy action sprint steps');
  assert.ok(stage.nextMoneyMove.trim(), stage.label + ' is missing a next money move');
  assert.ok(stage.supportPrompt.trim(), stage.label + ' is missing an Ask Faith prompt');

  for (const recommendation of stage.resources) {
    assert.ok(recommendation.resourceId?.trim(), stage.label + ' recommendation ' + recommendation.title + ' is missing a resourceId');
    assert.ok(recommendation.portalPath?.trim(), stage.label + ' recommendation ' + recommendation.title + ' is missing a portal path');
    assert.notEqual(recommendation.access, 'Access review', stage.label + ' recommendation ' + recommendation.title + ' should be usable without manual access review');
    const portalResource = matchingPortalResource(recommendation);
    assert.ok(portalResource, stage.label + ' recommendation ' + recommendation.title + ' does not map to a portal resource');
    const expectedAccess = accessLabelByPortalAccess[portalResource.access];
    assert.equal(
      recommendation.access,
      expectedAccess,
      stage.label + ' recommendation ' + recommendation.title + ' says ' + recommendation.access + ', but portal resource is ' + expectedAccess
    );
    assert.ok(
      isDefaultMastermindPortalResource(portalResource),
      stage.label + ' recommendation ' + recommendation.title + ' must map to a default-visible resource'
    );
  }
}

assert.equal(inferMastermindSuccessPath(cycle({ biggest_bottleneck: 'My sales page and follow up are weak' }))?.stageId, 'sell');
assert.equal(inferMastermindSuccessPath(cycle({ biggest_bottleneck: 'I need to grow my email list' }))?.stageId, 'find');
assert.equal(inferMastermindSuccessPath(cycle({ biggest_bottleneck: 'Client onboarding and retention are messy' }))?.stageId, 'deliver');
assert.equal(inferMastermindSuccessPath(cycle({ audience_target: null, signature_message: null }))?.stageId, 'offer');
assert.equal(
  inferMastermindSuccessPath(cycle({ discover_score: 3, nurture_score: 8, convert_score: 9 }))?.stageId,
  'find',
  'lowest diagnostic should drive the suggested path when no stronger signal exists'
);

console.log('mastermind portal verifier passed');
`;

writeFileSync(entryPath, entry);

try {
  await build({
    absWorkingDir: projectRoot,
    bundle: true,
    entryPoints: [entryPath],
    format: 'esm',
    logLevel: 'silent',
    outfile: outputPath,
    platform: 'node',
    target: 'node20',
    plugins: [
      {
        name: 'app-alias',
        setup(builder) {
          builder.onResolve({ filter: /^@\// }, (args) => {
            const resolved = path.join(projectRoot, 'src', args.path.slice(2));
            const candidates = [
              resolved,
              resolved + '.ts',
              resolved + '.tsx',
              path.join(resolved, 'index.ts'),
              path.join(resolved, 'index.tsx'),
            ];

            return {
              path: candidates.find((candidate) => existsSync(candidate)) ?? resolved,
            };
          });
        },
      },
    ],
  });

  await import(pathToFileURL(outputPath).href);

  const mastermindHubSource = readFileSync(mastermindHubSourcePath, 'utf8');
  const mastermindResourcesSource = readFileSync(mastermindResourcesSourcePath, 'utf8');
  const successPathPlanCardSource = readFileSync(successPathPlanCardSourcePath, 'utf8');
  assert.ok(mastermindHubSource.includes("label: 'Indexed now'"), 'Resource filter should use clear member-facing indexed language');
  assert.ok(mastermindHubSource.includes('Choose the smallest useful next resource'), 'Resource map should explain member value, not audit mechanics');
  assert.ok(mastermindHubSource.includes('Bonus and vault items stay out of this finder'), 'Resource map should state restricted resources stay access-gated');
  assert.ok(mastermindHubSource.includes('selectedStageId={selectedStageId}'), 'Changing focus should update the main Success Plan card');
  assert.ok(mastermindHubSource.includes('Does this focus feel right?'), 'Members should be able to correct a recommendation without self-diagnosing from scratch');
  assert.ok(mastermindHubSource.includes('handleOpenRecommendedResource'), 'Success Plan resources should open mapped resources directly');
  assert.ok(mastermindHubSource.includes('aria-label="Clear resource search"'), 'Clear search icon button needs an accessible label');
  assert.ok(mastermindHubSource.includes('aria-label={isPinned ? `Unpin ${resource.title}`'), 'Pin icon button needs resource-specific accessible labels');
  assert.ok(successPathPlanCardSource.includes('Your next three moves'), 'The Success Plan should turn the recommendation into three concrete moves');
  assert.ok(successPathPlanCardSource.includes('Update My 90-Day Plan'), 'The Success Plan needs an honest direct plan-editing action');
  assert.ok(successPathPlanCardSource.includes('Open My Starting Resource'), 'The Success Plan should include a direct supporting-resource action');
  assert.ok(!mastermindHubSource.includes('Find the first broken link'), 'The member UI should not lead with internal diagnostic language');
  for (const hiddenAuditLabel of ['Transcript-ready', 'Dropbox rows', 'Content Repurpose DB audit', "label: 'Vault'", 'Mapped resources']) {
    assert.ok(!mastermindHubSource.includes(hiddenAuditLabel), 'Member UI should not expose audit label: ' + hiddenAuditLabel);
  }
  for (const hiddenSourceLabel of ['MASTERMIND_PORTAL_AUDIT', 'crdbDropboxRows', 'coachingRowsWithDropboxPaths', 'Content Repurpose', 'Dropbox', 'dropbox.com', 'bunny_video_id']) {
    assert.ok(!mastermindResourcesSource.includes(hiddenSourceLabel), 'Frontend resource data should not include private source/audit label: ' + hiddenSourceLabel);
  }
  assert.ok(mastermindHubSource.includes('className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"'), 'Primary Mastermind actions should stack cleanly on mobile');
  assert.ok(!mastermindHubSource.includes("navigate('/mastermind/replay-vault')"), 'monthly Mastermind surfaces must not expose an unconditional Replay Vault route');
  assert.ok(!mastermindHubSource.includes('VITE_ENABLE_MASTERMIND_VIDEO_SEARCH'), 'MastermindHub must not retain the static video-search feature flag');
  assert.ok(!mastermindHubSource.includes('MastermindVideoSearch'), 'MastermindHub must not mount the static Replay Vault pilot');

  const requiredMastermindHubLayoutGuards = [
    'className="grid w-full grid-cols-3 sm:max-w-lg"',
    'className="pl-10 pr-10"',
    'className="min-h-9 whitespace-normal text-left leading-tight"',
    'className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"',
    'className="break-words text-muted-foreground">No resources found matching',
    'className="min-w-0 flex-1 break-words leading-snug"',
    'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
  ];
  for (const guard of requiredMastermindHubLayoutGuards) {
    assert.ok(mastermindHubSource.includes(guard), 'MastermindHub is missing responsive/accessibility guard: ' + guard);
  }

  const requiredSuccessPathLayoutGuards = [
    'className="max-w-3xl"',
    'className="mt-3 grid gap-3 md:grid-cols-3"',
    'className="flex gap-3 rounded-xl border bg-background p-4"',
    'className="flex flex-col gap-2 sm:flex-row"',
    'className="border-t bg-background/60 px-6 py-4 md:px-8"',
  ];
  for (const guard of requiredSuccessPathLayoutGuards) {
    assert.ok(successPathPlanCardSource.includes(guard), 'SuccessPathPlanCard is missing responsive layout guard: ' + guard);
  }

  for (const [sourceName, source] of [
    ['MastermindHub', mastermindHubSource],
    ['SuccessPathPlanCard', successPathPlanCardSource],
  ]) {
    for (const riskyClass of ['whitespace-nowrap', 'text-nowrap', 'w-[', 'min-w-[']) {
      assert.ok(!source.includes(riskyClass), sourceName + ' should not use layout class that risks mobile overflow: ' + riskyClass);
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
