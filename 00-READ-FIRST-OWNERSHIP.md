# READ FIRST — OVERNIGHT OWNERSHIP

Status: ACTIVE
Owner session: Hermes Mastermind Curriculum / Success Path overnight lane
Started: 2026-08-22
Branch: `hermes/mastermind-success-path-results-overnight-20260822`
Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
Base: `main` at `5f4c219cdbcc58b845b0e5d3a7e8d719e64f6ce3`

## Owned scope

- Canonical transactional 90-Day Planner save/reconciliation required by Success Path
- Mastermind core capability integration
- Mastermind Planner Learning catalog/assignment contracts
- Success Path onboarding, recommendation, confirmation, action, evidence, check-in, and coaching visibility
- Offer-first private vertical slice using synthetic/review-pending curriculum fixtures
- Source-only migrations, local tests, private preview, verification receipts

## Explicitly excluded / owned by separate Replay Vault chat

Do not redesign, remove, or claim ownership of:

- `src/pages/ReplayVault.tsx`
- `src/components/replay-vault/**`
- annual Replay Vault discovery, search, Saved, transcripts, Questions Answered, or replay progress
- `supabase/functions/_shared/replayVault*`
- `supabase/functions/_shared/vault*`
- `supabase/functions/search-mastermind-resources/**`
- `supabase/functions/vault-member-*/**`
- existing Replay Vault migrations and verification suites
- membership.io all-call Replay Vault migration work

A generic playback/media interface may be consumed, but Planner Learning must have separate catalog, publication, capability, assignment, progress context, search, Saved, analytics, and member UX.

## Governing sources

1. `/Users/faithhawks/Library/Mobile Documents/iCloud~md~obsidian/Documents/FaithMariahHQ/98-AI-Staging/Mastermind Planner Curriculum Infrastructure and Member Results Build Plan - 2026-08-22.md`
2. `/Users/faithhawks/Library/Mobile Documents/iCloud~md~obsidian/Documents/FaithMariahHQ/98-AI-Staging/Mastermind Curriculum and 90-Day Planner Implementation Blueprint - 2026-08-22.md`
3. Accepted behavior reference only: worktree `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-portal-replacement-overnight-20260811`, commit `9f9b25f7`
4. Current source authority: this worktree based on current `main`

## Safety

- No push, deploy, production migration, live Supabase write, member access change, GHL change, publishing, or portal retirement.
- Never merge/cherry-pick `9f9b25f7` wholesale. Selectively port behavior.
- New SQL migrations are drafts and are never applied to production.
- Preserve regular Planner and Replay Vault behavior.
- One writer at a time in this worktree.
- Run and record decisive verification after every wave.
- Stop rather than fake a result if a dependency or credential is unavailable.

## Handoff requirement

Every worker must update `OVERNIGHT-BUILD-TRACKER.md`, commit coherent source changes locally, and leave the worktree clean or explicitly document uncommitted state. A self-reported pass is not proof; exact commands and exit codes are required.
