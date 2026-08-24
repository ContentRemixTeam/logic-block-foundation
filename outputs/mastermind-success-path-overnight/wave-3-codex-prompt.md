# Wave 3 — Success Path State, Canonical Action, Evidence, Check-ins, and Support

Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
Branch: `hermes/mastermind-success-path-results-overnight-20260822`
Accepted Wave 2 source checkpoint: `25811fdcd2ef74d8425843024575bc845a6e65ea`
Documentation lock/base HEAD: `eb53a68adc39f6fbef4de56d83420c159bfe56a2`

You are the sole implementation writer. Inspect the accepted Wave 1/2 migrations, generated types, canonical cycle/task model, governing verifiers, and build tracker before editing.

Do not commit, push, deploy, apply production migrations, seed real curriculum/member data, publish, mutate SaaS, expose members, or start Wave 4. Preserve all 74 Replay Vault protected files and inherited migration chronology.

## Governing results loop

> One 90-day result → one confirmed bottleneck → one current milestone → one necessary learning resource → one canonical Planner action → evidence → evaluation → adjustment or support.

Planner owns the result, canonical action/task, evidence, evaluation, and cycle history. Wave 2 owns fail-closed capability and frozen assigned Learning. Wave 3 adds a thin protected per-cycle Success Path state and execution/evaluation ledger; it must not create a second planner, duplicate task system, video-completion success proxy, or curriculum library.

## Required implementation

### 1. Thin per-cycle Success Path snapshot

Create a post-Wave-2 migration and server-owned RPC boundary for a protected per-cycle state containing only orientation/execution linkage:
- same-owner `user_id + cycle_id` authority with composite FK to the canonical cycle;
- exact accepted Planner reconciliation receipt/plan identity and frozen Wave 2 assignment identity;
- recommended stage distinct from member-confirmed stage;
- recommendation reason/evidence receipt without exposing private authority;
- one confirmed active milestone;
- one current canonical Planner action/task;
- capacity/recovery mode and version/receipt timestamps.

Inference proposes; the member explicitly confirms/corrects. Null confirmation must look and serialize unconfirmed. No keyword heuristic, watch percentage, missed week, or one difficult week may silently become authoritative stage/milestone state.

Every read/write must resolve `auth.uid()` server-side and revalidate capability, exact cycle ownership, current Planner receipt, and frozen assignment authority. Denied, expired, verification-unavailable, review-required, cross-owner, stale-receipt, revoked, and malformed states fail closed with no stage, milestone, action, learning, evidence, support, count, title, or private metadata.

### 2. One canonical Planner action, never duplicate progress

Attach Success Path execution to one existing or atomically created neutral canonical Planner task/action:
- stable logical identity derived from cycle + milestone + move/action version, never display index;
- same-owner FK and exact cycle binding;
- idempotent create/attach under retries and concurrency;
- no Mastermind labels or protected metadata in ordinary Planner task surfaces;
- completing the canonical task may inform protected state but does not itself prove milestone completion;
- member-modified/retired/completed tasks are preserved; rebuild/reroute cannot steal history or duplicate them;
- an AI employee may later attach to this same action, never create another progress system.

### 3. Append-only evidence receipts

Implement member-owned evidence submission tied to exact user, cycle, Success Path version, milestone, canonical task/action, frozen assignment/catalog authority, and request id/hash.
- append-only/history-preserving;
- idempotent exact replay and fail-closed payload conflict;
- evidence is private; no broad authenticated SELECT or direct DML;
- business evidence—not lesson watching—supports completion;
- support concise structured evidence types plus bounded member note/reference, without credentials, external secrets, or unsafe locator storage;
- retain evidence across capacity reduction, absence recovery, focus-change proposals, and cycle history.

### 4. Weekly check-in and evaluation

Add one transactional/idempotent check-in/evaluation boundary with explicit outcomes:
- `continue`
- `improve`
- `reduce`
- `support`

Bind it to exact cycle/path/action/evidence versions and an explicit check-in period key. Concurrent same-period submissions yield one authoritative receipt; exact retries return it; conflicting retries fail closed.

