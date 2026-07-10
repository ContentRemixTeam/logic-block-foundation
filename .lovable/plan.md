# Low Battery signature features

Six-part batch that integrates battery-awareness into the existing daily plan, task, and cycle systems. Nothing deleted, additive migrations, calm/permission-giving copy throughout.

---

## 1. Data model (one migration, additive only)

**New table** `daily_battery_checkins`
```
user_id uuid, date date, level text ('full'|'half'|'low'|'empty'),
created_at, updated_at
PRIMARY KEY (user_id, date)
```
+ GRANTs to `authenticated`/`service_role`, RLS `user_id = auth.uid()`, `updated_at` trigger. Upsert on (user_id, date) so re-adjustments overwrite same row.

**Additive columns** (all nullable, no defaults that touch existing rows):
- `tasks.energy_cost text` — `'low'|'medium'|'high'` or null
- `tasks.is_bare_minimum boolean default false`
- `user_settings.bare_minimum_template jsonb default '[]'::jsonb` — array of `{text, energy_cost?}` strings the user wants pre-filled each day
- `daily_plans.low_battery_mode boolean default false`
- `daily_plans.deferred_task_ids jsonb default '[]'::jsonb` — snapshot of which tasks were parked when Low Battery Day was toggled on, so "restore my day" can undo

CHECK constraint would break restores → use a `validate_battery_level` trigger for the enum instead.

---

## 2. Battery check-in

