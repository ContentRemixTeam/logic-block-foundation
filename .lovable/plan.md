
# Phase 1 — Mastermind OS

Turn the planner into a coaching system anchored on the loop:
**90-Day Goal → Weekly Commitments → Today's Brave Move → Evidence**

Built on top of what already exists (`cycles_90_day`, `weekly_plans`, `daily_plans`, `tasks.energy_level`, `tasks.goal_id`, `tasks.cycle_id`, `tasks.reschedule_count_30d`, `Evidence` page, `WeeklyFocusCoach`, `BrainDumpSorterModal`, `StuckTaskCoachModal`, `CapacityIndicator`). Nothing existing gets removed.

---

## 1. Schema (one migration)

Add to `tasks`:
- `momentum_type` (enum: `revenue` | `audience` | `delivery` | `operations` | `mindset` | null)
- `is_maintenance` (boolean, default false) — momentum vs maintenance flag
- `done_enough_definition` (text, nullable) — "what would 'done enough' look like"
- `connection_swept_at` (timestamptz, nullable) — marks tasks the user has already triaged in the guided sweep, so we don't keep nagging

Add to `weekly_plans`:
- `weekly_outcome` (text) — the ONE business outcome
- `minimum_viable_week` (jsonb) — array of 1-3 things that count as "week was a win"
- `life_happens_plan` (text) — what to drop if life intervenes
- `weekly_capacity_planned_minutes` (int, nullable) — planned load total

Add to `daily_plans`:
- `brave_move_task_id` (uuid, nullable, FK tasks)
- `low_energy_task_id` (uuid, nullable, FK tasks)
- `support_task_id` (uuid, nullable, FK tasks)
- `not_today` (text, nullable) — "one thing to not worry about today"

Keep existing `category` text column free-form (launches/projects). `momentum_type` is the spine.

RLS: mirror existing policies on each table (auth.uid() = user_id).

---

## 2. Goal-to-Task Spine

### TaskCard / TaskQuickAdd / inline edit
- Add a small `MomentumChip` (Revenue / Audience / Delivery / Ops / Mindset) on the task card, next to existing energy chip.
- Add inline pickers in `TaskQuickAdd` for `momentum_type` and `goal_id` (optional, skippable, remembered per session).
- Tasks page gets a new group-by option: **Momentum Type**.

### Tasks page top banner
A compact summary strip at the top of `/tasks`:
- **Moves your 90-day goal**: N tasks linked to active cycle goal
- **Maintenance**: N maintenance tasks
- **Unconnected**: N tasks with no goal/momentum (clickable → opens guided sweep)

### Guided Sweep modal — `ConnectTasksSweepModal`
Triggered from the "Unconnected" pill or a one-time auto-prompt.
- Walks through unconnected tasks in batches of 10.
- Each row: task text + dropdowns (goal, momentum_type, maintenance toggle) + "Skip" / "Send to Someday" / "Delete".
- Optional "Suggest with AI" button per batch (uses existing `mastermind-ai-coach` edge function with a new `mode: 'classify_tasks'`).
- Sets `connection_swept_at = now()` even on Skip so the same task isn't re-prompted.

---

## 3. Today's Brave Move (Daily Plan rebuild — additive)

New section at the top of `DailyPlan.tsx`, above the existing Top 3 / One Thing:

```text
┌─────────────────────────────────────────────────────────┐
│  TODAY                                                  │
│  ★ Brave Move      [pick from revenue/audience tasks]   │
│  ◐ Low-Energy      [pick from low_energy tasks]         │
│  ? Support / Ask   [pick from waiting/unclear tasks]    │
│  ✕ Not Today       [free text]                          │
└─────────────────────────────────────────────────────────┘
```

- Each slot is a single-task slot bound to a new `daily_plans` column.
- Picker filtered: Brave Move suggests `momentum_type IN (revenue, audience)` + `energy_level = high_focus`. Low-Energy suggests `energy_level = low_energy`. Support suggests `status = waiting OR reschedule_loop_active`.
- "Suggest with AI" button calls `mastermind-ai-coach` mode `daily_brave_move` and proposes 3 picks; user approves.
- Existing Top 3 / One Thing / brain dump / scratch pad stay untouched below.

---

## 4. Weekly Tradeoff + Capacity Coach (WeeklyPlan rebuild — additive)

New top section in `WeeklyPlan.tsx`:

1. **The One Outcome** — single text field (`weekly_outcome`)
2. **3 Commitments** — reuse existing `top_3_priorities`
3. **Minimum Viable Week** — 1-3 chip inputs (`minimum_viable_week`)
4. **If life happens** — text (`life_happens_plan`)

**Capacity bar** below: aggregates `estimated_minutes` of tasks assigned to this week, broken by:
- High-energy load (sum of `high_focus`)
- Revenue actions (sum where `momentum_type='revenue'`)
- Content actions (sum where `momentum_type='audience'`)
- Delivery/admin (sum where `momentum_type IN (delivery, operations)`)

