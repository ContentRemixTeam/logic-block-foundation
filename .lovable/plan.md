
# Time Tracking Feature - Complete Implementation Plan

## Overview

Add comprehensive time tracking to your task management system. This feature enables:
- Tracking estimated vs actual time spent on tasks
- Automatic duration learning for recurring tasks
- Time analytics and reports on the Progress page
- Estimation accuracy insights

---

## What You'll Get

### 1. Task Completion Modal
When completing a task with an estimated duration, a modal prompts for actual time:

```text
+-----------------------------------------------+
|  Task Completed!                          [X] |
|                                               |
|  "Write blog post about SEO tips"             |
|                                               |
|  Estimated: 45 min                            |
|                                               |
|  How long did it actually take?               |
|                                               |
|  [15m] [30m] [45m] [1h] [1.5h] [2h]           |
|                                               |
|  [_______________] minutes                    |
|                                               |
|  [Use Estimate]  [Skip]  [Save]               |
+-----------------------------------------------+
```

### 2. Smart Recurring Tasks
For recurring tasks, the system learns from history:
- Calculates average actual time from past instances
- Auto-sets estimates on new instances
- Shows "Usually takes ~45 min" badge

### 3. Progress Page Analytics
New "Time Tracking" section with:
- Weekly Time Chart (estimated vs actual)
- Estimation Accuracy Score
- Time by Project breakdown
- Time by Tag breakdown
- Recurring Task Averages table

---

## Database Changes

### New Table: `time_entries`

Stores time logs for detailed reporting:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | Owner (references auth.users) |
| task_id | UUID | Task completed (references tasks) |
| parent_task_id | UUID | Recurring parent (nullable) |
| estimated_minutes | INTEGER | Estimate at completion time |
| actual_minutes | INTEGER | Logged actual time |
| logged_at | TIMESTAMPTZ | When logged |
| created_at | TIMESTAMPTZ | Record creation |

### New View: `recurring_task_averages`

Pre-computed averages for recurring tasks:

```sql
SELECT 
  parent_task_id,
  COUNT(*) as instance_count,
  AVG(actual_minutes) as avg_actual_minutes,
  AVG(estimated_minutes) as avg_estimated_minutes,
  STDDEV(actual_minutes) as stddev_minutes
FROM time_entries
WHERE parent_task_id IS NOT NULL
GROUP BY parent_task_id;
```

### Settings Table Update

Add column to `task_settings`:

| Column | Type | Values |
|--------|------|--------|
| time_completion_modal | TEXT | 'always' / 'when_estimated' / 'never' |

The existing `enable_time_tracking` column (already present) will control the overall feature toggle.

---

## Implementation Phases

### Phase 1: Database Foundation

**Migration 1 - Create time_entries table:**
- Create table with all columns
- Add RLS policies (users can only access their own)
- Create index on (user_id, logged_at) for performance
- Create the recurring_task_averages view

**Migration 2 - Update task_settings:**
- Add time_completion_modal column with default 'when_estimated'

### Phase 2: Edge Function Updates

**Update `manage-task/index.ts`:**

Modify the toggle action schema to accept optional actual_minutes:

```typescript
const ToggleTaskSchema = z.object({
  action: z.literal('toggle'),
  task_id: z.string().uuid('Invalid task ID'),
  actual_minutes: z.number().min(0).optional(), // NEW
});
```

In the toggle case, when completing a task:

```typescript
case 'toggle': {
  const { task_id, actual_minutes } = validatedData;
  
  // Get current state including parent info
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('is_completed, estimated_minutes, parent_task_id')
    .eq('task_id', task_id)
    .eq('user_id', userId)
    .single();

  const newState = !currentTask.is_completed;

  // If completing AND actual_minutes provided, log time entry
  if (newState && actual_minutes !== undefined) {
    await supabase.from('time_entries').insert({
      user_id: userId,
      task_id: task_id,
      parent_task_id: currentTask.parent_task_id,
      estimated_minutes: currentTask.estimated_minutes,
      actual_minutes: actual_minutes,
      logged_at: new Date().toISOString(),
    });
    
    // Also update task's actual_minutes
    await supabase
      .from('tasks')
      .update({ actual_minutes })
      .eq('task_id', task_id);
  }

  // ... rest of toggle logic
}
```

**Update `generate-recurring-tasks/index.ts`:**

