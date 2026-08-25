# Sole Writer Work Order — Same-Day Private Success Path + Learning Build

You are the **only implementation writer** for this exact worktree:

`/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`

Baseline was clean at commit `36dfb85c`. Hermes has claimed the lane `mastermind-success-path-learning-build`. Do not use or modify another checkout. Do not spawn another writer. Do not commit, push, deploy, apply production migrations, publish content, expose navigation to members, change entitlements, mutate GHL/Searchie, send messages, or touch live data.

## Read first

1. `00-READ-FIRST-OWNERSHIP.md`
2. `outputs/mastermind-success-path-overnight/SAME-DAY-PRIVATE-BUILD-MAP-2026-08-24.md`
3. `/Users/faithhawks/Developer/Mastermind Scaling/FaithMariahHQ/00-Canonical/Mastermind Success Path Learning Product Requirements - 2026-08-24.md`
4. `/Users/faithhawks/Developer/Mastermind Scaling/FaithMariahHQ/00-Canonical/Success Path Personalized Curriculum Member Experience - 2026-08-08.md`
5. accepted Wave 1–4 migrations, pages, verifiers, and receipts.

## Product outcome

Extend the **real accepted** `MastermindSuccessPath` page into a complete private vertical slice proving:

> one result → one suggested stage/milestone → one assigned lesson → one editable canonical action → evidence → evaluation/support → honest return after absence.

The member is always the boss. Every recommendation must be presented as a suggestion based on what she shared. She can confirm, correct, edit, reschedule, reduce, postpone, or ask for support. The system must never silently reroute or overwrite member-owned work.

## Required implementation

### A. Visible member authority

On the real protected Success Path page, add lean, accessible UI that:

- visibly displays `result_text`;
- labels the current stage/milestone **Suggested for you** rather than a permanent diagnosis;
- states in short copy: **You are the boss. Change anything that does not fit.**;
- explains that the suggestion is based on her saved plan without exposing internal authority/security jargon;
- provides a `Review or change my focus` action;
- presents one next move by default; keep details progressive-disclosure and mobile calm.

Do not add paragraphs, confidence badges, or a giant six-stage map to the default page.

### B. Server-owned correction/edit flow

Reuse the accepted Wave 3 authority. Do not create a client-only path editor or direct-table writes.

- Inspect `confirm_my_success_path`, `preview_my_success_path_transition`, and `confirm_my_success_path_transition` and use the correct one for the current path state.
- A correction/change must show an exact member-safe impact preview before confirmation.
- The member can cancel with zero mutation.
- A confirmed change preserves member-owned edits, completed history, notes/evidence, and exactly one current canonical action.
- If the existing authority cannot safely support a particular edit from the ready page, implement an honest bounded alternative rather than inventing authority. For example, allow editing the current action through the supported reviewed transition and clearly label stage changes as requiring a new reviewed recommendation. Record any such constraint in the receipt.
- Add strict client parsers for all new response envelopes. Unknown fields and malformed responses fail closed.

### C. Canonical action edit/reduce ownership

Allow supported editing of suggested action text and estimated minutes/low-capacity version through existing or narrowly additive server-owned reviewed authority.

- No duplicate Planner task or second progress system.
- Idempotent request IDs and exact readback.
- Preserve retired action history and prior evidence.
- Watching, opening, or completing a lesson may not complete the action, create evidence, move the milestone, or reroute the path.

### D. Meaningful engagement foundation

If not already present, add one forward-only rerunnable migration after `20260822230000` and exact generated types/contracts for an append-only/bounded assigned-learning engagement model covering:

- assignment/open;
- playback started;
- bounded monotonic progress;
- completed;
- action opened/selected;
- evidence submitted;
- check-in completed;
- support requested;
- stalled/inactive classification;
- returned after absence.

Requirements:

