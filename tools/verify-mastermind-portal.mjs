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
const aiStudioSourcePath = path.join(projectRoot, 'src/lib/mastermindAiStudio.ts');
const aiStudioPlanCardSourcePath = path.join(projectRoot, 'src/components/mastermind/AiStudioPlanCard.tsx');
const phaseOneCatalogSourcePath = path.join(projectRoot, 'src/hooks/usePhaseOneCatalog.ts');

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
const plannerAccess = getAiStudioAccessSummary(null, false);
assert.equal(monthlyAccess.canSeeFullLibrary, false, 'monthly members should not receive the full AI library by default');
assert.equal(monthlyAccess.canUnlockMonthlyPack, true, 'monthly members should be able to unlock one recommended pack');
assert.equal(annualAccess.canSeeFullLibrary, true, 'annual/lifetime members should be eligible for the full approved AI library');
assert.equal(plannerAccess.canUnlockMonthlyPack, false, 'planner-only members should not unlock Mastermind AI packs');
assert.equal(getRecommendedAiProjectPack('offer', cycle({ biggest_bottleneck: 'offer clarity' })).id, 'offer-lab');
const monthlyPacks = getVisibleAiProjectPacks(monthlyAccess, 'offer-lab');
assert.equal(monthlyPacks.find((pack) => pack.id === 'ninety-day-ceo-workspace')?.visibility, 'included');
assert.equal(monthlyPacks.find((pack) => pack.id === 'offer-lab')?.visibility, 'recommended_unlock');
assert.equal(monthlyPacks.find((pack) => pack.id === 'sales-room')?.visibility, 'locked');
assert.ok(getVisibleAiProjectPacks(annualAccess, 'offer-lab').every((pack) => pack.visibility === 'included'), 'annual access should include every AI project pack');
for (const pack of AI_PROJECT_PACKS) {
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
  const mastermindResourcesSource = readFileSync(mastermindResourcesSourcePath, 'utf8');
  const successPathPlanCardSource = readFileSync(successPathPlanCardSourcePath, 'utf8');
  const aiStudioSource = readFileSync(aiStudioSourcePath, 'utf8');
  const aiStudioPlanCardSource = readFileSync(aiStudioPlanCardSourcePath, 'utf8');
  const phaseOneCatalogSource = readFileSync(phaseOneCatalogSourcePath, 'utf8');
  assert.ok(mastermindHubSource.includes("label: 'Search-ready'"), 'Resource filter should use clear member-facing search language');
  assert.ok(mastermindHubSource.includes('Choose the smallest useful next resource'), 'Resource map should explain member value, not audit mechanics');
  assert.ok(mastermindHubSource.includes('Watch the videos that are ready inside this app.'), 'Training finder should set the expectation that every card is playable now');
  assert.ok(mastermindHubSource.includes('This finder only shows curriculum videos that open in the in-app player'), 'Training finder should not present planning/support links as playable curriculum');
  assert.ok(mastermindHubSource.includes('MASTERMIND_PORTAL_RESOURCES.filter(isReadyMastermindCurriculumVideoResource)'), 'Training finder should only render ready protected curriculum videos');
  assert.ok(mastermindHubSource.includes('Curriculum sections'), '90-day page should show the member the curriculum sections before the full finder');
  assert.ok(mastermindHubSource.includes('Training by focus area'), 'Training tab should expose the real curriculum by section');
  assert.ok(mastermindHubSource.includes('Browse by section without changing the saved focus'), 'Browsing training sections should not mutate the saved 90-day focus');
  assert.ok(mastermindHubSource.includes('videos ready now'), 'Curriculum section map should count only videos that are ready now');
  assert.ok(mastermindHubSource.includes('Next useful video'), 'Curriculum section map should point to the next useful video');
  assert.ok(mastermindHubSource.includes('Section complete'), 'Curriculum section map should not reassign watched videos after a section is complete');
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
  assert.ok(mastermindHubSource.includes('const AccessBoundary = isAdminPreview ? PreviewAccessBoundary : MastermindGate'), 'Admin 90-day preview must rely on the route allowlist instead of the inner member gate');
  assert.ok(mastermindHubSource.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"), 'Admin 90-day preview must keep curriculum clicks on the hidden training route');
  assert.ok(mastermindHubSource.includes('completedResourceIds.has(resource.resourceId)'), '90-day guidance should label watched recommendation videos');
  assert.ok(mastermindHubSource.includes("'Watch again'"), 'Watched recommendation videos should not look like new assignments');
  assert.ok(mastermindHubSource.includes('aria-label="Clear resource search"'), 'Clear search icon button needs an accessible label');
  assert.ok(mastermindHubSource.includes('aria-label={isPinned ? `Unpin ${resource.title}`'), 'Pin icon button needs resource-specific accessible labels');
  assert.ok(successPathPlanCardSource.includes('Do this this week'), 'The 90-day guidance card should name one concrete weekly move');
  assert.ok(successPathPlanCardSource.includes('Bring back this evidence'), 'The 90-day guidance card should define the evidence target');
  assert.ok(successPathPlanCardSource.includes('Update My 90-Day Plan'), 'The 90-day guidance card needs an honest direct plan-editing action');
  assert.ok(successPathPlanCardSource.includes('Open training'), 'The 90-day guidance card should include a direct supporting-training action');
  assert.ok(successPathPlanCardSource.includes("primaryResource.resourceId === 'faith-ai'"), 'The 90-day guidance card should treat Faith AI as setup, not a video lesson');
  assert.ok(successPathPlanCardSource.includes('Set up if needed'), 'The 90-day guidance card should label AI recommendations as setup');
  assert.ok(successPathPlanCardSource.includes('Open AI settings'), 'The 90-day guidance card should send AI recommendations to settings');
  assert.ok(successPathPlanCardSource.includes('After setup: '), 'The 90-day guidance card should not use watch-language for AI setup recommendations');
  assert.ok(aiStudioSource.includes('Monthly members get the planner-safe workspace plus one recommended project pack unlock per active month'), 'AI Studio should encode monthly limited access copy');
  assert.ok(aiStudioSource.includes('90-Day CEO Workspace'), 'AI Studio should include a planner-safe foundation workspace');
  assert.ok(aiStudioPlanCardSource.includes('Starter packet'), 'AI Studio should provide a usable starter packet, not just a theoretical feature card');
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
  assert.ok(aiStudioPlanCardSource.includes('Copy custom install docs'), 'AI Studio should let members copy customized install docs');
  assert.ok(aiStudioPlanCardSource.includes('AI_STUDIO_WORKSPACE_TRACKER_STORAGE_KEY'), 'AI Studio should persist member workspace setup progress locally');
  assert.ok(aiStudioPlanCardSource.includes('mastermind-ai-studio-workspace-tracker-v1'), 'AI Studio workspace tracker should use a stable storage key');
  assert.ok(aiStudioPlanCardSource.includes('Created from this plan'), 'AI Studio should show what the member has created from the current 90-day plan');
  assert.ok(aiStudioPlanCardSource.includes('Setup answers saved'), 'AI Studio tracker should show whether setup answers were saved');
  assert.ok(aiStudioPlanCardSource.includes('Install docs copied'), 'AI Studio tracker should show whether install docs were copied');
  assert.ok(aiStudioPlanCardSource.includes('Workspace installed'), 'AI Studio tracker should show whether the workspace was installed');
  assert.ok(aiStudioPlanCardSource.includes('First test run'), 'AI Studio tracker should show whether the first supervised test was run');
  assert.ok(aiStudioPlanCardSource.includes('Mark workspace installed'), 'AI Studio tracker should let members mark the workspace installed');
  assert.ok(aiStudioPlanCardSource.includes('Mark first test complete'), 'AI Studio tracker should let members mark the first test complete');
  assert.ok(aiStudioPlanCardSource.includes("`${cycle?.cycle_id || 'active-cycle'}:${recommendedPack.id}`"), 'AI Studio workspace tracker should be scoped to the current 90-day plan and recommended pack');
  assert.ok(aiStudioPlanCardSource.includes('savePhaseOneState'), 'AI Studio workspace tracker should sync workspace setup to the app account');
  assert.ok(aiStudioPlanCardSource.includes('usePhaseOneState'), 'AI Studio workspace tracker should hydrate from saved Phase One state');
  assert.ok(aiStudioPlanCardSource.includes('Workspace ready is saved to this app account.'), 'AI Studio should tell members when workspace setup is durably saved');
  assert.ok(phaseOneCatalogSource.includes('save_my_mastermind_phase_one_state'), 'Phase One state hook should use the existing server save contract');
  assert.ok(phaseOneCatalogSource.includes("queryKey: ['phase-one-state']"), 'Phase One state hook should expose a stable query key');
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
  ]) {
    for (const riskyClass of ['whitespace-nowrap', 'text-nowrap', 'w-[', 'min-w-[']) {
      assert.ok(!source.includes(riskyClass), sourceName + ' should not use layout class that risks mobile overflow: ' + riskyClass);
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
