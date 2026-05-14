# Money Moves Sprint Module

A focused diagnostic + tracker that answers one question for the user: **"What is the next money move I can actually take this week?"** Not a planning system. Not an offer workshop. Just diagnosis → rung → move → action → community post.

## Scope guardrails

- **In scope:** diagnostic quiz, track assignment, ladder rung, weekly move, 3-action tracker, community post generator, celebrations, badges, VIP/free conditional panels, Mastermind CTA.
- **Out of scope (explicitly):** full offer workshop, content calendar, funnel builder, email automation. Offer Foundation track is light-touch only and points to Digital Product Lab.

## Route & entry points

- New route: `/money-moves-sprint` (lazy-loaded page in `src/pages/MoneyMovesSprintPage.tsx`).
- Wizards hub card: "Money Moves Sprint — Find your next money move."
- Dashboard widget (Command Center): "Find Your Money Move" pill that deep-links to the diagnostic if no tracker exists, or to the active tracker if one exists.
- Sidebar entry under **Grow** pillar.

## Database

One new table, RLS-protected, owner-only access.

```text
money_moves_sprint_trackers
  id              uuid pk
  user_id         uuid (auth.users)
  track           text  -- 'offer_foundation' | 'lead_gen' | 'nurture' | 'sell'
  rung            int   -- 1..6
  move_title      text
  move_why        text
  goal            text
  block           text
  actions         jsonb -- array of action objects (see schema below)
  proof           jsonb
  community_posts jsonb -- { diagnostic, action_done, all_done, sale }
  sale_logged     bool default false
  result_note     text
  diagnostic_answers jsonb
  completed_at    timestamptz
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
```

Action JSON shape:
```text
{ id, label, due_date, completed, completed_at, notes, proof_url,
  community_post_copied, community_post_shared }
```

Badges reuse existing `user_badges` table (already in project) — keys: `money_move_chosen`, `first_action_done`, `community_brave_move`, `rung_complete`, `made_the_ask`, `first_sale_logged`.

RLS: standard 4 policies (select/insert/update/delete) keyed on `auth.uid() = user_id`. Updated_at trigger via existing `update_updated_at_column()`.

## User flow

```text
/money-moves-sprint
  ├─ no tracker → Hero: "Find My Money Move" → Diagnostic (8 Qs)
  │                                          → Diagnosis screen
  │                                          → Tracker created (celebrate)
  └─ has tracker → Tracker dashboard
                    ├─ Move card (track, rung, move, why)
                    ├─ 3-action checklist (notes, proof, copy post, mark shared)
                    ├─ Community posts panel (4 templates, copy buttons)
                    ├─ Sprint schedule (May 25/27/29 2026, 5pm ET)
                    ├─ VIP / Free conditional panel
                    ├─ Sprint prizes panel
                    ├─ Badges earned
                    └─ "Retake diagnostic" (with confirm)

  on all 3 actions complete → celebration + Mastermind CTA
```

## Diagnostic logic

8 single-select questions (per spec). Track assignment runs on the **earliest broken stage** in the revenue cycle:

1. If Q1 = "no" or Q1 = "kind of" → **Offer Foundation**
2. Else if Q3 = "nowhere" or Q4 = "not showing up" → **Lead Gen**
3. Else if Q5 ∈ {"rarely", "no list"} or Q2 = "not yet" with audience present → **Nurture**
4. Else if Q6 = "no" or "hinted" → **Sell**
5. Tie-break by Q7 (stuck point) then Q8 (doable action).

Rung within track is chosen by combining Q2 (sold before), Q4 (consistency), Q5 (email rhythm), Q6 (recent ask), and Q8 (doable action). Codified as a pure function in `src/lib/moneyMovesDiagnosis.ts` so it's unit-testable.

## Ladder content

Static content lives in `src/data/moneyMovesLadder.ts`:

```text
ladder = {
  offer_foundation: [rung1..rung3]   // light, 3 rungs only, ends with DPL CTA
  lead_gen:         [rung1..rung6]
  nurture:          [rung1..rung6]
  sell:             [rung1..rung6]
}

each rung = {
  number, title, move_title, move_why,
  default_actions: [{label, suggested_due_offset_days}, x3]
}
```

Exact rung copy from the brief is preserved verbatim.

## Components

