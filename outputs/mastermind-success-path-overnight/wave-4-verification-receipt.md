# Wave 4 Offer-First Protected Planner Learning Verification Receipt

Date: 2026-08-24  
Status: **PARENT-VERIFIABLE PRIVATE SOURCE CANDIDATE — PRODUCTION BLOCKED AND UNTOUCHED**  
Base HEAD/documentation lock: `50e26d4daf312e12821e4c2ba7ff7f5327d625ce`  
Accepted Wave 3 implementation source: `396febb31cdb5497ae8016b918edc4939f979fca`

## Source candidate implemented

- Added chronological migration 197, `20260822230000_offer_first_assigned_learning_slice.sql`, without modifying the accepted Wave 1–3 migrations.
- Added an authenticated, server-owned, closed-schema one-item Success Path resolver. It derives `auth.uid()`, revalidates the assigned-Learning capability, owner/cycle/current Planner receipt, confirmed Offer path, exact active assignment item, ready/QA/publication/revocation authority, and one current canonical action/task. Every non-ready result is an exact three-key empty envelope.
- Added a service-role-only playback authorization RPC with exact user/cycle/path/action/item/hash binding, request-lock concurrency idempotency, changed-payload conflict handling, request-time revalidation, and an append-only locator-free audit receipt. Direct table rights are revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`; only the narrow member and service RPC execution grants remain.
- Added the separate `get-assigned-learning-playback` edge function. Its pure handler accepts only cycle ID, opaque assignment item ID, and request ID; verifies JWT identity; enforces allowed origins and a 2 KiB body bound; calls only the assignment-bound RPC; and mints through the approved Dropbox token and temporary-link endpoints. Denial is 404-style, provider/verification failure is honest 503 copy, and browser responses are exact and locator-free.
- Mounted a dedicated gated `/mastermind/success-path/:cycleId` surface. It fetches only the combined resolver, presents one result/Offer milestone/lesson/canonical action/evidence/evaluation/support path, and invokes only the new playback edge. Watching never completes Planner work. Evidence, evaluation, and absence recovery retain stable request IDs through ambiguous failures and require idempotent server receipt/readback before success copy.
- Removed the unconditional Replay Vault entry from the monthly Mastermind hub experience. The protected 74-file Replay Vault scope was not changed.
- Added generated TypeScript contracts, static/native/edge/mounted/mutation verifiers, package scripts, aggregate wiring, and 197-migration chronology/double-apply wiring.

No real or member curriculum data was added. Synthetic `ready` fixtures exist only in verifiers. No editorial or launch readiness is claimed.

## Verification executed locally

| Gate | Result | Evidence |
|---|---:|---|
| `npm run verify:mastermind-wave4-static` | PASS | 79 closed-schema, authority, edge, mounted, privacy, chronology, and wiring checks |
| `npm run verify:mastermind-wave4-edge` | PASS | 4/4 Deno tests; focused Deno lint passed |
| `npm run verify:mastermind-wave4-mutation-control` | PASS | DB exact-item, edge provider, and UI receipt-readback executable mutations each broke the aggregate gate while source tokens remained; restoration passed |
| `npx tsc --noEmit` | PASS | No TypeScript errors |
| Focused ESLint for Wave 4 UI/verifiers | PASS | No focused lint errors |
| `npm run build` | PASS | 5,169 modules transformed; inherited Browserslist-age/chunk-size warnings only |
| `npm run verify:mastermind-wave2-static` | PASS | 132 accepted Wave 2 checks |
| `npm run verify:mastermind-wave3-static` | PASS | 229 accepted Wave 3 checks |
| Portal, Success Path, production bundle verifiers | PASS | All three focused inherited gates passed |
| Replay Vault protected baseline | PASS | 74/74 hashes and byte counts; zero protected additions |
| Replay Vault protected control | PASS | Scope/self-exclusion/mutation/addition/real-untracked controls passed |
| Migration chronology count | PASS | Exactly 197 SQL migrations; Wave 4 is final chronological candidate |
| `git diff --check` | PASS | No whitespace errors before receipt finalization |
| Secret scan | PASS | No credential/token/private-key signatures in changed implementation files |
| Local absolute-host-path scan | PASS | No developer-machine absolute paths in changed implementation files |

Wave 4 migration SHA-256 before receipt finalization: `5134f2ee0428f027dd30e283acbea96e840dcf8881b9f81ca5bab08d95abb527`.

## Environment-blocked gates — no pass claimed

- `npm run verify:mastermind-wave4-postgres` exits before schema apply: PostgreSQL 16 cannot allocate bootstrap shared memory in this managed sandbox. The authored suite covers monthly/annual identity, no-Vault parity, denied/review/stale/cross-owner/unconfirmed/non-ready/revoked/drift states, exact item/action resolution, service-only ACLs, request concurrency/conflicts, revocation races, live resolver privacy mutation/rollback, and candidate apply-twice.
- `npm run verify:cycle-plan-full-stack-postgres` exits before replay for the same bootstrap restriction. No 197-migration chronological behavior or candidate double-apply pass is claimed locally.
- `npm run verify:mastermind-wave4-mounted` exits because local headless Chrome cannot establish a DevTools session. No 320/360/390 px mounted behavior pass is claimed locally. The suite contains assertions for monthly DOM isolation, one lesson/action/support route, watch non-completion, exact readbacks/stable IDs, playback refresh/failure, focus, keyboard/live regions, 44 px controls, clipping, and horizontal overflow.
- `npm run verify` starts and passes Wave 2 static, then stops at the mandatory inherited Wave 2 PostgreSQL bootstrap blocker. The full aggregate did not complete and is not claimed.

## Parent verification required

On an unrestricted host, the parent must run:

1. `npm run verify:mastermind-wave4-postgres`
2. `npm run verify:cycle-plan-full-stack-postgres`
3. `npm run verify:mastermind-wave4-mounted`
4. `npm run verify:mastermind-wave4`
5. `npm run verify`
6. final `git diff --check`, protected baseline/control, and source scans on the exact uncommitted tree

The native and mounted suites must pass before immutable review may accept this candidate.

## Files in the Wave 4 implementation scope

- `supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql`
- `supabase/functions/_shared/assignedLearningPlayback.ts`
- `supabase/functions/_shared/assignedLearningPlayback.test.ts`
- `supabase/functions/get-assigned-learning-playback/index.ts`
- `src/pages/MastermindSuccessPath.tsx`
- `src/components/mastermind/AssignedLearningPlayer.tsx`
- `src/hooks/useSuccessPathLearningSlice.ts`
- `src/lib/successPathLearningSlice.ts`
- `src/App.tsx`
- `src/pages/MastermindHub.tsx`
- `src/integrations/supabase/types.ts`
- `tools/verify-mastermind-wave4.mjs`
- `tools/verify-mastermind-wave4-postgres.py`
- `tools/verify-mastermind-wave4-mounted.mjs`
- `tools/verify-mastermind-wave4-mutation-control.mjs`
- `tools/mastermind-wave4-supabase-mock.ts`
- `tools/mastermind-wave4-layout-mock.tsx`
- `tools/mastermind-wave4-mounted-harness.tsx`
- `tools/verify-cycle-plan-full-stack-postgres.py`
- `tools/verify-mastermind-portal.mjs`
- `package.json`
- `OVERNIGHT-BUILD-TRACKER.md`
- this receipt and `wave-4-final-message.txt`

The user-provided untracked `wave-4-codex-prompt.md` was preserved and was not treated as implementation output.

## Production and ownership statement

No commit, push, deploy, production migration apply, real/member curriculum seed, publication, entitlement change, GHL/Searchie/SaaS mutation, external webhook, payment/access/CRM mutation, member exposure, or Wave 5 work occurred. Replay Vault remains a separate product and does not authorize or enrich monthly assigned Learning.

Final classification: **parent-verifiable private source candidate only**. It is not beginner-ready, pilot-ready, launch-ready, editorially approved, or production-ready.


## Parent verification supersession — 2026-08-24

The preceding worker-sandbox blockers are superseded by parent execution on the exact repaired candidate tree.

Parent repairs made before acceptance review:

- scoped monthly DOM privacy assertions to the mounted root rather than bundled verifier source text;
- compared annual/monthly Learning content while requiring their user-specific opaque assignment-item IDs to differ;
- normalized PostgreSQL boolean ACL output (`false` versus `f`) without weakening the privilege assertion;
- preserved the verified slice during background receipt refresh;
- closed two player-focus races so queued ready/error focus cannot reclaim focus after “Back to my action.”

Parent gates passed:

- Wave 4 static: **79**;
- native PostgreSQL **16.14**, including candidate apply-twice, monthly-without-Vault, annual parity, denied/unavailable/cross-owner privacy, exact-item replay/conflict, QA/publication drift rollback, direct-table ACL denial, and service-only playback RPC;
- complete **197-migration** chronology and candidate double-apply;
- assigned-Learning edge: **4/4** plus Deno lint;
- mounted Chrome at **320/360/390 px**, including five consecutive race-stability repetitions after the final focus repair;
- Wave 4 executable DB/edge/UI mutation control with restoration;
- full `npm run verify` in one execution, including production build and inherited browser verifier (**5 scenarios × 2 passes**);
- Replay Vault protected baseline **74/74**, protected mutation/addition controls, diff check, secret scan, and absolute-host-path scan.

One initial repository-wide run reached the final inherited browser gate and lost its inspected Chrome target with an allocator warning. The isolated gate then passed, and a fresh complete `npm run verify` passed in one execution. No flaky pass is substituted for acceptance evidence.

Status after this supersession: **PARENT-VERIFIED PRIVATE SOURCE CANDIDATE — IMMUTABLE INDEPENDENT REVIEW REQUIRED**. No production, editorial, entitlement, publishing, SaaS, or member action occurred.

## Rejected-candidate immutable-review security repair — 2026-08-24

Status: **PARENT-VERIFIABLE PRIVATE SOURCE REPAIR CANDIDATE — NATIVE/MOUNTED PARENT VERIFICATION REQUIRED**

This section supersedes the preceding Wave 4 parent-verification classification for candidate `d2f64f997860e3726c573b9999bc3f4ac06cc380`. Immutable review rejected that candidate. The accepted implementation boundary remains Wave 3 source `396febb31cdb5497ae8016b918edc4939f979fca`; no prior evidence is erased or relabeled as evidence for this repair.

### Exact critical/high repairs

- Migration 197 now preserves append-only evaluation history with a positive `evaluation_sequence`, a self-referencing supersession FK, exact per-request sequence uniqueness, and a latest-evaluation index. The rejected one-row uniqueness is dropped idempotently. The resolver locks the exact user/request, computes live authority on every call, returns a closed conflict for changed payload, replays only an exact request/decision/reason/authority match, and otherwise appends one sequential receipt that supersedes the prior evaluation. Allowed and denied private producer results carry the exact stored receipt ID, authority hash, sequence, decision, and safe reason.
- Granted capability evidence is included through a private one-way authority digest, so granted-to-granted entitlement evidence rotation produces a new allowed evaluation rather than replaying stale authority. Raw email, entitlement, hold, locator, or URL values are not placed in the receipt table or browser result.
- The edge boundary treats RPC data as `unknown` and parses exact allowed, denied, and conflict producer schemas on both calls. Unknown/missing/mistyped/null/opposite-state fields, invalid IDs/hashes/sequences/reasons/provider/title/locator, and malformed second results fail closed.
- Playback now requires authorization before mint and a second live authorization after mint for the same verified user/cycle/item/request. The second allowed producer must match the first receipt ID, authority hash, sequence, item, title, provider, and locator exactly. Revocation, decision transition, authority rotation, mismatch, or outage cannot return the minted URL.
- Dropbox locators accept only bounded `id:<file-id>` grammar. Playback URLs are parsed with `URL` and require HTTPS, exact host `dl.dropboxusercontent.com`, no credentials, fragment, or unexpected port, a 2,048-character maximum, and no ambiguous whitespace/control characters.
- Every migration-197 helper/trigger/private function has an exact revoke from `PUBLIC`, `anon`, `authenticated`, and `service_role`. The only grants are authenticated execution of `resolve_my_success_path_learning_slice(uuid)` and service-role execution of `resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)`.
- The native verifier now launches real simultaneous `psql` processes for exact allowed, exact denied, controlled denied-to-allowed transition, and exact-payload/changed-payload conflict races. It also checks immutable response/row/JSON consistency, one receipt per authority state, no sequence gaps, exact supersession, no UPDATE/DELETE escape, every effective function ACL including a PUBLIC/default-only probe role, direct PUBLIC ACL entries, and a real authenticated cross-owner helper-call denial.
- Mutation controls now mutate the real RPC producer, post-mint fence, locator grammar, playback-host check, DB item gate, UI receipt readback, and helper PUBLIC revoke. Edge mutations must fail executable Deno tests while validator tokens remain. The helper-revoke mutation must fail both static and native ACL gates.

### Verification on the repaired uncommitted tree

| Gate | Result | Evidence |
|---|---:|---|
| `npm run verify:mastermind-wave4-static` | PASS | 114 exact receipt, ACL, producer, fence, allowlist, chronology, concurrency-wiring, UI, and privacy checks |
| `npm run verify:mastermind-wave4-edge` | PASS | 7/7 executable Deno tests plus focused Deno lint |
| TypeScript | PASS | `npx tsc --noEmit` exited 0 |
| Focused lint | PASS | Wave 4 edge, mounted harness, static, and mutation sources exited 0 |
| Production build | PASS | Vite transformed 5,169 modules; inherited Browserslist-age and chunk-size warnings only |
| Wave 2 / Wave 3 static | PASS | 132 / 229 checks |
| Portal / Success Path / production bundle | PASS | All three focused inherited verifiers exited 0 |
| Replay Vault protected baseline | PASS | 74/74 hashes and byte counts; zero scope additions |
| Replay Vault protected controls | PASS | Scope, self-exclusion, synthetic mutation/addition, and real untracked-addition controls |
| Migration chronology source count | PASS | Exactly 197 SQL files; chronology gate now requires the exact count |
| `git diff --check` | PASS | No whitespace errors after repair receipt/final-message finalization |
| Secret scan | PASS | No private-key, provider-token, or hardcoded credential-assignment signature in changed implementation source |
| Absolute-host-path scan | PASS | No `/Users`, `/home`, or Windows user path added to changed implementation source |
| Executable mutation controls | PARTIAL | DB/UI and all security mutations failed static; producer/fence/locator/host mutations also failed executable edge tests. Native helper-ACL mutation could not bootstrap PostgreSQL in this sandbox, so the aggregate correctly did not pass. |
| Focused native PostgreSQL 16 | BLOCKED | PostgreSQL 16.14 `initdb` cannot allocate mmap or SysV bootstrap shared memory in this managed sandbox; no repaired database behavior/ACL/concurrency claim is made. |
| Complete 197 chronology + double-apply | BLOCKED | Same pre-schema PostgreSQL bootstrap restriction; no chronological behavior pass is claimed. |
| Mounted 320/360/390 | BLOCKED | Background headless Chrome could not establish a DevTools session; the accepted focus-handoff repair remains in source and the mounted harness remains wired to all three widths. |
| `npm run verify:mastermind-wave4` | BLOCKED | Static passed, then the mandatory focused PostgreSQL child stopped the aggregate. |
| Full `npm run verify` | BLOCKED | Wave 2 static passed, then the mandatory inherited Wave 2 PostgreSQL child stopped the aggregate. |

Source SHA-256 values before documentation finalization:

- migration 197: `c11c92b3fa0758461e7449046490266cde6201283cf06761733785aaee175d6f`
- edge boundary: `642071d2c49c860e928fff0cf60e576b529f797f8a2a296a9e5d1ec824407b66`
- edge regression suite: `7b3d9f86f27cb738e2db7be2f743b7b1d091d3212fa4cbda837c0539207c13b2`

### Exact Git status and untracked inventory

```text
 M OVERNIGHT-BUILD-TRACKER.md
 M outputs/mastermind-success-path-overnight/wave-4-verification-receipt.md
 M package.json
 M src/integrations/supabase/types.ts
 M supabase/functions/_shared/assignedLearningPlayback.test.ts
 M supabase/functions/_shared/assignedLearningPlayback.ts
 M supabase/functions/get-assigned-learning-playback/index.ts
 M supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql
 M tools/mastermind-wave4-mounted-harness.tsx
 M tools/verify-cycle-plan-full-stack-postgres.py
 M tools/verify-mastermind-wave4-mounted.mjs
 M tools/verify-mastermind-wave4-mutation-control.mjs
 M tools/verify-mastermind-wave4-postgres.py
 M tools/verify-mastermind-wave4.mjs