- `src/hooks/useBatteryCheckin.ts` — `useTodayBattery()` returns `{ level, hasChecked, setLevel, isLoading }`, cached in React Query, shared app-wide.
- `src/components/battery/BatteryCheckinPrompt.tsx` — one-tap sheet with 4 large buttons (Full 🔋 / Half 🪫 / Low 🔻 / Empty ⚪) + "Skip for now" link. Renders once per day at `Dashboard` and `DailyPlan` mount if `!hasChecked` (localStorage flag `battery_prompt_dismissed_<date>` for skips so it doesn't re-nag same day; a fresh day resets).
- `src/components/battery/BatteryHeaderChip.tsx` — small pill in the daily-plan header + dashboard hero showing current level, tap to reopen chooser. Always available.

Copy: "How's your battery today? (Totally optional — this just helps the planner match your day.)"

---

## 3. Bare Minimum plan

- Task toggle: `is_bare_minimum` — a small battery icon button on `TaskCard` / task edit sheet. Optimistic + resilient mutation via existing `useResilientTaskMutation`.
- Settings: new subsection in `ExtraFeaturesSection` sibling `BareMinimumTemplateSection` under Settings → Planner (existing `PlannerSettings.tsx`). List editor (1–3 items with an energy tag). Saves to `user_settings.bare_minimum_template`.
- Daily-plan pre-fill: on first render of a `DailyPlan` for a date with no template-derived tasks yet, we do NOT auto-create tasks (keeps things reversible). Instead, `<BareMinimumSection>` reads the template + any tasks flagged `is_bare_minimum` scheduled for that date, and shows them together at the top of the daily plan. Tapping a template item that has no backing task offers "Add to today" which creates a task via `useResilientTaskMutation` with `is_bare_minimum=true`.
- Visual: calm outlined card with small battery icon, above the existing Top 3 block. Copy: "Today's bare minimum — the tiny things that make today count."

---

## 4. Energy on tasks + "Match my energy" filter

- `EnergyChip` component (Low = soft green, Medium = soft amber, High = soft rose — semantic tokens only). Optional selector in task create/edit alongside importance.
- `Tasks.tsx` filter bar: new "Match my energy" toggle. Logic in `src/lib/energyMatching.ts`:
  ```
  empty  → is_bare_minimum only
  low    → energy_cost in [null, 'low']  (null = unknown = safe to include)
  half   → [null, 'low', 'medium']
  full   → all
  ```
  Wait — for `low`, showing all null tasks would be too much. Refined: `empty → bare minimum only`; `low → energy 'low' + bare minimum`; `half → 'low' + 'medium' + bare minimum + null (untagged)`; `full → all`. Sorted by existing importance/priority within the filtered set.
- Filter state persists in localStorage per session.

---

## 5. Low Battery Day mode

- Button on daily plan header: "Make this a Low Battery Day 🔻". Also surfaced automatically as a soft suggestion card when the check-in returns `low` or `empty`.
- On enable:
  1. Snapshot the current scheduled task IDs for today (minus bare-minimum and any tasks the user opts to keep in a small confirm sheet: "Keep these low-energy tasks too?") into `daily_plans.deferred_task_ids`.
  2. Update those tasks' `scheduled_date` to tomorrow via existing task update path — but pass a `skipRescheduleTracking: true` flag through `useTaskMutations` so `useRescheduleTracking` doesn't fire the friction banner. (Add the flag; default false.)
  3. Set `daily_plans.low_battery_mode = true`.
  4. Toast: "Everything else is safely parked for tomorrow. Doing your minimum today is a win."
- Daily plan view: when `low_battery_mode`, hide the full task grid and show only the Bare Minimum section + any kept low-energy tasks + the "Restore my day" button.
- Restore: reads `deferred_task_ids`, moves them back to today (again with `skipRescheduleTracking`), clears the flag and array. Copy: "Restored. Take it at your pace."
- Celebration: on completing all bare-minimum items while `low_battery_mode`, fire the existing `celebrationService.celebrate('daily-complete')` with a gentler `variant: 'low-battery'` (add variant → warmer copy, no confetti burst, small heart animation). All-bare-minimum on a normal day also celebrates but with the standard variant.

---

## 6. Dashboard integration

- `Dashboard.tsx` today-section: read `useTodayBattery()` + today's `daily_plans` row.
  - If `low_battery_mode`: replace Top-3 widget content with `<BareMinimumSection compact />`.
  - Otherwise: existing Top-3 widget, but show `BatteryHeaderChip` in its header.
- 90-day cycle hero stays untouched.

---

## 7. Copy principles applied everywhere

- Never "you only did X".
- Reframes: "Bare minimum done — that's a full day today." / "Battery low? That's information, not a verdict." / "Everything else is safely parked."
- Skip links on every prompt.

---

## 8. Files touched (rough)

**New**
- `supabase/migrations/<ts>_low_battery_features.sql`
- `src/hooks/useBatteryCheckin.ts`
- `src/hooks/useBareMinimum.ts`
- `src/lib/energyMatching.ts`
- `src/components/battery/BatteryCheckinPrompt.tsx`
- `src/components/battery/BatteryHeaderChip.tsx`
- `src/components/battery/BareMinimumSection.tsx`
- `src/components/battery/LowBatteryDayToggle.tsx`
- `src/components/battery/EnergyChip.tsx`
- `src/components/battery/EnergySelector.tsx`
- `src/components/settings/BareMinimumTemplateSection.tsx`

**Edited (small, targeted)**
- `src/pages/DailyPlan.tsx` (header chip, bare-minimum section, low-battery button/render branch)
- `src/pages/Dashboard.tsx` (checkin prompt mount, today-section swap)
- `src/pages/Tasks.tsx` (Match-my-energy filter)
- Task card + task create/edit dialog (energy chip/selector, bare-minimum toggle)
- `src/hooks/useTasks.tsx` / `useResilientTaskMutation.tsx` (add `skipRescheduleTracking` option)
- `src/hooks/useRescheduleTracking.tsx` (respect the flag)
- `src/lib/celebrationService.ts` (add `low-battery` variant)
- `src/pages/PlannerSettings.tsx` (mount `BareMinimumTemplateSection`)
- `src/integrations/supabase/types.ts` regenerates after migration

No file, route, table, or feature deleted. No behavior change for users who ignore the new features (all optional/nullable).

---

## 9. Verification

1. `tsgo --noEmit` clean.
2. Playwright: check-in prompt appears on `/dashboard` on first visit of a day, dismisses, doesn't reappear same day; re-openable from chip.
3. Manual (I'll ask you): mark a task bare minimum → appears in bare-minimum section; set energy on 3 tasks, flip Match-my-energy at each battery level; enable Low Battery Day → non-kept tasks move to tomorrow, no reschedule banner fires; hit Restore → they come back; complete bare minimums in low-battery mode → gentle celebration.

---

## Two decisions to confirm before I ship

1. **Bare-minimum template storage**: on `user_settings.bare_minimum_template` (single JSONB) rather than a new `bare_minimum_templates` table. Simpler, fits the "one-row settings" pattern already used. Say if you'd rather have per-weekday templates (that'd be a new table).
2. **Low-Battery-Day defer target**: tasks move to **tomorrow's** scheduled date (as the prompt says "rescheduled to tomorrow/unscheduled pool"). I'll default to tomorrow; if you'd rather I dump them into the unscheduled pool instead, say the word.

Reply "go" (or with adjustments) and I'll implement in one pass.
