# Simplify around the rebrand — hide, never delete

Everything stays in the codebase and database. This adds a per-user visibility layer, reorders the dashboard, and softens tone on core pages. Nothing is removed.

Before I start: two decisions I'd like to confirm — see **Assumptions** at the end.

---

## 1. Feature-toggle backend

**Storage.** Add one JSONB column to the existing `user_settings` table rather than a new table:

```sql
ALTER TABLE public.user_settings
ADD COLUMN feature_toggles JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Reads happen alongside the rest of settings (one row, already cached). Merging with a defaults constant in code means we never write until the user actually flips a switch.

**Feature keys (all default OFF for new users):**

| Key | Label | Description |
|---|---|---|
| `courses` | Courses & Study Plans | Track courses you're taking and build gentle study plans |
| `focus_pets` | Focus Pets & Rewards | Little companions, quests, and small celebrations while you work |
| `ai_writing` | AI Writing Assistant | Draft posts, emails, and content with AI help |
| `launch_tools` | Launch Tools | Launches, summits, flash sales, webinars, content challenges, money-momentum sprints |
| `coaching` | Coaching & Mastermind Tools | Mastermind hub, office hours, coaching log & prep |
| `challenges` | Challenges & Celebrations | Monthly challenges, streaks, celebration overlays |

**Auto-enable migration (one-time backfill so no existing user loses anything):**

For every user, check the relevant tables and set the matching key to `true`:

- `courses` → any row in `courses` or `course_study_plans`
- `focus_pets` → any row in `arcade_wallet`, `arcade_daily_pet`, `arcade_game_sessions`, `arcade_pomodoro_sessions`, `hatched_pets`, `earned_trophies`
- `ai_writing` → any row in `ai_copy_generations`, `ai_connection_keys`, `user_api_keys`, `brand_profiles`, `messaging_frameworks`
- `launch_tools` → any row in `launches`, `launch_templates`, `launch_debriefs`, `summits`, `summit_speakers`, `flash_sales`, `webinars`, `content_challenges`, `revenue_sprints`, `money_moves_sprint_trackers`
- `coaching` → any row in `coaching_entries`, `coaching_call_prep`, `office_hours`, `user_mastermind_rsvps`
- `challenges` → any row in `user_monthly_challenges`, `user_badges`, `earned_trophies`

Written as a single SQL `UPDATE ... SET feature_toggles = feature_toggles || jsonb_build_object(...)` per key, guarded by `EXISTS` subqueries. Idempotent.

**Client hook.** New `src/hooks/useFeatureToggles.ts`:

```ts
export const FEATURE_DEFAULTS = { courses: false, focus_pets: false, ai_writing: false,
  launch_tools: false, coaching: false, challenges: false };

export function useFeatureToggles(): {
  toggles: FeatureToggles;
  isEnabled: (key: FeatureKey) => boolean;
  setToggle: (key: FeatureKey, value: boolean) => Promise<void>;
  isLoading: boolean;
};
```

Backed by the existing `user_settings` query; writes go through a mutation that patches the JSONB and invalidates the settings cache. Optimistic update so the sidebar changes instantly.

---

## 2. Route & nav guarding

**Route → feature map** in a single file (`src/lib/featureRoutes.ts`) so nav + guard + settings share one source of truth:

```
/courses, /courses/:id              → courses
/arcade, /focus, /quest, /timer     → focus_pets
/ai-copywriting, /content-vault     → ai_writing
/wizards/launch, /wizards/launch-v2, /wizards/summit,
  /wizards/money-momentum, /wizards/content-challenge,
  /launch-debrief, /sprint-dashboard  → launch_tools