?? outputs/mastermind-success-path-overnight/wave-4-security-repair-final-message.txt
?? outputs/mastermind-success-path-overnight/wave-4-security-repair-prompt.md
```

The prompt file is the preserved user-provided untracked repair brief. The final-message file is the required new repair handoff. No other untracked files remain.

### Parent verification required on the exact tree

1. `npm run verify:mastermind-wave4-postgres`
2. `npm run verify:mastermind-wave4-chronology`
3. `npm run verify:mastermind-wave4-mounted`
4. `npm run verify:mastermind-wave4-mutation-control`
5. `npm run verify:mastermind-wave4`
6. `npm run verify`
7. Replay Vault protected baseline/control, final diff/source scans, and exact status/untracked inventory

No commit, push, deploy, production migration apply, real/member curriculum seed or publication, entitlement mutation, SaaS/GHL/Searchie action, member exposure, or Wave 5 work occurred.

Final classification: **parent-verifiable private source repair candidate**. It is not accepted, production-ready, pilot-ready, member-ready, launch-ready, or editorially ready.


## Security-repair parent verification supersession — 2026-08-24

The security-repair writer's environment-blocked items are superseded by parent execution on the exact repaired tree. Parent also hardened mounted-verifier teardown to await Chrome exit before profile cleanup after a serial stress run exposed an `ENOTEMPTY` cleanup race; UI assertions themselves had passed.

Verified on the repaired candidate:

- Wave 4 static: **114** exact checks;
- native PostgreSQL **16.14**, including sequential/superseding immutable receipt history, denial→allow, allow→deny, changed-authority allow, unchanged replay, append-only enforcement, true simultaneous PostgreSQL processes, payload-conflict races, exhaustive migration-197 effective function ACLs for PUBLIC/default + anon + authenticated + service_role, and authenticated cross-owner helper denial;
- complete **197-migration** chronology with Wave 1–4 double-apply;
- edge **7/7** plus Deno lint, including exact producer schemas, pre/post-mint receipt/hash fence, strict Dropbox locator grammar, exact playback-host validation, revocation/rotation/transition/outage during mint, and private browser-schema closure;
- mounted 320/360/390 px, followed by **five consecutive serial passes** after teardown hardening;
- executable mutations for producer schema, post-mint fence, locator, playback host, DB/item authority, UI readback, and private-helper ACL relaxation; the ACL relaxation was rejected by both static and native PostgreSQL gates;
- full `npm run verify` in one execution, including production build and browser verifier 5 scenarios × 2 passes;
- Replay Vault protected baseline **74/74** and all protected mutation/addition controls;
- `git diff --check`, secret scan, and absolute-host-path scan.

Status: **PARENT-VERIFIED SECURITY-REPAIR PRIVATE SOURCE CANDIDATE — EXACT IMMUTABLE RE-REVIEW REQUIRED**. No deployment, production migration, real curriculum seed, entitlement/publication change, SaaS mutation, or member exposure occurred.
