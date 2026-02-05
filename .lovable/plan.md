
# Task Manager Simplification: Remove Redundant Status Field

## Overview

After auditing the codebase, the user's analysis is **correct** - the `status` field is indeed redundant and creates confusion. Here's what I found:

### Current Confusing State

The task system has **overlapping organization methods**:

| Concept | Current Implementation | Problem |
|---------|----------------------|---------|
| **When?** | `scheduled_date`, `planned_day` | Works correctly |
| **How important?** | `priority` (high/medium/low) | Works correctly |
| **Energy needed?** | `energy_level` | Works correctly |
| **Is it blocked?** | `waiting_on` (text field) | Works correctly |
| **Project workflow?** | `project_column` (todo/in_progress/done) | Works correctly |
| **Generic status?** | `status` (focus/scheduled/backlog/waiting/someday) | REDUNDANT - overlaps with dates |

**Key Problem:** The Kanban view (TaskKanbanView.tsx) uses `status === 'someday'` as a **special case** that overrides date-based logic (line 102-105), causing confusion about whether "Someday" is a date range or a status.

---

## Proposed Changes

### Phase 1: Update Kanban View Logic (Date-Only)

**File:** `src/components/tasks/views/TaskKanbanView.tsx`

Replace the `getTaskColumn` function to use pure date-based logic:

```typescript
function getTaskColumn(task: Task): string {
  const now = new Date();
  const today = startOfDay(now);
  
  // Get the effective date (planned_day takes priority, then scheduled_date)
  const dateStr = task.planned_day || task.scheduled_date;
  
  // No date = unscheduled
  if (!dateStr) {
    return 'unscheduled';
  }

  const taskDate = startOfDay(new Date(dateStr));
  const daysUntil = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Overdue or today
  if (daysUntil <= 0) return 'today';
  
  // This week (1-7 days)
  if (daysUntil <= 7) return 'this_week';
  
  // Next week (8-14 days)
  if (daysUntil <= 14) return 'next_week';
  
  // Next quarter (15-90 days)
  if (daysUntil <= 90) return 'next_quarter';
  
  // Someday (>90 days)
  return 'someday';
}
```

Update the `getColumnTargetDate` function to set far-future dates for "Someday" instead of using status:

```typescript
case 'someday':
  // Set date to 6 months from now (signals "far future")
  const somedayDate = addMonths(now, 6);
  return { date: somedayDate.toISOString().split('T')[0] };
```

Also update the drag-drop handler to stop setting/clearing status.

---

### Phase 2: Remove Status Dropdown from Board Views

**Files to update:**

1. **`src/components/projects/monday-board/BoardRow.tsx`**
   - Remove `STATUS_OPTIONS` constant (lines 44-50)
   - Remove the status case from `renderCell` (lines 129-151)
   - Update the `BOARD_COLUMNS` reference to exclude status

2. **`src/components/tasks/views/TaskBoardRow.tsx`**
   - Remove `STATUS_OPTIONS` constant (lines 53-59)
   - Remove the status case from `renderCell` (lines 152-172)

3. **`src/types/project.ts`**
   - Remove 'status' from `BOARD_COLUMNS` array if present

---

### Phase 3: Replace Status-Based Filtering with "Blocked" Filter

Instead of filtering by status, add a "Blocked Tasks" filter based on the `waiting_on` field:

**Files to update:**

1. **`src/components/weekly-plan/AvailableTasksSidebar.tsx`**
   - Change filter from `status === 'waiting'` to `waiting_on !== null`

2. **`src/components/weekly-plan/WeekInbox.tsx`**
   - Same change as above

3. **`src/pages/Tasks.tsx`**
   - Update `handleQuickReschedule` to stop setting status
   - Update overdue task handling to use dates only

---

### Phase 4: Update TaskMondayBoardView Grouping

**File:** `src/components/tasks/views/TaskMondayBoardView.tsx`

- Remove 'status' from `GroupByOption` type
- Remove `STATUS_GROUPS` constant
- Update grouping logic to default to 'date' instead of 'status'
- Keep date, priority, and project grouping options

---

### Phase 5: Cleanup Type Definitions

**File:** `src/components/tasks/types.ts`

Mark status field as deprecated (don't remove yet for backward compatibility):

```typescript
/**
 * @deprecated Status field is redundant. Use:
 * - scheduled_date/planned_day for scheduling
 * - waiting_on for blocked tasks
 * - project_column for project workflow
 */
status: 'focus' | 'scheduled' | 'backlog' | 'waiting' | 'someday' | null;
```

Remove the `TaskStatus` type export since it won't be used.

---

### Phase 6: Update Theme Colors (Optional Cleanup)

**File:** `src/lib/themeColors.ts`

Keep the color utilities but add deprecation notice - the colors can still be used for other UI elements.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/views/TaskKanbanView.tsx` | Use pure date logic, remove status handling |
| `src/components/tasks/views/TaskBoardRow.tsx` | Remove STATUS_OPTIONS and status cell |
| `src/components/projects/monday-board/BoardRow.tsx` | Remove STATUS_OPTIONS and status cell |
| `src/components/tasks/views/TaskMondayBoardView.tsx` | Remove status grouping option |
| `src/pages/Tasks.tsx` | Update reschedule handlers to not set status |
| `src/components/weekly-plan/AvailableTasksSidebar.tsx` | Use `waiting_on` instead of status |
| `src/components/weekly-plan/WeekInbox.tsx` | Use `waiting_on` instead of status |
| `src/components/tasks/types.ts` | Add deprecation comment |
| `src/lib/themeColors.ts` | Add deprecation notice |
| `src/hooks/useTasks.tsx` | Update filter logic in `unplannedTasks` |

---

## What NOT to Change

1. **Database column** - Keep the `status` column for now (backward compatibility)
2. **`waiting_on` field** - This is useful and should stay
3. **`project_column`** - This serves a different purpose for project workflows
4. **Priority/Energy/Tags** - These are valuable and independent

---

## Expected Behavior After Changes

| Scenario | Before | After |
|----------|--------|-------|
| View Kanban | "Someday" status overrides dates | Pure date-based columns |
| Drag to "Someday" | Sets `status = 'someday'` | Sets date to 6 months out |
| Blocked tasks | Filter by `status = 'waiting'` | Filter by `waiting_on IS NOT NULL` |
| Board view | Shows redundant status column | Status column removed |
| Task grouping | Can group by status | Group by date/priority/project |

---

## Testing Checklist

After implementation:

**Kanban View:**
- [ ] Drag task to Unscheduled - clears date, no status change
- [ ] Drag task to Today - sets today's date
- [ ] Drag task to Someday - sets date 6 months out
- [ ] Tasks appear in correct columns based on dates only

**Board Views:**
- [ ] Status column no longer appears
- [ ] All other columns work correctly
- [ ] No errors when loading board views

**Filters:**
- [ ] "Show Blocked Tasks" filter uses `waiting_on` field
- [ ] Weekly planning filters work correctly

**Backward Compatibility:**
- [ ] Existing tasks with old status values still appear correctly
- [ ] No database errors or data loss
