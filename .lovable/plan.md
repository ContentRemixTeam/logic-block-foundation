# Fresh Start + calm-design pass

This work is real-designer, not a coat-of-paint pass. To keep quality high, I'm splitting delivery into a **Batch 1 (this turn)** and a **Batch 2 (next turn)**. Batch 1 ships the whole "Fresh Start" feature end-to-end plus the design-system foundations that unblock every other page. Batch 2 does per-page composition work.

If you want a different split, tell me and I'll re-cut.

## Batch 1 — this turn

### Part B: Fresh Start feature (complete)

1. **Migration** — additive only:
   - `tasks.archived_at timestamptz null` + index on `(user_id, archived_at)`.
   - `daily_plans.archived_at timestamptz null` for stale plan carry-overs.
   - Default all list queries filter out `archived_at is not null`.

2. **Welcome-back flow** (`WelcomeBackDialog.tsx`):
   - On sign-in, read `user_profiles.last_activity_date`. If gap >= 7 days AND `localStorage['lbb-welcome-back-shown-{returnDate}']` unset, open dialog before any overdue UI paints.
   - 3 primary options (Fresh start / Move forward / Look around), one-tap dismiss, warm copy.
   - Fires once per return, dismissible.

3. **Bulk actions hook** (`useFreshStart.ts`):
   - `archiveOverdue()` — sets `archived_at` on incomplete tasks with `scheduled_date < today` + on `daily_plans` whose date < today.
   - `moveOverdueForward(mode: 'today' | 'this_week' | 'unscheduled')` — reuses existing task update path so no reschedule-friction banners fire (I'll pass a `silent: true` flag through `useResilientTaskMutation`).
   - Returns preview counts before commit.
   - Emits an undo token stored in memory for 20s (`undoLastFreshStart()`).

4. **Manual "Clean up" dialog** (`CleanUpDialog.tsx`):
   - Trigger on `/tasks` header + Settings.
   - Sections: archive before [date], reschedule overdue to [today/this week/unscheduled], archive completed older than [30/60/90 days].
   - Live counts before confirm. Undo snackbar for 20s.

5. **Archive page** (`/tasks/archive`):
   - Lists archived tasks + archived daily plans, searchable, restore single or in bulk (sets `archived_at = null`).
   - Nav entry lives quietly in Tasks page menu + Settings link.

6. **De-alarm overdue**:
   - Sweep the codebase for red-badge overdue styling. Neutralize to `text-muted-foreground` + a soft amber accent only where truly informational. Replace "X days overdue" phrasing with "waiting for you" / "from {date}".

### Part A: design foundations only (not per-page redesigns)

The following are reusable primitives every core page can adopt. Actual page-by-page composition sits in Batch 2.

1. **`<AppCard />`** — one canonical card (radius, border, subtle shadow) built on shadcn Card so we don't touch 40 files at once.
2. **`<PageSkeleton />` + `<CardSkeleton />`** — shared skeletons; swap spinners on the 4 highest-traffic pages (Dashboard, DailyPlan, Tasks, Cycle) this turn.
3. **`<EmptyState />`** — icon + one warm sentence + one primary action; drop into Tasks empty view + Archive empty view this turn as reference implementation.
4. **Motion guard util** — `useRespectMotion()` returning bool; used by PageTransition + celebrations (already respected there).
5. **Overdue tone tokens** — add `--tone-waiting` semantic (warm neutral) to `index.css`; use it for waiting/overdue states everywhere the sweep touches.

## Batch 2 — next turn (I will not do this turn)

- Per-page composition pass on Dashboard, DailyPlan, WeeklyPlan, Cycle, Tasks, BrainDump, Reflections, Wizards chooser, Settings, Auth: hierarchy, whitespace, single primary action, 375px audit.
- Empty states rolled out to every remaining core page using the primitive from Batch 1.
- Auth/first-run premium polish pass.

Doing that page work in the same turn as Batch 1 would mean either shallow work on Fresh Start or shallow work on the design pass — neither is what you asked for.

## Assumptions I'm making

- "Archive everything overdue/stale" for Fresh Start = incomplete tasks with `scheduled_date < today` + `daily_plans` with `date < today`. Notes, reflections, cycle, completed tasks are untouched.
- Undo window = 20 seconds via snackbar; after that, users restore from Archive.
- `last_activity_date` on `user_profiles` is already updated by the `update_last_activity` trigger — I'll rely on it. If it's stale for a specific user, the welcome dialog just won't fire; it's not destructive.
- Bulk reschedule "this week" spreads across the next 5 weekdays evenly.
- Archive page lives at `/tasks/archive` and is always accessible (no feature toggle).

Reply "go" to proceed with Batch 1 as scoped, or tell me what to cut/add.