```text
src/pages/MoneyMovesSprintPage.tsx         shell + header + schedule
src/components/money-moves/
  Diagnostic.tsx                            8-question wizard (reuses wizard pattern)
  DiagnosisResult.tsx                       reveal screen
  TrackerDashboard.tsx                      main post-diagnostic view
  MoveCard.tsx                              track/rung/move/why
  ActionsChecklist.tsx                      3 actions, notes, proof, copy
  CommunityPostsPanel.tsx                   4 templates, copy + mark-shared
  SprintSchedulePanel.tsx                   3 dates, ET
  AccessPanel.tsx                           VIP vs free conditional
  PrizesPanel.tsx                           static editable copy
  BadgesStrip.tsx                           reuses existing badge UI
  MastermindCTA.tsx                         post-completion soft CTA
src/hooks/useMoneyMovesTracker.ts           CRUD, query invalidation, optimistic updates
src/lib/moneyMovesDiagnosis.ts              pure diagnosis function + tests
src/lib/moneyMovesPosts.ts                  community post template fillers
src/data/moneyMovesLadder.ts                ladder content
src/constants/moneyMovesConfig.ts           prize copy, schedule, URLs
```

## Reuse of existing patterns

- Wizard chrome: existing wizard components (step indicator, next/back).
- Celebrations: existing `celebrationService.ts` triggers.
- Badges: existing `user_badges` insert pattern.
- Toasts / loading / empty / error states: existing primitives.
- Resilient writes: `useResilientTaskMutation`-style hook for tracker updates so offline edits don't lose data.
- Layout, sidebar, route prefetch already in place.
- Auth/membership: existing `useMembership` hook drives VIP panel; never invent a role — render-conditional only.

## Community posts (4 templates)

Generated with simple template substitution, copy button, and "Mark as posted" checkbox that flips a flag in `actions[i].community_post_shared` (or top-level for the diagnostic post). Templates exactly as specified in the brief. Community URL: `https://portal.faithmariah.com/communities/groups/money-moves/home` (added to `src/constants/community.ts`).

## Celebrations & badges

Triggered in this order, idempotent (won't re-fire if badge already exists):

| Trigger | Celebration copy | Badge |
|---|---|---|
| Diagnostic complete | "You picked the move. Now we can coach the right thing." | money_move_chosen |
| First action done | "First action done. Action counts before confidence." | first_action_done |
| Community post marked shared | "You posted it. That makes it real." | community_brave_move |
| All 3 actions done | "That rung is complete. Ready for the next honest step?" | rung_complete |
| Sale logged | "You made the ask. That matters before the result does." | first_sale_logged |

## Access model

- All authenticated users can use the tracker (free + VIP + Mastermind).
- `AccessPanel` reads `useMembership`:
  - VIP → portal links + Zoom + replays + DPL.
  - Free → YouTube live links + subscribe CTA.
  - Mastermind → "You already have ongoing access — keep using this after the sprint."
- No paywall on the tracker itself; conversion path is the post-completion Mastermind CTA.

## Mobile

Single-column layout below `md`. Tap targets ≥44px. Sticky bottom "Copy post" button on mobile community posts panel. Diagnostic uses one-question-per-screen on mobile.

## Acceptance criteria

- User can complete diagnostic and gets appropriate track/rung.
- Tracker persists across refresh; offline edits sync when back online.
- All 4 community post templates copyable; "shared" flag persists.
- All 5 celebrations fire once each, badges awarded once.
- "Retake diagnostic" works with confirmation and overwrites in place (no orphans).
- RLS verified: user A cannot read user B's tracker.
- Works at 375px width.
- Wizards hub + dashboard widget + sidebar entry all link correctly.

## Build order (so we can ship incrementally)

1. Migration + RLS + types.
2. Static content files (ladder, posts, config) + diagnosis function with tests.
3. Diagnostic UI → diagnosis result → tracker creation.
4. Tracker dashboard (move card + actions checklist).
5. Community posts panel + celebrations + badges.
6. Schedule, access, prizes, Mastermind CTA panels.
7. Wizards hub card + dashboard widget + sidebar entry.
8. QA pass on mobile + offline + RLS.

## Out-of-scope confirmations

- No new offer workshop.
- No edits to existing wizards.
- No changes to billing / membership logic.
- Prize copy is static-editable in `moneyMovesConfig.ts`; no admin UI.
