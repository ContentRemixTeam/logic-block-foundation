
# Fix: Add PWA Update Notification

## Problem
Your app is a Progressive Web App (PWA) that caches files for offline use. When you publish updates, the old cached version keeps showing until you **completely close all browser tabs** of the app (not just refresh).

This is because refreshing only reloads from cache - it doesn't activate the new version.

## Solution
Add a simple "Update Available" notification that appears when a new version is ready. Users can click it to immediately get the latest version.

---

## What Users Will See

When you publish a new version, users will see a small notification at the bottom of the screen:

> **Update available** - A new version is ready. [Refresh]

Clicking "Refresh" will immediately load the new version.

---

## Implementation

### 1. Create Update Prompt Component

**New File**: `src/components/pwa/PWAUpdatePrompt.tsx`

A toast-style notification that:
- Detects when a new service worker is waiting
- Shows a "Refresh" button to activate it immediately
- Uses the existing toast/sonner styling for consistency

### 2. Add to App.tsx

Import and render the `PWAUpdatePrompt` component at the root level so it's always active.

---

## Technical Details

The fix uses `vite-plugin-pwa`'s `useRegisterSW` hook which provides:
- `needRefresh` - true when a new version is ready
- `updateServiceWorker()` - function to activate the new version immediately

This is a standard pattern recommended by the vite-plugin-pwa documentation.

---

## Workaround (Immediate)

Until this is implemented, to see your updates now:

1. **Close ALL tabs** of your app completely (not just refresh)
2. Wait 5-10 seconds
3. Open the app fresh

Or use an **incognito/private window** which doesn't have the cached version.
