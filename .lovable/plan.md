

# PWA Install Experience Overhaul

## Overview

The audit identified real issues. Here's what we'll fix, in priority order, across 7 changes.

---

## 1. Delete dead code: `InstallApp.tsx`

`InstallApp.tsx` has no route in `App.tsx` and is never imported anywhere. It's a duplicate of `Install.tsx` causing confusion. Delete it.

## 2. Add session refresh to `QuickAddApp.tsx` (iOS fix)

`CaptureLaunchPage.tsx` has proactive session validation that prevents iOS PWA logout. `QuickAddApp.tsx` lacks this -- it just checks `useAuth()` and shows a login screen. Copy the same `supabase.auth.getSession()` + `refreshSession()` pattern into `QuickAddApp` so iOS users don't get randomly logged out.

## 3. Create global `beforeinstallprompt` hook

Currently, the install prompt is only captured on the `/install` and `/install-quick-add` pages. If Chrome fires it while the user is on the Dashboard, it's lost forever.

Create `src/hooks/useInstallPrompt.tsx`:
- Listens for `beforeinstallprompt` globally
- Stores the deferred prompt in React context
- Exposes `deferredPrompt`, `promptInstall()`, and `isInstallable`
- Wrap the app with the provider in `App.tsx`

Then update `Install.tsx` and `InstallQuickAdd.tsx` to consume from context instead of their own local listeners (removes duplicate code).

## 4. Add dismissible install banner to Dashboard

Create `src/components/install/InstallBanner.tsx`:
- Only shows on mobile (use existing `useIsMobile` hook)
- Only shows if NOT in standalone mode (use `isStandalone` from `deviceDetection.ts`)
- Dismissal stored in `localStorage` with 7-day expiry
- Links to `/install`
- Simple card: phone icon, short message, "Install" button, X to dismiss

Add it near the top of `Dashboard.tsx`.

## 5. Add "Opening in browser..." toast to Quick Add

When a user taps "Open Full App" from the Quick Add PWA, the link opens in the browser (because Quick Add's scope is `/quick-add`). This feels broken without feedback.

In `QuickAddApp.tsx`, change the "Open Full App" link to trigger a toast saying "Opening in your browser..." before navigating, so users understand the behavior.

## 6. Extract shared `DeviceInstallSteps` component

Install instructions (iOS/Android/Desktop steps) are copy-pasted across `Install.tsx`, `InstallQuickAdd.tsx`, and the now-deleted `InstallApp.tsx`. Extract a shared component:

`src/components/install/DeviceInstallSteps.tsx`
- Takes `device` and `appName` props
- Renders the correct steps for each platform
- Used by both `Install.tsx` and `InstallQuickAdd.tsx`

## 7. Fix `InstallSuccess.tsx` hardcoded state

The success page always shows both apps as "installed" regardless of reality. Update it to accept and display actual install state (passed via route state or URL params from the install flow).

---

## Technical Details

### Files to delete
- `src/pages/InstallApp.tsx`

### Files to create
- `src/hooks/useInstallPrompt.tsx` (context provider + hook)
- `src/components/install/InstallBanner.tsx` (dashboard banner)
- `src/components/install/DeviceInstallSteps.tsx` (shared steps)

### Files to modify
- `src/pages/QuickAddApp.tsx` -- add session refresh logic, add toast on "Open Full App"
- `src/pages/Dashboard.tsx` -- render InstallBanner
- `src/pages/Install.tsx` -- use shared DeviceInstallSteps, consume useInstallPrompt context
- `src/pages/InstallQuickAdd.tsx` -- use shared DeviceInstallSteps, consume useInstallPrompt context
- `src/pages/InstallSuccess.tsx` -- read actual install state instead of hardcoding
- `src/App.tsx` -- wrap with InstallPromptProvider

### No database changes needed

