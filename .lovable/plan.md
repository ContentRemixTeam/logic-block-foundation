
# Editorial Calendar UX Improvements

## Overview

This plan addresses four key usability issues in the Editorial Calendar:
- Adding easy delete functionality
- Fixing scroll/keyboard navigation in the Add Content dialog
- Ensuring Ideas integration works correctly
- Improving status visibility on content cards

---

## Changes Summary

### 1. Add Delete Functionality

**Problem**: No way to delete content from the calendar. Users must go to Content Vault to delete items.

**Solution**: Add delete button to the quick edit drawer and optionally to content cards.

**Files to modify**:
- `src/components/editorial-calendar/ContentQuickEditDrawer.tsx` - Add delete button with confirmation
- `src/hooks/useEditorialCalendar.ts` - Add `deleteItem` mutation

**Implementation**:
```text
+----------------------------------+
|     Edit Content Schedule        |
+----------------------------------+
| Title: [My Post Title]           |
| Platform: Instagram              |
| Create Date: Feb 5               |
| Publish Date: Feb 7              |
|                                  |
| [Cancel]  [Delete]  [Save]       |
+----------------------------------+
```

- Delete button will be red/destructive styling
- Click triggers confirmation dialog: "Delete this content? This cannot be undone."
- For recurring items, ask: "Delete just this one or all occurrences?"
- On confirm, deletes from `content_items` table
- Refreshes calendar queries after deletion

---

### 2. Fix Scroll and Keyboard Navigation in Add Content Dialog

**Problem**: Down arrow key doesn't work to scroll the dialog content. The ScrollArea isn't receiving keyboard focus properly.

**Root Cause**: The `DialogContent` wraps everything, but the `ScrollArea` inside the `TabsContent` isn't getting focus. The `enableKeyboardScroll` feature requires the ScrollArea viewport to be focused.

**Solution**:
- Wrap dialog content properly with explicit focus management
- Add `autoFocus` to make the scroll area focusable when switching tabs
- Increase touch/scroll area padding for better mobile experience
- Add explicit max-height constraints to ensure scrolling activates

**Files to modify**:
- `src/components/editorial-calendar/AddContentDialog.tsx` - Fix scroll focus handling
- `src/components/ui/scroll-area.tsx` - Verify keyboard scroll implementation

**Key changes**:
```typescript
// In AddContentDialog.tsx - ensure ScrollArea gets focus
<ScrollArea 
  className="h-full -mx-2 px-2"
  enableKeyboardScroll={true}
  tabIndex={0}  // Make explicitly focusable
>
```

Also add an effect to auto-focus the scroll area when tab changes:
```typescript
useEffect(() => {
  // Focus the scroll viewport when tab changes
  const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
  if (viewport instanceof HTMLElement) {
    viewport.focus();
  }
}, [mode]);
```

---

### 3. Verify Ideas Integration Works

**Current State**: The "From Ideas" tab already exists in `AddContentDialog.tsx`. It:
- Fetches from `ideas_db` table using `useIdeasForContent` hook
- Allows searching ideas
- Prefills title when an idea is selected

**Potential Issues to Check**:
1. The hook fetches from `ideas_db` but column is `idea` not `content`
2. Ideas might not be loading due to query key or permission issues
3. Tab might not be obvious to users

**Verification**:
- Ensure the "From Ideas" tab is visible and clearly labeled
- Verify the query is fetching correctly from `ideas_db`
- Add better empty state messaging if no ideas exist
- Add a link to the Ideas page if the user hasn't captured any ideas yet

**Files to modify**:
- `src/hooks/useIdeasForContent.ts` - Ensure correct column mapping
- `src/components/editorial-calendar/AddContentDialog.tsx` - Improve empty state

---

### 4. Improve Status Visibility

**Current State**: Status badges exist on cards but are:
- Hidden in compact density mode
- Only show icon in comfortable mode
- Show full label only in spacious mode
- Draft status is hidden entirely

**Solution**: Make status more visible across all density modes:
- Always show a small status indicator dot (colored)
- Add status filter option in the header
- Add status column to distinguish cards more clearly

**Visual Enhancement**:
```text
Before (compact mode):
+----------------------------+
| 📄 My Post Title     [IG]  |
+----------------------------+

After (compact mode):
+----------------------------+
| 📄 My Post Title  🟢  [IG] |
+----------------------------+
         ↑ Status dot
```

**Color coding**:
- 🔵 Not Started / Draft
- 🟡 In Progress
- 🟣 Scheduled
- 🟢 Published/Done

**Files to modify**:
- `src/components/editorial-calendar/CalendarContentCard.tsx` - Add status dot in all modes
- Optionally add status filter to header

---

## Implementation Order

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | Delete functionality | Medium |
| 2 | Fix scroll/keyboard | Low |
| 3 | Improve status visibility | Low |
| 4 | Verify ideas integration | Low |

---

## Database Changes

**None required** - All tables and columns already exist.

---

## Testing Checklist

After implementation:
- [ ] Can delete content from quick edit drawer
- [ ] Delete confirmation appears before deleting
- [ ] Down arrow scrolls the Add Content dialog
- [ ] Ideas tab shows saved ideas
- [ ] Clicking an idea prefills the title
- [ ] Status dots visible on all cards
- [ ] Calendar refreshes after delete