When creating new recurring instance, check for average:

```typescript
// Query average from past instances
const { data: avg } = await supabase
  .from('recurring_task_averages')
  .select('avg_actual_minutes, instance_count')
  .eq('parent_task_id', parentTask.task_id)
  .single();

// Use average if 3+ instances exist
const estimatedMinutes = avg?.instance_count >= 3
  ? Math.round(avg.avg_actual_minutes)
  : parentTask.estimated_minutes;
```

**Create `get-time-analytics/index.ts`:**

New edge function returning:
- weeklyTimeData: Last 13 weeks of estimated vs actual
- projectBreakdown: Time by project (last 30 days)
- tagBreakdown: Time by context tag (last 30 days)
- recurringTaskAverages: From view with task names
- accuracyMetrics: Overall accuracy, tendency, best/worst categories

### Phase 3: Frontend Components

**Create `src/components/tasks/TaskCompletionModal.tsx`:**

Dialog component with:
- Task name display
- Estimated time shown (if exists)
- Quick-select duration buttons (15m, 30m, 1h, etc.)
- Custom minutes input field
- "Use Estimate" button
- Skip and Save actions

Props interface:
```typescript
interface TaskCompletionModalProps {
  open: boolean;
  task: Task;
  onClose: () => void;
  onSave: (actualMinutes: number) => void;
  onSkip: () => void;
}
```

**Create `src/hooks/useTaskCompletion.tsx`:**

Centralized hook that:
- Checks task_settings.enable_time_tracking
- Checks task_settings.time_completion_modal preference
- Returns handleTaskComplete function and modal component
- Shows modal based on settings/task state
- Calls toggleComplete mutation with actual_minutes

```typescript
export function useTaskCompletion() {
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const { toggleComplete } = useTaskMutations();
  const { settings } = useTaskSettings();

  const handleTaskComplete = useCallback((task: Task) => {
    // Check if should show modal
    if (!settings?.enable_time_tracking) {
      toggleComplete.mutate(task.task_id);
      return;
    }

    const modalPref = settings?.time_completion_modal || 'when_estimated';
    
    if (modalPref === 'never') {
      toggleComplete.mutate(task.task_id);
    } else if (modalPref === 'always' || task.estimated_minutes) {
      setPendingTask(task);
    } else {
      toggleComplete.mutate(task.task_id);
    }
  }, [settings, toggleComplete]);

  const handleSave = (actualMinutes: number) => {
    if (pendingTask) {
      toggleComplete.mutate({ 
        taskId: pendingTask.task_id, 
        actual_minutes: actualMinutes 
      });
      setPendingTask(null);
    }
  };

  return {
    handleTaskComplete,
    TaskCompletionModal: pendingTask ? (
      <TaskCompletionModal
        open={!!pendingTask}
        task={pendingTask}
        onClose={() => setPendingTask(null)}
        onSave={handleSave}
        onSkip={() => {
          toggleComplete.mutate(pendingTask.task_id);
          setPendingTask(null);
        }}
      />
    ) : null,
  };
}
```

**Create `src/components/tasks/TimeEntryBadge.tsx`:**

Small badge for recurring task instances showing average time:

```typescript
interface TimeEntryBadgeProps {
  parentTaskId: string;
  currentEstimate: number | null;
}
```

Shows: "Usually ~45 min" with clock icon
Warning icon if current estimate differs >20% from average

### Phase 4: Update Existing Components

**Update `src/hooks/useTasks.tsx`:**

Modify toggleComplete mutation signature:

```typescript
const toggleComplete = useMutation({
  mutationFn: async ({ 
    taskId, 
    actual_minutes 
  }: { 
    taskId: string; 
    actual_minutes?: number 
  }) => {
    const session = await getSession();
    const response = await supabase.functions.invoke('manage-task', {
      body: { 
        action: 'toggle', 
        task_id: taskId,
        actual_minutes 
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    // ... rest unchanged
  },
  // Optimistic update unchanged
});
```

**Update Task Views:**

Files to update to use useTaskCompletion:
- `src/pages/DailyPlan.tsx`
- `src/pages/Tasks.tsx`
- `src/components/tasks/views/TaskListView.tsx`
- `src/components/tasks/views/TaskKanbanView.tsx`
- `src/components/weekly-plan/WeekPlanner.tsx`

