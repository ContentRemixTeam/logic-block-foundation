# Wave 1 Critical Repair Round 2 — Final Independent Findings

You are the sole application source writer in:

`/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

Current HEAD is `34133f9474a9ded885013466876038ee3e0b9ab9`. Round-1 repairs are uncommitted and MUST be preserved. You MAY modify source/tests/docs. Do not commit.

## Safety

- Read ownership/tracker, round-1 receipt, current diff, and exact source before editing.
- No other coding agents. Wave 2 remains paused.
- No push, deployment, production migration apply/link, SaaS action, GHL/entitlement change, publishing, or member exposure.
- Keep Replay Vault behavior and all 74 protected product files byte-identical.
- Do not weaken or bypass verifiers.
- Ignore the Wave 2 prompt.

## Consolidated blockers — repair all ten

### 1. Revoke direct authenticated draft DML

Historical policies/grants on `cycle_drafts` permit authenticated INSERT/UPDATE/DELETE, bypassing v2 CAS functions.

Required:
- In the v2 migration, revoke direct draft table INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from PUBLIC, anon, authenticated.
- Remove/drop historical authenticated write policies without weakening owner read needed by the app.
- Grant only the minimum read and function execute paths required.
- Prove direct authenticated DML denial and RPC success under realistic role/auth claims.

### 2. Add true compare-and-swap to cloud draft saves

`save_cycle_draft_v2` currently serializes but unconditionally overwrites.

Required:
- Save accepts expected prior identity: exact draft id plus revision for v2; exact id + updated_at + null revision for legacy; explicit verified-absence token/state for create.
- A stale tab/device save must return/raise a typed conflict and must not mutate the row.
- Blind owner-only overwrite is forbidden.
- Client must discover authoritative cloud state before autosave and retain/update the exact save receipt after success.
- Conflict/network failure preserves browser recovery and displays truthful status.
- Add stale-save races, verified-absence/create race, legacy save, retry, same-revision conflict, and success tests.

### 3. Fix different-request dedup receipt readback

Owner-quarter convergence for a different request currently clones the winner receipt but leaves the winner payload hash, while the caller ledger stores caller payload hash.

Required:
- Each request ledger/readback receipt must bind its own request_id, logical_plan_key, and exact caller payload_hash while truthfully referring to the same canonical cycle/plan receipt/version as appropriate.
- Real `verifyCyclePlanReceiptReadback` must accept the losing concurrent caller's actual response.
- Add a concurrency test that captures both function responses and runs the same client receipt verification contract for each; shared canonical cycle is expected, false hash reuse is forbidden.

### 4. Preserve generation baselines for member-edited fields

Project/habit/incomplete-task upserts replace baseline with new generated values even when preserving member edits, eventually absorbing authored data.

Required:
- Advance a field's generation baseline only when current persisted value still equals its prior generated baseline (or field has never had a baseline and is provably untouched).
- When preserving a member-edited field, preserve its prior baseline for that field.
- Handle partial fields independently where applicable.
- Add multi-reconciliation tests: generate A -> member edits B -> generator proposes B -> generator later proposes C; member B must remain and not be absorbed.

### 5. Daily Plan collision must not report complete

A date owned by another cycle currently increments conflict_count but function returns complete, client clears recovery, and UI claims all work verified.

Required:
- Preflight Daily Plan date ownership under locks before required writes, or raise a typed conflict that rolls back the whole transaction.
- Never return `status=complete` with any required Daily Plan collision.
- Client must retain recovery and show truthful conflict/support action.
- Add rollback proof showing no partial cycle/project/task/receipt changes survive a conflict.

### 6. User-scope browser draft storage

Current localStorage key is global and leaks/restores drafts across account switches.

Required:
- Scope all browser draft and related recovery keys by authenticated user id.
- Never offer or sync another user's local draft.
- Do not auto-migrate an ownerless legacy global key into a user account; quarantine/delete it safely without displaying its content.
- Clear only the current user's exact local snapshot.
- Add account A -> sign out -> account B tests, same-user reauth, and legacy global-key tests.

### 7. Persist `nurturePlatforms`, including empty

Autosave payload/dependencies omit `nurturePlatforms`, letting a cleared array resurrect.

Required:
- Include it in payload and dependencies.
- Preserve authoritative empty array.
- Add edit-only, clear-to-empty, reopen/resave tests.

### 8. Make SaveStatusBanner truthful

Shared banner says `Backed up to cloud` and `All changes saved` in idle/local/pending/error states.

Required:
- Drive wording strictly from actual local/cloud state, lastServerSync, pending, and syncError.
- Local-only must say saved on this device/recovery only, not cloud.
- Pending must say saving/syncing.
- Cloud success only after verified server receipt.
- Error/conflict must say not backed up to cloud and preserve recovery.
- Ensure callers pass the evidence and add component/behavior tests for all states.

### 9. Include untracked protected files in Replay Vault scope discovery

Verifier uses `git ls-files` and misses untracked protected additions; the synthetic control bypasses discovery.

Required:
- Exact-current discovery must include tracked plus untracked non-ignored files (`git ls-files --cached --others --exclude-standard` or equivalent).
- Preserve 74-file committed baseline semantics and control-plane exclusions only for the verifier/test themselves.
- Mutation control must create an actual temporary untracked protected-path file and run the real discovery/main boundary; prove rejection and cleanup.
- Continue to reject tracked/untracked additions, removals, byte/hash mutations.

### 10. Repair full chronological PG16 migration 182 safely

`20260808120000_mastermind_portal_private_search.sql` fails on PG16 because `array_to_string` is not immutable inside a stored generated expression.

Authorized local-source compatibility repair:
- Add a deterministic schema-qualified helper in that migration before table creation, declared IMMUTABLE/PARALLEL SAFE, that converts a text array to stable search text (or tsvector).
- Use the helper in the generated expression so PostgreSQL 16 accepts it.
- Keep resulting search semantics equivalent for title/product/category/summary/success_paths/stages.
- Schema-qualify and lock down function ACL/search_path appropriately; do not introduce member execution unnecessarily.
- Also add a later post-main compatibility migration if required for already-applied environments, but do not create destructive behavior.
- Document the historical-source compatibility change and hash honestly.
- Run a real clean chronological replay of all migrations through current Wave 1, not just the mock schema. It must reach and test Wave 1. Apply-twice requirements should cover the candidate migration where valid.

## Verification requirements

Expand tests first. Then run and record exact exits:

1. focused client behavior tests
2. static migration verifier
3. native PG16 focused behavior including realistic role/ACL, DML denial, CAS races, request dedup readback, baseline sequence, Daily Plan rollback
4. native PG16 full-stack/chronological migration replay through Wave 1 (must no longer stop at migration 182)
5. `npx tsc --noEmit`
6. focused ESLint and Deno lint
7. `npm run build`
8. full `npm run verify`
9. Replay Vault baseline + control tests, including actual untracked discovery
10. `git diff --check`
11. secret/absolute-path scan

Do not claim a pass for a gate not actually run. Parent will rerun all decisive gates.

## Artifacts

Update:
- `OVERNIGHT-BUILD-TRACKER.md`
- `outputs/mastermind-success-path-overnight/wave-1-critical-repair-receipt.md` with a clearly labeled Round 2 section, without erasing prior truth

Write last:
- `outputs/mastermind-success-path-overnight/wave-1-critical-repair-round-2-final-message.txt`

Final message must report HEAD, dirty paths, every gate and exit, full chronological replay result, Replay Vault count, remaining blockers/risks, and no production action. Do not commit.