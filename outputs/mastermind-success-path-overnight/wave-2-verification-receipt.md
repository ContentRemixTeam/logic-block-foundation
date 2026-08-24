# Wave 2 Critical Repair Verification Receipt

Date: 2026-08-23
Status: **REPAIRED PARENT-VERIFIED LOCAL CANDIDATE — IMMUTABLE RE-REVIEW PENDING; PRODUCTION BLOCKED**
Accepted Wave 1 base: `b6a99139a2b82cb3f824a052b92a2f0e2c35b33e`
Rejected Wave 2 checkpoint/current HEAD: `f93c0f691347b1add6663adedc244153cd33646d`

## Repaired authority

- Whole-catalog revocation is a service-role-only RPC with an exact append-only evidence event and terminal lifecycle transition. The member resolver checks both lifecycle and audit authority before exposing assignment metadata.
- Rebuild proposal creation computes and persists a canonical JSONB diff from the exact frozen active assignment and proposed frozen authority snapshots. A caller-provided proposal diff is only an optional expected value and must match.
- Rebuild confirmation requires the exact server-derived diff and canonical SHA-256, recomputes both from the pending frozen rows, revalidates current/proposed authority, and activates only that pending assignment.
- Catalog `content_sha256` now hashes versioned canonical JSONB in deterministic item order. It binds publication-time catalog identity; every item, prompt, teacher/attribution/provenance field; every media identity and source hash; all QA states, receipt, timestamp, and approver fields; and the required capability.
- Assignment rows freeze the catalog hash. Assignment items freeze the complete private publication authority snapshot plus its hash. Creation, confirmation, and resolution recompute receipts and fail closed on drift.
- Denied/review envelopes remain limited to capability state, safe reason, assignment state, `assignment: null`, and `items: []`.

## Files changed by this repair

- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql`
- `tools/verify-mastermind-wave2.mjs`
- `tools/verify-mastermind-wave2-postgres.py`
- `OVERNIGHT-BUILD-TRACKER.md`
- `outputs/mastermind-success-path-overnight/wave-2-verification-receipt.md`
- `outputs/mastermind-success-path-overnight/wave-2-final-message.txt`

Untracked repair prompt preserved and not treated as implementation source:

- `outputs/mastermind-success-path-overnight/wave-2-critical-repair-prompt.md`

## Executed verification

- `npm run verify:mastermind-wave2-static` — exit `0`; 131 focused authority/type/ACL/test-wiring checks passed.
- `npm run verify:mastermind-wave2-postgres` — exit `1`; PostgreSQL 16 `initdb` could not allocate either mmap or SysV bootstrap shared memory. No migration or database behavior pass is claimed.
- `npm run verify:cycle-plan-full-stack-postgres` — exit `1`; the full chronological runner was blocked at PostgreSQL bootstrap before migration replay. No 195+ migration pass is claimed in this sandbox.
- `npx tsc --noEmit` — exit `0`.
- `npx eslint tools/verify-mastermind-wave2.mjs src/integrations/supabase/types.ts` — exit `0`.
- `npm run lint` — exit `1`; repository-wide pre-existing baseline contains 638 errors and 113 warnings outside the repaired files. No repair-scope ESLint error was reported.
- `npm run build` — exit `0`; 5,165 modules transformed. Existing Browserslist/chunk-size warnings remain non-failing.
- `npm run verify` — exit `1`; the aggregate passed the Wave 2 static child and stopped at the mandatory PostgreSQL bootstrap blocker.
- `npm run verify:replay-vault-protected-baseline` — exit `0`; 74/74 hashes and byte counts match with zero protected-scope additions.
- `npm run verify:replay-vault-protected-baseline-control` — exit `0`; unchanged scope, synthetic mutation/addition, real untracked addition discovery, cleanup, and verifier self-exclusion controls passed.
- Remaining aggregate children run independently: Deno Replay Vault lint, Mastermind portal, Success Path, Replay Vault pilot, pilot bundle, server search, playback link, and Mastermind production bundle passed. Mounted Chrome checks cannot establish DevTools; loopback mock/browser checks cannot bind `127.0.0.1`; Replay Vault commercial PostgreSQL is blocked by the same `initdb` restriction.
- `git diff --check` — exit `0` after the final receipt update.
- Secret scan of all seven repair-owned source/artifact files — exit `0`; no live-key/private-key patterns found.
- Absolute-path scan of all seven repair-owned source/artifact files — exit `0`; no host-home or local-file URI matches found.

Migration SHA-256 values:

- Capability projection (unchanged by repair): `3d51a0b2cbd4301ae08cf2861223e9e92353f890a1a4ac5657ad57e37bedb8c3`
- Repaired Learning catalog/assignment authority: `91b22c5d52a125afff7fb39bc5f069fcdd6cddfca2efd21a0f14ced7e0b3c98b`

## Native PostgreSQL cases authored but not executed here

The checked-in PostgreSQL 16 verifier now exercises:

- actual service-only append-only terminal whole-catalog revocation after an assignment is active;
- direct authenticated RPC/table revocation denial and audit-row immutability;
- exact server-derived proposal diff persistence and false caller proposal rejection;
- omitted diff, omitted hash, incomplete diff, false diff, reordered item arrays, materially changed authority, and false hash confirmation rejection while the pending assignment remains pending;
- truthful exact diff/hash activation;
- publication receipt mutation controls across catalog, item, media, source, publication, prompt, teacher/provenance, capability, and every QA authority field;
- assignment creation/resolution drift detection against recomputed catalog and frozen item authority;
- real serialized JSON absence for standalone Planner, expired entitlement, verification unavailable, review-required conflict/hold, stale Planner receipt, invalid frozen authority, cross-owner, malformed authority, item revocation, and whole-catalog revocation;
- negative sentinel values for private media/resource/transcript/playback/publication/provider/locator and Vault IDs, counts, titles, placements, and alternate labels;
- an isolated denied-response mutation control that injects `media_asset_id` and requires the governing absence verifier to fail.

These are authored controls, not database execution evidence, until the parent runs both PostgreSQL gates on an unrestricted PostgreSQL 16 host.

## Boundary and production status

- Replay Vault protected source remains byte-identical at 74/74 with zero additions.
- No commit, push, deploy, production migration, Supabase link/write, real curriculum/member seed, external SaaS mutation, publishing, entitlement/access change, or member exposure occurred.
- Wave 3 was not started.
- Production status: **BLOCKED / NOT DEPLOYED**. Independent parent PostgreSQL execution and immutable review remain required.

## Parent repair verification — 2026-08-23

The exact repaired tree passed:

- Wave 2 static verifier: 131 checks.
- Native PostgreSQL 16.14 focused suite: catalog revocation, metadata-free denied states, 59-field publication-authority mutation controls, stale/malformed authority, server-derived rebuild diff mismatch matrix, concurrency, ACL/RLS, and item/catalog revocation.
- Full chronological PostgreSQL 16.14: all 195 migrations through Wave 2; Wave candidate double-apply; inherited helper and Wave 1 behavior/ACL probes.
- TypeScript, focused ESLint, production build, and complete `npm run verify`.
- Replay Vault protected baseline 74/74, zero additions, plus all mutation controls including actual untracked protected-path rejection.
- `git diff --check`.

No production migration, push, deploy, real curriculum/member seed, entitlement mutation, GHL/Searchie change, publishing, member exposure, or Wave 3 work occurred.

## Executable resolver privacy mutation closure — 2026-08-23

The final review's test-quality blocker is closed. The native PostgreSQL harness now replaces `resolve_my_assigned_learning(uuid)` inside a transaction with a leaking resolver that inserts `media_asset_id` into a denied envelope, calls that real resolver under the authenticated role, and requires the governing privacy assertion to fail. The transaction rolls back; the harness then calls the restored real resolver and requires the clean denied envelope to pass. Static verification requires this database mutation + rollback-restoration path, preventing regression to a local Python-dictionary injection. Focused PostgreSQL 16.14 and the complete repository aggregate both passed afterward.

## Static executable-mutation anti-regression closure — 2026-08-23

The static gate now requires the exact assignment of `mutation_control` from `assigned_learning_after_mutation(..., resolver_leak_mutation)`, requires a runtime provenance marker returned only by the database-mutated resolver, forbids the former local dictionary assignment and `media_asset_id` injection patterns, and runs a synthetic legacy-regression negative control that must be rejected. Static verification now passes 132 checks; native PostgreSQL 16 and the complete repository aggregate pass afterward.

## Wave 2 accepted — 2026-08-23

Accepted immutable source checkpoint: `25811fdcd2ef74d8425843024575bc845a6e65ea`.

Independent closure verdict: **NO BLOCKERS**. The final review confirmed the live PostgreSQL resolver mutation/rollback control, exact static binding to `assigned_learning_after_mutation(..., resolver_leak_mutation)`, runtime database provenance, rejection of the legacy local-dictionary injection pattern, and the synthetic negative regression control.

Wave 2 is locked. Production remains untouched and blocked. Wave 3 may build only from this accepted authority.

