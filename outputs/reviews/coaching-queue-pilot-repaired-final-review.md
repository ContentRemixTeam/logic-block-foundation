# Hidden Coaching Queue Pilot — Repaired Final Acceptance Review

**Verdict: CHANGES REQUESTED — NOT ACCEPTED**

One P1 defect remains. The named repair work closes the prior transaction, resubmission, client/admin ordering, stale-call, and concurrent-replay defects, but the two server queue readers still compute different fairness histories. A member can therefore be told the opposite queue position from the one Faith sees.

## Exact candidate reviewed

- Repository: `/Users/faithhawks/Developer/Mastermind Scaling/logic-block-foundation`
- Branch: `coaching-queue-hidden-pilot`
- Exact final HEAD: `4c6b582c80f0041b3dfdc9a59b9ab80f3687a07e`
- Final worktree at dispatch: clean
- Exact-HEAD archive SHA-256: `c497ff564a97ebc0f255b716d35e370ac55222f2fdebf3fab4945e3199451b5e`
- Review fixture: a disposable `git archive HEAD` snapshot; builds and PostgreSQL writes were isolated from the repository.

The live worktree changed once during the first pass (from dirty HEAD `e0816f0da13355e25e3529c8dda29e19037c7e9c` to clean HEAD `4c6b582c80f0041b3dfdc9a59b9ab80f3687a07e`). I discarded the earlier candidate as superseded, obtained two consecutive stable clean scans, and reran the governing checks against the exact final HEAD. The only Coaching Queue source change between those candidates was the page clock refresh; the migration containing the finding below was byte-identical.

## Prior-blocker verification matrix

### 1. Split save/join partial success — PASS

- `src/pages/CoachingQueuePilot.tsx:253-273` uses `save_and_join_my_coaching_queue` for live queue submission; it no longer performs a second client-side join RPC.
- `supabase/migrations/20260811130000_hidden_coaching_queue_pilot.sql:348-381` executes save and join inside one PostgreSQL function/statement, so a join exception rolls back the preceding save and event.
- Committed PostgreSQL coverage at `test/coaching-queue/sql_tests.sql:191-211` proves a late arrival leaves zero requests.
- Fresh disposable exact-HEAD probes additionally exercised:
  - before-open rejection: the probe asserted zero durable `coaching_requests` rows;
  - an injected trigger failure on the post-save queued-state update: the probe asserted zero durable `coaching_requests` rows.
- Both probes completed successfully under `ON_ERROR_STOP=1`.

### 2. Withdrawn request cannot resubmit — PASS

- `...hidden_coaching_queue_pilot.sql:272-289` clears `withdrawn_at`, resets withdrawn live requests to `submitted`, preserves `waiting_since`, and records a distinct `resubmitted` event.
- `test/coaching-queue/sql_tests.sql:108-135` executes withdraw → atomic resubmit/join and asserts the original request ID, joined receipt, preserved waiting time, null withdrawal marker, and one resubmission audit event.
- The fresh exact-HEAD PostgreSQL suite passed this test.

### 3. Client/admin ordering mismatch — PASS for the named client defect

- `src/pages/CoachingQueuePilot.tsx:211-216` uses server-returned `queuePosition` as the ordering authority in live mode; the TypeScript comparator is demo-only.
- `tools/verify-coaching-queue.mjs:54-56` verifies the atomic RPC and server-position live path.
- This closes the prior whole-day client timestamp rounding mismatch.

A separate server/server P1 remains; see **Blocking finding** below.

### 4. Stale expired call selection — PASS

- `...hidden_coaching_queue_pilot.sql:466-486` provides the server-owned call list, excludes rows whose `queue_closes_at` is in the past, and orders an open call ahead of an upcoming call.
- `src/pages/CoachingQueuePilot.tsx:180-194` consumes the first row from that RPC instead of selecting locally from an unbounded table query.
- `test/coaching-queue/sql_tests.sql:214-224` proves an expired `planned` call is excluded while the current and next valid calls remain.
- The final page also refreshes its displayed window state every second (`src/pages/CoachingQueuePilot.tsx:173-178,219`), avoiding a stale client badge at the boundary.

### 5. Concurrent completion replay — PASS

