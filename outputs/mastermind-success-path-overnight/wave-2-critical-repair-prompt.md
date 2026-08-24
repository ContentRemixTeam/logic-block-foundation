# Wave 2 Critical Repair — Immutable Review Findings

Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

Rollback/base accepted Wave 1: `b6a99139a2b82cb3f824a052b92a2f0e2c35b33e`
Rejected Wave 2 checkpoint: `f93c0f691347b1add6663adedc244153cd33646d`

You are the sole implementation writer. Do not commit, push, deploy, apply production migrations, seed real curriculum/member data, mutate SaaS, or start Wave 3. Preserve Replay Vault protected files.

## Repair all confirmed blockers

### 1. Catalog-level revocation must fail closed

`resolve_my_assigned_learning()` currently checks item-level revocation but not the assigned `curriculum_catalog_versions.lifecycle_state`.

Requirements:
- An assigned version that is revoked must return a denied/review-required fail-closed envelope with no assignment item/title/teacher/stage/milestone/action/evidence/catalog/media/transcript/Vault metadata.
- Add a server-authorized, auditable append-only/terminal catalog revocation transition if no safe RPC exists. Ordinary authenticated callers must not execute it or directly mutate authority tables.
- Preserve historical rows and frozen assignments; do not delete history.
- Test actual catalog revocation after an assignment is active and prove serialized response absence.

### 2. Rebuild confirmation must use a server-derived exact diff

The rebuild boundary must not trust caller-supplied `p_rebuild_diff` as truth.

Requirements:
- Derive a canonical deterministic diff server-side from the frozen current active assignment and proposed pending assignment item sets/authority snapshots.
- Persist/hash the server-derived diff.
- If a caller supplies expected diff/hash for confirmation, compare it byte-for-byte/canonical-hash to the server-derived diff and fail closed on mismatch.
- Separate proposal creation from confirmation. Confirmation must activate only the exact pending assignment whose server-derived diff was explicitly confirmed.
- Test omitted, incomplete, false, reordered, and materially mismatched caller diffs/hashes; none may activate. Test truthful exact confirmation.

### 3. Publication hash must bind complete immutable authority

`content_sha256` must bind every publication-relevant catalog/item/media/QA field, including at minimum:
- milestone title
- media asset ID
- media source content SHA-256
- canonical resource UUID
- transcript version
- verified playback attempt
- publication SHA-256
- required capability
- teacher/attribution/provenance fields
- action/evidence prompts
- all ready-state QA booleans/timestamps/approvers and lifecycle/publication identity fields

Requirements:
- Use deterministic canonical ordering and unambiguous encoding.
- Hash the exact final stored authority at publication time, not mutable caller prose.
- Recompute/verify at assignment creation/resolution where needed so post-approval mutation fails closed.
- Add mutation controls proving every authority-bearing field changes or invalidates the publication receipt.

### 4. Complete metadata-absence verification

Expand real PostgreSQL serialized-response sentinel coverage to reject all private or unauthorized fields/values, including at minimum:
- `media_asset_id`
- `canonical_resource_id`
- transcript identifiers/version
- playback attempt ID
- `publication_sha256`
- source/provider locator/path/URL
- Vault resource IDs, counts, titles, placement metadata, and alternate labels

Exercise all fail-closed states:
- standalone Planner / no Mastermind entitlement
- expired entitlement
- verification unavailable
- review required / hold
- stale Planner receipt or invalid frozen authority
- cross-owner
- item revoked
- whole catalog revoked
- malformed/inconsistent authority

Use real serialized JSON outputs and negative sentinel values, not only source-token assertions. Add an isolated mutation control demonstrating that adding a private authority field to a denied response causes the governing verifier to fail.

### 5. Receipt/diff hygiene

Fix trailing whitespace/blank-line issue reported in `wave-2-verification-receipt.md`; `git diff --check` must pass.

## Required verification

Run what the sandbox permits; parent will rerun native database gates:
- Wave 2 static verifier
- Wave 2 native PostgreSQL verifier
- full chronological PostgreSQL verifier through all 195+ migrations
- TypeScript
- ESLint
- build
- full `npm run verify`
- Replay Vault 74/74 baseline and mutation controls
- `git diff --check`

Update Wave 2 receipt/final message honestly. Leave the tree uncommitted and report exact files, tests, residual blockers, and production status.