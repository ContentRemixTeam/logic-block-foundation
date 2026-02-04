
# Fix Scrolling in Dialogs and Pop-ups Throughout the App

## Problem Summary

Users are having difficulty scrolling in pop-up dialogs, specifically the "Add Content" dialog on the Editorial Calendar. The issues include:

1. **Invisible scroll indicators** - The scrollbar is too subtle (thin gray line) and hard to see
2. **Keyboard navigation doesn't work** - Arrow keys don't scroll the content
3. **No scroll affordance** - No visual hint that more content exists below
4. **Inconsistent scrolling patterns** - Different dialogs use different approaches

## Solution Overview

We'll fix scrolling by:
1. Enhancing the `ScrollArea` component with visible scrollbars and keyboard support
2. Adding scroll shadow/fade indicators to show more content exists
3. Updating the `AddContentDialog` to use proper scrollable structure
4. Creating a reusable `ScrollableDialogContent` pattern for consistency

---

## Technical Implementation

### Part 1: Enhance ScrollArea Component

**File: `src/components/ui/scroll-area.tsx`**

Update the ScrollArea to:
- Make scrollbar more visible (thicker, higher contrast)
- Add `tabIndex={0}` to viewport for keyboard focus
- Support arrow key scrolling via `onKeyDown` handler

```text
Changes:
- ScrollAreaThumb: bg-border → bg-muted-foreground/50 (more visible)
- Scrollbar width: w-2.5 → w-3 (slightly thicker)
- Add tabIndex={0} to viewport for keyboard access
- Add focus ring for accessibility
```

### Part 2: Create Scroll Indicator Component

**New File: `src/components/ui/scroll-indicator.tsx`**

A wrapper that shows subtle gradient shadows at top/bottom when content is scrollable:

```text
Features:
- Detects scroll position (top, middle, bottom)
- Shows top shadow when scrolled down
- Shows bottom shadow when more content below
- Respects reduced-motion preferences
```

### Part 3: Fix AddContentDialog

**File: `src/components/editorial-calendar/AddContentDialog.tsx`**

Current structure (problematic):
```
DialogContent (max-h-[90vh] flex flex-col)
  └─ DialogHeader (fixed)
  └─ Tabs
      └─ TabsContent
          └─ ScrollArea (h-[400px]) ← Fixed height cuts off on smaller screens
  └─ DialogFooter (fixed)
```

Updated structure:
```
DialogContent (max-h-[90vh] flex flex-col)
  └─ DialogHeader (flex-shrink-0)
  └─ Tabs (flex-1 overflow-hidden flex flex-col)
      └─ TabsList (flex-shrink-0)
      └─ TabsContent (flex-1 overflow-hidden)
          └─ ScrollIndicator
              └─ ScrollArea (h-full) ← Dynamic height
  └─ DialogFooter (flex-shrink-0)
```

Key changes:
- Remove fixed `h-[400px]` heights
- Use flex layout with `flex-1` for dynamic sizing
- Add scroll indicators for visual affordance
- Ensure keyboard scrolling works

### Part 4: Update Other Dialogs for Consistency

Apply the same pattern to other commonly used dialogs:
- `QuickCaptureModal.tsx` (mobile drawer content)
- `ContentQuickEditDrawer.tsx`
- `PlatformConfigModal.tsx`
- `ContentTypeConfigModal.tsx`

### Part 5: Add Keyboard Scroll Support to ScrollArea

**File: `src/components/ui/scroll-area.tsx`**

Add keyboard event handler to support arrow key scrolling:

```text
- ArrowDown: Scroll down by 40px
- ArrowUp: Scroll up by 40px
- PageDown: Scroll down by viewport height
- PageUp: Scroll up by viewport height
- Home: Scroll to top
- End: Scroll to bottom
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ui/scroll-area.tsx` | Update | Enhanced visibility, keyboard support, focus states |
| `src/components/ui/scroll-indicator.tsx` | **New** | Gradient shadows showing scroll position |
| `src/components/editorial-calendar/AddContentDialog.tsx` | Update | Fix layout, add scroll indicators |
| `src/components/editorial-calendar/PlatformConfigModal.tsx` | Update | Apply consistent scroll pattern |
| `src/components/editorial-calendar/ContentTypeConfigModal.tsx` | Update | Apply consistent scroll pattern |
| `src/components/quick-capture/QuickCaptureModal.tsx` | Update | Apply scroll indicators to mobile drawer |

---

## Visual Design

### Before (Current Issues)
```text
┌─────────────────────────────────┐
│ Add Content              [X]    │
├─────────────────────────────────┤
│ [ Create New ] [ From Vault ]   │
├─────────────────────────────────┤
│ Title: ________________         │
│ Platform: [Select]              │
│ Content Type: [Select]          │
│ Create Date: [Pick]             │
│ Publish Date: [Pick]            │ ← Content cut off, no scroll indicator
│                                 │
│ ??? (can't see there's more) ???│
└─────────────────────────────────┘
```

### After (Fixed)
```text
┌─────────────────────────────────┐
│ Add Content              [X]    │
├─────────────────────────────────┤
│ [ Create New ] [ From Vault ]   │
├─────────────────────────────────┤
│ Title: ________________         │
│ Platform: [Select]              │
│ Content Type: [Select]          │
│ Create Date: [Pick]             │
│ Publish Date: [Pick]            │
│ ░░░░░ gradient fade ░░░░░░░░░░░ │ ← Visual hint: more content below
│                               ▓ │ ← Visible scrollbar
└─────────────────────────────────┘
  ↑↓ Arrow keys work when focused
```

---

## Testing Checklist

After implementation:
- [ ] Open Add Content dialog on Editorial Calendar
- [ ] Verify scrollbar is clearly visible
- [ ] Click inside the scrollable area, then use arrow keys to scroll
- [ ] Verify gradient shadow appears at bottom when more content exists
- [ ] Verify gradient shadow appears at top when scrolled down
- [ ] Test on mobile - verify drawer scrolling works smoothly
- [ ] Test in Quick Capture modal on mobile
- [ ] Verify Page Up/Page Down keys work for large jumps

---

## Accessibility Improvements

1. **Keyboard Navigation**: Arrow keys, Page Up/Down, Home/End all work
2. **Focus Indicators**: Clear focus ring when scroll area is focused
3. **Screen Readers**: Scroll area has proper role and focus management
4. **Reduced Motion**: Scroll shadows respect `prefers-reduced-motion`
