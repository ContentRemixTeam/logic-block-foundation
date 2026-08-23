# Wave 2 Source Build — Mastermind Capability + Curriculum Authority

You are the sole application source writer in:

`/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

Exact starting commit must be:

`34133f9474a9ded885013466876038ee3e0b9ab9`

You MAY MODIFY source files in this repository. That is the job.

## Safety and ownership

- Read `00-READ-FIRST-OWNERSHIP.md`, `OVERNIGHT-BUILD-TRACKER.md`, `outputs/mastermind-success-path-overnight/wave-0-contracts-and-port-map-2026-08-22.md`, and `outputs/mastermind-success-path-overnight/specialist-critical-feedback-2026-08-22.md` first.
- One writer only. Do not invoke other coding agents.
- No push, deployment, production migration apply, Supabase linking, SaaS/API changes, GHL changes, entitlement changes, publishing, member exposure, or Business Brain edits.
- Keep the 74-file Replay Vault protected baseline exact. Run its verifier before completion.
- Do not edit or bypass inherited migration `20260808120000_mastermind_portal_private_search.sql`. Its PG16 generated-expression defect is a known release blocker.
- Do not start Wave 3 UI/state/action work.
- Do not commit. Preserve the completed candidate dirty tree for parent verification.

## Product boundary

The regular Planner is complete and Mastermind-neutral. The Mastermind section is separately server-entitled. Planner Learning is curated assigned curriculum for active Mastermind members. Replay Vault is the separate annual/lifetime historical all-call archive. Shared infrastructure must never blend their catalogs, entitlements, progress, search, saved destinations, or member metadata.

Independent capability keys:

- `planner.base`
- `mastermind.section`
- `mastermind.learning.assigned`
- `mastermind.ask_faith`
- `mastermind.community_link`
- `vault.discovery`
- `vault.search`
- `vault.playback`
- `vault.saved_videos`
- `admin.curriculum_preview`

JWT/auth identity and server-owned evidence—not browser email, user ID, tier, query string, local storage, or client claims—must control authorization. Distinguish `granted`, `denied`, `verification_unavailable`, and `review_required`. Fail closed. A denied caller receives no protected title, teacher, stage, milestone, resource count, locator, transcript, or other metadata.

## Wave 2 implementation scope

### 1. Reconcile with current schema first

Inspect existing entitlement/capability tables, functions, views, migrations, generated types, Mastermind gates, and Replay Vault authorization. Extend the current architecture rather than creating a conflicting second truth. Preserve current Replay Vault behavior byte-for-byte unless a new additive shared interface is necessary; prefer new files and a post-Wave-1 migration.

### 2. Server capability projection

Implement a fail-closed server-owned capability resolver/projection for the exact keys above.

Requirements:

- Derive caller from `auth.uid()`.
- Keep `planner.base`, Mastermind Learning, Ask Faith/Community, Vault, and admin preview independently decidable.
- Preserve existing annual/monthly/expired logic where current server evidence already defines it; do not fabricate entitlements.
- Handle missing, contradictory, stale, or review-required evidence explicitly.
- Prevent ordinary clients from granting/updating capability authority.
- Revoke PUBLIC/anon execution and direct private-table access; grant only intended member-safe resolver functions.
- Keep service-role/admin operations explicit and narrow.
- Member-safe output may expose only the caller's capability states and safe reasons—never private evidence rows or another member.

### 3. Versioned Planner Learning catalog authority

Add additive, versioned authority for Planner Learning—not Replay Vault:

- immutable `curriculum_catalog_versions`
- normalized `curriculum_catalog_items`
- item states exactly `gap | candidate | refresh_required | ready | revoked`
- stage, milestone, item role/order, intended output, action/evidence prompt, teacher/attribution, source provenance, privacy/rights/edit/caption/playback QA, required Learning capability
- private media asset reference separate from member-visible publication metadata
- no item may enter `ready` unless transcript, provenance, rights/privacy, edit/caption, playback, action, and evidence QA requirements are present and approved
- seed only synthetic/review-pending fixtures if tests require fixtures; do not mark real GHL resources ready
- catalog versions/items are immutable once published/active; use supersession/revocation rather than silent mutation

### 4. Frozen per-cycle assignment authority

Add normalized assignment authority without implementing Wave 3 UI:

- immutable `curriculum_cycle_assignments`
- normalized assignment items
- owner/cycle binding and exact Wave 1 Planner receipt binding
- catalog version/item binding
- assignment status/version and explicit supersession
- catalog changes never rewrite active assignments
- rebuilding creates a new assignment with an explicit diff/confirmation boundary
- same-owner relational integrity
- no duplicate active assignment for one owner/cycle/context
- no client direct write authority

If a `mastermind_cycle_state` record is structurally required, add only the minimum authority skeleton; recommendation UX, member confirmation/change-focus behavior, actions, evidence, check-ins, and support belong to Wave 3.

### 5. Member-safe resolver contracts

Add narrowly scoped RPCs/views needed to:

- resolve caller capabilities
- resolve only the caller's current assigned Learning item(s) when `mastermind.learning.assigned` is granted
- return no protected metadata on denied/unavailable/review-required states
- keep Replay Vault metadata absent unless its independent capabilities are granted

Do not implement protected playback or member UI yet.

### 6. Generated types and tests

Regenerate or accurately update Supabase types for new schema/RPC contracts.

Add deterministic tests for:

- anonymous caller
- signed-in nonmember / standalone Planner
- active monthly Mastermind
- active annual/lifetime-equivalent Mastermind
- expired Mastermind
- conflicting/review-required evidence
- verification-unavailable path
- admin preview
- cross-owner access attempts
- direct-table write attempts
- PUBLIC/anon function ACL denial
- independent Learning versus Vault capability behavior
- no metadata leakage on denial
- catalog ready-state QA enforcement
- catalog immutability/supersession
- frozen assignment stability across later catalog version creation
- concurrent duplicate assignment creation
- same-owner cycle/receipt integrity
- migration apply twice on the exact predecessor schema where supported

Use real disposable PostgreSQL 16 behavior for decisive SQL/RLS/concurrency proof. Static text checks are supplementary only.

## Verification gates

Run and record exact exits:

1. focused Wave 2 static/client tests
2. focused native PostgreSQL 16 schema/RLS/persona/concurrency suite
3. `npx tsc --noEmit`
4. focused ESLint and Deno lint for changed files
5. `npm run build`
6. `npm run verify`
7. `npm run verify:replay-vault-protected-baseline`
8. `git diff --check`
9. secret/absolute-path scan of changed source

The inherited full-history PG16 blocker must remain honestly documented; do not represent it as fixed or as a Wave 2 failure caused by new source.

## Completion artifacts

Update `OVERNIGHT-BUILD-TRACKER.md` with exact status. Write last:

- `outputs/mastermind-success-path-overnight/wave-2-verification-receipt.md`
- `outputs/mastermind-success-path-overnight/wave-2-final-message.txt`

Receipt must list files, exact commands/exits, real database behaviors exercised, protected hash result, known blockers, and next dependency. Keep it factual. A process exit is not acceptance.

Do not commit. End with a compact status containing current HEAD, dirty files, passing/failing gates, and any blocker.