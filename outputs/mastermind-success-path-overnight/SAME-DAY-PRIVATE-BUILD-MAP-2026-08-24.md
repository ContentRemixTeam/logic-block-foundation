# Same-Day Private Build Map — Mastermind Success Path + Learning

**Date/commit baseline:** 2026-08-24, clean worktree at `36dfb85c`
**Owner:** Hermes sole implementation lane
**Classification:** complete private vertical slice + engagement foundation; not production rollout
**Product goal:** replace GHL Learning with a gated Mastermind Success Path + Learning experience inside the existing Planner, where the member remains the boss and learning connects to one canonical plan/action/evidence loop.

## Honest commitment

### Deliverable targeted for today

A committed, verified, Faith-only private build that extends the accepted real Success Path page and proves:

1. The member sees her actual 90-day result.
2. Every stage, milestone, lesson, and action is presented as a suggestion.
3. She can review why it was suggested and change/correct the recommendation through server-owned transition authority.
4. She can edit/reduce the proposed action without creating a second task system or losing prior work.
5. The page retains the accepted lesson → canonical action → evidence → evaluation → support/return loop.
6. Assigned/opened/started/progress/completed/action/evidence/stalled/returned engagement states have one bounded, privacy-safe contract.
7. A Faith-only preview can demonstrate the core journey and honest inactive/return states without publishing real curriculum or touching production.
8. Mobile/accessibility and privacy behavior are verified.

### Not honestly finishable today

- Editorial approval and publication of the full 24-milestone curriculum.
- Recording/fixing the seven curriculum gaps.
- A real 3–5-member pilot.
- Retention measurement, which requires elapsed member behavior.
- Production deployment/migrations, member access, broad navigation exposure, GHL Learning retirement, Searchie changes, sends, or publishing.

## Build sequence

### Phase 0 — freeze and reconcile (12:00–1:00)

- Claim exclusive ownership of the isolated worktree.
- Reconcile the exact accepted source, preview commit, current requirements, and curriculum status.
- Run three read-only audits: product/code gaps, verification runway, content disposition.
- Produce one exact sole-writer work order.

**Gate:** clean baseline, no conflicting owner, no invented/real unpublished content.

### Phase 1 — member authority and visible clarity (1:00–3:00)

Extend `src/pages/MastermindSuccessPath.tsx` and its strict response contract so the ready state shows:

- the member's 90-day result;
- `Suggested for you` rather than a permanent diagnosis;
- short copy: `You are the boss. Change anything that does not fit.`;
- an accessible `Review or change my focus` action;
- recommendation reason/impact only after authorization;
- explicit confirm/cancel behavior;
- no silent reroute or overwrite;
- one primary next action.

Reuse existing `confirm_my_success_path`, `preview_my_success_path_transition`, and `confirm_my_success_path_transition` authority rather than creating a client-only editor.

**Gate:** member edits survive; server diff is shown before transition; cancel changes nothing; no protected data leaks in denied/unavailable states.

### Phase 2 — canonical action ownership (2:30–4:00)

- Allow the member to adjust the suggested action text, minutes, and low-capacity version using the existing reviewed-transition/reduce model.
- Preserve completed work, evidence, notes, and retired-action history.
- Keep exactly one current canonical action.
- Never create progress from watching, bookmarking, or merely selecting a lesson.

**Gate:** idempotent save/readback, one active action, prior history retained, no duplicate task.

### Phase 3 — engagement and re-engagement foundation (3:30–6:00)

Add one forward-only local migration and bounded client/server contracts for meaningful assigned-learning events:

- assigned;
- opened;
- playback started;
- bounded progress;
- completed;
- action opened/selected;
- evidence submitted;
- check-in completed;
- support requested;
- stalled/inactive classification;
- returned after absence.

Rules:

- authenticated identity and assignment authority are server-owned;
- stable resource/assignment IDs only—no provider locator or URL;
- progress is monotonic and idempotent;
- heartbeats cannot inflate engagement;
- completion does not mutate Planner progress;
- denial/unavailable/revoked states return exact closed schemas;
- staff/re-engagement projections are private and review-first;
- no outreach is sent.

**Gate:** real PG16 behavior, owner isolation, concurrency/idempotency, malformed-event rejection, exact privacy schemas, no progress mutation.

### Phase 4 — Faith-only product preview (5:00–7:00)

Extend the existing offline private preview—not a parallel member product—to demonstrate:

- suggested path + `You are the boss` controls;
- result, stage, milestone, lesson, action, evidence, evaluation, support;
- edit/cancel/confirm behavior;
- assigned/not opened, watched/no action, stalled, and returned states;
- clearly labeled fake/draft content;
- playback disabled unless a safe fixture is explicitly used;
- 320/360/390/desktop behavior.

**Gate:** preview cannot reach production, expose protected media, or be mistaken for live member curriculum.

### Phase 5 — completion runway and repair (6:00–9:30)

Run on the exact final tree:

1. new focused behavioral verifier;
2. TypeScript;
3. targeted lint;
4. production build;
5. mounted mobile/accessibility tests;
6. new PG16 engagement/authority suite;
7. complete chronological migration replay and candidate double-apply;
8. executable privacy/mutation controls;
9. existing Waves 1–4 gates;
10. Replay Vault 74-file protected baseline and full repo `npm run verify`;
11. `git diff --check` and exact protected-baseline reconciliation;
12. independent product/security review of the immutable candidate.

Failures are repaired and all affected gates rerun. Exit code zero alone is not acceptance.

### Phase 6 — freeze and deliver (target by end of day)

- Stage only owned paths.
- Commit one immutable private-source candidate.
- Prove clean worktree and record exact commit/hash.
- Build and verify the Faith-only offline artifact.
- Write a receipt distinguishing source-built, locally exercised, unapplied migration, not-live, and still-blocked work.
- Deliver a tiny status card: status, proof, blocker, next.

## Today's acceptance criteria

The private build is `VERIFIED` only if:

- the member authority language and controls render in the real Success Path page;
- changing a recommendation requires a server-generated impact preview and explicit confirmation;
- member-owned edits/history are preserved;
- exactly one canonical action remains active;
- engagement events are authorized, bounded, idempotent, and do not create business progress;
- inactivity/return states are honest and non-shaming;
- denied/revoked/unavailable responses expose no protected curriculum/media/activity metadata;
- mobile widths 320/360/390 have no overflow and 44px touch targets;
- full current repository and Replay Vault gates pass on the immutable candidate;
- an independent reviewer reports no critical/high blockers;
- no production or member-facing effect occurred.

## Definition of the later full replacement

The complete GHL Learning replacement remains finished only after Faith approves the minimum curriculum, all required lessons are ready, a real private member pilot produces business evidence, engagement/re-engagement operations are proven, confusion is repaired, production access/navigation is authorized, backups/parity/rollback pass, and GHL Learning is deliberately retired.
