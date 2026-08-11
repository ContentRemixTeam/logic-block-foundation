# Hidden Coaching Queue Pilot — Local Source Receipt

Date: 2026-08-11
Branch: `coaching-queue-hidden-pilot`
Repository: `logic-block-foundation`

## Completed source work

- Added an unlinked route at `/mastermind/coaching-queue-pilot`.
- Wrapped the route in the existing authenticated Mastermind gate and a separate `is_admin` gate. An active member who guesses the URL is redirected.
- Default route mode is an explicitly labeled, no-write demo with seeded fictional members.
- Added member test form: question, desired result/decision, what was tried, real blocker, deadline, attendance, coaching-if-absent, replay permission, sensitive flag, live/private route, update, withdraw, and Raise My Hand.
- Added Faith queue: explainable fair ordering, place/wait context, goals, milestone, capacity, current check-in, prior coaching, manual override with recorded reason, private written requests, and outcome recording.
- Added owner-scoped schema/RPC draft for coaching calls, requests, immutable queue events, outcomes, skip/carry-forward, first-15-minute admission, member-only status, admin-only detailed queue, Planner task write-back, pending weekly follow-up read, outcome acknowledgment, and member result logging.
- The live “save + Raise My Hand” path is one transactional RPC: a before-open, late, or injected join failure rolls back the request save instead of leaving partial state.
- Withdrawn members may intentionally resubmit for the same call; the original waiting date is preserved and a separate resubmission audit event is recorded.
- Live queue cards use the server-returned queue position as the single ordering authority; the client comparator is demo-only.
- The server-owned call list ignores expired planned calls and prefers the currently open call before the next upcoming call.
- Outcome completion locks the request before replay lookup; a forced-overlap two-session PostgreSQL test proves one creation plus one successful replay.
- Added deterministic TypeScript contracts and disposable PostgreSQL behavior tests.

## Verified

- `npm run verify` passed the complete Planner gate after all review repairs: portal, Success Path, cycle reconciliation, disposable PostgreSQL, Coaching Queue, replay/search/playback, live-gate mocks, TypeScript, production build, bundle checks, and 10 browser passes.
- Focused ESLint for all new TypeScript/React files passed.
- The PostgreSQL migration applies twice in a disposable PostgreSQL 16 database.
- Runtime SQL tests prove owner privacy, denied direct writes, transactional late-arrival rollback, server-clock 15-minute close, authoritative fair order, preserved original waiting date, audited withdraw/resubmit and manual override, skipped-request carry-forward, expired-call exclusion, follow-up readback, result logging, and safe retry after the window closes.
- A forced-overlap two-session PostgreSQL test proves simultaneous completion requests persist exactly one outcome and one Planner task while the second request returns a successful replay receipt.
- Built preview responds at `http://127.0.0.1:4173/mastermind/coaching-queue-pilot`.

## Deliberately not done

- No production Supabase migration applied.
- No commit pushed or merged to GitHub/main.
- No Lovable sync or production publication.
- No Planner navigation item or member-facing link.
- No real member records created or changed.
- Normal Weekly Review UI remains unchanged; the backend follow-up contract is present but stays hidden until Faith approves the pilot.

## Release boundary

The pilot is local and testable in no-write demo mode only. Turning on live mode requires the exact migration in this branch and a separate approval. Member exposure additionally requires a later navigation/integration change and separate approval.
