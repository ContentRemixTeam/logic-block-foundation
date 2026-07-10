# Comprehensive Audit — Boss Planner → "Low Battery Business Planner"

Read-only report. No code changes. Findings backed by file paths, line numbers, and SQL queries against the live database. (Full version saved at `.lovable/plan.md`.)

---

## 1. Data Integrity & Save Architecture — Risk: **HIGH**

**How saving actually works:**

```text
Component state
  → React Query mutation → supabase.functions.invoke('manage-task' / 'save-*')   [primary]
  → useLocalStorageSync / useFormDraftProtection → localStorage + IDB('drafts')  [draft net]
  → usePeriodicBackup → IDB('backups') every 5 min                               [snapshot]
  → useBeforeUnload → emergencySave → sendBeacon + localStorage + IDB            [crash net]
  → useOfflineSync + offlineDb('mutationQueue') → edge fns on reconnect          [offline queue — partial]
```

One IndexedDB (`boss-planner-offline`, v2, 9 stores) via `src/lib/offlineDb.ts`. Infrastructure itself is well-engineered. The **wiring** is the problem.

**4 overlapping "you're offline / have unsynced data" UIs** all read the same `useOfflineSync()` state and can render simultaneously: `OfflineBanner` (Layout.tsx:71), `UnsyncedDataBanner` (Layout.tsx:72), `OfflineIndicator` badge (Layout.tsx:124), `OfflineDetector` toasts. Plus 3 separate "we found unsaved data" UIs (`DraftRestoreBanner`, `DataRecoveredPopup`, `ConflictResolutionModal` wired only into 2 review pages).

**Concrete data-loss holes (worst first):**

1. **Sign-out unconditionally destroys the offline queue.** `useAuth.tsx:66-96` → `clearAllOfflineData()` (`offlineDb.ts:466`) wipes `mutationQueue`/`drafts`/`backups`/`emergencySaves` with no `getPendingCount()` check. Sign-out or session-expiry auto-signout with pending writes = silent loss.
2. **Task creation has zero offline resilience.** `useTasks.tsx:389-458` — `onError` (438) only toasts. `useOfflineTasks.tsx` and `useOfflineSafeWrite.ts` are fully built but **dead code**. `useResilientTaskMutation` is used only by `CycleWizard`.
3. **Debounce-unmount race in `useServerSync.ts`.** Cleanup (206-215) clears the 2s timer but doesn't flush. ~2s loss window on every navigation during autosave.
4. **Mutation queue fixed table whitelist** (`offlineSync.ts:59-96`). Unlisted tables → `default:` branch → `console.warn` + `return false`; mutation stays `pending` forever.
5. **`emergencySave` recovery only reads localStorage.** IDB `emergencySaves` and server beacon are write-only (`getEmergencySaves()` in offlineDb.ts:714 has no callers).
6. **`emergencySave` beacon fails silently** if Supabase localStorage key format changes or token expired (`emergencySave.ts:36-55`).
7. **"Discard Changes"** in `UnsyncedDataRecovery.tsx:53-65` permanently deletes with only a toast, no undo.
8. **Two parallel Sheets backup queues.** `sheetsPrimaryTaskService.ts` (fully built, zero callers, live landmine if `plannerSheetRollout.ts` flag flips) and `shadowTaskSync.ts` (fire-and-forget after Supabase success). Neither is cross-referenced with `offlineDb.mutationQueue`. Retry only from Settings, not on reconnect.
9. **Cross-tab conflict is last-write-wins by timestamp** (`useLocalStorageSync.ts:96-117`); only 2 pages route into a real merge UI.

**Rating: HIGH.** Not Critical only because the infrastructure is sound and daily/weekly/cycle drafts are actually protected.

---

## 2. Database & Security — Overall: **Solid**

Universal RLS coverage, `auth.uid()` scoping, no `anon` grants, all 26 SECURITY DEFINER functions pin `search_path`. **Zero Critical findings.**

- **High:** `error_logs.user_id` nullable + two overlapping INSERT policies both allow `user_id IS NULL` (orphan PII rows nobody can delete). Duplicate policies on `ai_connection_keys`, `user_api_keys`, `error_logs`, `admin_users`.
- **Medium:** `admin_users.user_id` nullable with email-fallback matching; blanket `USING (true)` SELECT on `feature_flags`/`feature_releases`/`wizard_templates`; public INSERT on `workshop_testimonials` with no rate limit; ~55 tables missing `created_at`/`updated_at` (including `error_logs`, `time_entries`, `sales_log`, `task_schedule_history`).
- **Low:** **44 tables have 0 rows** across all users (`launches`, `evidence_bank`, `content_challenges`, `flash_sales`, `summits`, `webinars`, courses tables, `revenue_sprints`, `email_campaigns`, `feature_requests`, `financial_transactions`, +30 more) — data-layer confirmation of the feature bloat in §4. `launches` needs a `(user_id, status/date)` composite index before it fills.

