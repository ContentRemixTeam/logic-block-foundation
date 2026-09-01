// Regression guard: every approved core-curriculum video must stay playable
// through the real hidden Mastermind hub and protected Training Library.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

assert.equal(existsSync(path.join(root, "src/data/phaseOneCurriculum.ts")), false, "retired static Phase One catalog should not return");
assert.equal(existsSync(path.join(root, "src/pages/MastermindPhaseOnePreview.tsx")), false, "retired Phase One preview page should not return");

const app = read("src/App.tsx");
const hub = read("src/pages/MastermindHub.tsx");
const resources = read("src/data/mastermindPortalResources.ts");
const portalVerifier = read("tools/verify-mastermind-portal.mjs");

const PLAYABLE = [
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

const PENDING_NOT_PLAYER = [
  "success-plan",
  "ninety-day-planning",
  "wibn-offer-clarity",
  "messy-action-sprints",
];

const readyResourcesBlock = portalVerifier.match(/const readyProtectedCurriculumResourceIds = \[[\s\S]*?\];/)?.[0] ?? "";
assert.ok(readyResourcesBlock, "portal verifier must define readyProtectedCurriculumResourceIds");
assert.ok(resources.includes("const coreTraining ="), "coreTraining helper must exist for ready curriculum videos");
assert.ok(resources.includes("accessScope: 'core_curriculum'"), "coreTraining helper must keep core curriculum access");
assert.ok(resources.includes("surface: 'curriculum'"), "coreTraining helper must keep the curriculum surface");
assert.ok(resources.includes("status: 'ready'"), "coreTraining helper must keep ready playback status");

for (const id of PLAYABLE) {
  const occurrences = resources.split(`id: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `hidden Training Library must contain exactly one resource for ${id}`);
  const resourceBlock = resources.slice(resources.indexOf(`id: '${id}'`), resources.indexOf(`id: '${id}'`) + 1400);
  const usesReadyHelper = resources.includes(`coreTraining({\n    id: '${id}'`);
  const hasExplicitReadyPlayback =
    resourceBlock.includes("accessScope: 'core_curriculum'") &&
    resourceBlock.includes("surface: 'curriculum'") &&
    resourceBlock.includes("status: 'ready'");
  assert.ok(usesReadyHelper || hasExplicitReadyPlayback, `${id} must stay connected to ready core-curriculum playback`);
  assert.ok(readyResourcesBlock.includes(`'${id}'`), `${id} must stay in the ready protected-curriculum verifier list`);
}

for (const id of PENDING_NOT_PLAYER) {
  const occurrences = resources.split(`id: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `pending non-player resource should remain represented once: ${id}`);
  const resourceBlock = resources.slice(resources.indexOf(`id: '${id}'`), resources.indexOf(`id: '${id}'`) + 1400);
  assert.ok(resourceBlock.includes("status: 'pending_import'"), `${id} must not be treated as playable yet`);
}

assert.ok(
  app.includes('path="/admin/mastermind-phase-one-preview"') && app.includes('to="/admin/mastermind-90-day-plan-preview"'),
  "the old Phase One preview URL must redirect to the real hidden 90-day hub",
);
assert.ok(
  hub.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"),
  "the real hidden 90-day hub must open protected lessons through the hidden training route",
);
assert.ok(
  hub.includes("isReadyMastermindCurriculumVideoResource(resource) && playableResourceIds.has(resource.id)"),
  "the Training finder should only render videos ready in the protected in-app player",
);
assert.ok(
  hub.includes("const defaultUnwatchedResources = useMemo") &&
    hub.includes("!completedResourceIds.has(resource.id)") &&
    hub.includes("const hiddenWatchedResourceCount = useMemo"),
  "completed videos must leave the default next-up list and remain recoverable",
);
assert.ok(hub.includes("usePhaseOneCatalog"), "server completion hydration must be preserved");
assert.ok(hub.includes("Curriculum sections"), "members need a browsable curriculum section map");
assert.ok(hub.includes("Training by focus area"), "members need the curriculum organized by focus area");
assert.ok(
  !hub.includes("label: '30-day'"),
  "Training finder should not show a 30-day replay filter until recent replays are integrated safely",
);

console.log(`verify:phase-one-playable-ids OK (${PLAYABLE.length} protected Training Library videos)`);