Pattern for each:
```typescript
const { handleTaskComplete, TaskCompletionModal } = useTaskCompletion();

// Replace direct toggleComplete calls with handleTaskComplete(task)

// At end of component:
return (
  <>
    {/* existing UI */}
    {TaskCompletionModal}
  </>
);
```

### Phase 5: Progress Page Analytics

**Create `src/hooks/useTimeAnalytics.tsx`:**

```typescript
export function useTimeAnalytics() {
  return useQuery({
    queryKey: ['time-analytics'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data } = await supabase.functions.invoke('get-time-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Create Progress Page Components:**

| Component | Purpose |
|-----------|---------|
| `TimeAccuracyCard.tsx` | Shows accuracy %, tendency, tips |
| `WeeklyTimeChart.tsx` | Line chart: estimated vs actual over 13 weeks |
| `TimeByProjectChart.tsx` | Pie chart of hours by project |
| `TimeByTagChart.tsx` | Bar chart of hours by context tag |
| `RecurringTasksTable.tsx` | Table of recurring tasks with averages |
| `TimeAnalytics.tsx` | Container combining all above |

**Update `src/pages/Progress.tsx`:**

Add new section after existing metrics:

```typescript
{/* After WinsCard */}
<div className="space-y-4">
  <h2 className="text-lg font-semibold flex items-center gap-2">
    <Clock className="h-5 w-5" />
    Time Tracking
  </h2>
  <TimeAnalytics />
</div>
```

---

## Files Summary

### New Files to Create

| File | Type |
|------|------|
| `src/components/tasks/TaskCompletionModal.tsx` | Component |
| `src/components/tasks/TimeEntryBadge.tsx` | Component |
| `src/hooks/useTaskCompletion.tsx` | Hook |
| `src/hooks/useTimeAnalytics.tsx` | Hook |
| `src/components/progress/TimeAnalytics.tsx` | Component |
| `src/components/progress/TimeAccuracyCard.tsx` | Component |
| `src/components/progress/WeeklyTimeChart.tsx` | Component |
| `src/components/progress/TimeByProjectChart.tsx` | Component |
| `src/components/progress/TimeByTagChart.tsx` | Component |
| `src/components/progress/RecurringTasksTable.tsx` | Component |
| `supabase/functions/get-time-analytics/index.ts` | Edge Function |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/manage-task/index.ts` | Add actual_minutes to toggle action |
| `supabase/functions/generate-recurring-tasks/index.ts` | Use averages for estimates |
| `src/hooks/useTasks.tsx` | Update toggleComplete signature |
| `src/pages/DailyPlan.tsx` | Use useTaskCompletion hook |
| `src/pages/Tasks.tsx` | Use useTaskCompletion hook |
| `src/pages/Progress.tsx` | Add TimeAnalytics section |
| `src/components/tasks/views/TaskListView.tsx` | Use completion handler |
| `src/components/tasks/views/TaskKanbanView.tsx` | Use completion handler |
| `src/components/weekly-plan/WeekPlanner.tsx` | Use completion handler |

---

## Technical Considerations

### Bulk Operations
For bulk task completion (completing multiple tasks at once):
- Skip modal for bulk operations
- Use estimated time as actual time automatically
- Or add "Skip time tracking for bulk" option in settings

### Existing Data
- The `tasks.actual_minutes` column already exists
- The `task_settings.enable_time_tracking` column already exists
- Historical tasks without time entries won't appear in analytics

### Offline Support
The app has offline sync capabilities. Time entries should:
- Queue offline like other mutations
- Sync when connection restored

### Performance
- Index on `time_entries(user_id, logged_at)` for fast queries
- Materialized view for recurring averages (or simple view with caching)
- Limit analytics queries to last 90 days by default

---

## Recommended Implementation Order

1. **Database migration** - Create time_entries table and view
2. **Edge function: manage-task** - Add time entry logging on toggle
3. **Edge function: get-time-analytics** - Create analytics endpoint
4. **TaskCompletionModal** - Build the UI component
5. **useTaskCompletion hook** - Centralize completion logic
6. **Update useTasks.tsx** - Modify toggleComplete signature
7. **Update task views** - Integrate modal across all views
8. **Update generate-recurring-tasks** - Add average-based estimates
9. **Progress page components** - Build analytics UI
10. **TimeEntryBadge** - Add to recurring task cards
