// Regression guard for the hidden Phase One core_curriculum contract.
// Ensures the five approved hidden resource IDs stay in the static playlist,
// keep their requirement track, and remain resolvable through the hidden
// training preview route (?resource=<id>&from=phase-one).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");

const curriculum = read("../src/data/phaseOneCurriculum.ts");
const preview = read("../src/pages/MastermindPhaseOnePreview.tsx");
const training = read("../src/pages/MastermindTraining.tsx");
const core = read("../src/components/replay-vault/replayVaultCore.mjs");

const EXPECTED = [
  { id: "ninety-day-goal-setting-introduction", requirement: "required" },
  { id: "ninety-day-goal-setting-workshop", requirement: "required" },
  { id: "money-move-day-one", requirement: "optional" },
  { id: "money-move-day-two", requirement: "optional" },
  { id: "money-move-day-three", requirement: "optional" },
];

// 1. Every approved hidden ID is present exactly once with the expected track.
for (const { id, requirement } of EXPECTED) {
  const occurrences = curriculum.split(`resourceId: '${id}'`).length - 1;
  assert.equal(occurrences, 1, `expected exactly one catalog entry for ${id}`);
  const block = curriculum.slice(curriculum.indexOf(`resourceId: '${id}'`));
  const declared = block.match(/requirement: '(\w+)'/)?.[1];
  assert.equal(declared, requirement, `${id} must be requirement="${requirement}"`);
  const hasAction = /afterWatchingAction:/.test(block.slice(0, 900));
  assert.ok(hasAction, `${id} must keep its protected after-watching action metadata`);
}

// 2. Route contract: the hidden preview links every catalog lesson into the
//    training preview route with the phase-one return context.
assert.ok(
  preview.includes("?resource=${encodeURIComponent(resourceId)}&from=phase-one"),
  "Phase One preview must link lessons through the hidden training preview route",
);
assert.ok(
  training.includes("searchParams.get('from') === 'phase-one'"),
  "training preview must honor the phase-one return context",
);
assert.ok(
  training.includes("surface: 'curriculum'"),
  "training preview must resolve playback through the core_curriculum contract",
);

// 3. Every approved ID must satisfy the stable-vault-id shape used by the route.
const pattern = core.match(/const ID_PATTERN = (\/.*\/);?/)?.[1];
assert.ok(pattern, "ID_PATTERN not found in replayVaultCore.mjs");
const regex = new RegExp(pattern.slice(1, pattern.lastIndexOf("/")), pattern.slice(pattern.lastIndexOf("/") + 1));
for (const { id } of EXPECTED) {
  assert.ok(regex.test(id), `${id} must be a stable vault id accepted by the preview route`);
}

// 4. Optional lessons stay reachable and completed/ready-first sorting is kept.
assert.ok(preview.includes("hasOptionalLessons"), "optional-track lessons must remain reachable in the playlist UI");
assert.ok(
  preview.includes("if (watchedA !== watchedB) return watchedA - watchedB;") &&
    preview.includes("if (readyA !== readyB) return readyA - readyB;"),
  "completed-last / ready-first playlist sorting must be preserved",
);

// 5. Hidden posture: no member navigation or publication implied by the catalog.
for (const forbidden of ["member_visible_default", "publish", "VITE_ENABLE_MASTERMIND_VIDEO_SEARCH"]) {
  assert.equal(curriculum.includes(forbidden), false, `catalog must not reference ${forbidden}`);
}

console.log(`verify:phase-one-core-curriculum OK (${EXPECTED.length} hidden IDs verified)`);
