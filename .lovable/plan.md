
# Production Stability Fix: Centralized Task Data Layer

## Executive Summary

The audit is **accurate and verified**. I've confirmed the following critical issues in the codebase:

| Issue | Verified | Location | Impact |
|-------|----------|----------|--------|
| Direct Supabase calls bypassing `useTasks()` | Yes | 3 components | Duplicate API calls, stale data |
| Inconsistent date filtering logic | Yes | 4+ locations | Tasks appear/disappear unpredictably |
| Query key mismatches | Yes | 6+ files | Cache invalidation failures |
| Optimistic updates without centralized rollback | Yes | 3 components | UI shows wrong state after errors |

---

## Files Analysis

### Components Bypassing Centralized Hook

**Confirmed problematic files:**

1. **`DailyTimelineView.tsx`** (lines 75-105)
   - Direct `supabase.functions.invoke('get-all-tasks')` in useEffect
   - Local `useState` for tasks
   - Manual optimistic updates with local rollback

2. **`DailyScheduleView.tsx`** (lines 142-183)
   - Direct API call in useEffect
   - Duplicate filtering logic
   - Manual optimistic updates

3. **`InlineCalendarAgenda.tsx`** (lines 344-366)
   - `fetchTasks` callback with direct API call
   - Local state management
   - Manual optimistic updates

### Component Using Centralized Hook Correctly

**`DailyAgendaCard.tsx`** (line 55):
```typescript
const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
const { toggleComplete } = useTaskMutations();
```
This is the correct pattern.

---

## Query Key Inconsistencies Found

```text
CORRECT:
- useTasks.tsx: ['all-tasks']

INCORRECT:
- DailyAgendaCard.tsx (line 244): ['tasks'] 
- CourseProgressPanel.tsx (line 67): ['tasks']
- AddContentDialog.tsx (lines 345, 497): ['tasks']
- ContentPlannerWizard.tsx (line 314): ['tasks']
- Tasks.tsx (line 745): ['tasks']
```

This mismatch means cache invalidations don't work properly.

---

## Implementation Plan

### Phase 1: Create Unified Task Filter Utility

**New File: `src/lib/taskFilters.ts`**

Create a single source of truth for filtering tasks by date:

```typescript
import { Task } from '@/components/tasks/types';

/**
 * Unified task filtering for a specific date.
 * Checks all date fields consistently.
 */
export function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
  return tasks.filter(task => {
    if (task.is_recurring_parent) return false;
    
    const isScheduledForDate = task.scheduled_date === dateStr;
    const isPlannedForDate = task.planned_day === dateStr;
    const hasTimeBlockForDate = task.time_block_start?.startsWith(dateStr);
    
    return isScheduledForDate || isPlannedForDate || hasTimeBlockForDate;
  });
}

/**
 * Get incomplete tasks for a date (most common use case)
 */
export function getIncompleteTasksForDate(tasks: Task[], dateStr: string): Task[] {
  return getTasksForDate(tasks, dateStr).filter(t => !t.is_completed);
}

/**
 * Separate tasks into scheduled (has time) and unscheduled (pool)
 */
export function separateScheduledTasks(tasks: Task[]) {
  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];

  tasks.forEach(task => {
    if (task.time_block_start || task.scheduled_time) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  });

  return { scheduled, unscheduled };
}
```

---

### Phase 2: Refactor DailyTimelineView

**File: `src/components/daily-plan/DailyTimelineView.tsx`**

Changes:
1. Remove local task state and fetching
2. Import and use `useTasks()` and `useTaskMutations()`
3. Use unified filter from `taskFilters.ts`
4. Replace direct API calls with centralized mutations

```typescript
// REMOVE these:
// - useState for tasks
// - useState for loadingTasks  
// - useEffect that calls supabase.functions.invoke('get-all-tasks')
// - handleTaskToggle function with direct API call

// ADD these:
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { getTasksForDate, separateScheduledTasks } from '@/lib/taskFilters';

// In component:
const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
const { toggleComplete } = useTaskMutations();

const tasks = useMemo(() => 
  getTasksForDate(allTasks, todayStr),
  [allTasks, todayStr]
);

const { scheduled: scheduledTasks, unscheduled: unscheduledTasks } = useMemo(() =>
  separateScheduledTasks(tasks),
  [tasks]
);

// Replace handleTaskToggle:
const handleTaskToggle = (taskId: string) => {
  toggleComplete.mutate(taskId);
  onTaskToggle?.(taskId, false);
};
```

---

### Phase 3: Refactor DailyScheduleView

**File: `src/components/daily-plan/DailyScheduleView.tsx`**

Same pattern as DailyTimelineView:

