# Comprehensive Audit — Boss Planner → "Low Battery Business Planner"

Read-only report. No code changes made. Findings backed by file paths, line numbers, and SQL queries against the live database.

---

## 1. Data Integrity & Save Architecture — Risk: **HIGH**

### How saving actually works

```text
Component state
  → React Query mutation → supabase.functions.invoke('manage-task' / 'save-*')   [primary]
  → useLocalStorageSync / useFormDraftProtection → localStorage + IDB('drafts')  [draft safety net]
  → usePeriodicBackup → IDB('backups') every 5 min                               [snapshot]
  → useBeforeUnload → emergencySave → sendBeacon + localStorage + IDB            [crash net]
  → useOfflineSync + offlineDb('mutationQueue') → edge fns on reconnect          [offline queue — partial coverage]
```

Storage lives in one IndexedDB (`boss-planner-offline`, v2, 9 stores) via `src/lib/offlineDb.ts`. The infrastructure itself is well-engineered (safe retry wrapper, 3 retries, 409 last-write-wins, sendBeacon, periodic snapshots). The problems are in **wiring**.

### Overlapping recovery UI (4 systems, 1 event)

All read the same `useOfflineSync()` state and can render at once:
- `OfflineBanner` (Layout.tsx:71) — full-width top banner
- `UnsyncedDataBanner` (Layout.tsx:72) — full-width top banner
- `OfflineIndicator` compact badge (Layout.tsx:124)
- `OfflineDetector` toasts
- Plus 3 unrelated "we found unsaved data" UIs: `DraftRestoreBanner`, `DataRecoveredPopup` (cycle-only, hardcoded), `ConflictResolutionModal` (built as reusable but wired only into `MonthlyReview.tsx:654` and `DailyReview.tsx:513`).

Comments in the code reference "Prompt 7/8/9/11" and "13-layer data protection" — built incrementally without consolidation.

### Concrete data-loss holes (worst first)

1. **Sign-out unconditionally destroys the offline queue.** `useAuth.tsx:66-96` → `clearAllOfflineData()` (`offlineDb.ts:466-479`) wipes `mutationQueue`, `drafts`, `backups`, `emergencySaves` with **no check for `getPendingCount() > 0`**. Any user with pending/failed unsynced writes who signs out (or hits an auto-signout on session expiry) loses that data silently.
2. **Task creation has zero offline resilience.** `useTasks.tsx:389-458` calls the edge function directly; `onError` (line 438) only shows a toast — no queue, no draft, no retry. Meanwhile `useOfflineTasks.tsx` and `useOfflineSafeWrite.ts` are fully-built but **dead code** (never imported). `useResilientTaskMutation.tsx` is only used by `CycleWizard`.
3. **Debounce-unmount race in `useServerSync.ts`.** Cleanup effect (lines 206-215) clears the 2 s debounce timer but **doesn't flush**. Every navigation during autosave has a ~2 s data-loss window unless the surface also wired its own `useBeforeUnload`.
4. **Mutation queue has a fixed table whitelist** (`offlineSync.ts:59-96`). Unlisted tables hit the `default:` branch: `console.warn` + `return false` — the mutation stays `pending` forever, is never retried, and floods `pendingCount`.
5. **`emergencySave` recovery only reads localStorage.** IDB `emergencySaves` store and the server-side beacon record are write-only from the client — `getEmergencySaves()` (offlineDb.ts:714) has no callers. Two of three safety layers are unused on read.
6. **`emergencySave` beacon fails silently** if the Supabase localStorage key format changes or the token is expired (`emergencySave.ts:36-55`) — only a `console.warn`.
7. **"Discard Changes" in `UnsyncedDataRecovery.tsx:53-65`** permanently deletes unsynced data with only a toast, no undo.
8. **Two parallel Sheets backup queues.** `sheetsPrimaryTaskService.ts` (fully-built, zero callers — landmine if `plannerSheetRollout.ts` flag is flipped) and `shadowTaskSync.ts` (the one actually used, fire-and-forget after successful Supabase write). They share `localPendingWrites` (localStorage) and are not cross-referenced with `offlineDb`'s `mutationQueue`. Retry only fires from a Settings panel, not on reconnect.
9. **Cross-tab conflict resolution is last-write-wins by timestamp** (`useLocalStorageSync.ts:96-117`); only 2 pages route it into a real merge UI.

