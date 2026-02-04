

# Editorial Calendar Responsive Enhancement Plan

## Overview

This plan transforms the Editorial Calendar into a fully responsive experience with smart breakpoints, collapsible components, density controls, and mobile-optimized interactions. The implementation follows the existing project patterns (no zustand, using localStorage for persistence, 768px mobile breakpoint).

---

## Part 1: Responsive Week Grid with Smart Breakpoints

### Current Problem
The 7-column grid is fixed and breaks on smaller screens, becoming unusable on mobile.

### Solution
Create a responsive layout with three distinct modes:
- **Desktop (1024px+)**: Full 7-day grid
- **Tablet (768px-1023px)**: 5 days visible with horizontal scroll for weekend
- **Mobile (<768px)**: 3 days visible with horizontal swipe navigation

### File Changes

**Update: `src/components/editorial-calendar/CalendarWeekView.tsx`**
- Add responsive visibility classes using Tailwind breakpoints
- Implement horizontal scroll container with snap scrolling for tablet/mobile
- Use `useIsMobile()` hook for conditional rendering

```text
Layout Strategy:
+--------------------------------------------------+
| Desktop (lg+): grid-cols-7, all days visible     |
| Tablet (md-lg): scroll-x with 5 visible days     |  
| Mobile (<md): scroll-x with 3 visible days, snap |
+--------------------------------------------------+
```

### Implementation Details
1. Add `useIsMobile()` import
2. Wrap the grid in a `ScrollArea` for horizontal scroll on smaller screens
3. Set min-widths on day columns to ensure proper sizing
4. Add snap scroll for mobile: `scroll-snap-type-x mandatory` and `scroll-snap-align: start` on columns

---

## Part 2: Collapsible Unscheduled Pool

### Current Problem
The Unscheduled Pool takes fixed 256px width, wasting space when not actively used.

### Solution
Add collapse/expand functionality with smooth transitions and vertical text in collapsed state.

### File Changes

**Update: `src/components/editorial-calendar/UnscheduledPool.tsx`**
- Add `useState` for `isCollapsed` state
- Add collapse toggle button in header
- Render vertical text with item count when collapsed
- Animate width transition between 256px (expanded) and 48px (collapsed)
- Maintain drop zone functionality in both states

```text
Collapsed State:
+----+
|    |
| U  |
| n  |
| s  |  <- Vertical text
| c  | 
| h  |
| (5)|  <- Item count
|    |
+----+
48px width
```

---

## Part 3: Mobile Bottom Sheet for Unscheduled Items

### Current Problem
On mobile, the sidebar takes too much horizontal space and doesn't fit the mobile UX pattern.

### Solution
Replace sidebar with a floating action button (FAB) that opens a bottom sheet drawer.

### File Changes

**Update: `src/components/editorial-calendar/EditorialCalendarView.tsx`**
- Import `Sheet` components and `useIsMobile` hook
- Add state for `mobilePoolOpen`
- Conditionally render:
  - Desktop/Tablet: Regular sidebar `UnscheduledPool`
  - Mobile: FAB button + Sheet with pool content
- FAB shows badge with unscheduled count

```text
Mobile Layout:
+------------------+
|  Calendar Grid   |
|                  |
|                  |
|                  |
|                  |
|              [●] | <- FAB with badge
+------------------+
     |
     v
+------------------+
|  Unscheduled (5) | <- Bottom sheet
|  [Content cards] |
|                  |
+------------------+
```

---

## Part 4: Calendar Density Controls

### Current Problem
Fixed card sizes may not suit all users - some prefer compact views to see more, others prefer spacious views for details.

### Solution
Add density toggle (compact/comfortable/spacious) persisted to localStorage.

### File Changes

**Create: `src/hooks/useCalendarDensity.ts`**
- Simple hook using localStorage for persistence
- Returns `density` state and `setDensity` function
- Three modes: 'compact' | 'comfortable' | 'spacious'

