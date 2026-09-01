// Regression guard for the hidden Phase One core_curriculum contract.
// Ensures the five approved hidden resource IDs stay in the static playlist,
// keep their requirement track, and remain resolvable through the hidden
// training preview route (?resource=<id>&from=phase-one).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");

const curriculum = read("../src/data/phaseOneCurriculum.ts");
const app = read("../src/App.tsx");
const preview = read("../src/pages/MastermindPhaseOnePreview.tsx");
const hub = read("../src/pages/MastermindHub.tsx");
const training = read("../src/pages/MastermindTraining.tsx");
const core = read("../src/components/replay-vault/replayVaultCore.mjs");
const catalogHook = read("../src/hooks/usePhaseOneCatalog.ts");
const catalogScaleMigration = read("../supabase/migrations/20260901105500_mastermind_curriculum_catalog_scale_limit.sql");

const EXPECTED = [
  { id: "ninety-day-goal-setting-introduction", requirement: "required" },
  { id: "ninety-day-goal-setting-workshop", requirement: "conditional" },
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

// 2. Route contract: the old Phase One preview URL redirects to the real
//    hidden 90-day hub, and the retained legacy preview file still links
//    its lessons through the training preview route if opened in isolation.
assert.ok(
  app.includes('path="/admin/mastermind-phase-one-preview"') &&
    app.includes('to="/admin/mastermind-90-day-plan-preview"'),
  "old Phase One preview URL must redirect to the real hidden 90-day plan hub",
);
assert.ok(
  preview.includes("?resource=${encodeURIComponent(resourceId)}&from=phase-one"),
  "Phase One preview must link lessons through the hidden training preview route",
);
assert.ok(
  hub.includes("navigate(`/admin/mastermind-training-preview?${params.toString()}`)"),
  "real hidden 90-day hub must open protected training through the hidden training route",
);
assert.ok(
  training.includes("searchParams.get('from') === 'phase-one'"),
  "training preview must honor the phase-one return context",
);
assert.ok(
  training.includes("? '/admin/mastermind-90-day-plan-preview'"),
  "phase-one return context must now go back to the real hidden 90-day hub",
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

// 5b. Preview must never reference placeholder wibn-* resources, must not ship the
//     stale "9 approved items only" badge, and must not gate Find results on the
//     static lessonState instead of the server catalog.
assert.equal(/\d+ approved items only/.test(preview), false, "hardcoded approved-item count must be removed");
assert.equal(preview.includes("lessonState"), false, "Find results must use server catalog readiness, not static lessonState");
assert.ok(
  preview.includes("isPlaybackReady(lesson.resourceId)") && preview.includes("catalogById.has(id)"),
  "Find/coaching panels must resolve readiness from the server catalog",
);
assert.equal(
  preview.includes("Playback remains unavailable until its protected import passes."),
  false,
  "stale unconditional unavailable-playback copy must be removed",
);
const coachingBlock = preview.match(/const COACHING_RESPONSES[\s\S]*?\n\};/)?.[0] ?? "";
const coachingIds = [...coachingBlock.matchAll(/resourceId: '([^']+)'/g)].map((match) => match[1]);
assert.ok(coachingIds.length > 0, "coaching preview must recommend Phase One resources");
for (const id of coachingIds) {
  assert.ok(EXPECTED.some((item) => item.id === id), `coaching recommendation ${id} must be a real Phase One resource id`);
}


console.log(`verify:phase-one-core-curriculum OK (${EXPECTED.length} hidden IDs verified)`);

// 6. Completion persistence contract: the hidden training preview must hydrate
//    the checkoff from the server-authorized Phase One catalog (save receipt ->
//    reload -> persisted completed state) for all five hidden resource IDs, and
//    the playlist must keep completed lessons sorted last.
const trainingSource = read("../src/pages/MastermindTraining.tsx");
const curriculumTranscript = read("../src/components/mastermind/MastermindCurriculumTranscript.tsx");
for (const contract of [
  "usePhaseOneCatalog",
  "row.portal_resource_id === resourceId && row.completed === true",
  "if (serverCompleted) setProgressSaved(true)",
  "savePhaseOneVideoProgress",
  "invalidateQueries({ queryKey: ['phase-one-catalog'] })",
]) {
  assert.ok(trainingSource.includes(contract), `training preview must keep completion contract: ${contract}`);
}
assert.ok(
  /setProgressSaved\(false\);\s*\}, \[resourceId\]\)/.test(trainingSource),
  "completion state must reset per resource so one lesson never marks another complete",
);
assert.ok(
  catalogHook.includes("search_my_mastermind_phase_one_resources") &&
    catalogHook.includes("save_my_mastermind_phase_one_video_progress"),
  "progress contract must stay on the validated server RPCs",
);
assert.ok(
  catalogHook.includes("p_limit: 200") && catalogScaleMigration.includes("),200)"),
  "hidden curriculum catalog must request and allow enough rows for the expanded core curriculum",
);
assert.ok(
  trainingSource.includes("isAdminTrainingPreview &&") &&
    trainingSource.includes("<MastermindCurriculumTranscript"),
  "curriculum transcript timestamps must stay hidden-admin-preview only until member transcript access is explicitly approved",
);
assert.ok(
  curriculumTranscript.includes("supabase.functions.invoke('vault-member-library'") &&
    curriculumTranscript.includes("action: 'transcript'") &&
    curriculumTranscript.includes("data-curriculum-transcript"),
  "curriculum training transcript must reuse the protected transcript endpoint and mount with a QA selector",
);
assert.equal(
  curriculumTranscript.includes("get_my_mastermind_curriculum_transcript"),
  false,
  "curriculum transcript UI must not depend on a broad direct transcript RPC",
);
for (const { id } of EXPECTED) {
  assert.ok(
    preview.includes("isWatchedLesson(lesson.resourceId)") && curriculum.includes(`resourceId: '${id}'`),
    `${id} must participate in server-backed watched/completed state`,
  );
}
console.log("verify:phase-one-core-curriculum completion persistence OK (5 hidden IDs)");