Compare against `weekly_capacity_planned_minutes` (default = workdays × 4h, editable). When over 100%, show:
- Red "Over capacity" pill
- "Rewrite to a realistic week" button → AI proposal (existing `WeeklyFocusCoach` infrastructure, new mode `realistic_week`) suggests which tasks to defer/shrink. User approves each before save.

---

## 5. Avoidance Detector + Brave Action Loop

Reuse existing `reschedule_count_30d` and `reschedule_loop_active`:

- New `AvoidanceCoachModal` triggered when a task with `reschedule_count_30d >= 3` is opened or rescheduled again.
- Modal asks (no shame): *"This has moved 3 times. What's actually going on?"*
- 5 buttons:
  1. **It's unclear** → opens edit with `done_enough_definition` field focused
  2. **It's too big** → AI proposes 3 subtasks (preview → approve)
  3. **It's scary** → opens StuckTaskCoachModal "Make this easier" (already exists)
  4. **Make a low-energy version** → AI rewrite, replaces or creates new
  5. **Move to Someday / Ask for support** → updates status
- Tasks page: new "Stuck" filter chip surfaces all `reschedule_loop_active` tasks. Existing `StuckTaskBadge` stays.

---

## 6. Coaching prompts (lightweight, in-context)

A small `<CoachingPrompt />` component (random from a curated list, dismissible per session) shown:
- On Tasks page when "Unconnected" count > 5: *"Is this task moving the business forward, or helping you feel productive?"*
- On Today when no Brave Move set: *"What's the sales-generating version of today?"*
- On Weekly when over capacity: *"What would you do if you trusted this could work?"*

Curated prompts in `src/lib/coachingPrompts.ts`. No new schema, just UI copy.

---

## 7. AI (BYOK) — extend existing `mastermind-ai-coach`

Add modes (all return JSON for user-approval flows, never silent edits):
- `classify_tasks` — input: array of `{id, text}` → output: `{id, momentum_type, is_maintenance, suggested_goal}`
- `daily_brave_move` — input: today's task list + cycle goal → output: 3 picks per slot
- `realistic_week` — input: this week's tasks + capacity → output: defer/shrink/keep recommendations
- `subtask_breakdown` — input: one task → output: 3 micro-steps
- `low_energy_rewrite` — input: one task → output: low-energy variant text

All use existing encryption + `useMastermindAI` hook. Rate-limited per existing pattern.

---

## 8. Files

**Migration:** one Supabase migration for sections (1).

**New components:**
- `src/components/tasks/MomentumChip.tsx`
- `src/components/tasks/ConnectTasksSweepModal.tsx`
- `src/components/tasks/UnconnectedTasksBanner.tsx`
- `src/components/daily/BraveMoveSlots.tsx`
- `src/components/weekly-plan/WeeklyTradeoffPanel.tsx`
- `src/components/weekly-plan/CapacityCoachBar.tsx`
- `src/components/mastermind/AvoidanceCoachModal.tsx`
- `src/components/coaching/CoachingPrompt.tsx`
- `src/lib/coachingPrompts.ts`
- `src/lib/momentumTypes.ts` (constants, labels, colors)

**Edited (additive only):**
- `src/components/tasks/TaskCard.tsx` (momentum chip)
- `src/components/tasks/TaskQuickAdd.tsx` (inline picker)
- `src/components/tasks/types.ts` (new fields)
- `src/components/tasks/views/TaskListView.tsx` (group-by momentum, Stuck filter)
- `src/pages/Tasks.tsx` (banner + sweep entry)
- `src/pages/DailyPlan.tsx` (BraveMoveSlots top section)
- `src/pages/WeeklyPlan.tsx` (tradeoff + capacity)
- `src/hooks/useMastermindAI.ts` (new modes)
- `supabase/functions/mastermind-ai-coach/index.ts` (new mode handlers)

**Untouched:** all existing fields, filters, dialogs, calendar integration, content/launch/offer flows, mindset, scorecard, evidence page (we'll wire deeper integration in Phase 2).

---

## 9. What's explicitly out of Phase 1

To keep this shippable, these are noted for Phase 2+:
- Monthly Planning strategy room rebuild
- 90-Day Command Center page rebuild
- Evidence Bank deep integration into reviews
- "Connection check" gate on every new task
- Energy/load swap suggestions ("you planned 5 high-energy tasks today")

These build cleanly on Phase 1 schema; nothing in Phase 1 forecloses them.

---

## 10. Acceptance checks

- A new task can be tagged with momentum + goal in one keystroke flow.
- Tasks page shows a real "Unconnected" count and the sweep modal can clear it.
- Today page shows 4 named slots that persist per day and survive reload.
- Weekly page enforces (visually) one outcome + 3 commitments + MVP week, with a real capacity bar.
- Rescheduling a task to its 4th date triggers the avoidance modal once per loop.
- All AI suggestions require explicit per-item approval before write.
- TypeScript build passes; no existing route, filter, or dialog regresses.
