#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapPlaybackResponse, mapSearchRow } from "../supabase/functions/_shared/replayVaultProducer.mjs";
import {
  groupSearchResults,
  isStableVaultId,
  makeDetailHref,
  normalizeAccessResponse,
  parseDetailTarget,
  validatePlaybackResponse,
} from "../src/components/replay-vault/replayVaultCore.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const searchEndpoint = readFileSync(path.join(root, "supabase/functions/search-mastermind-resources/index.ts"), "utf8");
const playbackEndpoint = readFileSync(path.join(root, "supabase/functions/get-mastermind-playback-link/index.ts"), "utf8");
const accessEndpoint = readFileSync(path.join(root, "supabase/functions/get-mastermind-portal-access/index.ts"), "utf8");
const importer = readFileSync(path.join(root, "tools/build-membershipio-replay-vault-import.py"), "utf8");
const parityMigration = readFileSync(path.join(root, "supabase/migrations/20260809170000_replay_vault_member_parity_r4.sql"), "utf8");

assert.match(searchEndpoint, /import \{ mapSearchRow \} from "\.\.\/_shared\/replayVaultProducer\.mjs"/);
assert.match(searchEndpoint, /\.map\(mapSearchRow\)/);
assert.match(playbackEndpoint, /import \{ mapPlaybackResponse \} from "\.\.\/_shared\/replayVaultProducer\.mjs"/);
assert.match(playbackEndpoint, /const MAX_RESOURCE_ID = 220/);
assert.match(playbackEndpoint, /Boolean\(questionId\) && Boolean\(momentId\)/, 'playback endpoint zero-or-one-target guard drifted');
assert.match(parityMigration, /\(p_question_id IS NOT NULL AND p_moment_id IS NOT NULL\) THEN RETURN;/, 'SQL dual-target playback guard drifted');
assert.match(parityMigration, /v_start:=0;v_end:=v_duration;/, 'SQL resource-only playback start contract drifted');
assert.match(playbackEndpoint, /secureJson\(req, mapPlaybackResponse\(/);
assert.match(importer, /portal_resource_id = f"membershipio:\{file_hash\}"/);
for (const field of ["allowed", "memberEntitled", "memberTier", "memberScopes", "previewCapabilities", "previewActive", "launchState"]) {
  assert.match(accessEndpoint, new RegExp(`\\b${field}:`), `accepted access endpoint stopped returning ${field}`);
}

const accessPayload = (overrides = {}) => ({
  allowed: true,
  memberEntitled: true,
  memberTier: "annual",
  memberScopes: ["core_curriculum", "current_replay_30_day", "replay_vault"],
  previewCapabilities: [],
  previewActive: false,
  launchState: "launched",
  ...overrides,
});
const accessCases = [
  ["annual full", accessPayload(), "allowed"],
  ["lifetime full", accessPayload({ memberTier: "lifetime" }), "allowed"],
  ["monthly current", accessPayload({ memberTier: "monthly", memberScopes: ["core_curriculum", "current_replay_30_day"] }), "limited"],
  ["non-entitled denied", accessPayload({ allowed: false, memberEntitled: false, memberTier: null, memberScopes: [] }), "denied"],
  ["entitled launch disabled", accessPayload({ allowed: false, launchState: "disabled" }), "not_launched"],
  ["entitled pilot excluded", accessPayload({ allowed: false, launchState: "pilot" }), "not_launched"],
  ["admin preview", accessPayload({ memberEntitled: false, memberTier: null, memberScopes: [], previewCapabilities: ["preview_vault", "preview_unpublished"], previewActive: true }), "allowed"],
];
for (const [name, payload, expected] of accessCases) {
  assert.equal(normalizeAccessResponse(payload).status, expected, `UX rejected exact access producer case: ${name}`);
}
assert.equal(normalizeAccessResponse({}).status, "unavailable", "malformed success must not invent entitlement loss");
assert.equal(normalizeAccessResponse({ error: "Could not verify access" }).status, "unavailable", "transport/server failure must remain unavailable");
for (const field of ["allowed", "memberEntitled", "memberTier", "memberScopes", "previewCapabilities", "previewActive", "launchState"]) {
  const drifted = structuredClone(accessPayload());
  delete drifted[field];
  assert.equal(normalizeAccessResponse(drifted).status, "unavailable", `UX accepted access schema drift with missing ${field}`);
}
for (const [name, mutate] of [
  ["allowed wrong type", (value) => { value.allowed = "yes"; }],
  ["annual missing full scope", (value) => { value.memberScopes = ["core_curriculum", "current_replay_30_day"]; }],
  ["monthly claiming full scope", (value) => { value.memberTier = "monthly"; }],
  ["allowed while disabled", (value) => { value.launchState = "disabled"; }],
]) {
  const drifted = structuredClone(accessPayload());
  mutate(drifted);
  assert.equal(normalizeAccessResponse(drifted).status, "unavailable", `UX accepted contradictory access producer control: ${name}`);
}

const canonicalResourceId = `membershipio:${"a".repeat(64)}`;
const maxBoundResourceId = `source:${"b".repeat(213)}`;
assert.equal(canonicalResourceId.length, 77);
assert.equal(maxBoundResourceId.length, 220);
for (const id of ["replay-1", "550e8400-e29b-41d4-a716-446655440000", canonicalResourceId, "source.namespace:item_1~v2", maxBoundResourceId]) {
  assert.equal(isStableVaultId(id), true, `UX rejected intentionally safe producer ID: ${id.slice(0, 32)}`);
}
for (const id of ["", `x${"a".repeat(220)}`, "bad/id", "bad\\id", "bad?id", "bad&id", "bad#id", "bad=id", "bad%2fid", "bad id", "bad\nid", "\u0000bad"]) {
  assert.equal(isStableVaultId(id), false, `UX accepted unsafe/out-of-bound producer ID: ${JSON.stringify(id)}`);
}

const momentId = "11111111-1111-4111-8111-111111111111";
const secondMomentId = "22222222-2222-4222-8222-222222222222";
const questionId = "33333333-3333-4333-8333-333333333333";
const searchRows = [
  { portal_resource_id: canonicalResourceId, moment_id: momentId, question_id: null, title: "Pricing replay", product_title: "Vault", category_title: "Selling", resource_type: "video", snippet: "pricing strategy", reason: "matches transcript", starts_at_seconds: 120, ends_at_seconds: 165, duration_seconds: 3600 },
  { portal_resource_id: canonicalResourceId, moment_id: secondMomentId, question_id: questionId, title: "Pricing replay", product_title: "Vault", category_title: "Selling", resource_type: "video", snippet: "pricing answer", reason: "best answer", starts_at_seconds: 240, ends_at_seconds: 285, duration_seconds: 3600 },
];
const mappedSearch = searchRows.map(mapSearchRow);
const groups = groupSearchResults({ results: mappedSearch });
assert.equal(groups.length, 1);
assert.equal(groups[0].resourceId, canonicalResourceId);
assert.deepEqual(groups[0].moments.map(({ momentId: id, startSeconds }) => [id, startSeconds]), [[momentId, 120], [secondMomentId, 240]]);
const detailHref = makeDetailHref({ resourceId: canonicalResourceId, questionId, momentId: secondMomentId });
assert.ok(detailHref.includes("resource=membershipio%3A"), "URLSearchParams must encode canonical namespace punctuation");
assert.deepEqual(parseDetailTarget(new URL(detailHref, "https://app.example").search), { resourceId: canonicalResourceId, questionId: null, momentId: secondMomentId });
assert.equal(groups[0].moments[1].questionId, null, 'search answer must resolve by its durable moment ID, not send a playback-invalid dual target');

for (const [name, mutate] of [
  ["remove resourceId", (value) => { delete value.resourceId; }],
  ["unsafe resourceId", (value) => { value.resourceId = "bad/id?leak=1"; }],
  ["remove momentId", (value) => { delete value.momentId; }],
  ["unsafe momentId", (value) => { value.momentId = "bad/id"; }],
]) {
  const value = structuredClone(mappedSearch[0]);
  mutate(value);
  assert.equal(groupSearchResults({ results: [value] }).length, 0, `UX accepted negative search producer control: ${name}`);
}

const playbackRow = { portal_resource_id: canonicalResourceId, title: "Pricing replay", access_scope: "replay_vault", authoritative_start_seconds: 120, authoritative_end_seconds: 165, moment_id: momentId, question_id: null };
const mappedPlayback = mapPlaybackResponse(playbackRow, "https://dropbox.example/temporary", "2026-08-09T20:00:00.000Z");
const momentTarget = { resourceId: canonicalResourceId, momentId, questionId: null };
assert.ok(validatePlaybackResponse(mappedPlayback, momentTarget), "UX rejected canonical real moment playback mapper");
assert.equal(validatePlaybackResponse(mappedPlayback, momentTarget).startSeconds, 120, "authoritative playback cue drifted");
for (const [name, mutate] of [
  ["remove resourceId", (value) => { delete value.resourceId; }],
  ["mutate resourceId", (value) => { value.resourceId = maxBoundResourceId; }],
  ["remove playbackUrl", (value) => { delete value.playbackUrl; }],
  ["remove startSeconds", (value) => { delete value.startSeconds; }],
  ["remove momentId", (value) => { delete value.momentId; }],
  ["mutate momentId", (value) => { value.momentId = secondMomentId; }],
]) {
  const value = structuredClone(mappedPlayback);
  mutate(value);
  assert.equal(validatePlaybackResponse(value, momentTarget), null, `UX accepted negative moment playback producer control: ${name}`);
}

const fullPlayback = mapPlaybackResponse({ ...playbackRow, authoritative_start_seconds: 0, authoritative_end_seconds: 3600, moment_id: null, question_id: null }, "https://dropbox.example/temporary", "2026-08-09T20:00:00.000Z");
const fullTarget = { resourceId: canonicalResourceId, momentId: null, questionId: null };
assert.equal(validatePlaybackResponse(fullPlayback, fullTarget)?.startSeconds, 0, "resource-only playback must open at authoritative start");
assert.equal(validatePlaybackResponse({ ...mappedPlayback, questionId }, { resourceId: canonicalResourceId, momentId, questionId }), null, "client accepted a dual-target playback response");

const questionPlayback = mapPlaybackResponse({ ...playbackRow, authoritative_start_seconds: 240, authoritative_end_seconds: 285, moment_id: null, question_id: questionId }, "https://dropbox.example/temporary", "2026-08-09T20:00:00.000Z");
const questionTarget = { resourceId: canonicalResourceId, momentId: null, questionId };
assert.equal(validatePlaybackResponse(questionPlayback, questionTarget)?.startSeconds, 240, "question mapper target/cue drifted");
for (const [name, mutate] of [
  ["remove questionId", (value) => { delete value.questionId; }],
  ["mutate questionId", (value) => { value.questionId = momentId; }],
]) {
  const value = structuredClone(questionPlayback);
  mutate(value);
  assert.equal(validatePlaybackResponse(value, questionTarget), null, `UX accepted negative question producer control: ${name}`);
}

const maxBoundPlayback = mapPlaybackResponse({ ...playbackRow, portal_resource_id: maxBoundResourceId }, "https://dropbox.example/temporary", null);
assert.ok(validatePlaybackResponse(maxBoundPlayback, { ...momentTarget, resourceId: maxBoundResourceId }), "UX rejected safe producer ID at the server's 220-character bound");

console.log("Replay Vault producer contract passed: exact access producer states, canonical/importer and 220-character IDs, search/playback mapper resource-only and cue targets, URL encoding, and schema/identity/target/cue drift controls are bound to the current UX.");