1. Remove lines 79, 80-82 (local state)
2. Remove lines 142-183 (useEffect fetching)
3. Remove lines 222-246 (handleTaskToggle with direct API)
4. Remove lines 249-269 (handleTaskUpdate with direct API)
5. Remove lines 272-300 (handleTaskRemove with direct API)
6. Remove lines 430-466 (handleRefresh with direct API)

Replace with centralized hook usage and mutation calls.

**Note:** This component has complex drag-and-drop logic. The mutations for scheduling (`setTimeBlock`, `updateTask`) should use `useTaskMutations()` instead of direct API calls.

---

### Phase 4: Refactor InlineCalendarAgenda

**File: `src/components/daily-plan/InlineCalendarAgenda.tsx`**

1. Remove lines 275, 277-278 (local state for tasks/loading)
2. Remove lines 344-366 (fetchTasks callback and useEffect)
3. Replace with `useTasks()` hook
4. Use `useTaskMutations()` for toggle/update operations

---

### Phase 5: Fix Query Key Inconsistencies

Update all files using wrong query key:

| File | Line | Change |
|------|------|--------|
| `DailyAgendaCard.tsx` | 244 | `['tasks']` → `['all-tasks']` |
| `CourseProgressPanel.tsx` | 67 | `['tasks']` → `['all-tasks']` |
| `AddContentDialog.tsx` | 345, 497 | `['tasks']` → `['all-tasks']` |
| `ContentPlannerWizard.tsx` | 314 | `['tasks']` → `['all-tasks']` |
| `Tasks.tsx` | 745 | `['tasks']` → `['all-tasks']` |
| `useCourses.tsx` | 355 | `['tasks']` → `['all-tasks']` |

Better approach - use the exported constant:
```typescript
import { taskQueryKeys } from '@/hooks/useTasks';
queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
```

---

### Phase 6: Update useTasksForDate to Include time_block_start

**File: `src/hooks/useTasks.tsx`** (lines 431-439)

Current code is missing `time_block_start` check:
```typescript
// BEFORE
return task.scheduled_date === dateStr || task.planned_day === dateStr;

// AFTER (use the utility)
import { getTasksForDate } from '@/lib/taskFilters';
// OR inline:
return task.scheduled_date === dateStr || 
       task.planned_day === dateStr ||
       task.time_block_start?.startsWith(dateStr);
```

---

### Phase 7: Add Error Boundaries to Daily Plan Components

**File: `src/pages/DailyPlan.tsx`**

Wrap major sections with `WidgetErrorBoundary`:

```typescript
import { WidgetErrorBoundary } from '@/components/dashboard';

// Wrap each major component:
<WidgetErrorBoundary title="Daily Schedule">
  <DailyScheduleView {...props} />
</WidgetErrorBoundary>
```

---

## Files to Modify Summary

| File | Action | Priority |
|------|--------|----------|
| `src/lib/taskFilters.ts` | **CREATE** | High |
| `src/components/daily-plan/DailyTimelineView.tsx` | **MAJOR REFACTOR** | Critical |
| `src/components/daily-plan/DailyScheduleView.tsx` | **MAJOR REFACTOR** | Critical |
| `src/components/daily-plan/InlineCalendarAgenda.tsx` | **MAJOR REFACTOR** | Critical |
| `src/hooks/useTasks.tsx` | **MINOR UPDATE** | High |
| `src/components/daily-plan/DailyAgendaCard.tsx` | **FIX QUERY KEY** | High |
| `src/components/courses/CourseProgressPanel.tsx` | **FIX QUERY KEY** | Medium |
| `src/components/editorial-calendar/AddContentDialog.tsx` | **FIX QUERY KEY** | Medium |
| `src/components/wizards/content-planner/ContentPlannerWizard.tsx` | **FIX QUERY KEY** | Medium |
| `src/pages/Tasks.tsx` | **FIX QUERY KEY** | Medium |
| `src/hooks/useCourses.tsx` | **FIX QUERY KEY** | Medium |
| `src/pages/DailyPlan.tsx` | **ADD ERROR BOUNDARIES** | Medium |

---

## Expected Results After Fix

| Metric | Before | After |
|--------|--------|-------|
| API calls when opening Daily Plan | 3+ duplicate calls | 1 shared call |
| Cache consistency | Components show different data | All views show same data |
| Update propagation | Manual refresh needed | Automatic via realtime |
| Error recovery | UI stuck in wrong state | Automatic rollback |
| Date filtering | Inconsistent across views | Single unified logic |

---

## Testing Plan

After implementation:

1. **Cross-view consistency test**
   - Open Tasks page, toggle a task complete
   - Navigate to Daily Plan - task should show as complete
   - Navigate to Weekly Plan - same state

2. **Cache invalidation test**
   - Add a task via Quick Capture
   - All views should show the new task without refresh

3. **Error recovery test**
   - Disable network
   - Toggle a task
   - Should revert after error

4. **Date filtering test**
   - Create task with `time_block_start` for today
   - Should appear in all "today" views
