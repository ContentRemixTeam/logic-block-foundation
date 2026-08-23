# Wave 1 Recovery, Verification, and Commit Brief

You are the only active source writer in this worktree. A previous Codex process was terminated by the process runtime before testing or committing, but its uncommitted Wave 1 work is preserved. Continue from the current dirty tree. Do not discard, reset, stash, or rewrite unrelated work.

## Governing scope

Finish only Wave 1: replace the browser-orchestrated Cycle Setup multi-table save with one transactional, idempotent, receipt-backed PostgreSQL boundary and safe draft identity/cleanup behavior.

Read before editing:

- `00-READ-FIRST-OWNERSHIP.md`
- `OVERNIGHT-BUILD-TRACKER.md`
- `outputs/mastermind-success-path-overnight/wave-0-contracts-and-port-map-2026-08-22.md`
- `outputs/mastermind-success-path-overnight/specialist-critical-feedback-2026-08-22.md`
- `outputs/mastermind-success-path-overnight/wave-1-codex-prompt.md`

## Existing uncommitted work

Inspect every modified/untracked file. The tree currently includes a large migration, reconciliation client, draft ownership/cleanup utilities, Cycle Setup changes, generated Supabase types, edge draft changes, tests, and PostgreSQL verification tools. Treat these as untrusted candidate work until exercised.

## Required acceptance behavior

1. One server transaction owns every canonical Cycle Setup write.
2. Identity: one logical plan, one request per payload, stable request identity across lost-response retry.
3. Same request + same payload replays the authoritative receipt without duplicate work.
4. Same request + different payload fails explicitly.
5. Same logical plan + changed content creates the next version safely without duplicate active generated rows.
6. Concurrent first-cycle creation converges or rejects safely—never two active first cycles.
7. Stale expected-version writes fail explicitly.
8. Member-edited or member-adopted rows are preserved; only still-generated stale rows may retire.
9. Cycle Setup does not navigate until authoritative receipt readback matches request, logical plan, cycle, hashes, version, and receipt identity.
10. Local/cloud draft cleanup occurs only after verified receipt; cleanup failure preserves recovery state and cannot overwrite newer cloud work.
11. Authorization derives from authenticated server identity; fail closed.
12. No Replay Vault protected file changes.
13. No production migration apply, push, deployment, SaaS call, or member exposure.

## Verification sequence

Run and save exact receipts for:

1. `git diff --check`
2. focused JS/TS contract verification
3. migration/parser/schema checks
4. PostgreSQL-backed reconciliation verification, including the full-stack script where supported
5. `npm run typecheck` or the repository-equivalent TypeScript command
6. focused lint for touched source where available
7. production build
8. protected Replay Vault hash comparison against the committed 74-file baseline manifest
9. inspect final diff and `git status`

Do not accept a test that only scans SQL text as proof of database behavior. If PostgreSQL/Supabase is unavailable, mark that exact acceptance gate blocked rather than inventing a pass. Fix source defects discovered by real execution.

## Required deliverables

- Update `OVERNIGHT-BUILD-TRACKER.md` with exact Wave 1 status, commands, exit codes, files, and unresolved blockers.
- Write `outputs/mastermind-success-path-overnight/wave-1-verification-receipt.md`.
- Write final summary to the configured `wave-1-recovery-final-message.txt`.
- Commit all coherent Wave 1 work with a concise commit message only if the exercised gates support the claim.
- End with the exact commit hash and a clean worktree. If a blocker prevents a truthful commit, leave the tree intact, state the blocker, and do not claim success.

Finish within this single focused run. Do not begin Wave 2 or curriculum/AI-employee work.
