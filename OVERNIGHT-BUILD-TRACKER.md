# Mastermind Curriculum + Success Path Overnight Build Tracker

Status: ACTIVE — PRIVATE SOURCE BUILD ONLY
Last updated: 2026-08-22
Base: `5f4c219c`
Branch: `hermes/mastermind-success-path-results-overnight-20260822`

## Product result contract

One 90-day result → one confirmed stage → one active milestone → one primary Planner Learning resource → one canonical Planner action → evidence → Continue / Improve / Reduce / Support.

Watching never completes a milestone. The regular Planner remains complete and Mastermind-neutral. Replay Vault is a separate annual all-call archive.

## Sequential waves

### Wave 0 — Baseline and contracts
- [x] Verify dependency install and baseline checks
- [x] Record protected Replay Vault file/hash inventory
- [x] Map current Cycle Setup writer and accepted reconciliation behavior
- [x] Define final SQL/API/UI contracts and migration ordering
- [x] Create receipt

### Wave 1 — Canonical transactional Planner save
- [x] One typed reconciliation payload + authenticated transaction source
- [x] Durable logical plan, payload-bound request, and canonical receipt identities
- [x] Generated row baselines preserve completed/member-edited work and retire stale generated rows
- [x] Native PostgreSQL 16 apply-twice, RLS, cross-owner, preservation, retry/conflict, and concurrency probes
- [x] Full repository `npm run verify`, build, lint, type, and protected Replay Vault gates
- [x] VERIFIED LOCAL CANDIDATE receipt created
- [ ] RELEASE BLOCKER — inherited migration `20260808120000_mastermind_portal_private_search.sql` fails a fresh PostgreSQL 16 replay at migration 182/193 (`generation expression is not immutable`); Wave 1 does not modify it

### Wave 2 — Capability and curriculum authority
- [ ] Add fail-closed Mastermind Learning capability contract
- [ ] Keep Replay Vault capabilities independent
- [ ] Add versioned Learning catalog and normalized frozen assignments
- [ ] Add capability-aware RLS/RPCs
- [ ] Regenerate/verify Supabase data contracts
- [ ] Create receipt

### Wave 3 — Success Path state and actions
- [ ] Port/adapt welcome and recommendation UX
- [ ] Member confirmation/change focus
- [ ] Bind active path to exact Planner receipt and catalog assignment
- [ ] One canonical task; no duplicate completion state
- [ ] Evidence/check-in/support event bindings
- [ ] Create receipt

### Wave 4 — Offer-first Planner Learning vertical slice
- [ ] Add private Learning route/player contract separate from Replay Vault
- [ ] Use synthetic/review-pending Offer resource fixtures only
- [ ] Implement one-result/one-milestone/one-resource/one-action UI
- [ ] Add skip-to-action, More Help, low-capacity, return-after-absence states
- [ ] Add minimal private admin/results visibility
- [ ] Create receipt

### Wave 5 — Verification and critical revision
- [ ] TypeScript, lint, production build
- [ ] Disposable PostgreSQL full-stack and double-apply tests
- [ ] Contract parity tests
- [ ] Behavioral/security/persona tests
- [ ] Mounted browser + 320/360/390 mobile tests
- [ ] Independent acceptance review and substantive repair round
- [ ] Rerun complete gate on final hash
- [ ] Write morning handoff

## Content gate

The 543-lesson inventory exists, but a full transcript-by-transcript curriculum audit is not complete. No real resource is marked `Ready` or published by this overnight source build unless its transcript, provenance, rights/privacy, edit, playback, action, and evidence QA are proven. Offer candidates remain review-pending fixtures.

## Production blockers

- Intended Supabase project is not currently visible to the authenticated management account.
- No production migration or authenticated real-member/mobile playback proof.
- No approval to deploy, publish, alter access, retire GHL, or expose member routes.

## Receipts

Add exact commit, files, commands, exit codes, failures, and next dependency here after each wave.

### Wave 1 recovery and parent verification — 2026-08-22

Status: **VERIFIED LOCAL CANDIDATE — RELEASE BLOCKED**

Real parent-environment PostgreSQL 16.14 execution removed the worker sandbox limitation. The focused migration/behavior suite passed apply-twice, retry/conflict, versioning, preservation/retirement, RLS/cross-owner, and real concurrent first-cycle probes. TypeScript, focused lint, production build, protected Replay Vault baseline, and complete `npm run verify` also passed.

The exact 193-migration fresh-stack replay remains blocked at untouched inherited migration `20260808120000_mastermind_portal_private_search.sql` (`generation expression is not immutable`) after reaching migration 182/193. This is a release blocker, not represented as a Wave 1 pass.

Canonical evidence: `outputs/mastermind-success-path-overnight/wave-1-verification-receipt.md`.

No push, deployment, production migration, external SaaS action, access change, or member exposure occurred.
