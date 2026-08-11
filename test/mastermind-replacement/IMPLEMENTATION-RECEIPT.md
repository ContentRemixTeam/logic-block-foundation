# Hidden Mastermind Planner Replacement — Implementation Receipt

Date: 2026-08-11

The independent review of exact commit `0d76cf3c` was blocked. This local, uncommitted repair addresses those blockers; it does not claim a production migration apply or signed-in production proof.

## Built

- Durable one-time Welcome Wizard and handoff to canonical `/cycle-setup`.
- Evidence-order Offer → Find → Nurture → Sell → Deliver → Leverage recommendation from saved `planner_payload.details`; no keyword or lowest-score routing.
- Explicit member confirmation and deliberate focus-change section.
- Server-authoritative frozen 24-slot (6 × 4) curriculum/provenance catalog, seeded field-for-field from the TypeScript manifest. Every current slot is honestly `Gap`, with `resource_id = null`; no unverified resource can render.
- Confirmation accepts only cycle, stage, milestone, and the bound planner receipt. The RPC validates against private server rows and constructs both frozen JSON and resource references without client authority over labels, outputs, sources, status, provenance, or resource IDs.
- One unretired action per owner/cycle, enforced by a partial unique index. Every action now has non-null planner receipt provenance bound by a composite receipt/owner/cycle foreign key. Confirmation retires an active action when either its milestone or receipt differs, explicit scheduling is the only path that can reactivate and rebind a stable action row, and check-in requires the action, current snapshot, and confirmation to share the same completed receipt.
- Composite action-to-task ownership/cycle enforcement, while retaining the existing task foreign-key semantics.
- Confirmed UI curriculum comes only from a validated owner-scoped frozen assignment manifest and its matching resource ref. Missing or malformed server data fails closed; every Gap remains non-clickable. Pre-confirmation shows only the deterministic recommendation prompt.
- Initial read failure renders a dedicated retry state and never mounts onboarding. Mutation errors remain scoped to the attempted change.
- Continue/Improve/Reduce/Support check-in history with at most one support suggestion and an explicit `stage_changed: false` receipt.
- Forward-only migration with composite same-owner safeguards, RLS, and authenticated-only SECURITY DEFINER RPC execution.

## Verification run

- `LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 python3 test/mastermind-replacement/verify-mastermind-postgres.py` — PASS against a fresh isolated Homebrew PostgreSQL 16 cluster: the base and forward-only receipt-provenance migrations applied with `ON_ERROR_STOP=1`; 22 behavioral groups passed, 0 failed. Coverage includes the exact receipt A → receipt B same-milestone edge, blocked schedule/check-in before reconfirmation, retirement without reactivation on reconfirmation, explicit stable-row reschedule bound to B, successful post-reschedule check-in, focus-change retirement, one active action, concurrent action/confirmation identity, cross-owner denial, and composite owner/cycle constraints.
- `npx tsc --noEmit` — PASS (exit 0, no output).
- `npx eslint src/hooks/useMastermindSuccessPath.ts src/components/mastermind/SuccessPathPlanCard.tsx src/components/mastermind/MastermindWelcomeWizard.tsx src/lib/mastermindSuccessPath.ts src/pages/MastermindHub.tsx test/mastermind-replacement/*.mjs tools/verify-mastermind-replacement.mjs tools/verify-mastermind-success-path.mjs` — PASS (exit 0, no output).
- `npm run verify:mastermind-success-path` — PASS: its child `node --test` run reported 11 tests passed, 0 failed, then its synchronous PostgreSQL child harness reported 22 checks passed, 0 failed. Mutation checks prove the normal gate fails if action receipt nullability, composite receipt binding, same-milestone receipt retirement, explicit reschedule rebinding, check-in receipt equality, or the client receipt filter is removed, alongside the prior guards.
- `npm run verify:cycle-plan-reconciliation` — PASS: all 27 contract checks passed.
- `node tools/verify-mastermind-replacement.mjs` — PASS: 24-slot, routing, confirmation, idempotency, resource boundary, onboarding, accessibility, RLS, and ACL contracts are present; verifier now requires `resource_id text NULL`.
- `node --test test/mastermind-replacement/*.test.mjs` — PASS: 11 tests, 11 passed, 0 failed.
- `npm run build` — PASS: Vite transformed 5,134 modules and completed the production/PWA build. It emitted the existing Browserslist-age and large-chunk advisory warnings.
- `CHROME_PATH='<Playwright Chrome for Testing>' MASTERMIND_BROWSER_QA_REPEAT=1 node tools/verify-mastermind-browser.mjs` — PASS: 6 mounted scenarios × 1, including 320px width, keyboard focusability, a producer-shaped confirmed assignment/ref, active action, exact successful check-in RPC envelope, deliberate focus-change RPC envelope, and stale-action disappearance.
- `CHROME_PATH='<Playwright Chrome for Testing>' MASTERMIND_BROWSER_QA_REPEAT=1 npm run verify` — PASS on the final source: the normal Success Path gate synchronously ran the 22-check Mastermind PostgreSQL harness, followed by all repository gates, 27 cycle-reconciliation checks, 5 draft-honesty runtime contracts, the separate planner PG suite, untouched Vault/search/playback gates, 9 mock live-gate cases, `tsc`, production build, bundle/privacy, and 6 mounted browser scenarios × 1.
- `git diff --check` — PASS (exit 0, no output).

## Unproven production gates

- Migration has not been applied to a real Supabase project.
- Signed-in production desktop/mobile and assistive-technology proof has not been performed; mounted local browser fixtures are not production proof.
- No curriculum resource is Ready. Source, entitlement, and playback verification must precede any `Ready` status or visible resource action.