- identity from authenticated caller/server authority only;
- event accepted only for the caller's current authorized assignment/path/action as applicable;
- stable canonical IDs only; no provider locator, Dropbox URL, token, transcript, Vault identifier, or raw private payload;
- bounded exact event vocabulary and exact closed schemas;
- idempotency and genuinely concurrent duplicate handling;
- progress monotonicity and heartbeat dedupe;
- completion is engagement only and cannot mutate Success Path/Planner progress;
- revoked/denied/unavailable/cross-owner/malformed states fail closed without protected metadata;
- staff/re-engagement projection is service-only/private and produces evidence for a review-first queue only—no send or automation;
- member-safe status may distinguish assigned/not opened, watched/no action, stalled, and returned without shame or fake overdue state;
- preserve all inherited Wave 1–4 ACLs and complete chronology.

Wire the real player/page to record only the events the UI can honestly prove. Do not report playback progress from timers when media is not actually playing. If the current player cannot safely prove watch-time today, implement only opened/start/ended states and label remaining telemetry honestly in the receipt rather than fabricating it.

### E. Faith-only offline preview

Extend the existing private preview tooling and artifact builder—do not create a new product or route—to show fake/draft data for:

- result + suggested focus;
- `You are the boss` controls;
- edit/cancel/confirm behavior where the fake contract can safely model it;
- lesson/action/evidence/evaluation/support/return loop;
- assigned/not opened, watched/no action, stalled, and returned scenarios;
- obvious `FAKE / PRIVATE / OFFLINE / NOT LIVE` labeling;
- playback disabled unless a deterministic local fixture is used.

Must remain network-isolated and unable to touch production.

### F. Tests and verifiers

Add/strengthen focused behavioral, mounted, and PostgreSQL tests for:

1. result and member-authority copy/controls render in the real page;
2. cancel produces no mutation;
3. correction/edit requires preview + exact confirmation;
4. malformed/unknown response fields fail closed;
5. no silent overwrite/reroute and exactly one canonical action;
6. watch/open/complete never changes business progress;
7. engagement authorization, owner isolation, idempotency, monotonicity, concurrency, malformed rejection, and closed denial schemas;
8. inactive/return states are accurate and non-shaming;
9. 320/360/390px, no horizontal overflow, 44px touch targets, keyboard/focus/live regions;
10. offline preview cannot call production or expose protected locators;
11. chronological final migration frontier and double-apply are updated;
12. negative/mutation controls fail when authority/privacy behavior is weakened.

Create an aggregate script such as `verify:mastermind-wave5-private` without weakening existing Wave 1–4 or Replay Vault gates.

## Content boundary

- The full curriculum remains `24 mapped / 17 candidate / 7 gaps / 0 Ready` unless exact current evidence proves otherwise.
- Use fake/sample content only in the offline preview and label it conspicuously.
- Do not publish or represent candidate resources as approved.
- The real source path must render only server-authorized published assigned content.

## Completion discipline

1. Inspect first and write a concise implementation journal under `outputs/mastermind-success-path-overnight/`.
2. Make coherent edits, then run early typecheck/focused tests.
3. Run the final focused aggregate after the final edit.
4. Run TypeScript, targeted lint, production build, mounted tests, new PG16 tests, full chronology, mutation controls, and existing affected Wave gates.
5. Do not spend the final runway on optional work before receipt/test completion.
6. Write `outputs/mastermind-success-path-overnight/same-day-private-build-writer-receipt.md` distinguishing source built, tests actually run, draft/unapplied migration, preview state, and blockers.
7. Write your final summary to `outputs/mastermind-success-path-overnight/same-day-private-build-writer-final-message.txt`.
8. Do **not** commit. Parent Hermes will reconcile, run the full repository/Replay Vault gates, conduct independent review/repair, and freeze the immutable candidate.

A zero exit code is not acceptance. Be honest if scope must be reduced to preserve correctness. A complete smaller safe slice with real tests is better than fabricated engagement or an unfinished wide diff.
