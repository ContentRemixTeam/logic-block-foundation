
# Editorial Calendar Visual Redesign

## Overview
Transform the Editorial Calendar from a functional but flat interface into a polished, professional, and delightful experience with better visual hierarchy, hover states, and personality.

## Current State vs Target

| Component | Current | After |
|-----------|---------|-------|
| CalendarContentCard | Flat, minimal shadow, basic status dots | Elevated with hover animations, status badges, quick actions |
| CalendarDayColumn | Minimal headers, plain lane labels | Prominent headers with item counts, icons in lanes |
| EditorialCalendarView | Cramped header, basic spacing | Spacious layout, better hierarchy |
| UnscheduledPool | Basic empty state | Encouraging empty state with animation |

---

## Part 1: CalendarContentCard Redesign

### File: `src/components/editorial-calendar/CalendarContentCard.tsx`

**Changes:**

1. **Add elevation and hover states**
   - Base shadow with `shadow-sm`
   - Hover: lift with `hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5`
   - Active/dragging: compress with `active:scale-[0.98]`
   - Smooth transitions with `transition-all duration-200`

2. **Status-based left border**
   - Add colored left border based on item status
   - Published: green, Scheduled: purple, Draft: gray, In-progress: blue

3. **Improved typography**
   - Title with `line-clamp-1` for cleaner truncation
   - Slightly heavier font weight

4. **Status badges instead of dots**
   - Replace simple colored dots with descriptive badges
   - Include emoji indicators for quick scanning

5. **Quick actions on hover**
   - Add Edit and More buttons that appear on hover
   - Buttons stop event propagation to prevent card click

**New Helper Functions:**
- `getStatusBadgeClass(status)` - Returns badge styling based on status
- `getStatusIcon(status)` - Returns emoji for status
- `getStatusBorderClass(status)` - Returns border color class

**Additional imports:** `Edit`, `MoreVertical` from lucide-react

---

## Part 2: CalendarDayColumn Enhancement

### File: `src/components/editorial-calendar/CalendarDayColumn.tsx`

**Changes:**

1. **Redesigned day header**
   - Larger, bolder day numbers
   - Today indicator with background circle
   - Item count badge showing total items for the day
   - Better visual hierarchy between day name and number

2. **Enhanced lane labels with icons**
   - Add `Palette` icon for Create lane
   - Add `Send` icon for Publish lane
   - Item count pill next to label
   - Sticky positioning for scroll visibility

3. **Improved empty states**
   - Icon + descriptive text instead of just "Drop here"
   - Different messaging for Create vs Publish lanes
   - Animated pulse effect when dragging over

4. **Drop zone active state**
   - Dedicated visual when actively hovering with drag item
   - Pulsing animation to indicate drop readiness

**Additional imports:** `Palette`, `Send`, `CheckCircle2` from lucide-react, `Badge` from UI

---

## Part 3: EditorialCalendarView Header Polish

### File: `src/components/editorial-calendar/EditorialCalendarView.tsx`

**Changes:**

1. **Better header spacing**
   - Increased padding (`py-4`)
   - Background for visual separation
   - Two-row layout: navigation row + filter row

2. **Enhanced week navigation**
   - Grouped navigation buttons with border
   - Larger, more prominent week range display
   - Year shown separately in muted style

3. **Week range typography**
   - Larger font size for date range
   - Year in smaller, muted text below
   - Icon separator between navigation and display

---

## Part 4: PlatformFilterBar Enhancement

### File: `src/components/editorial-calendar/PlatformFilterBar.tsx`

**Changes:**

1. **Larger, more clickable badges**
   - Increased padding for easier touch/click
   - More visible selected state ring

2. **Better hover transitions**
   - Smooth opacity and scale transitions

---

## Part 5: UnscheduledPool Empty State

### File: `src/components/editorial-calendar/UnscheduledPool.tsx`

**Changes:**

1. **Encouraging empty state when all scheduled**
   - Celebratory message and icon
   - Instructions for how to use the pool

2. **Drop zone active state**
   - Visual feedback when dragging over
   - Clear "Drop here" indication

---

## Files to Modify

| File | Scope |
|------|-------|
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Major - new styling, helpers, hover states |
| `src/components/editorial-calendar/CalendarDayColumn.tsx` | Major - header redesign, empty states |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Moderate - header spacing |
| `src/components/editorial-calendar/PlatformFilterBar.tsx` | Minor - badge sizing |
| `src/components/editorial-calendar/UnscheduledPool.tsx` | Moderate - empty state improvements |

---

## Technical Details

### Status Helper Functions
```text
┌────────────────────────────────────────────────────────────┐
│ getStatusBadgeClass(status)                                │
├────────────────────────────────────────────────────────────┤
│ published  → bg-green-500/10 text-green-700               │
│ scheduled  → bg-purple-500/10 text-purple-700             │
│ draft      → bg-gray-500/10 text-gray-600                 │
│ in-progress→ bg-blue-500/10 text-blue-700                 │
│ completed  → bg-green-500/10 text-green-700               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ getStatusIcon(status)                                      │
├────────────────────────────────────────────────────────────┤
│ published  → CheckCircle (lucide icon)                    │
│ scheduled  → Clock icon                                   │
│ draft      → Edit icon                                    │
│ in-progress→ Zap icon                                     │
│ completed  → CheckCircle icon                             │
└────────────────────────────────────────────────────────────┘
```

### Animation Timing
- Hover scale: 200ms duration
- Shadow transitions: 200ms
- Drop zone pulse: CSS animation

---

## Visual Impact Summary

**Before:**
- Flat cards with no depth
- Basic status indicators
- Cramped header
- Plain "Drop here" empty states

**After:**
- Elevated cards with smooth hover lift
- Color-coded status badges with icons
- Spacious, scannable header
- Delightful empty states with personality

**No Breaking Changes:**
- All existing functionality preserved
- Drag-and-drop works identically
- No database changes required
- Purely visual enhancements

---

## Testing Checklist

- [ ] Cards have visible shadow on rest state
- [ ] Hover lifts cards smoothly with scale
- [ ] Status badges show correct colors per status
- [ ] Quick action buttons appear on hover
- [ ] Left border uses platform color
- [ ] Compact mode cards look correct
- [ ] Today has clear highlight circle
- [ ] Item counts appear on days with content
- [ ] Lane labels have icons
- [ ] Empty lanes show helpful messages
- [ ] Drop zones pulse when dragging over
- [ ] Header is well-spaced and scannable
- [ ] Platform filter badges are easy to click