/mastermind, /mastermind/*, /office-hours,
  /coaching-log, /coach-prep         → coaching
/challenges, /monthly-theme routes   → challenges
```

Everything else stays core.

**Guarded routes.** New `<FeatureGuard feature="courses">…</FeatureGuard>` wrapper. When disabled, renders a calm `FeatureDisabledPage`:

> **This feature is turned off**
> You can turn it on any time in Settings → Extra Features.
> [ Open Settings ] [ Go home ]

Never a 404. Never a blank screen. Uses the same padded card layout as the empty states we already have.

**Sidebar (`AppSidebar.tsx`) & mobile bottom nav (`MobileBottomNav.tsx`).** Each nav item declares an optional `feature` key; `isEnabled(item.feature ?? core)` filters the list. No item ever hard-disappears if it's core.

---

## 3. Core (always visible) surface

Dashboard, Today, Weekly, Monthly, 90-Day Cycle, Tasks, Brain Dump, Notes/Reflections, Content calendar (editorial calendar), Financial tracker, Settings.

Anything not in that list and not in the toggle map still exists in the codebase and remains reachable by direct URL — it just doesn't show up in nav for the default user. (This matters for lesser-used pages like Support, SOPs, Wins, Ideas — they're not features to hide, just secondary.)

---

## 4. Dashboard reorder — cycle-first

Rework `src/pages/Dashboard.tsx` visual hierarchy:

```text
┌─────────────────────────────────────────┐
│  90-Day Cycle — [Goal]                  │  ← hero, largest
│  Day 34 of 90 · progress bar            │
├─────────────────────────────────────────┤
│  This week's focus                      │  ← medium
│  • Priority 1  • Priority 2  • Priority 3│
├─────────────────────────────────────────┤
│  Today                                  │  ← medium
│  Top 3 · quick link into Daily Plan     │
├─────────────────────────────────────────┤
│  (Optional widgets, only if enabled)    │  ← small, calm
└─────────────────────────────────────────┘
```

- Any widget belonging to a disabled feature (arcade pet, mastermind card, launch countdown, monthly challenge, course reminders, AI drafts) returns `null` when its feature is off.
- If no cycle exists yet: the hero becomes a gentle "Start your first 90-day cycle" card instead of empty scaffolding.
- Strip the current widget stack down to the three-block hero; keep the rest available but visually secondary.

I'll list every dashboard widget I touch in the change summary so you can spot-check.

---

## 5. Tone pass (core pages only)

Sweep the copy in: Dashboard, Today/DailyPlan, WeeklyPlan, MonthlyReview, CycleView/CycleSetup, Tasks, BrainDump, Notes, EditorialCalendar, FinancialTracker, Settings, and shared Layout/empty-state components.

Replace hustle language with calm, energy-aware language. Examples:

| Before | After |
|---|---|
| "Crush your goals" | "Make gentle progress" |
| "Dominate this week" | "Shape your week" |
| "Power through your tasks" | "Work through what feels doable" |
| "Get sh*t done" | "Get to what matters" |
| "Beast mode" | "Focused time" |
| "Grind it out" | "Steady pace" |
| "Level up" | "Grow at your own pace" |

I won't touch strings inside hidden-feature files (arcade, launches, ai-copywriting, etc.) — that's a later batch tied to the rebrand.

---

## 6. Settings → Extra Features section

New `src/components/settings/ExtraFeaturesSection.tsx` mounted in the existing Settings page. Simple card list, one `<Switch>` per feature with the label + one-line description above. Saving flips the JSONB immediately and toasts a short confirmation ("Turned on — you'll see it in the sidebar"). Toggling off does not touch any data.

---

## 7. Files touched (rough)

- **Migration**: 1 SQL migration (schema + backfill)
- **New**: `useFeatureToggles.ts`, `featureRoutes.ts`, `FeatureGuard.tsx`, `FeatureDisabledPage.tsx`, `ExtraFeaturesSection.tsx`
- **Edited**: `App.tsx` (wrap ~15 routes), `AppSidebar.tsx`, `MobileBottomNav.tsx`, `Dashboard.tsx`, `Settings.tsx`, plus tone-pass edits (~10 core files, string-only)
- **No file deleted. No route removed. No table dropped.**

---

## 8. Verification

1. `tsgo --noEmit` clean.
2. Playwright smoke: load `/`, `/dashboard`, `/settings`, `/courses` unauthenticated redirect flow works.
3. Manual walk-through I'll ask you to do after: sign in as a fresh account (all toggles off → minimal nav), toggle Courses on in Settings (Courses appears immediately), toggle it off (disappears), visit `/courses` while off (calm disabled page).
4. Auto-enable: I'll run a `SELECT user_id, feature_toggles FROM user_settings WHERE feature_toggles != '{}'` after the migration and share the count so you can sanity-check that existing users kept their features.

---

## Assumptions to confirm before I start

1. **Grouping**: I've grouped all launch-family wizards (launch, summit, flash sale, webinar, content challenge, money-momentum, sprint dashboard, launch debrief) under one `launch_tools` toggle as your prompt suggested. Say the word if you'd rather split e.g. "Summits" out.
2. **Editorial calendar is core, AI writing is a toggle.** So the calendar renders for everyone but the "Draft with AI" buttons/panels inside it will hide when `ai_writing` is off. OK?

If both are fine, reply "go" and I'll ship it in one pass.
