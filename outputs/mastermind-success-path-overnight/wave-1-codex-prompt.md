# Focused Codex Brief — Wave 1 Transactional Planner Reconciliation

You may MODIFY source files in this exact worktree. Complete exactly one coherent Wave 1 and commit it locally.

## Exact workspace

- Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
- Branch: `hermes/mastermind-success-path-results-overnight-20260822`
- Required ancestor: `de806e8762a6b5181a0f51f2733c2c3ac6395fa3`
- Accepted behavior reference only: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-portal-replacement-overnight-20260811` at `9f9b25f7`

The previous broad worker stalled before editing. Do not repeat broad project discovery. Do not call ownership guards, MCP, Basic Memory, browser tools, external agents, or production services. The worktree is exclusively assigned and currently clean after the manager briefing commit.

Read only these governing files first:

1. `00-READ-FIRST-OWNERSHIP.md`
2. `OVERNIGHT-BUILD-TRACKER.md`
3. `outputs/mastermind-success-path-overnight/wave-0-contracts-and-port-map-2026-08-22.md`
4. `outputs/mastermind-success-path-overnight/specialist-critical-feedback-2026-08-22.md`
5. `outputs/mastermind-success-path-overnight/replay-vault-protected-baseline.json`

Then inspect the exact current and accepted files needed for Wave 1:

- current `src/pages/CycleSetup.tsx`
- accepted `src/lib/cyclePlanReconciliation.ts`
- accepted `src/lib/cycleDraftOwnership.ts`
- accepted `supabase/migrations/20260809160000_cycle_plan_reconciliation.sql`
- accepted reconciliation/draft/PostgreSQL tests and package scripts
- current migrations that touch every Cycle Setup destination

## Wave 1 required outcome

Replace the fragile browser-orchestrated multi-table Cycle Setup save with one canonical authenticated reconciliation path, selectively adapted to current main.

Required semantics:

1. One typed reconciliation payload from Cycle Setup.
2. One authenticated server transaction for required Planner destinations.
3. Durable logical first-cycle identity stored in cloud draft/server state; localStorage is only a cache.
4. Separate delivery/request ID, logical plan identity, and canonical Planner receipt identity.
5. Server-computed payload/content hash.
6. Same request + same payload returns the original receipt without duplicate writes.
7. Same request + changed payload is rejected.
8. Same owner/quarter first-cycle submissions converge on one logical cycle.
9. Expected-version protection rejects stale concurrent edits.
10. Preserve completed and genuinely member-edited generated tasks/projects.
11. Retire only removed unfinished, untouched generated work.
12. Stable generated keys and owner/cycle-scoped relational integrity.
13. Browser draft clears only after server receipt readback is verified.
14. Failure/ambiguous response retains the same logical/request identities for safe retry.
15. No Mastermind entitlement or curriculum tables in this wave; this is regular Planner infrastructure.

Create a new post-main migration filename—do not reuse `20260809160000`. Source-only; never apply to production. Include rollback comments where useful but do not execute rollback on real data.

## Required tests and gates

Implement executable tests, not source-substring-only claims:

- identical retry;
- changed-payload retry;
- two-browser same-quarter first cycle after shared identity cleared;
- stale expected-version conflict;
- ambiguous/lost response then retry;
- draft cleanup failure;
- completed-task preservation;
- member-edited unfinished-task preservation;
- untouched removed generated-task retirement;
- cross-owner relationship denial;
- full predecessor migration stack + candidate migration;
- candidate double apply;
- PostgreSQL 16 behavioral probe when local disposable runtime is available.

Run at minimum:

- focused reconciliation/draft tests;
- `npx tsc --noEmit`;
- `npm run build`;
- relevant lint command;
- protected Replay Vault hash comparison.

If Docker/PostgreSQL is unavailable, still write the executable harness and report the environment blocker honestly; do not upgrade source inspection to a behavior pass.

## Receipt and completion

- Critically inspect your diff and repair at least one substantive issue if found.
- Write `outputs/mastermind-success-path-overnight/wave-1-receipt-2026-08-22.md` last, under 100 lines, with exact files, commands, exits, behavior test results, blockers, and next dependency.
- Update Wave 1 in `OVERNIGHT-BUILD-TRACKER.md` truthfully.
- Include the two Codex prompt files and specialist packet in the coherent operational history if untracked.
- Commit locally with a clear Wave 1 message.
- Do not push, deploy, apply migrations, call live Supabase/GHL, change access, publish, or touch Replay Vault product files.
- Leave clean Git status.

Final message: exact commit, changed files, test exits, PostgreSQL proof or blocker, protected hash result, remaining defects, and Wave 2 dependency.
