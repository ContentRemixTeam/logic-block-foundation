// Regression guard: the ready, protected core_curriculum resources must never
// disappear from the hidden Mastermind Training Library, and the Phase One
// catalog must keep every approved/pending Foundation item.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const curriculum = read("../src/data/phaseOneCurriculum.ts");
const app = read("../src/App.tsx");
const preview = read("../src/pages/MastermindPhaseOnePreview.tsx");
const hub = read("../src/pages/MastermindHub.tsx");
const resources = read("../src/data/mastermindPortalResources.ts");
const portalVerifier = read("./verify-mastermind-portal.mjs");

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
const PHASE_ONE_PENDING = [
  "wibn-three-part-business-growth-engine",
  "wibn-ceo-embodiment",
  "wibn-business-vision",
  "mastermind-success-plan-module-one",
  "mastermind-success-plan-module-two",
  "mastermind-success-plan-module-three",
  "wibn-week-one-qa",
];

const PHASE_ONE_PLAYABLE = PLAYABLE.slice(0, 5);
const readyResourcesBlock = portalVerifier.match(/const readyProtectedCurriculumResourceIds = \[[\s\S]*?\];/)?.[0] ?? "";
assert.ok(readyResourcesBlock, "portal verifier must define readyProtectedCurriculumResourceIds");
assert.ok(resources.includes("const coreTraining ="), "coreTraining helper must exist for ready curriculum videos");
assert.ok(resources.includes("accessScope: 'core_curriculum'"), "coreTraining helper must keep core curriculum access");
assert.ok(resources.includes("surface: 'curriculum'"), "coreTraining helper must keep the curriculum surface");
assert.ok(resources.includes("status: 'ready'"), "coreTraining helper must keep ready playback status");

for (const id of [...PHASE_ONE_PLAYABLE, ...PHASE_ONE_PENDING]) {
  const occurrences = curriculum.split(`resourceId: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `hidden Phase One catalog must contain exactly one entry for ${id}`);
}

for (const id of PLAYABLE) {
  const occurrences = resources.split(`id: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `hidden Training Library must contain exactly one resource for ${id}`);

  const resourceBlock = resources.slice(resources.indexOf(`id: '${id}'`), resources.indexOf(`id: '${id}'`) + 1200);
  const usesReadyHelper = resources.includes(`coreTraining({\n    id: '${id}'`);
  const hasExplicitReadyPlayback =
    resourceBlock.includes("accessScope: 'core_curriculum'") &&
    resourceBlock.includes("surface: 'curriculum'") &&
    resourceBlock.includes("status: 'ready'");
  assert.ok(usesReadyHelper || hasExplicitReadyPlayback, `${id} must stay connected to ready core-curriculum playback`);
  assert.ok(readyResourcesBlock.includes(`'${id}'`), `${id} must stay in the ready protected-curriculum verifier list`);
}

for (const id of ["money-move-day-one", "money-move-day-two", "money-move-day-three"]) {
  const block = curriculum.slice(curriculum.indexOf(`resourceId: '${id}'`), curriculum.indexOf(`resourceId: '${id}'`) + 900);
  assert.equal(block.match(/requirement: '(\w+)'/)?.[1], "optional", `${id} must stay optional Offer & sell support`);
}

// Merged count is displayed from the catalog, never hardcoded.
assert.ok(preview.includes("{PHASE_ONE_LESSONS.length} approved items"), "approved-item count must come from the merged catalog");
assert.equal(/\d+ approved items only/.test(preview), false, "hardcoded approved-item count must not return");

// Money Moves keep the Offer & sell support treatment and the hidden route.
assert.ok(preview.includes("lesson.resourceId.startsWith('money-move-')"), "Money Moves must keep the Offer & sell support badge");
assert.ok(preview.includes("?resource=${encodeURIComponent(resourceId)}&from=phase-one"), "lessons must open the hidden training preview route");
assert.ok(
  app.includes('path="/admin/mastermind-phase-one-preview"') &&
    app.includes('to="/admin/mastermind-90-day-plan-preview"'),
  "the old Phase One preview URL must redirect to the real hidden 90-day hub",
);
assert.ok(
  hub.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"),
  "the real hidden 90-day hub must open protected lessons through the hidden training route",
);

// Completed-last / ready-first sorting and server completion hydration preserved.
assert.ok(
  preview.includes("if (watchedA !== watchedB) return watchedA - watchedB;") &&
    preview.includes("if (readyA !== readyB) return readyA - readyB;"),
  "completed deprioritization must be preserved",
);
assert.ok(preview.includes("usePhaseOneCatalog"), "server completion hydration must be preserved");

console.log(`verify:phase-one-playable-ids OK (${PLAYABLE.length} protected Training Library videos + ${PHASE_ONE_PENDING.length} pending Foundation items)`);
