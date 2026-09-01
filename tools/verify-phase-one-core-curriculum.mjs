// Regression guard for the real hidden Mastermind 90-day hub.
// This checks the production code path, not the retired Phase One prototype.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

for (const file of [
  "src/pages/MastermindPhaseOnePreview.tsx",
  "src/data/phaseOneCurriculum.ts",
]) {
  assert.equal(existsSync(path.join(root, file)), false, `${file} should stay removed; use the real hidden hub instead`);
}

const app = read("src/App.tsx");
const hub = read("src/pages/MastermindHub.tsx");
const training = read("src/pages/MastermindTraining.tsx");
const resources = read("src/data/mastermindPortalResources.ts");
const core = read("src/components/replay-vault/replayVaultCore.mjs");
const catalogHook = read("src/hooks/usePhaseOneCatalog.ts");
const curriculumTranscript = read("src/components/mastermind/MastermindCurriculumTranscript.tsx");
const catalogScaleMigration = read("supabase/migrations/20260901105500_mastermind_curriculum_catalog_scale_limit.sql");

const READY_CORE_IDS = [
  "ninety-day-goal-setting-introduction",
  "ninety-day-goal-setting-workshop",
  "money-move-day-one",
  "money-move-day-two",
  "money-move-day-three",
  "great-marketing-breakthrough-day-two",
  "great-marketing-breakthrough-day-three",
  "get-social-media-done-workshop-one",
  "get-social-media-done-workshop-two",
  "get-social-media-done-workshop-three",
  "get-your-freebie-non-boring-idea",
  "get-your-freebie-welcome-email",
  "bosses-make-sales-day-one",
  "bosses-make-sales-day-two",
  "bosses-make-sales-day-three",
  "launch-aligned-half-ass-launch",
  "launch-aligned-debrief",
  "program-upgrade-strategic-improvement",
  "program-upgrade-onboarding-upgrade",
  "program-upgrade-surprise-and-delight",
  "program-upgrade-offboard-like-a-boss",
  "do-less-make-more-workshop",
  "do-less-make-more-bonus-coaching",
];

for (const id of READY_CORE_IDS) {
  const occurrences = resources.split(`id: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `expected exactly one real hub resource for ${id}`);
  const block = resources.slice(resources.indexOf(`id: '${id}'`), resources.indexOf(`id: '${id}'`) + 1400);
  const usesCoreHelper = resources.includes(`coreTraining({\n    id: '${id}'`);
  const hasReadyContract =
    block.includes("accessScope: 'core_curriculum'") &&
    block.includes("surface: 'curriculum'") &&
    block.includes("status: 'ready'");
  assert.ok(usesCoreHelper || hasReadyContract, `${id} must stay connected to protected core-curriculum playback`);
}

assert.ok(
  app.includes('path="/admin/mastermind-phase-one-preview"') &&
    app.includes('to="/admin/mastermind-90-day-plan-preview"'),
  "the old Phase One URL must redirect to the real hidden 90-day hub",
);
assert.equal(app.includes("MastermindPhaseOnePreview"), false, "App must not lazy-load the retired prototype page");
assert.ok(
  app.includes('path="/admin/mastermind-90-day-plan-preview"') &&
    app.includes("<AdminPreviewGate>") &&
    app.includes("<MastermindHub />"),
  "real hidden hub must remain behind the admin preview gate",
);
assert.ok(
  hub.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"),
  "real hidden hub must open lessons through the hidden protected training route",
);
assert.ok(
  hub.includes("isReadyMastermindCurriculumVideoResource(resource) && playableResourceIds.has(resource.id)"),
  "real hidden hub must only show server-authorized playable curriculum videos",
);
assert.ok(
  hub.includes("!completedResourceIds.has(resource.id)") && hub.includes("setShowWatchedResources"),
  "watched videos must leave the default next-up list while staying recoverable",
);
for (const phrase of [
  "currentRound.question",
  "currentRound.buildAction",
  "currentRound.evidence",
  "currentRound.rescue",
  "Do the next step for this round, then bring back evidence.",
]) {
  assert.ok(hub.includes(phrase), `real hidden hub must keep milestone-specific guidance: ${phrase}`);
}

assert.ok(
  training.includes("searchParams.get('from') === 'phase-one'") &&
    training.includes("? '/admin/mastermind-90-day-plan-preview'") &&
    training.includes("surface: 'curriculum'"),
  "hidden training route must preserve return context and use the curriculum playback surface",
);

const pattern = core.match(/const ID_PATTERN = (\/.*\/);?/)?.[1];
assert.ok(pattern, "ID_PATTERN not found in replayVaultCore.mjs");
const regex = new RegExp(pattern.slice(1, pattern.lastIndexOf("/")), pattern.slice(pattern.lastIndexOf("/") + 1));
for (const id of READY_CORE_IDS) assert.ok(regex.test(id), `${id} must be accepted by the protected route id validator`);

for (const contract of [
  "search_my_mastermind_phase_one_resources",
  "save_my_mastermind_phase_one_video_progress",
  "p_limit: 200",
]) {
  assert.ok(catalogHook.includes(contract), `catalog/progress hook must keep ${contract}`);
}
assert.ok(catalogScaleMigration.includes("),200)"), "hidden curriculum catalog RPC must allow enough rows for the expanded curriculum");
for (const contract of [
  "usePhaseOneCatalog",
  "row.portal_resource_id === resourceId && row.completed === true",
  "if (serverCompleted) setProgressSaved(true)",
  "savePhaseOneVideoProgress",
  "invalidateQueries({ queryKey: ['phase-one-catalog'] })",
  "PLAYBACK_REQUEST_TIMEOUT_MS",
  "playback_request_timeout",
  "This training is taking longer than expected to open. Your access has not changed.",
]) {
  assert.ok(training.includes(contract), `training preview must keep completion contract: ${contract}`);
}
assert.ok(
  /setProgressSaved\(false\);\s*\}, \[resourceId\]\)/.test(training),
  "completion state must reset per resource so one lesson never marks another complete",
);
assert.ok(
  training.includes("isAdminTrainingPreview &&") && training.includes("<MastermindCurriculumTranscript"),
  "curriculum transcript timestamps must stay hidden-admin-preview only until member transcript access is explicitly approved",
);
assert.ok(
  curriculumTranscript.includes("supabase.functions.invoke('vault-member-library'") &&
    curriculumTranscript.includes("action: 'transcript'") &&
    curriculumTranscript.includes("data-curriculum-transcript"),
  "curriculum transcript UI must reuse the protected transcript endpoint and mount with a QA selector",
);
assert.equal(
  curriculumTranscript.includes("get_my_mastermind_curriculum_transcript"),
  false,
  "curriculum transcript UI must not depend on a broad direct transcript RPC",
);

console.log(`verify:phase-one-core-curriculum OK (${READY_CORE_IDS.length} real hidden hub videos verified)`);