Rules:
- `reduce` changes the action size/capacity mode, not the strategy/stage/milestone;
- `support` creates or links visible support work with a status/receipt;
- `continue` and `improve` retain prior evidence/history;
- no outcome silently reroutes stage/milestone;
- milestone completion/advancement requires explicit evaluation of observable business evidence and a reviewed/confirmed transition—not video completion or task completion alone.

### 5. Changed-plan and absence recovery

Implement explicit preview/confirmation boundaries:
- stage/milestone reroute is a proposal with impact diff, preserved evidence/history, and exact expected diff hash;
- confirmation activates only the exact reviewed proposal;
- stale/mismatched/false/reordered/incomplete confirmation fails closed;
- one difficult week cannot produce a reroute proposal automatically;
- return after absence preserves result/stage/milestone by default, chooses one small current action, and does not generate an overdue curriculum/task wall;
- retries/concurrency cannot duplicate actions, check-ins, evidence, support requests, or transitions.

### 6. Support visibility and privacy-safe operator timeline

Create a protected append-only timeline/projection sufficient for future member and coach/admin UI to see:
- recommendation/confirmation;
- canonical action attach/replace/preserve;
- evidence receipt;
- evaluation outcome;
- support requested/acknowledged/resolved;
- explicit confirmed focus transition.

Member reads only their own protected timeline. Privileged support operations require a narrow server role RPC, append-only events, explicit actor/reason, and final ACL denial to ordinary users. No browser-supplied identity/email authority. No private media/Vault locators or credentials.

### 7. Generated types and verification

Update generated TypeScript RPC/table contracts exactly.

Add:
- a static Wave 3 contract verifier;
- a native disposable PostgreSQL 16 behavior/RLS/ACL/concurrency verifier using real personas and serialized-response absence assertions;
- package scripts `verify:mastermind-wave3-static`, `verify:mastermind-wave3-postgres`, and aggregate `verify:mastermind-wave3`;
- Wave 3 aggregate must include the full chronological PostgreSQL replay through every checked-in migration, and repository `npm run verify` must include Wave 3.

Behaviorally prove at minimum:
- member/nonmember/expired/unavailable/review-required/cross-owner personas;
- null recommendation confirmation remains unconfirmed;
- stale Planner/frozen-assignment authority fails closed;
- canonical action same-owner binding and retry/concurrency idempotency;
- member-modified/completed/retired task history preservation;
- evidence exact retry vs conflicting payload;
- same-period check-in concurrency;
- reduce/support semantics;
- no silent reroute;
- exact reroute diff confirmation and adversarial mismatches;
- absence recovery without overdue duplication;
- support lifecycle/timeline privacy;
- final effective table/function ACLs, including denied direct INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER where applicable;
- serialized denial envelopes contain no protected Success Path, assigned Learning, media, transcript, Vault, action, evidence, support, counts, titles, placement, or authority metadata;
- a meaningful executable mutation control causes the governing privacy verifier to fail, with static anti-regression protection;
- migration apply-twice after complete chronological predecessor stack.

## UX/data boundaries

- Ordinary Planner remains complete and standalone-safe; no Mastermind labels, locked previews, upgrade prompts, stage/milestone metadata, curriculum, support controls, or hidden counts.
- Primary future Mastermind surface: one result, one confirmed stage, one milestone, one action, one evidence point, one support route.
- Low capacity reduces action size without changing strategy.
- Honest states distinguish loading, denied, verification unavailable, unconfirmed, stale, pending, saved, conflict, and support-open.
- No UI/member exposure is required in this wave unless an existing contract demands a minimal protected consumer; Wave 4 owns the Offer-first protected member vertical slice.

## Required verification and receipt

Run what the sandbox permits; parent will rerun native gates:
- Wave 3 static and native PG16;
- full chronological PG16 through all migrations;
- TypeScript;
- focused lint;
- production build;
- full `npm run verify`;
- Replay Vault 74/74 baseline and all mutation controls;
- `git diff --check`;
- secret and absolute-path scans.

Update `OVERNIGHT-BUILD-TRACKER.md` and write `outputs/mastermind-success-path-overnight/wave-3-verification-receipt.md` plus a concise final message. Report exact files, tests, blockers, and production status. Leave the tree uncommitted for parent reconciliation and immutable review.