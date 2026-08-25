# Wave 5 independent-review repair receipt — 2026-08-24

Baseline: `36dfb85c2b43a9793a0b0d866a0b2a3bfc4716be`

Scope: unapplied Wave 5 forward migration and current Wave 5 client/types/tests/receipts only. Accepted Waves 1–4 migrations were not edited.

Repair result:

- Private transition authority remains server-side; authenticated browsers can execute only the recursively closed member wrappers.
- Safe preview confirmation is bound to proposal ownership, server-stored raw authority, exact safe diff equality, and safe SHA-256; raw confirmation still performs its accepted recomputation/staleness/idempotency/readback work.
- The disposable PostgreSQL 16 verifier builds a synthetic current Success Path and assigned-learning fixture through the accepted catalog, assignment, recommendation, and member-confirmation producers. It invokes the engagement RPC as the real `authenticated` role with JWT claims.
- Simultaneous authenticated RPC clients prove same-request/same-payload convergence to one durable request and event with exact replay, changed-payload `request_conflict` with no write, and distinct-request progress serialization to an exact monotonic 7000-basis-point maximum while preserving each reported payload and durable receipt.
- A lower 3000-basis-point heartbeat after the 7000 maximum proves durable `heartbeat_deduplicated` suppression with no event, followed by exact replay with no additional rows. The verifier inspects response JSON, event rows, request rows, stored receipt fields, reported/accepted progress, and final counts.
- Member and review projections share one classification function; healthy `in_progress` is not returned as review work.
- Production parser runtime/mutation, PostgreSQL 16, 198-migration chronology/double-apply, mounted browser/a11y, type/lint, production build/bundle, canonical verify, and Replay Vault 74/74 gates passed.

No production action was taken. No commit was created. This receipt does not claim production readiness, approved curriculum, or member validation.
