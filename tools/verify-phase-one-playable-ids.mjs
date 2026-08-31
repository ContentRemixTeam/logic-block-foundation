// Regression guard: the five already-imported, protected core_curriculum
// resources must never disappear from the hidden Phase One catalog, and the
// merged catalog must keep every approved/pending curriculum item.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const curriculum = read("../src/data/phaseOneCurriculum.ts");
const app = read("../src/App.tsx");
const preview = read("../src/pages/MastermindPhaseOnePreview.tsx");
const hub = read("../src/pages/MastermindHub.tsx");

const PLAYABLE = [
  "ninety-day-goal-setting-introduction",
  "ninety-day-goal-setting-workshop",
  "money-move-day-one",
  "money-move-day-two",
  "money-move-day-three",
];
const PENDING = [
  "wibn-three-part-business-growth-engine",
  "wibn-ceo-embodiment",
  "wibn-business-vision",
  "mastermind-success-plan-module-one",
  "mastermind-success-plan-module-two",
  "mastermind-success-plan-module-three",
  "wibn-week-one-qa",
];

for (const id of [...PLAYABLE, ...PENDING]) {
  const occurrences = curriculum.split(`resourceId: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `hidden Phase One catalog must contain exactly one entry for ${id}`);
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

console.log(`verify:phase-one-playable-ids OK (${PLAYABLE.length} playable + ${PENDING.length} pending items)`);
