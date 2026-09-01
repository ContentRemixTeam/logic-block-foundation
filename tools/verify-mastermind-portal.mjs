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
const mastermindTrainingSourcePath = path.join(projectRoot, 'src/pages/MastermindTraining.tsx');
const mastermindResourcesSourcePath = path.join(projectRoot, 'src/data/mastermindPortalResources.ts');
const successPathPlanCardSourcePath = path.join(projectRoot, 'src/components/mastermind/SuccessPathPlanCard.tsx');
const mastermindSupportBotSourcePath = path.join(projectRoot, 'src/components/mastermind/MastermindSupportBot.tsx');
const aiStudioSourcePath = path.join(projectRoot, 'src/lib/mastermindAiStudio.ts');
const aiStudioPlanCardSourcePath = path.join(projectRoot, 'src/components/mastermind/AiStudioPlanCard.tsx');
const phaseOneCatalogSourcePath = path.join(projectRoot, 'src/hooks/usePhaseOneCatalog.ts');
const mastermindPortalAccessSourcePath = path.join(projectRoot, 'src/hooks/useMastermindPortalAccess.ts');
const mastermindSuccessPathHookSourcePath = path.join(projectRoot, 'src/hooks/useMastermindSuccessPath.ts');

const entry = String.raw`
import assert from 'node:assert/strict';
import {
  MASTERMIND_PORTAL_RESOURCES,
  getProtectedTrainingHref,
  type MastermindPortalAccess,
} from '@/data/mastermindPortalResources';
import {
  isDefaultMastermindPortalResource,
  isReadyMastermindCurriculumVideoResource,
  searchMastermindPortalResources,
} from '@/lib/mastermindPortalSearch';
import {
  getMastermindWeeklyGuidance,
  inferMastermindSuccessPath,
  MASTERMIND_SUCCESS_STAGES,
  type MastermindPlanCycle,
  type MastermindResourceRecommendation,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';
import {
  AI_PROJECT_PACKS,
  getAiStudioAccessSummary,
  getRecommendedAiProjectPack,
  getVisibleAiProjectPacks,
} from '@/lib/mastermindAiStudio';

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

assert.ok(MASTERMIND_PORTAL_RESOURCES.length >= 32, 'expected the full portal resource map plus imported core curriculum videos');

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

assert.ok(idsFor('sales page').includes('sales-marketing'), 'sales page should find Sales & Marketing');
assert.ok(idsFor('email list').includes('grow-email-list'), 'email list should find Grow Your Email List');
assert.ok(idsFor('AI').includes('faith-ai'), 'AI should find Faith AI');
assert.ok(idsFor('welcome email').includes('get-your-freebie-welcome-email'), 'welcome email should find the imported welcome email lesson');
assert.ok(idsFor('onboarding').includes('program-upgrade-onboarding-upgrade'), 'onboarding should find the imported onboarding lesson');
assert.ok(idsFor('do less').includes('do-less-make-more-workshop'), 'do less should find the imported leverage lesson');
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

const readyProtectedCurriculumResourceIds = [
  'ninety-day-goal-setting-introduction',
  'ninety-day-goal-setting-workshop',
  'money-move-day-one',
  'money-move-day-two',
  'money-move-day-three',
  'great-marketing-breakthrough-day-two',
  'great-marketing-breakthrough-day-three',
  'get-social-media-done-workshop-one',
  'get-social-media-done-workshop-two',
  'get-social-media-done-workshop-three',
  'get-your-freebie-non-boring-idea',
  'get-your-freebie-welcome-email',
  'bosses-make-sales-day-one',
  'bosses-make-sales-day-two',
  'bosses-make-sales-day-three',
  'launch-aligned-half-ass-launch',
  'launch-aligned-debrief',
  'program-upgrade-strategic-improvement',
  'program-upgrade-onboarding-upgrade',
  'program-upgrade-surprise-and-delight',
  'program-upgrade-offboard-like-a-boss',
  'do-less-make-more-workshop',
  'do-less-make-more-bonus-coaching',
];
for (const resourceId of readyProtectedCurriculumResourceIds) {
  const resource = MASTERMIND_PORTAL_RESOURCES.find((item) => item.id === resourceId);
  assert.ok(resource?.protectedPlayback, resourceId + ' is missing the protected curriculum playback contract');
  assert.equal(resource.protectedPlayback.accessScope, 'core_curriculum', resourceId + ' must be monthly-safe core curriculum');
  assert.equal(resource.protectedPlayback.surface, 'curriculum', resourceId + ' must open through the Training Library surface');
  assert.equal(resource.protectedPlayback.status, 'ready', resourceId + ' should be connected to the protected player');
  assert.equal(getProtectedTrainingHref(resource), '/mastermind/training?resource=' + encodeURIComponent(resourceId), resourceId + ' must open the protected Training Library player');
}

const readyCurriculumVideoIds = MASTERMIND_PORTAL_RESOURCES
  .filter(isReadyMastermindCurriculumVideoResource)
  .map((resource) => resource.id)
  .sort();
assert.deepEqual(
  readyCurriculumVideoIds,
  [...readyProtectedCurriculumResourceIds].sort(),
  'the hidden Training finder should only show videos that are ready in the protected in-app player'
);
for (const nonVideoId of ['success-plan', 'ninety-day-planning', 'ask-faith', 'faith-ai', 'current-replays', 'messy-action-sprints']) {
  assert.ok(
    !readyCurriculumVideoIds.includes(nonVideoId),
    'the hidden Training finder must not show non-video or pending resource cards: ' + nonVideoId
  );
}

const pendingCurriculumResourceIds = [
  'success-plan',
  'ninety-day-planning',
  'wibn-offer-clarity',
  'messy-action-sprints',
];
for (const resourceId of pendingCurriculumResourceIds) {
  const resource = MASTERMIND_PORTAL_RESOURCES.find((item) => item.id === resourceId);
  assert.ok(resource?.protectedPlayback, resourceId + ' is missing the pending protected curriculum playback contract');
  assert.equal(resource.protectedPlayback.accessScope, 'core_curriculum', resourceId + ' must be monthly-safe core curriculum');
  assert.equal(resource.protectedPlayback.surface, 'curriculum', resourceId + ' must open through the Training Library surface when ready');
  assert.equal(getProtectedTrainingHref(resource), null, resourceId + ' must not open the protected player until its import is ready');
}

const readyTrainingHref = getProtectedTrainingHref({
  ...MASTERMIND_PORTAL_RESOURCES.find((item) => item.id === 'money-move-day-one')!,
  protectedPlayback: {
    resourceId: 'money-move-day-one',
    accessScope: 'core_curriculum',
    surface: 'curriculum',
    status: 'ready',
  },
});
assert.equal(readyTrainingHref, '/mastermind/training?resource=money-move-day-one', 'ready curriculum video should open the protected Training Library player');

const readyVaultHref = getProtectedTrainingHref({
  ...MASTERMIND_PORTAL_RESOURCES.find((item) => item.id === 'replay-vault')!,
  protectedPlayback: {
    resourceId: 'membershipio:P5qnk1Q02r',
    accessScope: 'replay_vault',
    surface: 'vault',
    status: 'ready',
  },
});
assert.equal(readyVaultHref, '/mastermind/replay-vault?resource=membershipio%3AP5qnk1Q02r', 'ready Vault video should keep opening the Vault surface');

for (const stage of MASTERMIND_SUCCESS_STAGES) {
  assert.ok(stageIdSet.has(stage.id), 'unknown stage id: ' + stage.id);
  assert.equal(stage.resources.length, 4, stage.label + ' should map each milestone to a starting resource');
  assert.equal(stage.messyActionSprint.length, 3, stage.label + ' should have exactly three messy action sprint steps');
  assert.ok(stage.nextMoneyMove.trim(), stage.label + ' is missing a next money move');
  assert.ok(stage.supportPrompt.trim(), stage.label + ' is missing an Ask Faith prompt');
  assert.ok(stage.aiProjectId.trim(), stage.label + ' is missing an AI project pack id');
  assert.ok(stage.quickWin.title.trim(), stage.label + ' quick win is missing a title');
  assert.ok(stage.quickWin.action.trim(), stage.label + ' quick win is missing an action');
  assert.ok(stage.quickWin.timeBox.trim(), stage.label + ' quick win is missing a time box');
  assert.ok(stage.quickWin.evidence.trim(), stage.label + ' quick win is missing an evidence target');
  assert.ok(stage.quickWin.lowEnergy.trim(), stage.label + ' quick win is missing a low-capacity action');
  assert.ok(
    !stage.resources.some((recommendation) => recommendation.resourceId === 'messy-action-sprints'),
    stage.label + ' should not make Messy Action Sprint a required dashboard recommendation'
  );

  for (const recommendation of stage.resources) {
    assert.ok(recommendation.resourceId?.trim(), stage.label + ' recommendation ' + recommendation.title + ' is missing a resourceId');
    assert.ok(recommendation.portalPath?.trim(), stage.label + ' recommendation ' + recommendation.title + ' is missing a portal path');
    assert.ok(recommendation.afterWatching?.trim(), stage.label + ' recommendation ' + recommendation.title + ' is missing an after-watching action');
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

  const mappedMilestoneIds = new Set(stage.resources.flatMap((resource) => resource.milestoneIds ?? []));
  for (const milestone of stage.milestones) {
    assert.ok(mappedMilestoneIds.has(milestone.id), stage.label + ' milestone is missing a mapped lesson: ' + milestone.id);
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

const sellGuidance = getMastermindWeeklyGuidance('sell', cycle({ low_energy_version: 'Send one warm follow-up before rewriting anything.' }));
assert.equal(sellGuidance.stage.id, 'sell', 'weekly guidance should load the selected stage');
assert.equal(sellGuidance.quickWin.lowEnergy, 'Send one warm follow-up before rewriting anything.', 'weekly guidance should respect the member low-capacity plan');
assert.equal(sellGuidance.primaryResource.resourceId, 'money-move-day-three', 'weekly guidance should choose a real protected sales-planning lesson');
assert.equal(sellGuidance.aiProjectId, 'sales-room', 'weekly guidance should expose the stage-matched AI project pack id');

const offerValidationGuidance = getMastermindWeeklyGuidance('offer', cycle({}), 'offer-validate');
assert.equal(offerValidationGuidance.primaryResource.resourceId, 'money-move-day-three', 'offer validation should recommend the sales-plan lesson');

assert.ok(AI_PROJECT_PACKS.length >= 7, 'AI Studio should include the foundation pack plus each stage pack');
const monthlyAccess = getAiStudioAccessSummary('mastermind', true);
const annualAccess = getAiStudioAccessSummary('mastermind_annual', true);
const annualScopedAccess = getAiStudioAccessSummary('monthly', true, ['core_curriculum', 'current_replay_30_day', 'replay_vault']);
const plannerAccess = getAiStudioAccessSummary(null, false);
assert.equal(monthlyAccess.canSeeFullLibrary, false, 'monthly members should not receive the full AI library by default');
assert.equal(monthlyAccess.canUnlockMonthlyPack, true, 'monthly members should be able to unlock one recommended pack');
assert.equal(annualAccess.canSeeFullLibrary, true, 'annual/lifetime members should be eligible for the full approved AI library');
assert.equal(annualScopedAccess.canSeeFullLibrary, true, 'server scopes should unlock the full AI library for annual/lifetime access');
assert.equal(plannerAccess.canUnlockMonthlyPack, false, 'planner-only members should not unlock Mastermind AI packs');
assert.equal(getRecommendedAiProjectPack('offer', cycle({ biggest_bottleneck: 'offer clarity' })).id, 'offer-lab');
const monthlyPacks = getVisibleAiProjectPacks(monthlyAccess, 'offer-lab');
assert.equal(monthlyPacks.find((pack) => pack.id === 'ninety-day-ceo-workspace')?.visibility, 'included');
assert.equal(monthlyPacks.find((pack) => pack.id === 'offer-lab')?.visibility, 'recommended_unlock');
assert.equal(monthlyPacks.find((pack) => pack.id === 'sales-room')?.visibility, 'locked');
assert.ok(getVisibleAiProjectPacks(annualAccess, 'offer-lab').every((pack) => pack.visibility === 'included'), 'annual access should include every AI project pack');
for (const pack of AI_PROJECT_PACKS) {
  assert.ok(pack.setupQuestions.length >= 4, pack.title + ' should define a stage-specific setup interview');
  assert.ok(pack.knowledgeDocs.length >= 3, pack.title + ' should define knowledge docs for installation');
  assert.ok(pack.operatingRules.length >= 3, pack.title + ' should define operating rules for better output');
  assert.ok(pack.outputChecks.length >= 3, pack.title + ' should define quality checks for member review');
}

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
  const mastermindTrainingSource = readFileSync(mastermindTrainingSourcePath, 'utf8');
  const mastermindResourcesSource = readFileSync(mastermindResourcesSourcePath, 'utf8');
  const successPathPlanCardSource = readFileSync(successPathPlanCardSourcePath, 'utf8');
  const mastermindSupportBotSource = readFileSync(mastermindSupportBotSourcePath, 'utf8');
  const aiStudioSource = readFileSync(aiStudioSourcePath, 'utf8');
  const aiStudioPlanCardSource = readFileSync(aiStudioPlanCardSourcePath, 'utf8');
  const phaseOneCatalogSource = readFileSync(phaseOneCatalogSourcePath, 'utf8');
  const mastermindPortalAccessSource = readFileSync(mastermindPortalAccessSourcePath, 'utf8');
  const mastermindSuccessPathHookSource = readFileSync(mastermindSuccessPathHookSourcePath, 'utf8');
  assert.ok(mastermindHubSource.includes("label: 'Search-ready'"), 'Resource filter should use clear member-facing search language');
  assert.ok(mastermindHubSource.includes('Choose the smallest useful next resource'), 'Resource map should explain member value, not audit mechanics');
  assert.ok(mastermindHubSource.includes('Watch the videos that are ready inside this app.'), 'Training finder should set the expectation that every card is playable now');
  assert.ok(mastermindHubSource.includes('This finder only shows curriculum videos that open in the in-app player'), 'Training finder should not present planning/support links as playable curriculum');
  assert.ok(
    mastermindHubSource.includes('playableResourceIds') &&
      mastermindHubSource.includes('isReadyMastermindCurriculumVideoResource(resource) && playableResourceIds.has(resource.id)'),
    'Training finder should only render server-authorized videos that are ready in the protected in-app player',
  );
  assert.ok(
    mastermindHubSource.includes("resource.resourceId === 'faith-ai' || playableResourceIds.has(resource.resourceId)"),
    'Guidance recommendations should not open unimported videos from the static curriculum map',
  );
  assert.ok(
    mastermindHubSource.includes("resource.id !== 'faith-ai' && !playableResourceIds.has(resource.id)"),
    'Primary recommendation opens must fail closed to the Training tab when the video is not server-ready',
  );
  assert.ok(mastermindHubSource.includes('Curriculum sections'), '90-day page should show the member the curriculum sections before the full finder');
  assert.ok(mastermindHubSource.includes('Training by focus area'), 'Training tab should expose the real curriculum by section');
  assert.ok(mastermindHubSource.includes('Browse by section without changing the saved focus'), 'Browsing training sections should not mutate the saved 90-day focus');
  assert.ok(mastermindHubSource.includes('core lessons being added next'), 'Curriculum sections should explain that mapped-but-not-live lessons are being added');
  assert.ok(mastermindHubSource.includes('plannedResources'), 'Curriculum section stats should keep mapped planned lessons separate from playable videos');
  assert.ok(mastermindHubSource.includes('trainingSectionStatsToShow'), 'Focus filters should still show the current section card and planned lessons');
  assert.ok(mastermindHubSource.includes('videos ready now'), 'Curriculum section map should count only videos that are ready now');
  assert.ok(mastermindHubSource.includes('ready to watch'), 'Curriculum section badges should distinguish ready-to-watch videos from planned lessons');
  assert.ok(mastermindHubSource.includes('Next planned lesson'), 'Curriculum section map should name the next planned lesson without opening it');
  assert.ok(mastermindHubSource.includes('Being added to this app'), 'Current-step support should show planned lessons without watch buttons');
  assert.ok(mastermindHubSource.includes('video is ready and tested'), 'Planned lesson copy should stay member-safe and avoid internal playback/audit terms');
  assert.ok(mastermindHubSource.includes('Search only finds ready videos; planned lessons appear in section cards.'), 'Training search should stay strict while section cards show planned lessons');
  assert.ok(mastermindHubSource.includes('Ready soon'), 'Unavailable section buttons should not pretend planned lessons are playable');
  assert.ok(mastermindHubSource.includes('Next useful video'), 'Curriculum section map should point to the next useful video');
  assert.ok(mastermindHubSource.includes('Section complete'), 'Curriculum section map should not reassign watched videos after a section is complete');
  assert.ok(mastermindHubSource.includes('Evidence to bring back'), 'Curriculum sections should name the evidence members need to collect');
  assert.ok(mastermindHubSource.includes('Done when'), 'Curriculum sections should define a concrete completion standard');
  assert.ok(mastermindHubSource.includes('stage.definitionOfDone[0]'), 'Curriculum sections should use the approved stage definition of done');
  assert.ok(mastermindHubSource.includes('stage.quickWin.evidence'), 'Curriculum sections should use the approved stage evidence target');
  assert.ok(mastermindHubSource.includes('Action step'), 'Training by focus area should show the action step before the video list');
  assert.ok(mastermindHubSource.includes('stage.doThis'), 'Training by focus area should reuse the approved stage action');
  assert.ok(mastermindHubSource.includes('setTrainingStageId(stage.id)'), 'Curriculum section browsing should keep a separate training filter from saved focus');
  assert.ok(mastermindHubSource.includes("setResourceFilter('focus')"), 'Curriculum section map should jump directly to the selected section videos');
  assert.ok(!mastermindHubSource.includes("label: '30-day'"), 'Training finder should not show a 30-day replay filter until recent replays are integrated');
  assert.ok(mastermindHubSource.includes('selectedStageId={selectedStageId}'), 'Changing focus should update the main 90-day guidance card');
  assert.ok(mastermindHubSource.includes('Change this if it is not the right focus.'), 'Members should be able to correct a recommendation without self-diagnosing from scratch');
  assert.ok(mastermindHubSource.includes('handleOpenRecommendedResource'), 'Success Plan resources should open mapped resources directly');
  assert.ok(mastermindHubSource.includes("location.pathname.startsWith('/admin/mastermind-90-day-plan-preview')"), 'Admin 90-day preview should detect its hidden route');
  assert.ok(mastermindHubSource.includes('const aiStudioEnabled = SHOW_AI_STUDIO || isAdminPreview'), 'Hidden admin QA route should show AI Studio without enabling the public feature flag');
  assert.ok(mastermindHubSource.includes("const TRAINING_TIME_STORAGE_KEY = 'mastermind-weekly-training-minutes'"), 'Training tab should remember the member weekly watch budget');
  assert.ok(mastermindHubSource.includes("This week's playlist"), 'Training tab should create a weekly playlist instead of only listing all videos');
  assert.ok(mastermindHubSource.includes('Fit training into the time you actually have.'), 'Training playlist should help members choose videos based on available time');
  assert.ok(mastermindHubSource.includes('duration_seconds'), 'Training playlist should use live catalog durations from the Lovable-connected app database');
  assert.ok(mastermindHubSource.includes('weeklyWatchPlan'), 'Training playlist should compute a focused weekly watch plan');
  assert.ok(mastermindHubSource.includes('formatWeeklyWatchPlanSummary'), 'Training playlist should summarize the watch plan without making long best-fit lessons look like a broken budget');
  assert.ok(mastermindHubSource.includes('best next watch'), 'Training playlist should handle a single recommended video longer than the weekly watch budget gracefully');
  assert.ok(mastermindHubSource.includes('const AccessBoundary = isAdminPreview ? PreviewAccessBoundary : MastermindGate'), 'Admin 90-day preview must rely on the route allowlist instead of the inner member gate');
  assert.ok(mastermindHubSource.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"), 'Admin 90-day preview must keep curriculum clicks on the hidden training route');
  assert.ok(mastermindHubSource.includes('params.set(\'stage\', activeTrainingStageId)'), 'Training links should carry the current plan section into the hidden player');
  assert.ok(mastermindResourcesSource.includes("params.set('stage', stageId)"), 'Protected training URLs should preserve section context when it is available');
  assert.ok(mastermindTrainingSource.includes('Lesson context'), 'Training player should explain why the member is watching the lesson');
  assert.ok(mastermindTrainingSource.includes('Connected outcome'), 'Training player should connect lessons to the 90-day outcome');
  assert.ok(mastermindTrainingSource.includes('After watching'), 'Training player should name the specific output after the lesson');
  assert.ok(mastermindTrainingSource.includes('Evidence to bring back'), 'Training player should name the evidence to collect after the lesson');
  assert.ok(mastermindTrainingSource.includes('findLessonRecommendation'), 'Training player should reuse the approved curriculum recommendation map');
  assert.ok(mastermindTrainingSource.includes('lessonStage?.quickWin.evidence'), 'Training player should reuse stage evidence targets instead of generic completion copy');
  assert.ok(mastermindTrainingSource.includes('Next step in your planner'), 'Completed training should hand the member back to the Planner action loop');
  assert.ok(mastermindTrainingSource.includes('lessonNextAction'), 'Completed training should reuse the approved stage action as the next step');
  assert.ok(mastermindTrainingSource.includes("navigate('/evidence')"), 'Completed training should offer a direct evidence-recording path');
  assert.ok(mastermindHubSource.includes('completedResourceIds.has(resource.resourceId)'), '90-day guidance should label watched recommendation videos');
  assert.ok(mastermindHubSource.includes("'Watch again'"), 'Watched recommendation videos should not look like new assignments');
  assert.ok(mastermindHubSource.includes('showWatchedResources'), 'Training tab should let members reveal watched videos only when they ask');
  assert.ok(mastermindHubSource.includes('defaultUnwatchedResources'), 'Training tab should remove watched videos from the default watch list');
  assert.ok(mastermindHubSource.includes('Watched videos are hidden from the default list'), 'Training tab should explain where completed lessons went');
  assert.ok(mastermindHubSource.includes('Show watched'), 'Training tab should provide a clear watched-video recovery control');
  assert.ok(mastermindHubSource.includes('aria-label="Clear resource search"'), 'Clear search icon button needs an accessible label');
  assert.ok(mastermindHubSource.includes('aria-label={isPinned ? `Unpin ${resource.title}`'), 'Pin icon button needs resource-specific accessible labels');
  assert.ok(mastermindHubSource.includes('<MastermindSupportBot'), 'Support tab should mount the embedded coaching and finder bot');
  assert.ok(mastermindHubSource.includes('title="Ask Faith"'), 'Support tab should keep human Ask Faith separate from the embedded bot');
  assert.ok(mastermindSupportBotSource.includes("type SupportBotMode = 'coach' | 'find'"), 'Support bot should have coaching and finder modes');
  assert.ok(mastermindSupportBotSource.includes('useMastermindAI'), 'Support bot should use the existing BYO-key AI coach hook');
  assert.ok(mastermindSupportBotSource.includes('searchMastermindPortalResources'), 'Support bot finder should reuse the curriculum search logic');
  assert.ok(mastermindSupportBotSource.includes('training_ids'), 'Support bot should request known training IDs instead of inventing resources');
  assert.ok(mastermindSupportBotSource.includes('Open AI key settings'), 'Support bot should give members the cost-safe key setup path');
  assert.ok(mastermindSupportBotSource.includes('Use your own AI without spending app credits'), 'Support bot should preserve no-key value before a member connects an API key');
  assert.ok(mastermindSupportBotSource.includes('Copy coaching prompt'), 'Support bot should let members copy a coaching prompt for their own AI account');
  assert.ok(mastermindSupportBotSource.includes('Copy finder prompt'), 'Support bot should let members copy a finder prompt for their own AI account');
  assert.ok(mastermindSupportBotSource.includes('deterministicCoachResult'), 'Support bot should provide deterministic fallback coaching when live AI is unavailable');
  assert.ok(mastermindSupportBotSource.includes('buildSupportPrompt'), 'Support bot should build plan-aware prompts from the member 90-day context');
  assert.ok(mastermindSupportBotSource.includes('one next move'), 'Coaching response should stay focused on one next move');
  assert.ok(mastermindSupportBotSource.includes('evidence_to_record'), 'Coaching response should ask for evidence, not only inspiration');
  assert.ok(mastermindSupportBotSource.includes('Only ready, playable curriculum videos appear here.'), 'Finder should only show playable hidden curriculum videos');
  assert.ok(successPathPlanCardSource.includes('Do this this week'), 'The 90-day guidance card should name one concrete weekly move');
  assert.ok(successPathPlanCardSource.includes('Bring back this evidence'), 'The 90-day guidance card should define the evidence target');
  assert.ok(successPathPlanCardSource.includes('useResilientTaskMutation'), 'The 90-day guidance card should create weekly moves through the existing resilient Planner task path');
  assert.ok(successPathPlanCardSource.includes('Add this weekly move'), 'The 90-day guidance card should let members turn the move into one Planner task');
  assert.ok(!successPathPlanCardSource.includes('!cycle || !successPath'), 'A saved 90-day plan must still show the weekly move when the routing recommendation is missing');
  assert.ok(successPathPlanCardSource.includes('successPath?.stageId === selectedStageId'), 'The guidance reason should be optional so saved plans still render a task-ready move');
  assert.ok(successPathPlanCardSource.includes('Review 90-Day Plan'), 'The 90-day guidance card needs an honest direct plan-editing fallback');
  assert.ok(successPathPlanCardSource.includes('cycle_id: cycle.cycle_id'), 'Weekly move tasks should stay tied to the current 90-day cycle');
  assert.ok(successPathPlanCardSource.includes('done_enough_definition: round.doneEnough'), 'Weekly move tasks should carry the result/evidence completion standard');
  assert.ok(successPathPlanCardSource.includes("const WEEKLY_MOVE_TASK_STORAGE_KEY = 'mastermind-weekly-move-task-keys'"), 'Weekly move task handoff should remember the exact cycle/stage/move key');
  assert.ok(successPathPlanCardSource.includes('rememberWeeklyMoveTaskKey(weeklyMoveTaskKey)'), 'Weekly move task handoff should mark successful or queued Planner creation as already handled');
  assert.ok(successPathPlanCardSource.includes("weeklyMoveTaskState === 'saved' || weeklyMoveTaskState === 'queued'"), 'Weekly move task handoff should prevent duplicate task creation after save or queued sync');
  assert.ok(successPathPlanCardSource.includes('Open training'), 'The 90-day guidance card should include a direct supporting-training action');
  assert.ok(successPathPlanCardSource.includes("primaryResource.resourceId === 'faith-ai'"), 'The 90-day guidance card should treat Faith AI as setup, not a video lesson');
  assert.ok(successPathPlanCardSource.includes('Set up if needed'), 'The 90-day guidance card should label AI recommendations as setup');
  assert.ok(successPathPlanCardSource.includes('Open AI settings'), 'The 90-day guidance card should send AI recommendations to settings');
  assert.ok(successPathPlanCardSource.includes('After setup: '), 'The 90-day guidance card should not use watch-language for AI setup recommendations');
  assert.ok(aiStudioSource.includes('Monthly members get the planner-safe workspace plus one recommended project pack unlock per active month'), 'AI Studio should encode monthly limited access copy');
  assert.ok(aiStudioSource.includes('ai_asset_full_library_access'), 'AI Studio should recognize server full-library access scopes');
  assert.ok(aiStudioSource.includes('ai_asset_monthly_unlock_access'), 'AI Studio should recognize server monthly AI unlock scopes');
  assert.ok(aiStudioSource.includes('90-Day CEO Workspace'), 'AI Studio should include a planner-safe foundation workspace');
  assert.ok(aiStudioPlanCardSource.includes('Starter packet'), 'AI Studio should provide a usable starter packet, not just a theoretical feature card');
  assert.ok(aiStudioPlanCardSource.includes('Previewing packs, saving setup answers, copying install docs, or hitting a generation error does not use the monthly unlock'), 'AI Studio should clarify that previews/copy/errors do not consume a monthly unlock');
  assert.ok(aiStudioPlanCardSource.includes('explicit pack confirmation'), 'AI Studio should clarify that a monthly unlock needs explicit pack confirmation');
  for (const packetSection of ['Start Here', 'Business Profile', 'Project Instructions', 'First Test', 'Review Checklist']) {
    assert.ok(aiStudioPlanCardSource.includes(packetSection), 'AI Studio starter packet is missing section: ' + packetSection);
  }
  assert.ok(aiStudioPlanCardSource.includes('Copy packet'), 'AI Studio starter packet should be copyable for Claude/ChatGPT setup');
  assert.ok(aiStudioPlanCardSource.includes('without spending app credits'), 'AI Studio should explain the cost-safe install path');
  assert.ok(aiStudioPlanCardSource.includes('AI_STUDIO_CUSTOMIZATION_STORAGE_KEY'), 'AI Studio should preserve customization answers before generating install docs');
  assert.ok(aiStudioPlanCardSource.includes('Customize before installing'), 'AI Studio should include a plan-aware customization interview');
  assert.ok(aiStudioPlanCardSource.includes('Where I will install it'), 'AI Studio should ask where the member will install the asset');
  assert.ok(aiStudioPlanCardSource.includes('Business context this AI must remember'), 'AI Studio should collect business context before generating instructions');
  assert.ok(aiStudioPlanCardSource.includes('What it should not change without asking'), 'AI Studio should collect member authority guardrails');
  assert.ok(aiStudioPlanCardSource.includes('Custom install docs'), 'AI Studio should generate custom install docs');
  assert.ok(aiStudioPlanCardSource.includes('Copy install packet'), 'AI Studio should let members copy customized install docs');
  assert.ok(aiStudioPlanCardSource.includes('Download .md'), 'AI Studio should let members download install-ready markdown docs');
  assert.ok(aiStudioPlanCardSource.includes('downloadMarkdownFile'), 'AI Studio should use a local markdown download helper for install packets');
  assert.ok(aiStudioPlanCardSource.includes('Advanced install docs'), 'AI Studio should hide deeper install docs behind an advanced section');
  assert.ok(aiStudioPlanCardSource.includes('Setup interview'), 'AI Studio should render the selected pack setup interview');
  assert.ok(aiStudioPlanCardSource.includes('Setup Interview To Answer'), 'AI Studio advanced docs should include the setup interview questions');
  assert.ok(aiStudioPlanCardSource.includes('Output Quality Benchmark'), 'AI Studio should include a hidden benchmark for comparing generic AI to the full project pack');
  assert.ok(aiStudioPlanCardSource.includes('Same-context baseline'), 'AI Studio benchmark should compare against a plain same-context AI prompt');
  assert.ok(aiStudioPlanCardSource.includes('Profile-only'), 'AI Studio benchmark should compare against business-profile-only prompting');
  assert.ok(aiStudioPlanCardSource.includes('Full pack'), 'AI Studio benchmark should compare against the installed full project pack');
  assert.ok(aiStudioPlanCardSource.includes('Source Labels And Contradictions'), 'AI Studio should include source-label and contradiction handling instructions');
  assert.ok(aiStudioPlanCardSource.includes('plan evidence, buyer/customer evidence, member preference, or AI assumption'), 'AI Studio should require evidence labels in project instructions');
  assert.ok(aiStudioPlanCardSource.includes('one recommendation, why it fits the 90-day plan, one lower-capacity version, one evidence target, assumptions to test'), 'AI Studio should define an exact answer format for higher quality outputs');
  assert.ok(aiStudioSource.includes('What has someone paid for, asked for, clicked, replied to, or said they want?'), 'Offer Lab should ask evidence-first setup questions');
  assert.ok(aiStudioSource.includes('What is the revenue target, offer price, and number of sales needed this cycle?'), 'Sales Room should ask sales-math setup questions');
  assert.ok(aiStudioSource.includes('Which repeated workflow is connected to revenue, delivery, retention, or owner capacity?'), 'Workflow Systems Lab should ask workflow-specific setup questions');
  assert.ok(aiStudioPlanCardSource.includes('AI_STUDIO_WORKSPACE_TRACKER_STORAGE_KEY'), 'AI Studio should persist member workspace setup progress locally');
  assert.ok(aiStudioPlanCardSource.includes('mastermind-ai-studio-workspace-tracker-v1'), 'AI Studio workspace tracker should use a stable storage key');
  assert.ok(aiStudioPlanCardSource.includes('Created from this plan'), 'AI Studio should show what the member has created from the current 90-day plan');
  assert.ok(aiStudioPlanCardSource.includes('Setup answers saved'), 'AI Studio tracker should show whether setup answers were saved');
  assert.ok(aiStudioPlanCardSource.includes('Install docs copied or downloaded'), 'AI Studio tracker should show whether install docs were copied or downloaded');
  assert.ok(aiStudioPlanCardSource.includes('Workspace installed'), 'AI Studio tracker should show whether the workspace was installed');
  assert.ok(aiStudioPlanCardSource.includes('First test run'), 'AI Studio tracker should show whether the first supervised test was run');
  assert.ok(aiStudioPlanCardSource.includes('Mark workspace installed'), 'AI Studio tracker should let members mark the workspace installed');
  assert.ok(aiStudioPlanCardSource.includes('Mark first test complete'), 'AI Studio tracker should let members mark the first test complete');
  assert.ok(aiStudioPlanCardSource.includes("`${cycle?.cycle_id || 'active-cycle'}:${selectedPack.id}`"), 'AI Studio workspace tracker should be scoped to the current 90-day plan and selected pack');
  assert.ok(aiStudioPlanCardSource.includes('savePhaseOneState'), 'AI Studio workspace tracker should sync workspace setup to the app account');
  assert.ok(aiStudioPlanCardSource.includes('usePhaseOneState'), 'AI Studio workspace tracker should hydrate from saved Phase One state');
  assert.ok(aiStudioPlanCardSource.includes('Workspace ready is saved to this app account.'), 'AI Studio should tell members when workspace setup is durably saved');
  assert.ok(aiStudioPlanCardSource.includes('Full pack library access opens only when this app account has annual, lifetime, or approved full-library access.'), 'AI Studio should explain server-owned full-library access');
  assert.ok(aiStudioPlanCardSource.includes('setSelectedPackId'), 'AI Studio should let eligible members select an included project pack');
  assert.ok(aiStudioPlanCardSource.includes('aria-pressed={isSelected}'), 'AI Studio project pack selector should expose selected state accessibly');
  assert.ok(aiStudioPlanCardSource.includes("pack.visibility !== 'locked'"), 'AI Studio should prevent locked project packs from being selected');
  assert.ok(aiStudioPlanCardSource.includes('Selected from library'), 'AI Studio should explain when the member selected a non-recommended annual/library pack');
  assert.ok(mastermindHubSource.includes('useMastermindPortalAccess(aiStudioEnabled)'), 'MastermindHub should read the server-owned portal access receipt for AI Studio gating');
  assert.ok(mastermindHubSource.includes('memberScopes={portalAccessQuery.data?.memberScopes ?? []}'), 'MastermindHub should pass server member scopes into AI Studio');
  assert.ok(mastermindHubSource.includes('previewCapabilities={portalAccessQuery.data?.previewCapabilities ?? []}'), 'MastermindHub should pass server preview capabilities into AI Studio');
  assert.ok(mastermindPortalAccessSource.includes("supabase.functions.invoke('get-mastermind-portal-access'"), 'AI Studio access hook should reuse the existing portal access function');
  assert.ok(mastermindPortalAccessSource.includes('body: { preview: true }'), 'AI Studio access hook should ask the server to evaluate hidden preview capability');
  assert.ok(phaseOneCatalogSource.includes('save_my_mastermind_phase_one_state'), 'Phase One state hook should use the existing server save contract');
  assert.ok(phaseOneCatalogSource.includes("queryKey: ['phase-one-state']"), 'Phase One state hook should expose a stable query key');
  assert.ok(mastermindHubSource.includes('Built from this plan'), '90-day hub should summarize what has been created from the current plan');
  assert.ok(mastermindHubSource.includes('Your plan, tasks, training, and AI setup in one place.'), '90-day hub dashboard should connect planning, tasks, training, and AI setup');
  assert.ok(mastermindHubSource.includes('PlanDashboardItem'), '90-day hub should render compact dashboard status items');
  assert.ok(mastermindHubSource.includes('getWorkspaceStatusLabel'), '90-day hub should hydrate AI workspace status from saved app state');
  assert.ok(mastermindHubSource.includes('Task-ready'), '90-day hub should make the weekly Planner task handoff visible');
  assert.ok(mastermindHubSource.includes('Watched videos leave next-up lists.'), '90-day hub should tell members where completed videos went');
  assert.ok(mastermindHubSource.includes('What to do next'), '90-day hub should give members one immediate next-step panel');
  assert.ok(mastermindHubSource.includes('Do the next step, then bring back evidence.'), 'Next-step panel should connect action, training, and evidence');
  assert.ok(mastermindHubSource.includes('nextReadyPlanResource'), 'Next-step panel should choose the next unwatched resource from the saved focus');
  assert.ok(mastermindHubSource.includes('hasCompletedNextReadyResource'), 'Next-step panel should avoid presenting watched resources as new assignments');
  assert.ok(mastermindHubSource.includes('Use next'), 'Next-step panel should name the next resource without making members browse');
  assert.ok(mastermindHubSource.includes('Record this'), 'Next-step panel should make evidence capture visible before the long curriculum map');
  assert.ok(mastermindHubSource.includes('nextMoveMode'), 'Next-step panel should support a quick-win mode instead of one fixed action');
  assert.ok(mastermindHubSource.includes('Low capacity'), 'Next-step panel should expose the smaller next move for low-capacity weeks');
  assert.ok(mastermindHubSource.includes('currentNextMove'), 'Next-step panel should render the selected standard or low-capacity action');
  assert.ok(mastermindHubSource.includes('data-testid="mastermind-dashboard-weekly-move"'), '90-day hub should expose a dashboard-level weekly Planner handoff');
  assert.ok(mastermindHubSource.includes('addDashboardWeeklyMoveToPlanner'), '90-day hub should create the weekly move from the dashboard next-step panel');
  assert.ok(mastermindHubSource.includes('useResilientTaskMutation'), '90-day hub should reuse the resilient Planner task save path for dashboard weekly moves');
  assert.ok(mastermindHubSource.includes("system_source: 'mastermind-90-day-plan'"), 'Dashboard weekly move tasks should be labeled as Mastermind 90-day plan work');
  assert.ok(mastermindHubSource.includes('rememberWeeklyMoveTaskKey(dashboardWeeklyMoveTaskKey)'), 'Dashboard weekly move handoff should prevent repeat task creation after save or queued sync');
  assert.ok(mastermindHubSource.includes('useActiveCycle'), '90-day hub should use the Planner active cycle as a dashboard fallback');
  assert.ok(mastermindHubSource.includes('const dashboardCycle = useMemo<MastermindPlanCycle | null>'), '90-day hub should normalize a single dashboard cycle from success-path or active-cycle data');
  assert.ok(mastermindHubSource.includes('usePhaseOneState(Boolean(dashboardCycle?.cycle_id))'), 'Phase One state should hydrate from the dashboard cycle fallback');
  assert.ok(mastermindHubSource.includes('isLoading={successPathLoading && !dashboardCycle}'), 'Saved guidance loading should not hide the dashboard when the active 90-day plan is available');
  assert.ok(mastermindHubSource.includes('cycle={dashboardCycle}'), 'Mastermind child cards should receive the dashboard cycle fallback');
  assert.ok(mastermindSuccessPathHookSource.includes('Could not load saved Mastermind 90-day focus. Using the active plan fallback.'), 'Optional saved focus snapshots should fail soft and preserve the active 90-day plan');
  assert.ok(!mastermindSuccessPathHookSource.includes('if (snapshotError) throw snapshotError'), 'Optional saved focus snapshot errors must not erase the active 90-day plan');
  assert.ok(mastermindHubSource.includes('Ask Faith coaching brief'), '90-day hub should generate a plan-aware Ask Faith handoff brief');
  assert.ok(mastermindHubSource.includes('Copy Ask Faith brief'), '90-day hub should let members copy their coaching context before opening support');
  assert.ok(mastermindHubSource.includes('copyAskFaithBrief'), '90-day hub should provide a working clipboard handler for the Ask Faith brief');
  assert.ok(!mastermindHubSource.includes('Find the first broken link'), 'The member UI should not lead with internal diagnostic language');
  for (const hiddenAuditLabel of ['Transcript-ready', 'Dropbox rows', 'Content Repurpose DB audit', "label: 'Vault'", 'Mapped resources', 'private QA finder']) {
    assert.ok(!mastermindHubSource.includes(hiddenAuditLabel), 'Member UI should not expose audit label: ' + hiddenAuditLabel);
  }
  for (const hiddenSourceLabel of ['MASTERMIND_PORTAL_AUDIT', 'crdbDropboxRows', 'coachingRowsWithDropboxPaths', 'Content Repurpose', 'Dropbox', 'dropbox.com', 'bunny_video_id']) {
    assert.ok(!mastermindResourcesSource.includes(hiddenSourceLabel), 'Frontend resource data should not include private source/audit label: ' + hiddenSourceLabel);
  }
  assert.ok(mastermindHubSource.includes('className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"'), 'Primary Mastermind actions should stack cleanly on mobile');
  assert.ok(!mastermindHubSource.includes("navigate('/mastermind/replay-vault')"), '90-day guidance must keep the Replay Vault hidden until launch is enabled');
  assert.ok(!mastermindHubSource.includes('VITE_ENABLE_MASTERMIND_VIDEO_SEARCH'), 'MastermindHub must not retain the static video-search feature flag');
  assert.ok(!mastermindHubSource.includes('MastermindVideoSearch'), 'MastermindHub must not mount the static Replay Vault pilot');

  const requiredMastermindHubLayoutGuards = [
    'className="grid w-full grid-cols-3 sm:max-w-lg"',
    'className="pl-10 pr-10"',
    'className="min-h-9 whitespace-normal text-left leading-tight"',
    'className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"',
    'No ready trainings match',
    'className="min-w-0 flex-1 break-words leading-snug"',
    'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
  ];
  for (const guard of requiredMastermindHubLayoutGuards) {
    assert.ok(mastermindHubSource.includes(guard), 'MastermindHub is missing responsive/accessibility guard: ' + guard);
  }

  const requiredSuccessPathLayoutGuards = [
    'className="max-w-3xl"',
    'className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"',
    'className="rounded-lg border bg-background p-4"',
    'className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"',
    'className="border-t bg-background/60 px-6 py-4 md:px-8"',
  ];
  for (const guard of requiredSuccessPathLayoutGuards) {
    assert.ok(successPathPlanCardSource.includes(guard), 'SuccessPathPlanCard is missing responsive layout guard: ' + guard);
  }

  for (const [sourceName, source] of [
    ['MastermindHub', mastermindHubSource],
    ['SuccessPathPlanCard', successPathPlanCardSource],
    ['MastermindSupportBot', mastermindSupportBotSource],
  ]) {
    for (const riskyClass of ['whitespace-nowrap', 'text-nowrap', 'w-[', 'min-w-[']) {
      assert.ok(!source.includes(riskyClass), sourceName + ' should not use layout class that risks mobile overflow: ' + riskyClass);
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