```typescript
export type CalendarDensity = 'compact' | 'comfortable' | 'spacious';

export function useCalendarDensity() {
  const [density, setDensity] = useState<CalendarDensity>(() => {
    const stored = localStorage.getItem('calendar-density');
    return (stored as CalendarDensity) || 'comfortable';
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem('calendar-density', density);
  }, [density]);

  return { density, setDensity };
}
```

**Update: `src/components/editorial-calendar/EditorialCalendarView.tsx`**
- Add `DropdownMenu` for density selection in header
- Display current density with icon

**Update: `src/components/editorial-calendar/CalendarContentCard.tsx`**
- Use `useCalendarDensity` hook
- Apply density-based padding classes:
  - Compact: `py-1.5 px-2`
  - Comfortable: `py-2.5 px-3` (current default)
  - Spacious: `py-3 px-4`
- Show additional details (dates) in spacious mode

---

## Part 5: Quick Stats Widget

### Current Problem
Users lack at-a-glance metrics about their content calendar status.

### Solution
Add a collapsible stats bar showing total/scheduled/published/overdue counts.

### File Changes

**Create: `src/components/editorial-calendar/CalendarStats.tsx`**
- Accept `items: CalendarItem[]` prop
- Calculate stats: total, scheduled, published, overdue
- Display as compact stat cards with icons
- Only show overdue badge when > 0

```text
Stats Bar:
+--------+--------+--------+--------+
| Total  | Sched  | Pubbed | Overdue|
|   12   |   8    |   3    |   1    |
+--------+--------+--------+--------+
```

**Update: `src/components/editorial-calendar/EditorialCalendarView.tsx`**
- Add state for `statsVisible` (default: true)
- Render `CalendarStats` component above the main content
- Add collapse/expand toggle

---

## Part 6: Day Column Mobile Optimization

### File Changes

**Update: `src/components/editorial-calendar/CalendarDayColumn.tsx`**
- Add responsive min-width classes for scroll behavior
- Add snap scroll alignment: `scroll-snap-align: start`
- Adjust padding for mobile touch targets (44px minimum)

---

## Technical Notes

### Breakpoints Strategy
Following existing project convention:
- Mobile: `< 768px` (useIsMobile breakpoint)
- Tablet: `768px - 1023px`
- Desktop: `1024px+`

### No New Dependencies
- Uses existing `useIsMobile` hook
- Uses localStorage directly (no zustand needed)
- Uses existing shadcn Sheet, DropdownMenu, ScrollArea components

### Performance Considerations
- Density state persists via localStorage (fast read on mount)
- Mobile bottom sheet uses portal for proper z-index handling
- Scroll containers use CSS scroll-snap for smooth native behavior

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useCalendarDensity.ts` | Density preference persistence |
| `src/components/editorial-calendar/CalendarStats.tsx` | Stats widget component |

## Files to Modify
| File | Changes |
|------|---------|
| `src/components/editorial-calendar/CalendarWeekView.tsx` | Responsive grid with scroll on mobile/tablet |
| `src/components/editorial-calendar/CalendarDayColumn.tsx` | Snap scroll alignment, mobile sizing |
| `src/components/editorial-calendar/UnscheduledPool.tsx` | Collapse/expand functionality |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Mobile FAB, stats widget, density toggle |
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Density-based styling |

---

## Testing Checklist
- [ ] Desktop: Full 7 days visible, no horizontal scroll
- [ ] Tablet (768-1023px): 5 days visible, scroll to see weekend
- [ ] Mobile (<768px): 3 days visible, swipe navigation with snap
- [ ] Unscheduled pool collapses and expands smoothly
- [ ] Mobile FAB shows correct unscheduled count
- [ ] Bottom sheet opens and closes correctly on mobile
- [ ] Density toggle persists across page reloads
- [ ] Compact mode shrinks cards, spacious shows extra details
- [ ] Stats widget shows correct counts
- [ ] Stats widget collapses/expands
- [ ] Drop zones still work in all views
- [ ] Drag-and-drop functions on tablet

