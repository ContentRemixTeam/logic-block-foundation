# Specialist Critical-Feedback Queue — 2026-08-22

Status: ACCEPTANCE BLOCKERS FOR ACTIVE PRIVATE SOURCE BUILD
Stable review checkpoint: `de806e8762a6b5181a0f51f2733c2c3ac6395fa3`
Delegation batch: `deleg_19dc6947`

This is a read-only review packet. Findings must be tested against each later immutable candidate; they are not implementation proof.

## P0 — Planner transaction and identity

1. Replace the current browser-controlled write chain in `src/pages/CycleSetup.tsx` with one authenticated server transaction. The current code can clear a draft and navigate after a parent cycle write while child writes fail.
2. Maintain separate identities for:
   - durable logical plan/cycle intent;
   - delivery/request retry identity;
   - canonical Planner receipt identity.
3. Compute payload hash server-side and reject reuse of a request ID with changed payload.
4. Add expected-version protection for edits; stale tabs must conflict rather than silently overwrite.
5. Two first-cycle browser sessions in the same owner/quarter must converge on one logical cycle even after local shared identity is cleared.
6. Preserve completed and genuinely member-edited generated work. Retire only removed unfinished, untouched generated work.
7. Add owner-inclusive relational constraints for cycle/project/task/child ownership and prove no cross-owner attachment.
8. Bind readback to the authoritative committed receipt. Draft cleanup occurs only after receipt verification.

## P0 — Authorization and product separation

1. Regular Planner ownership must never imply Mastermind/Planner Learning access.
2. Server derives identity and capability; browser email/tier/user claims are not authority.
3. Planner base, Mastermind Learning, Community/Ask Faith, annual Replay Vault, and admin preview capabilities remain independent.
4. Denial and verification-unavailable responses must not leak protected metadata.
5. Replay Vault’s protected 74-file baseline must remain exact unless a separately reviewed shared-interface change is necessary.

## P0 — Human support semantics

1. `Support` must create visible staff work with owner/queue state and a durable acknowledgment/resolution receipt.
2. UI must not say support was requested when only a private check-in or suggestion was saved.
3. `Reduce` must create and read back a smaller replacement action; storing the label alone is insufficient.

## P1 — Honest action and recovery UX

1. Success copy follows server readback, never optimistic local state.
2. Focus change needs impact preview, explicit second confirmation, and no destruction of historical evidence/tasks.
3. Return after absence must offer resume/reset/reduce/support without overdue curriculum debt.
4. One playable primary Learning resource must connect to one canonical Planner action and evidence; playback never completes the milestone.
5. Non-entitled regular Planner users must see no Mastermind labels, controls, locked cards, or upgrade clutter.
6. Mobile 320/360/390, keyboard, focus, announcements, and screen-reader choice semantics need mounted proof.

## P0 — Verification architecture

1. Do not accept source-string tests as behavior proof.
2. Run PostgreSQL 16 against the full chronological migration stack, predecessor upgrade, candidate double-apply, and rollback-safe failure behavior.
3. Add behavioral concurrency probes: identical retry, changed-payload retry, two-browser first cycle, stale expected version, ambiguous response/lost receipt, draft cleanup failure.
4. Add RLS/ACL/persona probes for unauthenticated, nonmember Planner, monthly Mastermind, annual Mastermind, expired, conflict/review-required, admin, and service-role misuse.
5. Regenerate Supabase types from the candidate migration contract; no untyped acceptance casts.
6. Browser proof must include required widths and failure/retry behavior, not Chromium happy path alone.
7. Final protected-file verification must check all 74 recorded files and detect unrecorded Replay-Vault-scope additions, not only Git-changed paths.
8. Final aggregate must include type, lint, build, database behavior, RLS/personas, contract parity, mounted browser/mobile/accessibility, and protected hash gates.

## Sequential repair order

1. Wave 1 transactional Planner reconciliation and executable PG tests.
2. Independent review of exact Wave 1 commit and one substantive repair iteration.
3. Wave 2 server capabilities and versioned Learning authority.
4. Wave 3 Success Path/action/evidence/check-in/support semantics.
5. Wave 4 private Offer slice and mounted member experience.
6. Wave 5 full exact-commit acceptance.

## Source review artifacts

- `/Users/faithhawks/.hermes/cache/delegation/subagent-summary-0-20260822_183039_355719.txt`
- `/Users/faithhawks/.hermes/cache/delegation/subagent-summary-1-20260822_183039_360594.txt`
- `/Users/faithhawks/.hermes/cache/delegation/subagent-summary-2-20260822_183039_362307.txt`
