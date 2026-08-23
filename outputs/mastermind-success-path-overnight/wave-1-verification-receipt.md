# Wave 1 Verification Receipt — Canonical Transactional Planner Save

Status: **VERIFIED LOCAL CANDIDATE — RELEASE BLOCKED; no production action**

Verified at: `2026-08-22 19:44:04 EDT`
Base checkpoint: `9cc7704e2fcd754592b9604dc1dcc963e3214997`
Branch: `hermes/mastermind-success-path-results-overnight-20260822`
Candidate migration: `supabase/migrations/20260822190000_cycle_plan_reconciliation_v2.sql`
Candidate migration SHA-256: `97053438300013173d819bc42806c8aa456d6ec2658ef9f1d0386c61b5359cdb`

## What Wave 1 establishes

- One authenticated, transactional server boundary reconciles the canonical 90-day Planner cycle.
- The server derives owner identity from `auth.uid()`; browser-supplied user identity is not authorization authority.
- Stable logical-plan identity is separated from payload-bound request identity.
- Exact retries converge to the same canonical receipt; changed payloads cannot reuse the same request identity.
- Concurrent first-cycle requests converge to one canonical cycle.
- Generated Planner rows carry baselines so completed or member-edited work is preserved.
- Stale generated rows are retired rather than blindly deleted.
- The browser requires authoritative receipt readback before treating reconciliation as complete.
- Cloud-draft ownership and cleanup prevent an older response from clearing newer member work.

## Exact final gates on the current candidate tree

| Gate | Exit | Result |
|---|---:|---|
| `git diff --check` | 0 | No whitespace errors |
| `npm run verify:cycle-plan-reconciliation` | 0 | Seven client identity/retry/readback/cleanup ownership contracts passed |
| `npm run verify:cycle-plan-migration-static` | 0 | Ordering, destinations, auth/hash/lock contract, generated types, and browser boundary passed |
| `npm run verify:cycle-plan-postgres` | 0 | Real PostgreSQL 16.14 apply-twice, behavior, RLS, cross-owner, preservation/retirement, and concurrency probes passed |
| `npx tsc --noEmit` | 0 | No TypeScript errors |
| Focused `npx eslint …` | 0 | No findings |
| Focused `deno lint …` | 0 | Three draft edge functions checked |
| `npm run build` | 0 | Production build passed; inherited Browserslist/chunk-size warnings only |
| `npm run verify:replay-vault-protected-baseline` | 0 | 74/74 protected hashes and byte counts matched; zero scope additions |
| `npm run verify` | 0 | Complete repository gate passed, including Replay Vault suites and 5 Mastermind browser scenarios × 2 passes |

## Real PostgreSQL proof

The focused native PostgreSQL 16.14 harness executed—not merely parsed—the candidate migration and contracts:

- mock current-main schema
- candidate migration apply 1
- candidate migration apply 2
- retry convergence
- payload-conflict rejection
- receipt versioning
- generated row creation
- preservation of member-edited/completed rows
- retirement of stale generated rows
- authenticated RLS behavior
- cross-owner cycle/project rejection
- real concurrent first-cycle convergence to one cycle and receipt

## Fresh chronological migration replay blocker

`npm run verify:cycle-plan-full-stack-postgres` does **not** pass.

After adding only disposable Supabase platform fixtures, the untouched migration history replayed through `181/193` migrations. It then failed at inherited migration:

`supabase/migrations/20260808120000_mastermind_portal_private_search.sql`

PostgreSQL 16 error:

`ERROR: generation expression is not immutable`

That historical migration has no Wave 1 diff. Its SHA-256 at verification was:

`5cd4c100bf7d4df6f960775d06588d938b8b154ac1b62efc227d0e7c4f60acea`

Wave 1 does not edit or bypass that migration. The exact 193-migration fresh-stack gate therefore remains a release blocker and must be repaired or validated in the intended managed project before production migration apply.

## Safety boundary

- No push.
- No deployment.
- No production migration apply.
- No production SaaS/API call.
- No member exposure.
- No entitlement or access change.
- No protected Replay Vault change.

## Acceptance meaning

This receipt supports a **local Wave 1 implementation checkpoint** and allows later private source waves to build against the transactional contract. It does **not** support production release. Production remains blocked by the inherited full-history migration failure, intended-project visibility, authenticated production proof, and final launch approval.
