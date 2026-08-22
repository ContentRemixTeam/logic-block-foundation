# Overnight Codex Build Brief — Mastermind Planner Learning + Success Path

You are the sole background source builder for Faith Mariah’s private Mastermind Planner Learning + Success Path implementation. Work continuously and sequentially through as many complete waves as can be verified. You may modify source files in this worktree; that is the job.

## Exact workspace

- Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
- Branch: `hermes/mastermind-success-path-results-overnight-20260822`
- Base: `5f4c219cdbcc58b845b0e5d3a7e8d719e64f6ce3`
- Verified Wave 0 checkpoint: `de806e8762a6b5181a0f51f2733c2c3ac6395fa3`
- Accepted behavior reference only: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-portal-replacement-overnight-20260811` at `9f9b25f7`

Begin by verifying this exact branch/HEAD and reading completely:

1. `00-READ-FIRST-OWNERSHIP.md`
2. `OVERNIGHT-BUILD-TRACKER.md`
3. `outputs/mastermind-success-path-overnight/wave-0-contracts-and-port-map-2026-08-22.md`
4. `outputs/mastermind-success-path-overnight/wave-0-receipt-2026-08-22.md`
5. `outputs/mastermind-success-path-overnight/replay-vault-protected-baseline.json`
6. `/Users/faithhawks/Library/Mobile Documents/iCloud~md~obsidian/Documents/FaithMariahHQ/98-AI-Staging/Mastermind Planner Curriculum Infrastructure and Member Results Build Plan - 2026-08-22.md`

## Product truth

One 90-day result → one member-confirmed stage → one active milestone → one primary Planner Learning resource → one canonical Planner task/action → evidence → Continue / Improve / Reduce / Support.

- Watching never completes or advances a milestone.
- Regular Planner remains a complete standalone-safe product with no Mastermind clutter for non-entitled users.
- Planner Learning is the curated curriculum replacing the GHL curriculum experience after a later approved migration.
- Replay Vault is a separate annual/lifetime product replacing membership.io’s all-call replay archive. Do not blend it with curriculum.
- GHL Community and Events remain separate destinations.
- The 543-lesson inventory has not received complete transcript-level final editorial QA. Real curriculum resources remain `gap`, `candidate`, or `review_pending`; use synthetic fixtures for the Offer private slice. Never mark real assets `ready` without transcript/provenance/rights/privacy/edit/playback/action/evidence proof.

## Hard safety boundaries

- No push.
- No deploy or Lovable publication.
- No production Supabase/API calls or migration apply.
- No GHL changes.
- No member access/entitlement changes.
- No email, publishing, portal retirement, Searchie cancellation, or member-facing exposure.
- Do not invoke external agents or schedule jobs.
- Do not modify the separate Replay Vault product except a minimal shared interface consumer if strictly required. Existing protected Replay Vault baseline must compare with zero unauthorized changes.
- Never merge or cherry-pick `9f9b25f7` wholesale. Manually port/adapt only accepted behavior onto current main.
- Never fabricate output, tests, or readiness.

## Required sequential build waves

### Wave 1 — Canonical transactional Planner reconciliation

Implement the Wave 0 contract on current main:

- one reconciliation payload from Cycle Setup;
- idempotent, authenticated server transaction;
- durable logical first-cycle identity carried in cloud draft/server contract, not localStorage alone;
- exact request ID + payload hash semantics;
- server readback receipt;
- two-browser/same-quarter convergence;
- completed/member-edited work preservation;
- retirement of removed unfinished generated tasks;
- stable generated keys and owner/cycle scoping;
- draft cleared only after receipt verification.

Rebuild the accepted reconciliation SQL as a new post-main migration filename. Do not reuse `20260809160000`. Add focused TypeScript/unit/contract and disposable PG16 behavior/double-apply tests. Preserve existing Planner behavior.

Run focused tests, `npx tsc --noEmit`, and `npm run build`. Critically inspect and repair substantive defects. Compare protected Replay baseline. Write Wave 1 receipt, update tracker, commit locally, and verify clean status before Wave 2.

### Wave 2 — Capability + Planner Learning authority

Build fail-closed server-owned capabilities and final versioned curriculum state:

- capability keys stay independent for Planner base, Mastermind section/Learning, Ask Faith/community, annual Vault, and admin preview;
- JWT/auth identity derived server-side; never trust browser email/user/tier;
- distinct allowed/denied/verification_unavailable/review_required states with no protected metadata leak;
- immutable catalog versions/items;
- normalized frozen per-cycle assignments/items;
- Learning publication context separate from annual Replay Vault publication;
- exact Planner receipt/catalog/resource/publication hashes;
- capability-aware RLS/RPCs;
- no untyped casts in accepted final contracts;
- synthetic 24-slot catalog with real assets non-clickable/review-pending.

Add migrations/tests from full predecessor stack, double-apply/security/persona tests, types/build, receipt, tracker update, local commit, clean state.

### Wave 3 — Success Path state, actions, evidence, and check-ins

Selectively port/adapt:

- Welcome Wizard;
- Offer/Find/Nurture/Sell/Deliver/Leverage recommendation;
- member confirmation/change focus;
- receipt-bound Success Path state and assignment;
- one canonical Planner task/action, with `tasks.task_id` as completion authority;
- evidence bridge to canonical evidence store;
- append-only event-time Continue/Improve/Reduce/Support check-ins;
- help/support receipt;
- stale plan/receipt recovery;
- no automatic rerouting or milestone completion.

Do not expose broad MastermindHub as the calm default. Keep historical state historically bound. Add behavior/concurrency/security/browser tests, run gates, critical repair, protected baseline compare, receipt, tracker update, local commit, clean state.

### Wave 4 — Offer-first private Planner Learning vertical slice

Build a hidden, source-only private slice with synthetic/review-pending Offer content:

- calm default: one result, stage, milestone, resource, action, evidence prompt, support route;
- protected assigned-Learning resolver/player contract separate from Replay Vault;
- playback progress diagnostic only;
- skip-to-action;
- up to two optional resources behind More Help;
- capacity-aware 10–20 minute action version;
- return-after-absence with no curriculum debt;
- mobile 320/360/390 and accessibility states;
- private staff/admin results timeline and friction visibility with privacy-safe projection;
- no production/member route exposure.

Use review-pending fixtures for the three Offer candidates; do not claim final content approval. Run mounted browser/mobile/security/type/build tests, critical repair, baseline compare, receipt, tracker update, local commit, clean state.

### Wave 5 — Final verification and handoff

If Waves 1–4 are complete:

- run complete repository verification in dependency order;
- run full disposable PG16 stack and double apply;
- run data-contract parity and adversarial entitlement/persona matrix;
- run mounted browser and 320/360/390 mobile loops;
- verify exact protected Replay Vault hash baseline;
- inspect final diff critically and repair at least one substantive issue if found;
- rerun complete gate on exact final commit candidate;
- write a final handoff stating VERIFIED/PARTIAL/BLOCKED, exact commits, tests/exits, what is not done, blockers, and whether private preview is safe to inspect;
- commit locally and leave clean status.

## Operating discipline

- Work sequentially in this one worktree.
- Read current source before every port; current main wins over stale accepted code.
- Build tests with each contract, not afterward only.
- After each wave, write `outputs/mastermind-success-path-overnight/wave-N-receipt-2026-08-22.md` under about 100 lines with exact files, commands, exits, blockers, and next dependency.
- Update `OVERNIGHT-BUILD-TRACKER.md` truthfully.
- Commit each coherent verified wave locally. Do not push.
- If a dependency blocks a later wave, finish and verify the smallest safe predecessor, record the blocker, and stop. Do not substitute a mock for a required security/data contract.
- If tests fail three times for the same root cause, stop and record exact evidence.

Your final message must include exact branch, final commit, completed waves, test exits, protected Replay comparison, remaining blockers, and the next smallest action. Architecture or code without executed verification is not complete.
