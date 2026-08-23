# Wave 1 Critical Repair — Independent Review Blockers

You are the sole application source writer in:

`/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

Exact source checkpoint under repair:

`34133f9474a9ded885013466876038ee3e0b9ab9`

You MAY MODIFY source and tests. That is the job.

## Ownership and safety

- Read `00-READ-FIRST-OWNERSHIP.md`, `OVERNIGHT-BUILD-TRACKER.md`, the Wave 1 canonical receipt, and the exact source before editing.
- One writer only. Do not invoke other coding agents.
- Wave 2 is paused. Do not implement capability/catalog/curriculum work.
- Ignore the untracked Wave 2 prompt; do not edit or remove it.
- No push, deployment, production migration apply, Supabase linking, external SaaS calls, GHL changes, entitlement changes, publishing, or member exposure.
- Do not edit inherited migration `20260808120000_mastermind_portal_private_search.sql`.
- Keep protected Replay Vault product files byte-identical.
- Do not commit. Parent will verify and commit.

## Repair every blocker

### 1. Never overwrite member-edited Daily Plan work

Current migration lines around 620-624 upsert `(user_id, date)` and unconditionally replace `cycle_id`, `top_3_today`, and `thought`.

Required behavior:

- Reconciliation must not overwrite an existing Daily Plan's member-authored Top 3, thought, completion, or other authored state.
- Do not steal a date owned by another cycle.
- Create missing generated Daily Plans safely; for existing rows, preserve authored content and only attach safe missing linkage when allowed.
- Return/record a truthful preservation/conflict receipt.
- Add real PG16 tests for existing same-cycle edited row, existing other-cycle row, empty/new row, retry, and concurrency.

### 2. Stable supporting-project and habit identities

Current payload creates `supporting-project:slot-N` and `habit:slot-N` from array positions. Removing/reordering earlier entries changes identity.

Required behavior:

- Give every supporting project and habit a durable identity that survives reorder and removal of siblings.
- Persist these identities in draft/form state and round-trip them through cloud/local drafts.
- Do not use mutable current index as canonical identity.
- Preserve member-edited/completed generated rows correctly when order changes.
- Handle duplicate labels safely.
- Add client and PG16 tests for reorder, remove-first, duplicates, retry, and preservation.

### 3. Round-trip intentionally empty arrays

The Cycle Setup hydrator currently applies many arrays only when `.length > 0`, so authoritative empty values revive stale/default data.

Required behavior:

- If a field is present and is an array—even empty—hydrate that exact array.
- Preserve backward compatibility when legacy payloads omit the field entirely.
- Cover platforms, offers, limited offers, month plans, projects, habits, reminders, office-hours days, recurring tasks, and first-three-day tasks.
- Add behavioral tests proving empty remains empty after save/reopen/resave.

### 4. Cross-tab-safe and truthful Start Fresh

Current Start Fresh calls `clearDraft()` without expected logical/request identity, does not await, closes immediately, and may delete a newer cross-tab draft.

Required behavior:

- Start Fresh must bind deletion to the exact currently loaded draft identity/version or use a server-issued conditional deletion receipt.
- A stale tab must not delete a newer cloud draft.
- Await cloud deletion and verify affected-row/identity receipt before clearing browser recovery state or changing UI to fresh.
- Surface failure/conflict truthfully and preserve the draft.
- If a legacy cloud draft lacks reconciliation identity, design a safe version/timestamp/etag conditional path; do not fall back to user-only deletion.
- Add stale-tab race, legacy draft, no-row, network failure, and success tests.

### 5. Legacy-cycle owner-quarter convergence

Current RPC resolves existing quarter only through the new intent table. A pre-v2 `cycles_90_day` row can be duplicated.

Required behavior:

- Under the same owner-quarter advisory lock, inspect authoritative legacy/current cycles for the target quarter before creating.
- Safely adopt exactly one compatible owner cycle into v2 intent/receipt authority, or fail with an explicit conflict requiring review.
- Never create a second owner-quarter cycle when one already exists.
- Handle multiple ambiguous legacy matches fail-closed.
- Do not alter another owner's cycle.
- Add real PG16 tests: no legacy row, one compatible legacy row, conflicting existing row, ambiguous duplicates, concurrent adoption/create, and retry.

### 6. Replay Vault verifier self-collision

The verifier classifies all `tools/*replay-vault*` additions as protected, including itself, and therefore rejects its own committed addition under immutable evaluation.

Required behavior:

- The verifier control-plane file must not be counted as a protected Replay Vault product file.
- Continue to fail on genuine protected product additions/removals/hash/byte changes.
- Keep the baseline exactly 74 product files unless the committed baseline's true protected set proves otherwise.
- Add a self-test/mutation control showing the verifier passes unchanged scope and fails on a synthetic protected modification/addition.

### 7. Gate existing-cycle load failure

The independent review also identified toast-only load failure that leaves the editor usable with unknown state.

Required behavior:

- Centralize `loading | load_failed | ready` for authoritative existing-cycle load.
- Do not expose default/create/save behavior while authoritative state is unknown or load failed.
- Verified no-cycle response may enter ready/create state.
- Load failure shows Retry and preserves any valid local recovery state without manufacturing fresh defaults.
- Add behavioral tests for loading, verified empty, failure, retry-success, and stale response ordering.

## Verification

Implement tests before claiming repair. Run exact-current:

1. focused client behavior tests covering all repaired paths
2. focused static migration boundary checks
3. native disposable PostgreSQL 16 apply-twice, RLS, preservation, legacy adoption/conflict, and concurrency tests
4. `npx tsc --noEmit`
5. focused ESLint/Deno lint
6. `npm run build`
7. `npm run verify`
8. `npm run verify:replay-vault-protected-baseline`
9. verifier mutation/self-control test
10. `git diff --check`
11. secret/absolute-path scan

The inherited 193-migration PG16 blocker remains separate and must be documented honestly.

## Artifacts

Update Wave 1 status in `OVERNIGHT-BUILD-TRACKER.md` from verified candidate to repair verification status.

Write last:

- `outputs/mastermind-success-path-overnight/wave-1-critical-repair-receipt.md`
- `outputs/mastermind-success-path-overnight/wave-1-critical-repair-final-message.txt`

Receipt must name every blocker, exact fix, tests/exits, real DB behaviors, protected hash proof, and remaining risks. Do not claim production readiness.

Do not commit. End with current HEAD, dirty files, gate results, and blockers.