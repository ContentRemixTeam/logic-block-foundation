# Wave 1 Closure Repair Round 3 — Four Final Findings

Sole source writer worktree:
`/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

HEAD: `34133f9474a9ded885013466876038ee3e0b9ab9`; preserve all uncommitted Round 1/2 repairs and parent fixture corrections. You may edit source/tests/docs. Do not commit.

No push/deploy/production migration/SaaS/member exposure. No Wave 2. Preserve Replay Vault 74 protected product files byte-identically.

Repair exactly these four closure blockers without weakening tests:

## 1. Complete private-ledger ACL lockdown

`cycle_plan_intents_v2` and `cycle_plan_reconciliation_requests_v2` still expose TRUNCATE, REFERENCES, TRIGGER under Supabase-style defaults.

- Revoke INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER from PUBLIC, anon, authenticated on both tables (and audit all Wave 1 private tables for the same bypass).
- RLS owner SELECT may remain where required; writes only through authorized security-definer boundaries.
- Full-stack PG16 verifier must probe final effective privileges under the realistic default grants and fail on any direct authenticated write/truncate/references/trigger privilege.
- Add behavior probes proving TRUNCATE denial and receipt ledger survival.

## 2. Conflict-block cloud draft saves; never auto-rebase

In `useCycleSetupDraft.ts`, CAS failure fetches/adopts the competing cloud snapshot as next expected predecessor, and queued saves can overwrite it.

- On typed CAS conflict, enter a durable `conflict_blocked` state.
- Preserve current user's local recovery snapshot.
- Do not adopt the competing revision as expected predecessor for writes.
- Cancel/ignore queued autosaves while conflict-blocked.
- No further cloud save until explicit user action reloads the authoritative cloud draft or intentionally resolves/merges through a separately verified path.
- Error/status UI must state cloud backup is blocked by newer work elsewhere.
- Add real behavior tests: tab A wins, tab B conflicts, B edits again/queued save -> zero cloud mutation; explicit reload resets predecessor and permits later save.

## 3. Correct generated-row reactivation

ON CONFLICT sets `generation_active=true` but leaves generator-retired rows archived/deleted.

- A row retired by reconciliation and later reintroduced under the same stable key must become operational again only when its retired state remains generator-owned/untouched.
- Projects: restore the generator-owned active status from archived where safe.
- Habits: restore `is_active` and clear generator-owned `deleted_at` where safe.
- Tasks: clear generator-owned `deleted_at` where safe.
- Do not undo a member's deliberate archive/delete/edit while inactive. Preserve human state and return truthful conflict/preservation metadata when reactivation is unsafe.
- Use generation baselines/provenance, not label guessing.
- Add multi-step PG16 tests: create -> remove/retire -> reintroduce -> visible/active; and member-modified-retired -> reintroduce -> human state preserved/fail-closed.

## 4. Truthful browser-storage failure status

`cycleSetupPersistence.ts` can label `status=error` + old `lastSaved` as `Saved on this device; cloud backup failed` even when the latest browser write failed.

- Distinguish local write failure from cloud sync failure in state/types/component props.
- If latest local write failed, say current changes are not safely saved on this device or cloud; do not use old lastSaved to imply latest durability.
- If local write succeeded but cloud failed, say current changes are saved on this device but not cloud.
- Cloud conflict has separate blocked wording.
- Pending and verified cloud success remain truthful.
- Add component/behavior tests for stale old timestamp + latest local failure, local-success/cloud-failure, conflict, pending, and verified success.

## Required verification

Run and record:
- focused client/static
- PG16 focused with ACL, conflict, reactivation tests
- full chronological PG16 192 predecessors + candidate
- TypeScript, focused ESLint/Deno
- build
- full npm verify
- Replay Vault baseline/control (74/74 and real untracked rejection)
- git diff --check and scans

Update tracker and append Round 3 to the critical repair receipt. Write last:
`outputs/mastermind-success-path-overnight/wave-1-critical-repair-round-3-final-message.txt`

Do not commit. Report exact gates/exits and blockers honestly.