
# Dual PWA Apps Plan

## Overview

You want two separate installable PWA apps from the same website:
1. **Boss Planner (Full App)** - Complete planning experience with dashboard, weekly planner, tasks, etc.
2. **Quick Add (Lightweight)** - Fast capture-only app for tasks, ideas, expenses, and income

This is achievable using the PWA `id` and `scope` properties with different manifests for each app.

---

## How It Works

PWA apps are identified by their unique `id` in the manifest. By creating two separate manifests with different `id` values, users can install both apps on their device:

```text
┌─────────────────────────────────────────────────────────┐
│  Same Website                                           │
│                                                         │
│  ┌─────────────────┐      ┌─────────────────┐          │
│  │ /manifest.json  │      │ /quick-add-     │          │
│  │                 │      │  manifest.json  │          │
│  │ id: full-app    │      │                 │          │
│  │ start: /dash    │      │ id: quick-add   │          │
│  │ scope: /        │      │ start: /quick   │          │
│  └────────┬────────┘      │ scope: /quick   │          │
│           │               └────────┬────────┘          │
│           ▼                        ▼                   │
│  ┌─────────────────┐      ┌─────────────────┐          │
│  │  Boss Planner   │      │   Quick Add     │          │
│  │  (Full App)     │      │   (Capture)     │          │
│  └─────────────────┘      └─────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Create New Manifest: `public/quick-add-manifest.json`

A lightweight manifest specifically for the Quick Add app:

```json
{
  "id": "boss-planner-quick-add",
  "name": "Quick Add",
  "short_name": "Quick Add",
  "description": "Quickly capture tasks, ideas, expenses and income",
  "start_url": "/quick-add",
  "scope": "/quick-add",
  "display": "standalone",
  "background_color": "#0077b6",
  "theme_color": "#0077b6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/quick-add-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/quick-add-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/quick-add-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["productivity", "finance"]
}
```

### 2. Update Main Manifest: `public/manifest.json`

Update to use the full app branding and add unique `id`:

```json
{
  "id": "boss-planner-full",
  "name": "Boss Planner",
  "short_name": "Boss Planner",
  "description": "The Becoming Boss Mastermind. Plan your 90 days with clarity and focus.",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  ...existing icons and settings...
}
```

### 3. Create New Route: `/quick-add`

A dedicated page at `src/pages/QuickAddApp.tsx`:

- Minimal, focused UI
- Auto-opens capture modal on load
- Supports: Tasks, Ideas, Expenses, Income
- Type switcher at top (4 quick buttons)
- No navigation to full app (stays focused)
- "Go to full app" link at bottom

```text
┌───────────────────────────────┐
│     Quick Add                 │
├───────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌───┐│
│ │Task │ │Idea │ │$Out │ │$In││ (Type tabs)
│ └─────┘ └─────┘ └─────┘ └───┘│
├───────────────────────────────┤
│                               │
│  ┌─────────────────────────┐  │
│  │ What's on your mind?    │  │ (Input)
│  └─────────────────────────┘  │
│                               │
│  [#tag] [📅 Today] [⏱ 30m]  │ (Quick chips)
│                               │
│  ┌─────────────────────────┐  │
│  │       Add Task          │  │ (Big button)
│  └─────────────────────────┘  │
│                               │
│  Saved: 3 this session       │
│                               │
│  ── or ──                     │
│  Open Full App →              │
└───────────────────────────────┘
```

### 4. HTML Head Management

Create component to dynamically inject the correct manifest based on route:

**File: `src/components/pwa/ManifestSwitcher.tsx`**

```tsx
// Switches manifest link based on current route
// /quick-add → /quick-add-manifest.json
// everywhere else → /manifest.json
```

### 5. Update Vite PWA Config

The main VitePWA config stays focused on the full app. The Quick Add manifest is served as a static file.

### 6. Create Quick Add Install Page: `/install-quick-add`

A dedicated installation page (`src/pages/InstallQuickAdd.tsx`) for the Quick Add app:

- Explains the lightweight experience
- Links manifest properly
- Device-specific instructions (iOS Safari, Android Chrome)
- Shows benefits: "Capture in 3 seconds"

### 7. Update Settings & Install Pages

Add section showing both apps:

```text
┌─────────────────────────────────────────┐
│ Install Apps                            │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📱 Boss Planner (Full App)         │ │
│ │ Complete planning experience        │ │
│ │ [Install]                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚡ Quick Add                        │ │
│ │ Fast capture for tasks, ideas,     │ │
│ │ expenses & income                   │ │
│ │ [Install]                          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `public/quick-add-manifest.json` | CREATE | New manifest for Quick Add PWA |
| `public/manifest.json` | MODIFY | Add `id` field, update to full app branding |
| `src/pages/QuickAddApp.tsx` | CREATE | Minimal capture-only app page |
| `src/pages/InstallQuickAdd.tsx` | CREATE | Installation guide for Quick Add |
| `src/components/pwa/ManifestSwitcher.tsx` | CREATE | Dynamic manifest injection |
| `src/App.tsx` | MODIFY | Add routes for /quick-add and /install-quick-add |
| `src/pages/InstallApp.tsx` | MODIFY | Add links to both apps |
| `src/pages/Settings.tsx` | MODIFY | Show both install options |
| `vite.config.ts` | MODIFY | Update main PWA manifest |
| `index.html` | MODIFY | Remove static manifest link (handled by ManifestSwitcher) |

---

## Icon Requirements

For the Quick Add app, you'll need these icons (can use the lightning bolt theme):

- `/public/quick-add-192x192.png` (192x192)
- `/public/quick-add-512x512.png` (512x512)
- `/public/quick-add-maskable-512x512.png` (512x512 with padding)

These should have a distinct look from the main app icon so users can tell them apart on their home screen.

---

## User Experience

### Installing Both Apps

1. User visits `/install` → sees both app options
2. Installs "Boss Planner" → full app from home screen
3. Installs "Quick Add" → fast capture from home screen

### Using Quick Add App

1. User taps Quick Add on home screen
2. App opens directly to capture screen
3. User types task/idea or enters expense/income
4. Taps Add → saved instantly
5. Counter shows "Saved 1 this session"
6. Ready for next capture immediately

### Differences from Full App

| Feature | Full App | Quick Add |
|---------|----------|-----------|
| Dashboard | ✓ | ✗ |
| Weekly Planner | ✓ | ✗ |
| Task List | ✓ | ✗ |
| Capture Tasks | ✓ | ✓ |
| Capture Ideas | ✓ | ✓ |
| Log Expenses | ✓ | ✓ |
| Log Income | ✓ | ✓ |
| Navigation | Full sidebar | "Open Full App" link |

---

## Technical Notes

1. **Manifest `id` field**: Critical for allowing two separate app installations from the same domain
2. **Manifest `scope`**: The Quick Add app scope is `/quick-add` to keep it contained
3. **iOS Safari**: Both apps can be installed via "Add to Home Screen" - each will use its own manifest
4. **Android Chrome**: `beforeinstallprompt` needs to be triggered from the correct page for each app
5. **Service Worker**: Shared between both apps - they use the same cached assets
6. **Authentication**: Both apps share the same login session

---

## Implementation Order

1. **Manifests**: Create Quick Add manifest, update main manifest with `id`
2. **Routes**: Create QuickAddApp.tsx and InstallQuickAdd.tsx pages
3. **ManifestSwitcher**: Dynamic manifest injection component
4. **Update Install Pages**: Show both app options
5. **Update Settings**: Add dual install section
6. **Icons**: Add Quick Add specific icons (can be done in parallel)
