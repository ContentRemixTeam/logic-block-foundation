## Audit findings (already in good shape)

Before scoping work, I checked the codebase against your 14 items. Several are already done or not blocking:

- **#1 Brain Dump wiring** — `BrainDump.tsx` already passes `onSubmitRaw={handleCreateRaw}` to `BrainDumpCreateForm`, which calls `createItemsFromText.mutateAsync`. Multi-line capture, failed-line retention, and tag routing are working from the previous Phase 1 pass. **No change needed.**
- **#2 Tana-style tag inbox** — `captureTags.ts` already supports all the tags you listed (#task, #idea, #note, #project, #content, #question, #win, #low-energy, #medium-energy, #high-focus, #sales, #admin, etc.) and routing precedence. The capture form uses them. **Already shipped.**
- **#10 Mobile bottom nav** — `MobileBottomNav.tsx` already shows Home / Tasks / Capture / Grow / More, and `/progress` is the live route. **Matches your spec.**

The real, scoped wins are #11 (stale routes), parts of #3/#4 (Next Best Action), parts of #5 (low-energy surfacing), and #12 (label consistency). Everything else (#3 full Today redesign, #6 Tasks polish round 2, #7 Project cards rework, #8 Business Season, #9 CEO Weekly Review redesign, #13 polish pass) is multi-hour redesign work that should be its own focused pass per area — bundling them risks regressions across autosave, offline, and existing planner data.

## Phase 1 scope (this loop)

Narrow, low-risk, high-leverage fixes only.

### 1. Fix stale Mobile Quick Action routes (#11)
- `src/components/mobile/MobileQuickActions.tsx`
  - `/metrics` → `/progress`
  - `/coach-yourself` → `/self-coaching` (drawer "Open Full Coach Tool" button)
  - Rename action id `metrics` label to "Update progress" so it matches the destination.

### 2. Add a deterministic "Next Best Action" panel (#4)
- New component `src/components/today/NextBestAction.tsx` — pure presentation + a small deterministic hook.
- New hook `src/hooks/useNextBestAction.ts` — reads existing data only:
  - active 90-day cycle (existing query) → "Create your 90-day focus"
  - this week's plan (existing query) → "Pick this week's Top 3"
  - today's daily plan top-3 → "Choose today's Top 3"
  - overdue tasks count from `useTasks()` → "Clear or reschedule N overdue tasks"
  - unprocessed brain dump items from `useBrainDump()` → "Review your captured ideas"
  - low-energy day flag on today's plan → "Pick one low-energy task"
- Render at the top of `src/pages/DailyPlan.tsx` (Today) above existing sections. Calm card, single CTA button that routes to the relevant page. No schema changes.

### 3. Surface low-energy tasks (#5, partial)
- In `src/components/tasks/TasksPageToolbar.tsx`, add a "Low energy" quick filter chip alongside existing filters (uses existing `energy_level = 'low_energy'` field). Persist in the same toolbar state pattern.
- In the new `NextBestAction` panel, when low-energy is the suggestion, deep-link into `/tasks?energy=low_energy` and have the toolbar read that param on mount.

### 4. Copy standardization (#12, low-risk slice)
- Audit + replace user-visible "Todo List" / "To-do" labels with "Tasks" in:
  - `src/components/Layout.tsx` sidebar (if present)
  - `src/components/MobileBottomNav.tsx` (already says Tasks — verify)
  - `src/pages/Tasks.tsx` page header
  - Any tab labels found via `rg -l "Todo List|To-do"` (will scope to user-facing strings only — not variable names, types, or DB columns).

### Out of scope this loop (deferred, will need their own passes)

- Full Today Command Center redesign (#3) — touches DailyPlan, Dashboard, Planning hierarchy
- Tasks page round-2 polish (#6) — already had a pass; needs a focused calm/inline-add round
- Projects cards + detail rework (#7) — needs design decisions on outcome / next-action surfacing
- Business Season UX layer (#8) — needs preference storage decision (localStorage vs profile column)
- Weekly CEO Review redesign (#9) — multi-section reflow, should be a dedicated loop
- App-wide polish pass (#13) — should follow the structural changes
- Data-safety banners (#14) — already present; will only re-audit when redesigning above

## Risk

- All Phase 1 changes are presentation/routing/derived-state only.
- No schema changes, no edits to `useTasks`, `useBrainDump`, autosave, offline sync, or auth.
- `NextBestAction` is additive (new files + one mount in `DailyPlan.tsx`); easy to revert.
- Toolbar filter chip reuses existing filter state plumbing.

## Suggested next steps after Phase 1 ships

I'd recommend ordering future phases as:
1. Today Command Center (#3) — anchors the rest of the UX
2. Projects rework (#7) — second-most-visited daily surface
3. Weekly CEO Review (#9) + Business Season (#8) together — they share planning vocabulary
4. Tasks round-2 polish (#6) + app-wide polish (#13) — final calm/visual pass

Want me to proceed with Phase 1 as scoped above?