**Risk rating: HIGH.** Not Critical only because the infrastructure is sound and daily/weekly/cycle drafts are actually protected. The gaps are concentrated and fixable.

---

## 2. Database & Security — Overall: **Solid**

Ran `security--run_security_scan` and direct queries. Universal RLS coverage, `auth.uid()` scoping everywhere, no `anon` grants, all 26 SECURITY DEFINER functions pin `search_path=public`. **Zero Critical findings.**

### High
- **H1 — `error_logs.user_id` nullable + two overlapping INSERT policies both allow `user_id IS NULL`.** Orphan rows can carry stack traces/PII and no one can UPDATE/DELETE them.
- **H2 — Duplicate policies** on `ai_connection_keys`, `user_api_keys`, `error_logs`, `admin_users`. Drift risk on future edits.

### Medium
- `admin_users.user_id` nullable with email-fallback matching (weaker than UID). Backfill and drop fallback.
- Blanket `USING (true)` SELECT policies on `feature_flags`, `feature_releases`, `wizard_templates` — confirm no sensitive rollout metadata.
- Public INSERT on `workshop_testimonials` with no rate-limit tied into RLS.
- **~55 tables missing `created_at`/`updated_at`**, including `error_logs`, `time_entries`, `sales_log`, `task_schedule_history`, `financial_categories`.

### Low
- **44 tables have 0 rows across all users** — includes `launches`, `evidence_bank`, `content_challenges`, `flash_sales`, `summits`, `webinars`, `courses`-related tables, `revenue_sprints`, `email_campaigns`, `feature_requests`, `financial_transactions`, and ~30 more. Not orphaned schema per se, but confirms feature bloat (§4) at the data layer.
- `launches` lacks `(user_id, status/date)` composite index — add before it fills.

Indexes on `tasks`, `daily_plans`, `weekly_plans`, `cycles_90_day`, `content_items`, `journal_pages`, `habit_logs`, `evidence_bank` are strong.

---

## 3. Auth — Risk: **HIGH** (mid-edit safety)