- `...hidden_coaching_queue_pilot.sql:703-715` locks the request with `FOR UPDATE` before checking for an existing outcome and returns a successful replay receipt after the first transaction commits.
- `tools/verify-coaching-queue-postgres.py:41-87` creates a forced-overlap trigger, starts two independent `psql` sessions, requires exactly one `"replayed": false` receipt and one `"replayed": true` receipt, and asserts exactly one outcome plus one Planner task.
- Fresh exact-HEAD result: `PASS concurrent completion: one creation + one successful replay`.

## Blocking finding

### P1 — Member status and Faith’s admin queue use different coaching-history definitions

The two server RPCs that promise one fair queue do not rank the same data:

- Member status (`get_my_coaching_queue_status`) counts **all** outcomes and takes the latest timestamp across every disposition: `...hidden_coaching_queue_pilot.sql:391-398`.
- Faith’s admin queue (`get_admin_coaching_queue`) counts and timestamps only outcomes where `disposition = 'completed'`: `...hidden_coaching_queue_pilot.sql:504-514`.

This is behaviorally observable, not a theoretical source discrepancy. In a fresh real-PostgreSQL exact-HEAD probe:

1. Member X had a recent `ask_faith` outcome.
2. Member Y had an older `completed` outcome.
3. Both joined the same current call with otherwise equal queue factors.
4. Faith’s admin RPC returned:
   - `ADMIN_POSITION X=1`
   - `ADMIN_POSITION Y=2`
5. The member status RPC returned:
   - `MEMBER_POSITION X=2`
   - `MEMBER_POSITION Y=1`

The member-facing estimate can therefore state the reverse of Faith’s operating order. This violates the required explainable single fair order and is acceptance-blocking.

**Exact blocking fix:** define one canonical coaching-history policy (including whether `ask_faith` and `private_written` count as “coached”) and make both RPCs consume the same shared history/ranking implementation. Add a PostgreSQL parity test with mixed `completed`, `ask_faith`, and `private_written` histories that asserts each queued member’s `get_my_coaching_queue_status.position` exactly equals that request’s `get_admin_coaching_queue.queue_position`.

## Other required pilot checks

- **Admin-only, unlinked, no-write demo:** PASS. `src/App.tsx:117-120,277` lazy-loads the route behind `ProtectedRoute`, `MastermindGate`, and `CoachingQueuePilotGate`; `CoachingQueuePilotGate.tsx:17-27` checks admin status and redirects non-admins; the verifier confirms no desktop/mobile sidebar link. Demo is the default and its submit/override/withdraw/outcome paths update React state only; live mode requires an explicit switch.
- **15-minute admission:** PASS. Database constraints cap close at start + 15 minutes, server-clock checks enforce open/close boundaries, and atomic before-open/late/injected-failure probes leave no partial request.
- **Owner privacy / narrow writes:** PASS for the reviewed pilot. Member reads are owner-scoped, detailed queue RPCs re-check admin status, member mutations derive ownership from `auth.uid()`, and direct writes are revoked.
- **Manual overrides:** PASS. Admin-only override validates and records a reason and audit event; behavioral ordering test passed.
- **Skip carry-forward:** PASS. `test/coaching-queue/sql_tests.sql:179-189` proves original waiting time and incremented skip count survive carry-forward.
- **Planner task, follow-up, and result write-back:** PASS. `test/coaching-queue/sql_tests.sql:147-177` proves one Planner task, pending follow-up readback, member result logging, and follow-up acknowledgment.
- **No production exposure:** No migration, push, publication, navigation addition, production database write, or other downstream action was performed during this review. This verdict covers the local exact HEAD only.

## Fresh verification receipts

Run from the disposable exact-HEAD fixture:

- `npm run verify:coaching-queue` — PASS
  - migration apply 1 — PASS
  - migration apply 2 — PASS
  - behavior/privacy/fairness/write-back/15-minute suite — PASS
  - real two-session concurrent completion — PASS
- `node node_modules/typescript/bin/tsc --noEmit` — PASS
- `npm run build` — PASS (nonblocking Browserslist-age and chunk-size warnings only)
- Fresh adversarial PostgreSQL parity probe — **FAIL as acceptance evidence**: admin positions `X=1, Y=2`; member positions `X=2, Y=1`.

## Final disposition

**NOT ACCEPTED.** No P0 was found, but the server/server queue-order P1 must be fixed and covered by mixed-disposition position-parity tests before acceptance.

Source was not modified. This review report is the only repository file created by the reviewer.
