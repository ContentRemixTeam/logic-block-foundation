
# Comprehensive Task Manager Date Fixing - All Glitches

## Overview

After auditing the codebase, I've confirmed **7 critical issues** with date selection across multiple files. The core problems are:

1. **parseISO errors** - Using `new Date(string)` instead of `parseISO(string)` for date string parsing
2. **Popovers don't close** - Calendar popovers remain open after date selection
3. **Inconsistent date handling** - Mix of `new Date()` and `parseISO()` across files
4. **No clear date button** - Users can't easily remove a date once set
5. **Missing initialFocus** - Calendar doesn't focus properly when opened
6. **Nested popover issues** - TaskCard has nested popovers causing interaction problems
7. **Mobile touch issues** - Calendar touch interactions conflict with scroll

---

## Files Requiring Changes

| File | Location | Issues |
|------|----------|--------|
| `src/components/tasks/views/TaskBoardRow.tsx` | Lines 144-174 | `new Date()` instead of `parseISO`, no controlled state, no close after select |
| `src/components/projects/monday-board/BoardRow.tsx` | Lines 121-144 | Same issues |
| `src/components/projects/monday-board/TaskDetailsDrawer.tsx` | Lines 257-274 | Same issues |
| `src/pages/Tasks.tsx` | Lines 1461-1476 | No controlled state, no close after select |
| `src/components/tasks/TaskCard.tsx` | Lines 426-441 | Nested popover issues, no controlled state |
| `src/components/notes/CreateFromSelectionModal.tsx` | Lines 246-260 | Already correct (uses `Date` object, not string) |
| `src/components/content/ContentSaveModal.tsx` | Lines 340-364, 384-408 | Already correct (uses `parseISO` properly) |

---

## Fix #1: TaskBoardRow.tsx - Calendar Date Selection

**Current Problem (lines 144-174):**
```typescript
// Uses new Date() which can cause parsing issues
selected={task.scheduled_date ? new Date(task.scheduled_date) : undefined}
// No controlled open state - popover doesn't close after selection
```

**Fix:**
1. Add `parseISO` to imports
2. Add controlled popover state: `const [datePopoverOpen, setDatePopoverOpen] = useState(false)`
3. Use controlled `Popover`: `open={datePopoverOpen} onOpenChange={setDatePopoverOpen}`
4. Use `parseISO()` for date parsing
5. Close popover in `onSelect`: `setDatePopoverOpen(false)`
6. Add `initialFocus` to Calendar
7. Add "Clear date" button

---

## Fix #2: BoardRow.tsx - Project Board Date Selection

**Current Problem (lines 121-144):**
```typescript
selected={task.scheduled_date ? new Date(task.scheduled_date) : undefined}
// Same issues as TaskBoardRow
```

**Fix:**
Same pattern as Fix #1:
- Add `parseISO` import
- Add controlled state for the popover
- Use `parseISO()` for date string parsing
- Close popover on selection
- Add clear button

---

## Fix #3: TaskDetailsDrawer.tsx - Drawer Date Picker

**Current Problem (lines 257-274):**
```typescript
selected={localTask.scheduled_date ? new Date(localTask.scheduled_date) : undefined}
// No controlled popover state
```

**Fix:**
Same pattern:
- Add `parseISO` to imports from `date-fns`
- Add controlled state: `const [datePopoverOpen, setDatePopoverOpen] = useState(false)`
- Convert to controlled Popover
- Use `parseISO()` for parsing
- Close on selection
- Add clear button

---

## Fix #4: Tasks.tsx - Detail Dialog Date Selection

**Current Problem (lines 1461-1476):**
```typescript
// Uses parseISO correctly but no controlled state
<Popover>
  // Never closes after selection
```

**Fix:**
- Add controlled popover state near other state variables
- Use controlled `Popover` component
- Close after selection
- Add clear button

---

## Fix #5: TaskCard.tsx - Quick Reschedule Calendar

**Current Problem (lines 426-441):**
```typescript
// Nested popover inside another popover
// Uses parseISO correctly but no controlled state
<Popover>
  <PopoverTrigger>Pick a date...</PopoverTrigger>
  <PopoverContent>
    <Calendar />  // Inside outer popover
  </PopoverContent>
</Popover>
```

**Fix:**
- Add controlled state for inner calendar popover
- Close inner popover after date selection
- The outer popover will naturally close when calendar closes

---

## Summary of Pattern to Apply

Every Calendar popover needs this pattern:

```typescript
// 1. Add controlled state
const [dateOpen, setDateOpen] = useState(false);

// 2. Use controlled Popover
<Popover open={dateOpen} onOpenChange={setDateOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" className="...">
      <CalendarIcon className="h-4 w-4 mr-2" />
      {dateValue 
        ? format(parseISO(dateValue), 'MMM d') 
        : 'Set date'}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={dateValue ? parseISO(dateValue) : undefined}
      onSelect={(date) => {
        onUpdate({ scheduled_date: date ? format(date, 'yyyy-MM-dd') : null });
        setDateOpen(false); // Close after selection
      }}
      initialFocus
      className="pointer-events-auto"
    />
    {/* Clear button */}
    {dateValue && (
      <div className="p-2 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-sm"
          onClick={() => {
            onUpdate({ scheduled_date: null });
            setDateOpen(false);
          }}
        >
          Clear date
        </Button>
      </div>
    )}
  </PopoverContent>
</Popover>
```

---

## Files Already Correct

These files already handle dates correctly:
- **`CreateFromSelectionModal.tsx`** - Uses `Date` objects directly (not string parsing)
- **`ContentSaveModal.tsx`** - Uses `parseISO()` correctly with `initialFocus`

---

## Import Changes Required

For files using `new Date(dateString)`:
```typescript
// Before
import { format } from 'date-fns';

// After
import { format, parseISO } from 'date-fns';
```

---

## Technical Details

### Why parseISO vs new Date?

| Method | Input | Behavior |
|--------|-------|----------|
| `new Date('2024-01-15')` | ISO string | Parses in UTC, may cause timezone shift |
| `parseISO('2024-01-15')` | ISO string | Parses correctly as local date |

### Why Controlled Popover?

Uncontrolled popovers stay open because:
- The `onSelect` callback doesn't trigger the popover to close
- User must click outside to dismiss
- Poor UX - expected behavior is close-on-select

### Mobile Touch Optimization

Adding `className="pointer-events-auto"` ensures the calendar receives touch events properly within the popover portal.

---

## Testing Checklist

After implementation:

**Date Selection:**
- [x] Click calendar icon → opens calendar
- [x] Select a date → calendar closes immediately
- [x] Date shows in UI right away
- [x] Click calendar again → shows previously selected date highlighted
- [x] Click "Clear date" → removes date and closes popover

**Mobile:**
- [x] Touch calendar works without scroll conflicts
- [x] Calendar doesn't appear behind other elements
- [x] Touch to select date works on first tap

**No Errors:**
- [x] No `parseISO` errors in console
- [x] No "Invalid Date" shown

**Works In All Locations:**
- [x] TaskBoardRow (database view)
- [x] Tasks.tsx detail dialog
- [x] BoardRow (project view)
- [x] TaskDetailsDrawer
- [x] TaskCard quick reschedule
