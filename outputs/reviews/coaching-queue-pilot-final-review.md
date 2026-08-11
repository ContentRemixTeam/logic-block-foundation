# Hidden Coaching Queue Pilot — Final Code Review

**Decision: CHANGES REQUESTED**

Reviewed the working-tree Coaching Queue changes on `coaching-queue-hidden-pilot` (route/gate, page, queue helper, migration, and verification suites). The focused verifier and `npx tsc --noEmit` both pass, but the pilot still has release-blocking state-transition defects.

## Findings

### P1 — Saving and joining are separate transactions, so a rejected arrival is falsely reported as “not saved”

`src/pages/CoachingQueuePilot.tsx:229-247` first calls `save_my_coaching_request`, then separately calls `join_my_coaching_queue`. The save RPC accepts any `planned`/`live` call without checking the arrival window (`supabase/migrations/20260811130000_hidden_coaching_queue_pilot.sql:218-223,241-280`), while the second RPC rejects before-open or post-15-minute joins (`:317-326`). Therefore a join failure leaves a durable `submitted` request, but the UI catches the second error and says “The coaching request was not saved.” This is a partial-success/false-failure state and makes the 15-minute contract operationally ambiguous.

**Required correction:** make “save + raise hand” one transactional RPC, or model preparation and joining as explicitly separate UI states with a server receipt for each. Never claim the request was not saved after the first RPC committed. Add before-open, after-close, and injected join-failure tests that assert both durable state and displayed outcome.

### P1 — A withdrawn request cannot be submitted again for the same call

`withdraw_my_coaching_request` permanently sets `withdrawn_at` (`...hidden_coaching_queue_pilot.sql:404-409`). The upsert in `save_my_coaching_request` changes status but never clears `withdrawn_at` (`:256-276`), and `join_my_coaching_queue` rejects any row whose `withdrawn_at` is non-null (`:308-310`). The UI permits withdrawing and then submitting the form again (`src/pages/CoachingQueuePilot.tsx:269-285,376-399`), but that resubmission will save/update and then fail to join forever.

**Required correction:** define resubmission semantics and enforce them atomically—normally clear `withdrawn_at` when a member intentionally resubmits, while preserving an audit event. Add a withdraw → resubmit → join behavioral test.

### P2 — Client and database implement different fairness orderings

The database orders `last_coached_at` by its exact timestamp (`...hidden_coaching_queue_pilot.sql:358-367,469-478`), while the client converts it to floored whole days before comparing (`src/lib/coachingQueue.ts:42-45,62-75`). Two members coached at different times within the same day can therefore be ordered differently in the member status RPC and Faith’s UI, because the client re-sorts the admin response (`src/pages/CoachingQueuePilot.tsx:190`). That undermines the promise of one deterministic fair queue.

**Required correction:** use the server’s returned `queue_position` as the single authority, or make the client comparator exactly match the SQL timestamp ordering. Add a same-day timestamp parity fixture.

### P2 — Live mode can select a stale closed-window call

The page selects the earliest call whose status is merely `planned` or `live`, with no time-window filter (`src/pages/CoachingQueuePilot.tsx:163-170`). A call left `planned` after its 15-minute window becomes the selected call indefinitely; saving still succeeds because the save RPC also checks only status, and joining then fails on the window. This amplifies the partial-success defect above and can hide a newer valid call.

**Required correction:** expose one server-owned “active/next pilot call” query with explicit time semantics, and close/ignore expired calls deterministically. Test an expired planned call preceding a current/upcoming call.

### P2 — Concurrent completion retries are not truly idempotent

`complete_coaching_request` checks for an existing outcome before locking the request (`...hidden_coaching_queue_pilot.sql:634-645`). Two concurrent calls can both miss the first check; after the first commits, the second continues after acquiring the request lock and eventually hits the unique outcome constraint rather than returning the documented replay receipt. The current test only replays serially (`test/coaching-queue/sql_tests.sql:118-133`). The second transaction rolls back its task insert, so duplicate durable writes are prevented, but an ambiguous retry can still surface as an error.

**Required correction:** lock first and then re-check the outcome, or use a conflict-safe transactional insert/readback path. Add a real concurrent two-session test and verify one creation plus one successful replay receipt.

## Authorization, privacy, and owner-scoping checks

No authorization bypass was found in the reviewed RPCs. Admin-only reads/actions re-check `is_admin(auth.uid())`; member mutations derive ownership from `auth.uid()`; cycle and weekly-review references are owner-validated; direct table writes are revoked; member RLS limits requests/outcomes to their own rows; and the route is absent from navigation and wrapped in both Mastermind and pilot admin gates. These controls are materially stronger than relying on the client gate alone.

The focused suite proves the basic 15-minute boundary, serial replay, RLS read isolation, direct-write denial, queue ordering fixtures, and Planner write-back. It does **not** cover the state transitions and concurrency cases above.

## Verification receipts

- `npm run verify:coaching-queue` — PASS
- `npx tsc --noEmit` — PASS
- `git diff --check -- package.json src/App.tsx` — PASS
- Source files were not modified; only this review report was created.