Indexes on the hot tables (tasks, daily_plans, weekly_plans, cycles_90_day, content_items, journal_pages, habit_logs, evidence_bank) are strong.

---

## 3. Auth — Risk: **HIGH** (mid-edit safety)

- `/auth` and `/login-help` render **outside** `PageSuspense`/`ErrorBoundary` (App.tsx:271-272). Login-screen crash = true white screen.
- **No unsaved-changes guard between `signOut()` and any open form** (compounds §1 hole #1).
- **Session expiry mid-edit** — `onAuthStateChange` triggers `queryClient.clear()` (useAuth.tsx:43-46) with no warning; open pages lose their cache under active editing.
- Password reset (`Auth.tsx` `isForgotPassword` mode) — validation is skipped in that mode (reasonable) but the full submit/error path wasn't sampled.
- Google OAuth via edge functions (`google-oauth-start`, `google-oauth-callback`); no client-side callback error handling visible.

---

## 4. Feature Inventory & Bloat

~85 routes across essentially three different products bolted together.

**KEEP (core value for target user):** Daily/Weekly/Monthly/Quarterly planning + 90-day cycles; tasks, brain dump, notes, wins, open loops; financial tracker (simplified); one lightweight onboarding + PWA install; one consolidated Reflections surface.

**SIMPLIFY:**
- **Mindset sprawl** — 5 overlapping pages (`Mindset`, `UsefulThoughts`, `BeliefBuilder`, `IdentityAnchors`, `SelfCoaching` + `Evidence`) → merge into one Reflections feature.
- **Content planner + editorial calendar + AI copywriting** = **59 files** (`ai-copywriting/` alone = 22). Keep calendar; reduce AI copy to a single optional assist button or cut.
- **Google integrations** — keep Calendar if lifetime buyers expect it, cut Sheets sync unless demanded. OAuth-token maintenance is a real recurring cost for a low-priced lifetime product.
- **Themes/seasonal/challenges/badges** — keep visual skin; cut challenge/streak/celebration mechanics (pressure ≠ calm).
- **Focus/pomodoro** — keep simple timer, cut arcade/quest/pet layer (`arcade/` 12 + `quest/` 7 + `timer/` 3).
- **Wizards** — `src/components/wizards/` is **152 files**, largest folder in the repo. Kill Summit / Flash Sale / Content Challenge / Money Momentum / Webinar as separate wizards; keep one generic template.
- **Habits/evidence/beliefs/identity** — consolidate.

**CUT:**
- `src/pages/Index.tsx` — Vite scaffold, not routed.
- `LaunchWizardPage` v1 at `/wizards/launch-v1` — v2 exists.
- **Mastermind hub, roster import, office hours, coaching log/prep, money-moves-sprint, prizes/community panels, podcast widget** (~20 files) — bespoke group-coaching infrastructure; highest mismatch with a self-serve lifetime-deal rebrand.
- **Courses / study system** (unless the rebrand ships a course).
- **Arcade / quest / gamification** — contradicts "calm."
- **Dead offline hooks** — `useOfflineTasks.tsx`, `useOfflineSafeWrite.ts` (never imported).
- **`SheetsPrimaryTaskService`** — zero callers, landmine.

**Net:** cutting mastermind + wizards + AI copy + arcade + courses removes 200+ files.

---

## 5. Error Handling & Stability — Risk: **HIGH**

- Route-scoped `ErrorBoundary` via `PageSuspense` is done well (App.tsx:239-247). **Exception: `/auth` and `/login-help` unprotected.**
- ~1,537 catch blocks; no fully empty ones, but most log to console with **no user toast**.
- **Top 10 silent-catch spots to fix:** `useMonthlyTheme.ts:76-77` (explicit "silent" comment), `WeeklyReflection.tsx:112-114`, `WeeklyReflection.tsx:242-244`, `UsefulThoughts.tsx:64-97`, `Tasks.tsx:265-267` (recurring generation silently stops), `useCrossTabSync.ts:165-234` (4 spots), `emergencySave.ts:138-180` (last-resort layer, silent), `pdfGenerator.ts:589-596`, `DailyPageSettings.tsx:218-220`, `useLocalStorageSync.ts:188-190` (corrupted local data silently discarded).

---

## 6. Performance & Cost — Risk: **MEDIUM**

- Heavy deps: `framer-motion`, `recharts`, `jspdf` + `html2canvas` (expensive), `@sentry/react` v10, `embla-carousel`, three `@dnd-kit/*`. AI SDKs kept server-side (right pattern).
- Realtime: 4 `.channel()` calls; verify `useTasks` unsubscribes on unmount.
- ~140 edge functions, narrow CRUD-per-entity, cold-start prone. `google-token-keepalive` suggests a cron — verify cost.
- 107 `select('*')` occurrences; watch `useTasks`, `useUserSettingsRow`, `useArcade` (mounted globally), `useAICopywriting` (6× in one file).
- React Query config (App.tsx:168-187) is sensible.

---

## 7. Mobile, PWA & Accessibility — Risk: **HIGH (PWA reality vs. claim)**

- **`public/sw.js` is a self-destroying kill-switch worker** — deletes all caches and unregisters itself on activate. **The PWA has zero offline caching.** IDB fallbacks in `emergencySave`/`useLocalStorageSync` are the only offline mechanism, decoupled from the SW. Any marketing claim of "offline mode" is false today.
- Manifest well-formed; `ManifestSwitcher` handles dual planner/quick-add setup correctly; install flow (`src/components/install/*`, 9 files) is thorough.
- `MobileBottomNav`: `h-16`, `min-w-[64px]`, `touch-manipulation` — good.
- **A11y gaps:** 163 hardcoded color utilities in `.tsx` (breaks theming/contrast); 186 `size="icon"` buttons — majority lack `aria-label`; 3 `<img>` tags missing `alt`.

---

## 8. Launch-Readiness Priorities

### (A) Critical — must fix before selling "your data is safe"
1. Guard sign-out against pending offline data (`useAuth.tsx:66`).
2. Route `useTasks.createTask` through the offline mutation queue (`useTasks.tsx:389`).
3. Flush pending debounced saves on unmount in `useServerSync` (line 206).
4. Wrap `/auth` + `/login-help` in `ErrorBoundary` (App.tsx:271-272).
5. Replace the kill-switch SW with real offline shell (via `vite-plugin-pwa`, already installed) OR remove all "offline" language from marketing (`public/sw.js`).
6. Delete `SheetsPrimaryTaskService` (dead landmine).
7. Tighten `error_logs` RLS + dedupe overlapping policies on 4 tables.
8. Wire user-visible errors into the top-10 silent catches, especially `emergencySave`.

### (B) High-value
9. Delete dead code: `src/pages/Index.tsx`, `LaunchWizardPage` v1, `useOfflineTasks.tsx`, `useOfflineSafeWrite.ts`.
10. Consolidate 4 overlapping offline/unsynced UI surfaces into 1.
11. Cut mastermind/office-hours/coaching-log/money-moves-sprint (~20 files, ~15 empty tables).
12. Reduce `wizards/` (152 files) to one generic Launch/Project template wizard.
13. Merge 5 mindset pages into 1 Reflections surface.
14. Cut arcade/quest/gamification.
15. Add `aria-label` to icon-only buttons; replace 163 hardcoded colors with semantic tokens.
16. Add `created_at` to `error_logs`, `time_entries`, `sales_log`, `task_schedule_history`.
17. Backfill `admin_users.user_id` and drop the email-fallback policy branch.
18. Verify `useTasks` realtime channel unsubscribes on unmount.
19. Audit `useAICopywriting`'s 6× `select('*')`.
20. Replace `jspdf + html2canvas` with a lighter server-side PDF path if PDF is kept.

### (C) Nice-to-have
21. Run `depcheck` to remove unused deps.
22. Drop v1 launch wizard code once rollout complete.
23. Consolidate two Sheets pending-write queues + `offlineDb.mutationQueue` into one source of truth.
24. Unify near-duplicate `useFormDraftProtection` + `useLocalStorageSync`.
25. Wire `ConflictResolutionModal` into daily/weekly/cycle surfaces or delete.
26. Add composite `(user_id, status)` / `(user_id, date)` index on `launches`.
27. Review Google OAuth callback client-side error handling.
28. Reduce theme/challenge/badge system to a subtle togglable skin.

---

### Bottom line

**Infrastructure** for data safety is impressively thorough — better than most SaaS at this scale. **Wiring** is inconsistent: the most-used write path (task creation) is unprotected, sign-out destroys the queue, and the marquee offline-recovery UI sits on a service worker that does nothing. **Product surface** is at least 2× larger than the "calm chronically-ill founder" positioning warrants — shrinking it reduces data-loss surface area, hosting cost, and user cognitive load simultaneously.

Fix the 8 Critical items and the app is genuinely safe to sell.