- `/auth` and `/login-help` routes are rendered **outside** `PageSuspense`/`ErrorBoundary` (App.tsx:271-272). A crash on the login screen = true white screen for unauthenticated users.
- **No unsaved-changes guard between `signOut()` and any open form.** Autosaved drafts in IDB are wiped instantly (see §1 hole #1).
- **Session-expiry mid-edit** — `onAuthStateChange` triggers `queryClient.clear()` (useAuth.tsx:43-46) with no warning; open pages lose their query cache under active editing.
- Password reset (`Auth.tsx` `isForgotPassword` mode) — password validation is skipped in that mode (reasonable), but full reset submit/error path was not fully sampled — recommend a targeted review.
- Google OAuth uses edge functions (`google-oauth-start`, `google-oauth-callback`) — no client-side callback error handling was visible; if users report OAuth failures, that's the place.

---

## 4. Feature Inventory & Bloat

~85 routes across 3 essentially different products bolted together.

### KEEP (core value for chronically-ill founder)
- Daily/Weekly/Monthly/Quarterly planning + 90-day cycles — this **is** the product.
- Tasks, brain dump, notes, wins, open loops — essential low-spoon capture.
- Financial tracker (simplified).
- Onboarding/tour/PWA install — trim to one lightweight flow.
- One consolidated Reflections surface (see Simplify).

### SIMPLIFY
- **Mindset sprawl** — 5 pages doing overlapping work: `Mindset`, `UsefulThoughts`, `BeliefBuilder`, `IdentityAnchors`, `SelfCoaching` + `Evidence`. Merge into a single "Reflections" feature.
- **Content planner + editorial calendar + AI copywriting** = 59 files (`ai-copywriting/` alone is 22 + BrandDNA page). Keep a basic calendar; reduce AI copy to an optional single-button assist or cut entirely.
- **Google integrations** — keep Calendar (if lifetime buyers expect it), cut Sheets sync unless there's proven demand. OAuth-token maintenance is a real recurring burden for a low-priced lifetime product.
- **Themes/seasonal/challenges/badges** — keep visual skin, cut challenges + streak/celebration mechanics (pressure ≠ calm).
- **Focus/pomodoro** — keep the simple timer, cut the gamified pet/quest/arcade layer (`arcade/` 12 + `quest/` 7 + `timer/` 3).
- **Wizards** — `src/components/wizards/` is **152 files**, the largest folder in the repo. Kill Summit / Flash Sale / Content Challenge / Money Momentum / Webinar as separate wizards; keep one flexible "Project/Launch" template wizard.
- **Habits/evidence/beliefs/identity** — consolidate.

### CUT
- **`src/pages/Index.tsx`** — Vite scaffold placeholder, not routed. Delete now.
- **`LaunchWizardPage` (v1)** at `/wizards/launch-v1` — v2 exists. Dead weight.
- **Mastermind hub, roster import, office hours, coaching log/prep, money-moves-sprint, prizes/community panels, podcast widget** (~20 files) — bespoke infrastructure for a specific group-coaching cohort. Highest mismatch with a self-serve lifetime-deal rebrand.
- **Courses / study system** (unless the rebrand ships a course).
- **Arcade / quest / gamification** entirely — contradicts "calm, non-overwhelming."
- **Dead offline hooks** — `useOfflineTasks.tsx`, `useOfflineSafeWrite.ts` (never imported).
- **`SheetsPrimaryTaskService`** — zero callers, live landmine.

**Net effect:** Cutting the mastermind + wizards + AI copy + arcade + courses layers removes **200+ files** and materially reduces per-user cost, cognitive load, and future-support burden.

---

## 5. Error Handling & Stability — Risk: **HIGH**

- Route-scoped `ErrorBoundary` via `PageSuspense` is done well (App.tsx:239-247). **Exception: `/auth` and `/login-help` are unprotected.**
- ~1,537 catch blocks; no fully empty ones, but most log to console with **no user toast**. Users cannot tell when background saves/loads fail.
- **Top 10 riskiest silent-catch spots** (data-critical, console-only):
  1. `useMonthlyTheme.ts:76-77` — explicit "silent" comment.
  2. `WeeklyReflection.tsx:112-114` — cycle load.
  3. `WeeklyReflection.tsx:242-244` — share count.
  4. `UsefulThoughts.tsx:64-97` — load/save/clear-backup, all silent.
  5. `Tasks.tsx:265-267` — recurring task generation silently stops.
  6. `useCrossTabSync.ts:165-234` — 4 spots.
  7. `emergencySave.ts:138-180` — the last-resort layer, silent.
  8. `pdfGenerator.ts:589-596` — cleanup/primary method.
  9. `DailyPageSettings.tsx:218-220` — unverified "handled in hook" assumption.
  10. `useLocalStorageSync.ts:188-190` — corrupted local data discarded silently.

---

## 6. Performance & Cost — Risk: **MEDIUM**

- **Heavy deps**: `framer-motion`, `recharts`, `jspdf` + `html2canvas` (expensive combo), `@sentry/react` v10, `embla-carousel`, three `@dnd-kit/*`. AI SDKs kept server-side via edge-function proxies — the right pattern for cost control.
- **Realtime**: only 4 `.channel()` calls; `useTasks` (`tasks-realtime`) is the one to verify unsubscribes cleanly on unmount.
- **Edge functions**: ~140, mostly narrow CRUD-per-entity. Cold-start prone at scale. `google-token-keepalive` name suggests scheduled execution — verify cron/cost.
- **`select('*')`**: 107 occurrences. Highest-traffic: `useTasks`, `useUserSettingsRow`, `useArcade` (mounted at root globally), `useAICopywriting` (6 in one file, likely fetching large text columns on list views).
- **React Query config** (App.tsx:168-187): sensible — `staleTime 5min`, `gcTime 15min`, `refetchOnWindowFocus: false`, `refetchOnReconnect: 'always'`.

---

## 7. Mobile, PWA & Accessibility — Risk: **HIGH (PWA reality vs. claim)**

- **`public/sw.js` is a self-destroying kill-switch worker.** On activate it deletes all caches and `self.registration.unregister()`s. **The PWA has zero offline caching.** The IndexedDB fallbacks in `emergencySave`/`useLocalStorageSync` are the *only* offline mechanism, and they're decoupled from the SW. Any marketing claim of "offline mode" is false today.
- Manifest is well-formed. `ManifestSwitcher` correctly handles the dual planner/quick-add app pattern.
- Install flow (`src/components/install/*`, 9 files) is thorough.
- `MobileBottomNav`: `h-16` bar, `min-w-[64px]` items, `touch-manipulation` — good.
- **A11y gaps:**
  - **163 hardcoded color utilities** (`text-gray-`, `text-white`, `bg-black`, hex literals) in `.tsx` — breaks theming/contrast, especially with the seasonal-theme system.
  - **186 `size="icon"` buttons**; sampling shows the majority lack `aria-label`. Real screen-reader gap.
  - 3 `<img>` tags missing `alt`.

---

## 8. Launch-Readiness Priorities

### (A) Critical — must fix before selling as "your data is safe"
1. **Guard sign-out against pending offline data.** In `useAuth.signOut`, block or prompt if `getPendingCount() + getMutationCount('failed') > 0`. (`useAuth.tsx:66`)
2. **Route `useTasks.createTask` through the offline mutation queue** (or through `useResilientTaskMutation`). Everyday adds currently vanish on network failure. (`useTasks.tsx:389`)
3. **Flush pending debounced saves on unmount** in `useServerSync`. Cancel is not the same as flush. (`useServerSync.ts:206`)
4. **Wrap `/auth` and `/login-help` in `ErrorBoundary`.** (`App.tsx:271-272`)
5. **Replace the kill-switch service worker** with either a real minimal offline shell (via `vite-plugin-pwa`, already installed) *or* explicitly remove all "offline" language from marketing. Current state contradicts every user-facing recovery banner. (`public/sw.js`)
6. **Delete `SheetsPrimaryTaskService`** (dead code, landmine) or fully wire it. (`src/lib/planner-storage/sheetsPrimaryTaskService.ts`)
7. **Tighten `error_logs` RLS** — drop nullable `user_id` inserts; dedupe overlapping policies on 4 tables.
8. **Wire real user-visible errors** into the top-10 silent catches (§5), especially `emergencySave`.

### (B) High-value
9. Delete dead code: `src/pages/Index.tsx`, `LaunchWizardPage` v1, `useOfflineTasks.tsx`, `useOfflineSafeWrite.ts`.
10. Consolidate the 4 overlapping "offline/unsynced" UI surfaces into 1 (§1).
11. Cut mastermind/office-hours/coaching-log/money-moves-sprint routes and their tables (~20 files, ~15 tables at 0 rows).
12. Reduce `wizards/` (152 files) to a single generic Launch/Project template wizard.
13. Merge the 5 mindset pages into 1 Reflections surface.
14. Cut arcade/quest/gamification layer.
15. Add `aria-label` to icon-only buttons; replace hardcoded colors with semantic tokens (163 hits).
16. Add `created_at` to `error_logs`, `time_entries`, `sales_log`, `task_schedule_history`.
17. Backfill `admin_users.user_id` and drop the email-fallback policy branch.
18. Confirm `useTasks` realtime channel unsubscribes on unmount to avoid connection leaks.
19. Audit `useAICopywriting`'s 6× `select('*')` — likely large payloads on list views.
20. Replace `jspdf + html2canvas` PDF generation with a lighter server-side path if PDF is kept.

### (C) Nice-to-have
21. Run `depcheck` to remove unused deps.
22. Drop v1 launch wizard code once feature-flag rollout is confirmed complete.
23. Consolidate two Sheets pending-write queues (`localPendingWrites` + `offlineDb.mutationQueue`) into one source of truth.
24. Unify `useFormDraftProtection` and `useLocalStorageSync` (near-duplicates).
25. Wire `ConflictResolutionModal` (already built) into daily/weekly/cycle surfaces or delete it.
26. Add composite `(user_id, status)` / `(user_id, date)` index on `launches` before it fills in production.
27. Review Google OAuth callback client-side error handling.
28. Reduce theme/challenge/badge system to a subtle togglable skin.

---

### Honest bottom line

The **infrastructure** for data safety is impressively thorough — better than most SaaS products at this scale. The **wiring** is inconsistent: the most-used write path (task creation) is unprotected, sign-out destroys the queue, and the marquee offline-recovery UI is built on a service worker that does nothing. The **product surface** is at least 2× larger than the "calm chronically-ill founder" positioning warrants, and shrinking it will simultaneously reduce data-loss surface area, hosting cost, and cognitive load for the target user.

Fix the 8 Critical items and the app is genuinely safe to sell. Everything else compounds the calm-and-cheap positioning.
